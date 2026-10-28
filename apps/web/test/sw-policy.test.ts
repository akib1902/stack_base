import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The service worker's cache policy is a security boundary (SRS C8: no broad
 * caching of private API responses, explicit cache rules, app-shell fallback).
 * Instead of matching strings, these tests load the real `public/sw.js` in a
 * harness with fake `self`, `caches` and `fetch`, dispatch events at it, and
 * assert what it actually caches and what it lets through untouched.
 */

type Listener = (event: FakeEvent) => void;

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
}

interface FakeEvent {
  request: FakeRequest;
  responded?: Promise<Response>;
  waited?: Promise<unknown>;
  respondWith?: (response: Promise<Response>) => void;
  waitUntil?: (promise: Promise<unknown>) => void;
}

interface Harness {
  dispatch: (type: string, target: FakeRequest) => FakeEvent;
  cachedUrls: () => string[];
  cacheNames: () => string[];
  seedCache: (name: string, url: string) => void;
  failing: (predicate: (url: string) => boolean) => void;
}

/** An event object with the two callbacks a service worker may call. */
function makeEvent(target: FakeRequest): FakeEvent {
  const event: FakeEvent = { request: target };
  event.respondWith = (response: Promise<Response>) => {
    event.responded = response;
  };
  event.waitUntil = (promise: Promise<unknown>) => {
    event.waited = promise;
  };
  return event;
}

function readPublicAsset(name: string): string {
  const candidates = [
    path.resolve(process.cwd(), 'public', name),
    path.resolve(process.cwd(), 'apps/web/public', name),
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (!file) throw new Error(`Could not locate public/${name}`);
  return readFileSync(file, 'utf8');
}

const source = readPublicAsset('sw.js');
const SW_ORIGIN = 'https://stackbase.example';
const OFFLINE_URL = `${SW_ORIGIN}/offline.html`;

/** The real Cache API resolves relative URLs against the worker's scope. */
function resolve(target: string | FakeRequest): string {
  const value = typeof target === 'string' ? target : target.url;
  return new URL(value, SW_ORIGIN).href;
}

function createHarness(): Harness {
  const listeners: Record<string, Listener[]> = {};
  const buckets = new Map<string, Map<string, Response>>();
  let failWhen: (url: string) => boolean = () => false;

  const bucketFor = (name: string): Map<string, Response> => {
    if (!buckets.has(name)) buckets.set(name, new Map());
    return buckets.get(name)!;
  };

  const urlOf = (target: string | FakeRequest): string => resolve(target);

  const cacheStorage = {
    async open(name: string) {
      const bucket = bucketFor(name);
      return {
        async match(target: string | FakeRequest) {
          return bucket.get(urlOf(target));
        },
        async put(target: string | FakeRequest, response: Response) {
          bucket.set(urlOf(target), response);
        },
      };
    },
    async keys() {
      return [...buckets.keys()];
    },
    async delete(name: string) {
      return buckets.delete(name);
    },
    async match(target: string | FakeRequest) {
      for (const bucket of buckets.values()) {
        const hit = bucket.get(urlOf(target));
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const fakeFetch = async (target: string | FakeRequest): Promise<Response> => {
    const url = urlOf(target);
    if (failWhen(url)) throw new TypeError('Failed to fetch');
    return new Response(`body:${url}`, { status: 200 });
  };

  const fakeSelf = {
    addEventListener(type: string, listener: Listener) {
      (listeners[type] ??= []).push(listener);
    },
    location: new URL('https://stackbase.example/'),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };

  // Same script the browser runs, evaluated against fakes.
  const factory = new Function('self', 'caches', 'fetch', source);
  factory(fakeSelf, cacheStorage, fakeFetch);

  const run = (type: string, target: FakeRequest): FakeEvent => {
    const event = makeEvent(target);
    for (const listener of listeners[type] ?? []) listener(event);
    return event;
  };

  return {
    dispatch: run,
    cachedUrls: () => [...buckets.values()].flatMap((bucket) => [...bucket.keys()]),
    cacheNames: () => [...buckets.keys()],
    seedCache: (name, url) => bucketFor(name).set(url, new Response('stale')),
    failing: (predicate) => {
      failWhen = predicate;
    },
  };
}

const request = (url: string, mode: string): FakeRequest => ({
  url,
  method: 'GET',
  mode,
});

describe('service worker cache policy (SRS C8)', () => {
  it('pre-caches the public shell on install', async () => {
    const harness = createHarness();
    const event = harness.dispatch('install', request(OFFLINE_URL, 'navigate'));
    await event.waited;

    const cached = harness.cachedUrls();
    expect(cached).toContain(OFFLINE_URL);
    expect(cached).toContain('https://stackbase.example/manifest.webmanifest');
    expect(cached).toContain('https://stackbase.example/icons/icon-512.png');
    expect(cached).not.toContain('https://stackbase.example/files');
  });

  it('lets API and cross-origin requests through without caching them', () => {
    const harness = createHarness();
    const privateUrls = [
      'https://stackbase.example/api/files/abc',
      'http://127.0.0.1:8787/api/v1/files',
      'http://127.0.0.1:8787/api/v1/me',
    ];

    for (const url of privateUrls) {
      const event = harness.dispatch('fetch', request(url, 'navigate'));
      expect(event.responded).toBeUndefined();
    }

    expect(harness.cachedUrls()).toEqual([]);
  });

  it('caches a public asset once and serves it afterwards', async () => {
    const harness = createHarness();
    const url = 'https://stackbase.example/icons/icon-192.png';

    const first = harness.dispatch('fetch', request(url, 'no-cors'));
    await first.responded;
    expect(harness.cachedUrls()).toContain(url);

    // Now break the network: the cached copy must still be served.
    harness.failing(() => true);
    const second = harness.dispatch('fetch', request(url, 'no-cors'));
    const response = await second.responded;
    expect(response).toBeDefined();
    expect(await response!.text()).toContain('icon-192.png');
  });

  it('falls back to the offline shell when a navigation fails', async () => {
    const harness = createHarness();
    const install = harness.dispatch('install', request(OFFLINE_URL, 'navigate'));
    await install.waited;

    harness.failing(() => true);
    const event = harness.dispatch('fetch', request('https://stackbase.example/files', 'navigate'));
    expect(event.responded).toBeDefined();
    const response = await event.responded;
    // The navigation resolved to the precached shell, not a network error.
    expect(response).toBeDefined();
    expect(await response!.text()).toContain('offline.html');
  });

  it('deletes caches left over from an older worker version', async () => {
    const harness = createHarness();
    const stale = 'stackbase-static-stackbase-v0-static';
    harness.seedCache(stale, OFFLINE_URL);
    harness.seedCache('unrelated-cache', 'https://example.com/other');

    const activation = harness.dispatch('activate', request(OFFLINE_URL, 'navigate'));
    await activation.waited;

    const names = harness.cacheNames();
    expect(names).not.toContain(stale);
    // Only this worker's own versioned caches are its to delete.
    expect(names).toContain('unrelated-cache');
  });
});