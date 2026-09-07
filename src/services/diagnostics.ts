/**
 * Genre-crash in-app tracer (diagnostic only — discard after the investigation).
 *
 * Signals:
 *  - 500ms JS heartbeat → if the UI freezes but the heartbeat keeps advancing
 *    (visible in the banner's "JS alive Ns ago"), the stall is main-thread/Fabric,
 *    not the JS runtime. If the heartbeat dies at genre, the JS runtime itself died.
 *  - Event ring buffer (100) → last actions before the failure.
 *  - ErrorUtils global handler CHAINING → we capture/log/persist the fatal, then
 *    call the original handler with the SAME arguments. Normal fatal behavior is
 *    never swallowed or altered.
 *  - Dual-key AsyncStorage snapshots → diag_curr_session holds the running session;
 *    on startup the previous session's final snapshot is promoted to
 *    diag_prev_session BEFORE any new writes, so the last state before termination
 *    can never be destroyed by the next launch.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiagEvent {
  t: number;
  tag: string;
  detail?: string;
}

export interface DiagSnapshot {
  t: number;
  phase: string;
  heartbeat: number;
  events: string[];
}

export interface FatalInfo {
  message: string;
  stack?: string;
  isFatal?: boolean;
}

const CURR_KEY = 'diag_curr_session';
const PREV_KEY = 'diag_prev_session';
const MAX_EVENTS = 100;
const HEARTBEAT_MS = 500;
const SNAPSHOT_MS = 1500;
const SNAPSHOT_EVENTS = 10;

let events: DiagEvent[] = [];
let lastHeartbeat = 0;
let phase = 'loading';
let fatal: FatalInfo | null = null;
let lastSessionSnapshot: DiagSnapshot | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let snapshotTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

const now = () => Date.now();

// ── Passive XHR network-error interceptor (diagnostic-only, owner 09-07) ──
// Purpose: recover the native NSError signal before RN's fetch polyfill collapses
// it to a generic "TypeError: Network request failed".
//
// Native trace (RCTNetworking.mm:674-676): the only native error info bridged to
// JS is `error.localizedDescription` (string) plus a `kCFURLErrorTimedOut` bool.
// NSError.domain / NSError.code / userInfo (TLS, DNS, socket, cancellation) are
// DISCARDED there. RN's XMLHttpRequest.__didCompleteResponse then stores that
// string and forwards it to `XMLHttpRequest._interceptor.loadingFailed(id, error)`
// — the one JS hook that still sees it before whatwg-fetch's xhr.onerror throws
// it away (whatwg-fetch/dist/fetch.umd.js:567). We observe that hook passively.
interface XhrInterceptorHandle {
  requestSent(id: number, url: string, method: string, headers: object): void;
  responseReceived(id: number, url: string, status: number, headers: object): void;
  dataReceived(id: number, data: string): void;
  loadingFinished(id: number, encodedDataLength: number): void;
  loadingFailed(id: number, error: string): void;
}
const AUTH_URL_RE = /identitytoolkit|securetoken|firebaseapp|www\.googleapis\.com/;
const pendingXhr: Record<number, { url: string; responded: boolean }> = {};
let lastAuthNetworkFailure: AuthNetworkFailure | null = null;

export interface AuthNetworkFailure {
  url: string;
  responded: boolean;
  at: number;
}

/**
 * The most recent AUTH-domain network failure, with whether the native layer
 * received ANY HTTP response before the failure. `responded === false` means a
 * pure transport failure (DNS/TLS/timeout/connection-lost) — no HTTP response
 * ever arrived, so a magic-link oobCode was almost certainly NOT consumed and a
 * retry is safe. `responded === true` means a response came back, so the code
 * may be consumed and a blind retry would be wrong.
 */
export function getLastAuthNetworkFailure(): AuthNetworkFailure | null {
  return lastAuthNetworkFailure;
}

