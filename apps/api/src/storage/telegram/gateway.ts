import { Api, Logger, TelegramClient, errors } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { computeCheck } from 'teleproto/Password';

/**
 * Narrow gateway over the pinned Telegram client (`teleproto`, ADR-016). Every
 * method is expressed in terms of what the application needs, which keeps the
 * login manager and the storage provider unit-testable with a fake gateway and
 * keeps teleproto types out of the rest of the codebase.
 *
 * The client never buffers a whole object: uploads stream from the staged file
 * on disk, downloads are yielded in 512 KiB chunks.
 */

const DOWNLOAD_CHUNK_BYTES = 512 * 1024;
const UPLOAD_WORKERS = 4;

export interface TelegramAccount {
  id: string;
  /** Username or numeric id — never the phone number (A4.4). */
  accountIdentifier: string;
}

export interface TelegramDocumentReference {
  messageId: number;
  documentId: string;
  accessHash: string;
  /** base64; refreshed from the message on download because it expires. */
  fileReference: string;
  dcId: number | null;
  size: number;
  mimeType: string | null;
}

export interface TelegramCodeDelivery {
  phoneCodeHash: string;
  viaApp: boolean;
}

export type TelegramSignInResult =
  | { kind: 'signed_in'; account: TelegramAccount }
  | { kind: 'password_required'; hint: string | null };

export interface TelegramGateway {
  connect(session: string | null): Promise<void>;
  disconnect(): Promise<void>;
  saveSession(): string;
  sendCode(phoneNumber: string): Promise<TelegramCodeDelivery>;
  signIn(phoneNumber: string, phoneCodeHash: string, code: string): Promise<TelegramSignInResult>;
  checkPassword(password: string): Promise<TelegramAccount>;
  getAccount(): Promise<TelegramAccount>;
  sendDocument(input: {
    objectName: string;
    sizeBytes: number;
    sourcePath: string;
  }): Promise<TelegramDocumentReference>;
  iterMessageBytes(input: { messageId: number }): AsyncIterable<Uint8Array>;
  deleteMessage(messageId: number): Promise<void>;
  inspectMessage(messageId: number): Promise<{ exists: boolean; size: number | null }>;
}

export type TelegramErrorCode =
  | 'RATE_LIMITED'
  | 'SESSION_EXPIRED'
  | 'MISSING'
  | 'NOT_AUTHENTICATED'
  | 'UNKNOWN';

export class TelegramError extends Error {
  readonly code: TelegramErrorCode;
  readonly retryAfterSeconds: number | null;

