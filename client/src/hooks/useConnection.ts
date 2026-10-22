import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { apiFetch, getApiBaseUrl } from "../services/api";

export type ConnectionStatus = "checking" | "online" | "slow" | "offline";

/** A health check slower than this counts as a slow connection. */
const SLOW_MS = 2500;
/** Give up after this long and treat the connection as offline. */
const TIMEOUT_MS = 8000;
/** Re-check this often while online; more often while offline so recovery is noticed quickly. */
const POLL_ONLINE_MS = 30_000;
const POLL_OFFLINE_MS = 6_000;

type Snapshot = { status: ConnectionStatus; latencyMs: number | null; checkedAt: number };

let snapshot: Snapshot = { status: "checking", latencyMs: null, checkedAt: 0 };
const listeners = new Set<() => void>();
let inFlight: Promise<void> | null = null;

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/**
 * Times a request to the backend's /health route. This needs no native module, and it
 * answers the question that matters: can the app reach its server, and how fast.
 */
export function checkConnection(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await apiFetch(`${getApiBaseUrl()}/health`, { signal: controller.signal, cache: "no-store" });
      const latencyMs = Date.now() - started;
      publish({
        status: response.ok ? (latencyMs > SLOW_MS ? "slow" : "online") : "offline",
        latencyMs,
        checkedAt: Date.now(),
      });
    } catch {
      publish({ status: "offline", latencyMs: null, checkedAt: Date.now() });
    } finally {
      clearTimeout(timer);
      inFlight = null;
    }
  })();
  return inFlight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current connection status, shared by every component that uses it. */
export function useConnectionStatus() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
}

/**
 * Mount once (ConnectionBanner does): checks on start, on return to the foreground,
 * and on a timer that speeds up while offline.
 */
export function useConnectionMonitor() {
  const state = useConnectionStatus();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void checkConnection();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") void checkConnection();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const delay = state.status === "online" ? POLL_ONLINE_MS : POLL_OFFLINE_MS;
    timer.current = setTimeout(() => void checkConnection(), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state.status, state.checkedAt]);

  return state;
}

/** Retry helper with a "checking" flag for buttons. */
export function useRetryConnection() {
  const [retrying, setRetrying] = useState(false);
  const retry = useCallback(async () => {
    setRetrying(true);
    await checkConnection();
    setRetrying(false);
  }, []);
  return { retrying, retry };
}