function installNetworkDiagnostic(): void {
  const g = globalThis as any;
  const XHR = g.XMLHttpRequest;
  if (!XHR || typeof XHR.__setInterceptor_DO_NOT_USE !== 'function') {
    logEvent('netDiag', 'unavailable (no XHR interceptor hook)');
    return;
  }
  const interceptor: XhrInterceptorHandle = {
    requestSent(id, url) {
      pendingXhr[id] = { url, responded: false };
      if (AUTH_URL_RE.test(url)) {
        logEvent('netReq', `${id} ${url.slice(0, 120)}`);
      }
    },
    responseReceived(id, url, status) {
      const entry = pendingXhr[id];
      if (entry) {
        entry.responded = true;
        logEvent('netResp', `${id} ${status} ${url.slice(0, 100)}`);
      }
    },
    dataReceived() {},
    loadingFinished(id) {
      delete pendingXhr[id];
    },
    loadingFailed(id, error) {
      const entry = pendingXhr[id];
      delete pendingXhr[id];
      const url = entry?.url || '';
      if (AUTH_URL_RE.test(url)) {
        lastAuthNetworkFailure = {
          url,
          responded: entry?.responded ?? false,
          at: Date.now(),
        };
      }
      // Capture the NATIVE error string + the failing URL. This is the signal
      // whatwg-fetch discards; it is the max that survives the native→JS bridge.
      logEvent('netFail', `${id} err="${error}" url=${url.slice(0, 120)}`);
      console.warn(`[netDiag] native request failed id=${id} url=${url}`, error);
    },
  };
  XHR.__setInterceptor_DO_NOT_USE(interceptor);
  logEvent('netDiag', 'installed');
}

function emit() {
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function logEvent(tag: string, detail?: string) {
  events.push({ t: now(), tag, detail });
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  emit();
}

export function setPhase(p: string) {
  phase = p;
  logEvent('phase', p);
}

export function getState() {
  return { events, lastHeartbeat, fatal, phase, lastSessionSnapshot };
}

function persistSnapshot() {
  const snap: DiagSnapshot = {
    t: now(),
    phase,
    heartbeat: lastHeartbeat,
    events: events.slice(-SNAPSHOT_EVENTS).map((e) => (e.detail ? `${e.tag}:${e.detail}` : e.tag)),
  };
  AsyncStorage.setItem(CURR_KEY, JSON.stringify(snap)).catch(() => {});
}

function safeStringify(value: unknown): string {
  try {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return `${value.name}: ${value.message}`;
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Install diagnostics. Safe to call once (guarded). Must be called at module scope
 * BEFORE the app renders so the fatal overlay + heartbeat cover the whole session.
 */
export async function installDiagnostics() {
  if (heartbeatTimer) {
    return;
  }
  // Install the XHR interceptor SYNCHRONOUSLY (before any async work below) so
  // the automatic anonymous sign-in / early requests can't slip past it.
  installNetworkDiagnostic();

  // 1) Promote the previous session's final snapshot BEFORE any new writes:
  //    whatever is in diag_curr_session right now is the last state before the
  //    previous termination. Copy it to diag_prev_session so it survives forever.
  try {
    const raw = await AsyncStorage.getItem(CURR_KEY);
    if (raw) {
      lastSessionSnapshot = JSON.parse(raw) as DiagSnapshot;
      await AsyncStorage.setItem(PREV_KEY, raw);
    }
  } catch {
    lastSessionSnapshot = null;
  }

  // 2) Heartbeat
  lastHeartbeat = now();
  heartbeatTimer = setInterval(() => {
    lastHeartbeat = now();
  }, HEARTBEAT_MS);

  // 3) Periodic tiny snapshot (1.5s — NOT every event)
  snapshotTimer = setInterval(persistSnapshot, SNAPSHOT_MS);

  // 4) ErrorUtils chaining — capture original, pass through unchanged
  const ErrorUtilsAny = (globalThis as any).ErrorUtils;
  if (ErrorUtilsAny && typeof ErrorUtilsAny.setGlobalHandler === 'function') {
    const originalHandler: unknown =
      typeof ErrorUtilsAny.getGlobalHandler === 'function'
        ? ErrorUtilsAny.getGlobalHandler()
        : ErrorUtilsAny.globalHandler;
    ErrorUtilsAny.setGlobalHandler((error: any, isFatal?: boolean) => {
      const message = error ? safeStringify(error.message ?? error) : String(error);
      const stack = error && error.stack ? String(error.stack) : undefined;
      fatal = { message, stack, isFatal };
      logEvent('jsFatal', message.slice(0, 120));
      persistSnapshot(); // persist the fatal immediately — it may be the last write
      if (typeof originalHandler === 'function') {
        originalHandler(error, isFatal); // same arguments, never swallowed
      }
    });
  }

  // 5) console capture — log, then pass through to the real console
  const origError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    logEvent('console.error', args.map(safeStringify).join(' ').slice(0, 160));
    origError(...args);
  };
  const origWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    logEvent('console.warn', args.map(safeStringify).join(' ').slice(0, 160));
    origWarn(...args);
  };

  logEvent('diagInstalled', `prev=${lastSessionSnapshot ? 'yes' : 'no'}`);
}
