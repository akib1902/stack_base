import {
  TelegramError,
  type TelegramDocumentReference,
  type TelegramGateway,
} from './gateway';
import type {
  ProviderReference,
  StorageObjectStatus,
  StorageProvider,
  StoredObjectReference,
} from '../types';

/**
 * Telegram storage provider (SRS A4.2). The gateway must already be connected;
 * the registry opens and closes sessions around each operation.
 */

const SAVED_MESSAGES = 'me';

export function telegramReferenceOf(
  document: TelegramDocumentReference,
  objectName: string,
): ProviderReference {
  return {
    messageId: document.messageId,
    documentId: document.documentId,
    accessHash: document.accessHash,
    fileReference: document.fileReference,
    dcId: document.dcId,
    size: document.size,
    mimeType: document.mimeType,
    fileName: objectName,
  };
}

/** Reference fields required to locate a stored object again. */
export function parseTelegramReference(reference: ProviderReference): {
  messageId: number;
} {
  const messageId = reference.messageId;
  if (typeof messageId !== 'number' || !Number.isInteger(messageId) || messageId <= 0) {
    throw new TelegramError('MISSING', 'The stored Telegram reference is invalid');
  }
  return { messageId };
}

export function createTelegramStorageProvider(gateway: TelegramGateway): StorageProvider {
  return {
    provider: 'telegram',

    async checkConnection() {
      const account = await gateway.getAccount();
      return { ok: true, accountIdentifier: account.accountIdentifier };
    },

    async upload(input) {
      const document = await gateway.sendDocument({
        objectName: input.objectName,
        sizeBytes: input.sizeBytes,
        sourcePath: input.sourcePath,
      });
      return {
        provider: 'telegram' as const,
        reference: telegramReferenceOf(document, input.objectName),
        telegram: {
          chatReference: SAVED_MESSAGES,
          messageReference: String(document.messageId),
          mediaReference: {
            documentId: document.documentId,
            accessHash: document.accessHash,
            dcId: document.dcId,
            mimeType: document.mimeType,
          },
        },
        remoteSizeBytes: document.size,
      } satisfies StoredObjectReference;
    },

    download: async function* download(reference) {
      const { messageId } = parseTelegramReference(reference);
      for await (const chunk of gateway.iterMessageBytes({ messageId })) {
        yield chunk;
      }
    },

    async delete(reference) {
      const { messageId } = parseTelegramReference(reference);
      await gateway.deleteMessage(messageId);
      return { deleted: true };
    },

    async inspect(reference) {
      const { messageId } = parseTelegramReference(reference);
      const result = await gateway.inspectMessage(messageId);
      if (!result.exists) {
        return { status: 'missing', remoteSizeBytes: null } satisfies StorageObjectStatus;
      }
      return {
        status: 'available',
        remoteSizeBytes: result.size,
      } satisfies StorageObjectStatus;
    },
  };
}
