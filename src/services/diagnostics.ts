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