  constructor(code: TelegramErrorCode, message: string, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'TelegramError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function mapTelegramError(error: unknown): TelegramError {
  if (error instanceof TelegramError) {
    return error;
  }
  if (error instanceof errors.FloodWaitError) {
    return new TelegramError(
      'RATE_LIMITED',
      `Telegram asked to wait ${error.seconds} seconds`,
      error.seconds,
    );
  }
  if (error instanceof errors.SessionPasswordNeededError) {
    return new TelegramError('NOT_AUTHENTICATED', 'A two-factor password is required');
  }
  if (
    error instanceof errors.SessionRevokedError ||
    error instanceof errors.AuthKeyUnregisteredError
  ) {
    return new TelegramError('SESSION_EXPIRED', 'The Telegram session is no longer valid');
  }
  if (error instanceof errors.MessageIdInvalidError || error instanceof errors.MessageIdsEmptyError) {
    return new TelegramError('MISSING', 'The stored Telegram message no longer exists');
  }
  if (
    error instanceof errors.FileReferenceExpiredError ||
    error instanceof errors.FileReferenceInvalidError
  ) {
    return new TelegramError('MISSING', 'The Telegram file reference has expired');
  }
  return new TelegramError(
    'UNKNOWN',
    error instanceof Error ? `Telegram request failed: ${error.name}` : 'Telegram request failed',
  );
}

export interface TelegramCredentials {
  apiId: number;
  apiHash: string;
}

export function createTelegramGateway(credentials: TelegramCredentials): TelegramGateway {
  let client: TelegramClient | null = null;
  let passwordRequest: Api.account.Password | null = null;

  const ensure = (): TelegramClient => {
    if (!client) {
      throw new TelegramError('NOT_AUTHENTICATED', 'The Telegram client is not connected');
    }
    return client;
  };

  const run = async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      throw mapTelegramError(error);
    }
  };

  const accountOf = (user: Api.User): TelegramAccount => ({
    id: String(user.id),
    accountIdentifier:
      typeof user.username === 'string' && user.username.length > 0
        ? `@${user.username}`
        : `id:${user.id}`,
  });

  const documentOf = (message: Api.Message): Api.Document | null => {
    const media = message.media;
    if (!(media instanceof Api.MessageMediaDocument)) {
      return null;
    }
    const document = media.document;
    if (!document || document.className === 'DocumentEmpty') {
      return null;
    }
    return document as Api.Document;
  };

  // `getMessages` can return a MessageEmpty at runtime although the types only
  // show Api.Message, so presence checks go through a structural test.
  const isEmptyMessage = (message: unknown): boolean =>
    typeof message === 'object' &&
    message !== null &&
    (message as { className?: unknown }).className === 'MessageEmpty';

  const fetchMessage = async (messageId: number): Promise<Api.Message> => {
    const messages = await ensure().getMessages('me', { ids: [messageId] });
    const message = messages[0] as Api.Message | undefined;
    if (!message || isEmptyMessage(message) || !documentOf(message)) {
      throw new TelegramError('MISSING', 'The stored Telegram message no longer exists');
    }
    return message;
  };

  const getAccount = async (): Promise<TelegramAccount> => {
    const me = await run(() => ensure().getMe());
    return accountOf(me);
  };

  return {
    async connect(session) {
      if (client) {
        await client.disconnect().catch(() => undefined);
        client = null;
      }
      // Explicit rate-limit errors instead of long sleeps inside a request.
      Logger.setLevel('error');
      const created = new TelegramClient(
        new StringSession(session ?? ''),
        credentials.apiId,
        credentials.apiHash,
        { connectionRetries: 3, floodSleepThreshold: 0 },
      );
      await run(() => created.connect());
      client = created;
    },

    async disconnect() {
      const current = client;
      client = null;
      passwordRequest = null;
      if (current) {
        await current.disconnect().catch(() => undefined);
      }
    },

    saveSession() {
      const current = ensure();
      return (current.session as StringSession).save();
    },

    async sendCode(phoneNumber) {
      const result = await run(() =>
        ensure().sendCode(
          { apiId: credentials.apiId, apiHash: credentials.apiHash },
          phoneNumber,
        ),
      );
      return { phoneCodeHash: result.phoneCodeHash, viaApp: result.isCodeViaApp };
    },

    async signIn(phoneNumber, phoneCodeHash, code) {
      try {
        await ensure().invoke(
          new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode: code }),
        );
      } catch (error) {
        if (error instanceof errors.SessionPasswordNeededError) {
          const request = await run(() => ensure().invoke(new Api.account.GetPassword()));
          passwordRequest = request;
          return {
            kind: 'password_required',
            hint: typeof request.hint === 'string' && request.hint.length > 0 ? request.hint : null,
          };
        }
        throw mapTelegramError(error);
      }
      return { kind: 'signed_in', account: await getAccount() };
    },

    async checkPassword(password) {
      if (!passwordRequest) {
        throw new TelegramError('NOT_AUTHENTICATED', 'The two-factor step was not started');
      }
      const request = passwordRequest;
      await run(async () => {
        const check = await computeCheck(request, password);
        await ensure().invoke(new Api.auth.CheckPassword({ password: check }));
      });
      passwordRequest = null;
      return getAccount();
    },

    getAccount,

    async sendDocument(input) {
      const message = await run(() =>
        ensure().sendFile('me', {
          file: input.sourcePath,
          forceDocument: true,
          fileSize: input.sizeBytes,
          workers: UPLOAD_WORKERS,
        }),
      );
      const document = documentOf(message);
      if (!document) {
        throw new TelegramError(
          'UNKNOWN',
          'Telegram did not return a document for the uploaded object',
        );
      }
      return {
        messageId: message.id,
        documentId: String(document.id),
        accessHash: String(document.accessHash),
        fileReference: Buffer.from(document.fileReference ?? []).toString('base64'),
        dcId: typeof document.dcId === 'number' ? document.dcId : null,
        size: Number(document.size),
        mimeType: typeof document.mimeType === 'string' ? document.mimeType : null,
      };
    },

    iterMessageBytes: async function* iterMessageBytes(input) {
      const current = ensure();
      let message = await fetchMessage(input.messageId);
      let yieldedAny = false;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          for await (const chunk of current.iterDownload(message, {
            requestSize: DOWNLOAD_CHUNK_BYTES,
          })) {
            yieldedAny = true;
            yield chunk as Uint8Array;
          }
          return;
        } catch (error) {
          const stale =
            error instanceof errors.FileReferenceExpiredError ||
            error instanceof errors.FileReferenceInvalidError;
          // A stale reference is retried once from the start — only if nothing
          // was yielded yet, because a partial decrypt stream cannot restart.
          if (stale && !yieldedAny && attempt === 0) {
            message = await fetchMessage(input.messageId);
            continue;
          }
          throw mapTelegramError(error);
        }
      }
    },

    async deleteMessage(messageId) {
      await run(() => ensure().deleteMessages('me', [messageId], { revoke: true }));
    },

    async inspectMessage(messageId) {
      const messages = await run(() => ensure().getMessages('me', { ids: [messageId] }));
      const message = messages[0] as Api.Message | undefined;
      if (!message || isEmptyMessage(message)) {
        return { exists: false, size: null };
      }
      const document = documentOf(message);
      return { exists: document !== null, size: document ? Number(document.size) : null };
    },
  };
}
