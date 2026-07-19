"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowRight,
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  MonitorSmartphone,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ORDER_STATUS_LABEL,
  adminOrderStreamUrl,
  countAdminOrders,
  formatOrderClock,
  isAdminApiConfigured,
  isAdminApiReady,
  listAdminOrders,
  orderItemCount,
  parseOrderCreated,
  parseOrderStatusChanged,
  type OrderStatus,
} from "@/lib/admin-orders";
import { cn, formatPrice } from "@/lib/utils";

/* ========================================================================== */
/*  Tunables                                                                  */
/* ========================================================================== */

const SOUND_SRC = "/sounds/new-order.wav";

/** Consecutive SSE failures tolerated before we give up and poll instead. */
const MAX_SSE_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
/** Contract: the list endpoint is the documented polling fallback. */
const POLL_INTERVAL_MS = 30_000;
/** Once polling, periodically give SSE another chance — proxies recover. */
const SSE_RETRY_WHILE_POLLING_MS = 5 * 60_000;

const MAX_STORED_NOTIFICATIONS = 40;
const MAX_VISIBLE_TOASTS = 3;
const TOAST_DISMISS_MS = 12_000;

const STORAGE_MUTED = "tsk:admin-notifications-muted";
const STORAGE_DESKTOP = "tsk:admin-desktop-alerts";
const STORAGE_SEEN = "tsk:admin-seen-orders";
/** Cap on the persisted dedupe ledger — plenty for a day of service. */
const MAX_SEEN = 300;

/* ========================================================================== */
/*  Types                                                                     */
/* ========================================================================== */

export type ConnectionState =
  | "connecting"
  | "live"
  | "reconnecting"
  | "polling"
  | "offline";

export interface OrderNotification {
  /** Unique per notification — an order can appear twice with different kinds. */
  id: string;
  kind: "created" | "status";
  orderNumber: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  customerName?: string;
  total?: number;
  itemCount?: number;
}

export type DesktopAlertState = "unsupported" | "default" | "granted" | "denied";

interface OrderNotificationsValue {
  connection: ConnectionState;
  notifications: OrderNotification[];
  unreadCount: number;
  markAllRead: () => void;
  /** Bumped on every inbound event — screens watch it to refetch. */
  revision: number;
  /** Live count of `PENDING_CUSTOMER_CONFIRMATION`, or null when unknown. */
  awaitingCount: number | null;
  muted: boolean;
  toggleMuted: () => void;
  /** True once a `play()` was rejected by the autoplay policy. */
  soundBlocked: boolean;
  enableSound: () => void;
  desktopAlerts: DesktopAlertState;
  /** True while the "Enable desktop alerts" offer should be shown. */
  desktopAlertsOffered: boolean;
  requestDesktopAlerts: () => void;
  dismissDesktopAlerts: () => void;
  /** Order the operator asked to open from a notification, if any. */
  focusedOrderNumber: string | null;
  focusOrder: (orderNumber: string) => void;
  clearFocusedOrder: () => void;
}

const OrderNotificationsContext = React.createContext<OrderNotificationsValue | null>(null);

export function useOrderNotifications(): OrderNotificationsValue {
  const value = React.useContext(OrderNotificationsContext);
  if (!value) {
    throw new Error("useOrderNotifications must be used inside <OrderNotificationsProvider>");
  }
  return value;
}

/* ========================================================================== */
/*  Storage helpers — every one of these is allowed to fail silently.         */
/* ========================================================================== */

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Private mode / quota — the preference just does not persist. */
  }
}

function readSeen(): string[] {
  const raw = readStorage(STORAGE_SEEN);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/* ========================================================================== */
/*  Provider                                                                  */
/* ========================================================================== */

export function OrderNotificationsProvider({ children }: { children: React.ReactNode }) {
  const [connection, setConnection] = React.useState<ConnectionState>("connecting");
  const [notifications, setNotifications] = React.useState<OrderNotification[]>([]);
  const [toasts, setToasts] = React.useState<OrderNotification[]>([]);
  const [revision, setRevision] = React.useState(0);
  const [awaitingCount, setAwaitingCount] = React.useState<number | null>(null);
  const [muted, setMuted] = React.useState(false);
  const [soundBlocked, setSoundBlocked] = React.useState(false);
  const [desktopAlerts, setDesktopAlerts] = React.useState<DesktopAlertState>("unsupported");
  const [desktopDismissed, setDesktopDismissed] = React.useState(true);
  const [focusedOrderNumber, setFocusedOrderNumber] = React.useState<string | null>(null);

  /**
   * Dedupe ledger, keyed by order number.
   *
   * An SSE reconnect can replay recent events and the polling fallback re-reads
   * the same list every 30s, so "have I already announced this order?" has to be
   * answered from durable state rather than from what happens to be on screen.
   * It is a ref because the connection loop reads it synchronously and must not
   * re-subscribe when it changes.
   */
  const seenRef = React.useRef<Set<string>>(new Set());
  const mutedRef = React.useRef(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = React.useRef(false);

  /* ---- Hydrate persisted preferences (client only) ---------------------- */

  React.useEffect(() => {
    seenRef.current = new Set(readSeen());

    const storedMute = readStorage(STORAGE_MUTED) === "1";
    setMuted(storedMute);
    mutedRef.current = storedMute;

    if (typeof Notification === "undefined") {
      setDesktopAlerts("unsupported");
    } else {
      setDesktopAlerts(Notification.permission as DesktopAlertState);
      // Only offer the prompt when the browser has not decided yet AND the
      // operator has not previously waved it away. Re-asking every session is
      // exactly the nagging this control is meant to avoid.
      setDesktopDismissed(
        Notification.permission !== "default" || readStorage(STORAGE_DESKTOP) === "off",
      );
    }
  }, []);

  const persistSeen = React.useCallback(() => {
    const recent = Array.from(seenRef.current).slice(-MAX_SEEN);
    seenRef.current = new Set(recent);
    writeStorage(STORAGE_SEEN, JSON.stringify(recent));
  }, []);

  /* ---- Audio ------------------------------------------------------------ */

  const getAudio = React.useCallback((): HTMLAudioElement | null => {
    if (typeof Audio === "undefined") return null;
    if (!audioRef.current) {
      const element = new Audio(SOUND_SRC);
      element.preload = "auto";
      audioRef.current = element;
    }
    return audioRef.current;
  }, []);

  /**
   * Autoplay-policy workaround.
   *
   * Browsers reject `play()` until the document has been interacted with, and
   * the rejection is an *unhandled promise rejection* if you ignore it. So:
   * always catch, and on the first real user gesture play the clip silently to
   * "unlock" the element — after that the element is blessed for the rest of
   * the page's life and a later notification can play instantly.
   */
  const unlockAudio = React.useCallback(() => {
    if (audioUnlockedRef.current) return;
    const audio = getAudio();
    if (!audio) return;

    const restoreVolume = audio.volume;
    audio.volume = 0;
    const attempt = audio.play();
    if (attempt && typeof attempt.then === "function") {
      attempt
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = restoreVolume;
          audioUnlockedRef.current = true;
          setSoundBlocked(false);
        })
        .catch(() => {
          audio.volume = restoreVolume;
        });
    } else {
      // Legacy browsers return undefined — assume it worked.
      audio.pause();
      audio.currentTime = 0;
      audio.volume = restoreVolume;
      audioUnlockedRef.current = true;
    }
  }, [getAudio]);

  React.useEffect(() => {
    const handler = () => unlockAudio();
    // `once` on each: the first gesture of any kind is enough.
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [unlockAudio]);

  const playChime = React.useCallback(() => {
    if (mutedRef.current) return;
    const audio = getAudio();
    if (!audio) return;
    try {
      audio.currentTime = 0;
    } catch {
      /* Not seekable yet — playing from wherever it is is fine. */
    }
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === "function") {
      // Never let a rejected play() escape: it is expected before first input.
      attempt.catch(() => setSoundBlocked(true));
    }
  }, [getAudio]);

  const enableSound = React.useCallback(() => {
    // Called from a click, so this counts as the unlocking gesture. Play the
    // chime for real as confirmation that sound now works.
    audioUnlockedRef.current = false;
    unlockAudio();
    setSoundBlocked(false);
    if (mutedRef.current) {
      mutedRef.current = false;
      setMuted(false);
      writeStorage(STORAGE_MUTED, "0");
    }
    window.setTimeout(() => playChime(), 60);
  }, [playChime, unlockAudio]);

  const toggleMuted = React.useCallback(() => {
    setMuted((current) => {
      const next = !current;
      mutedRef.current = next;
      writeStorage(STORAGE_MUTED, next ? "1" : "0");
      if (!next) unlockAudio();
      return next;
    });
  }, [unlockAudio]);

  /* ---- Desktop notifications -------------------------------------------- */

  const requestDesktopAlerts = React.useCallback(() => {
    if (typeof Notification === "undefined") return;
    // MUST originate from a user gesture: browsers reject (and some
    // permanently deny) permission requests made without one.
    void Notification.requestPermission()
      .then((permission) => {
        setDesktopAlerts(permission as DesktopAlertState);
        setDesktopDismissed(true);
        writeStorage(STORAGE_DESKTOP, permission === "granted" ? "on" : "off");
      })
      .catch(() => setDesktopDismissed(true));
  }, []);

  const dismissDesktopAlerts = React.useCallback(() => {
    setDesktopDismissed(true);
    writeStorage(STORAGE_DESKTOP, "off");
  }, []);

  const fireDesktopNotification = React.useCallback((notification: OrderNotification) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      // `tag` gives the OS its own dedupe: a replayed event replaces the
      // existing toast instead of stacking a second one.
      const native = new Notification(notification.title, {
        body: notification.body,
        tag: notification.orderNumber,
      });
      native.onclick = () => {
        window.focus();
        native.close();
      };
    } catch {
      /* Some browsers throw for constructor-based notifications; ignore. */
    }
  }, []);

  /* ---- Notification intake ---------------------------------------------- */

  const pushNotification = React.useCallback(
    (notification: OrderNotification, options: { toast: boolean; sound: boolean }) => {
      setNotifications((current) =>
        [notification, ...current].slice(0, MAX_STORED_NOTIFICATIONS),
      );
      if (options.toast) {
        setToasts((current) => [notification, ...current].slice(0, MAX_VISIBLE_TOASTS));
      }
      if (options.sound) {
        playChime();
        fireDesktopNotification(notification);
      }
      setRevision((value) => value + 1);
    },
    [fireDesktopNotification, playChime],
  );

  const handleCreated = React.useCallback(
    (event: {
      orderNumber: string;
      customerName: string;
      total: number;
      itemCount: number;
      placedAt: string;
    }) => {
      if (seenRef.current.has(event.orderNumber)) return;
      seenRef.current.add(event.orderNumber);
      persistSeen();

      pushNotification(
        {
          id: `created:${event.orderNumber}`,
          kind: "created",
          orderNumber: event.orderNumber,
          title: "New Order Received",
          body: `${event.customerName} · ${event.itemCount} item${
            event.itemCount === 1 ? "" : "s"
          } · ${formatPrice(event.total)}`,
          at: event.placedAt,
          read: false,
          customerName: event.customerName,
          total: event.total,
          itemCount: event.itemCount,
        },
        { toast: true, sound: true },
      );
      // A brand-new order lands in PENDING_CUSTOMER_CONFIRMATION.
      setAwaitingCount((current) => (current === null ? current : current + 1));
    },
    [persistSeen, pushNotification],
  );

  const handleStatusChanged = React.useCallback(
    (event: { orderNumber: string; from: OrderStatus | null; to: OrderStatus }) => {
      pushNotification(
        {
          id: `status:${event.orderNumber}:${event.to}:${Date.now()}`,
          kind: "status",
          orderNumber: event.orderNumber,
          title: `${event.orderNumber} → ${ORDER_STATUS_LABEL[event.to]}`,
          body: event.from
            ? `Moved from ${ORDER_STATUS_LABEL[event.from]}.`
            : `Status set to ${ORDER_STATUS_LABEL[event.to]}.`,
          at: new Date().toISOString(),
          read: false,
        },
        // Status changes are usually caused by this operator; they belong in the
        // bell list but must not shout.
        { toast: false, sound: false },
      );
      if (event.from === "PENDING_CUSTOMER_CONFIRMATION") {
        setAwaitingCount((current) => (current === null ? current : Math.max(0, current - 1)));
      }
    },
    [pushNotification],
  );

  /* ---- Awaiting-confirmation count -------------------------------------- */

  const refreshAwaiting = React.useCallback(async () => {
    if (!isAdminApiReady()) {
      setAwaitingCount(null);
      return;
    }
    const result = await countAdminOrders("PENDING_CUSTOMER_CONFIRMATION");
    setAwaitingCount(result.ok ? result.count : null);
  }, []);

  React.useEffect(() => {
    void refreshAwaiting();
  }, [refreshAwaiting]);

  /* ---- Connection: SSE with backoff, falling back to polling ------------- */

  // Latest handlers, read by the long-lived connection effect without making it
  // tear down and re-subscribe every render.
  const handlersRef = React.useRef({ handleCreated, handleStatusChanged, refreshAwaiting });
  React.useEffect(() => {
    handlersRef.current = { handleCreated, handleStatusChanged, refreshAwaiting };
  }, [handleCreated, handleStatusChanged, refreshAwaiting]);

  React.useEffect(() => {
    let disposed = false;
    let source: EventSource | null = null;
    let reconnectTimer: number | undefined;
    let pollTimer: number | undefined;
    let sseRetryTimer: number | undefined;
    let attempts = 0;
    /**
     * Polling reads the whole recent window every 30s, so "new" has to mean
     * "placed after this panel opened" as well as "not already announced".
     * Without the time gate, opening the panel mid-service would announce every
     * ticket already on the board as if it had just arrived.
     */
    const sessionStart = Date.now();

    function clearTimers() {
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (pollTimer) window.clearInterval(pollTimer);
      if (sseRetryTimer) window.clearTimeout(sseRetryTimer);
      reconnectTimer = undefined;
      pollTimer = undefined;
      sseRetryTimer = undefined;
    }

    async function poll() {
      const result = await listAdminOrders({ limit: 25, page: 1 });
      if (disposed) return;

      if (!result.ok) {
        setConnection("offline");
        return;
      }
      setConnection("polling");

      // Oldest first so a burst of orders is announced in the order it happened.
      let seeded = false;
      for (const order of [...result.orders].reverse()) {
        if (seenRef.current.has(order.orderNumber)) continue;

        if (new Date(order.placedAt).getTime() < sessionStart) {
          // Pre-existing ticket: remember it so it can never announce later,
          // but do not shout about it now.
          seenRef.current.add(order.orderNumber);
          seeded = true;
          continue;
        }

        handlersRef.current.handleCreated({
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.bill.total,
          itemCount: orderItemCount(order),
          placedAt: order.placedAt,
        });
      }
      if (seeded) persistSeen();
      void handlersRef.current.refreshAwaiting();
    }

    function startPolling() {
      clearTimers();
      if (disposed) return;
      setConnection((current) => (current === "offline" ? current : "polling"));
      void poll();
      pollTimer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
      // Proxies and laptops-waking-from-sleep recover; give SSE another go
      // rather than polling forever.
      sseRetryTimer = window.setTimeout(() => {
        attempts = 0;
        connect();
      }, SSE_RETRY_WHILE_POLLING_MS);
    }

    function scheduleReconnect() {
      attempts += 1;
      if (attempts > MAX_SSE_ATTEMPTS) {
        startPolling();
        return;
      }
      setConnection("reconnecting");
      // Exponential backoff, capped, with ±25% jitter so a kitchen running the
      // panel on three tablets does not reconnect in lockstep and stampede the
      // server the moment it comes back up.
      const capped = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (attempts - 1));
      const delay = Math.round(capped * (0.75 + Math.random() * 0.5));
      reconnectTimer = window.setTimeout(connect, delay);
    }

    function connect() {
      clearTimers();
      if (disposed) return;

      const url = adminOrderStreamUrl();
      if (!url || typeof EventSource === "undefined") {
        // Nothing to stream from (no API, no token) or no SSE support at all —
        // go straight to the documented fallback.
        if (!isAdminApiReady()) {
          setConnection("offline");
          // A token can be written after mount (sign-in in another tab), so
          // keep checking — but only when there is a backend to check against.
          if (isAdminApiConfigured) {
            sseRetryTimer = window.setTimeout(connect, 60_000);
          }
          return;
        }
        startPolling();
        return;
      }

      setConnection((current) => (current === "live" ? current : "connecting"));
      const es = new EventSource(url);
      source = es;

      es.onopen = () => {
        attempts = 0;
        setConnection("live");
      };

      es.addEventListener("order.created", (event) => {
        const parsed = parseOrderCreated((event as MessageEvent<string>).data);
        if (parsed) handlersRef.current.handleCreated(parsed);
      });

      es.addEventListener("order.status_changed", (event) => {
        const parsed = parseOrderStatusChanged((event as MessageEvent<string>).data);
        if (parsed) handlersRef.current.handleStatusChanged(parsed);
      });

      // A ping every 25s keeps proxies from closing the connection. Receiving
      // one is also the only positive proof the pipe is still alive.
      es.addEventListener("ping", () => setConnection("live"));

      es.onerror = () => {
        // EventSource retries on its own, but with no cap and no jitter — we
        // want control of the schedule, so close and reconnect ourselves.
        es.close();
        if (source === es) source = null;
        if (!disposed) scheduleReconnect();
      };
    }

    connect();

    // Coming back online or refocusing the tab after sleep should retry now
    // rather than waiting out a 30s backoff.
    const onOnline = () => {
      attempts = 0;
      connect();
    };
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      clearTimers();
      window.removeEventListener("online", onOnline);
      source?.close();
    };
  }, [persistSeen]);

  /* ---- Toast lifetimes --------------------------------------------------- */

  React.useEffect(() => {
    if (toasts.length === 0) return;
    const timer = window.setTimeout(() => {
      setToasts((current) => current.slice(0, -1));
    }, TOAST_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const markAllRead = React.useCallback(() => {
    setNotifications((current) => current.map((entry) => ({ ...entry, read: true })));
  }, []);

  const focusOrder = React.useCallback((orderNumber: string) => {
    setFocusedOrderNumber(orderNumber);
  }, []);

  const clearFocusedOrder = React.useCallback(() => setFocusedOrderNumber(null), []);

  const unreadCount = notifications.reduce((sum, entry) => sum + (entry.read ? 0 : 1), 0);

  const value = React.useMemo<OrderNotificationsValue>(
    () => ({
      connection,
      notifications,
      unreadCount,
      markAllRead,
      revision,
      awaitingCount,
      muted,
      toggleMuted,
      soundBlocked,
      enableSound,
      desktopAlerts,
      desktopAlertsOffered: desktopAlerts === "default" && !desktopDismissed,
      requestDesktopAlerts,
      dismissDesktopAlerts,
      focusedOrderNumber,
      focusOrder,
      clearFocusedOrder,
    }),
    [
      awaitingCount,
      clearFocusedOrder,
      connection,
      desktopAlerts,
      desktopDismissed,
      dismissDesktopAlerts,
      enableSound,
      focusOrder,
      focusedOrderNumber,
      markAllRead,
      muted,
      notifications,
      requestDesktopAlerts,
      revision,
      soundBlocked,
      toggleMuted,
      unreadCount,
    ],
  );

  return (
    <OrderNotificationsContext.Provider value={value}>
      {children}
      <OrderToastStack toasts={toasts} onDismiss={dismissToast} />
    </OrderNotificationsContext.Provider>
  );
}

/* ========================================================================== */
/*  Toast popup                                                               */
/* ========================================================================== */

function OrderToastStack({
  toasts,
  onDismiss,
}: {
  toasts: OrderNotification[];
  onDismiss: (id: string) => void;
}) {
  const router = useRouter();
  const { focusOrder } = useOrderNotifications();

  return (
    // The region is always mounted so assistive tech is already observing it
    // when the first order lands. `polite` because an order is important but
    // must not interrupt whatever the operator is currently reading.
    <div
      role="status"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="New order alerts"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end sm:p-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-float duration-300 animate-in fade-in-0 slide-in-from-bottom-4"
        >
          <div className="flex items-start gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <BellRing className="size-5" aria-hidden />
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-display text-base leading-tight text-ink-900">{toast.title}</p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-400">{toast.orderNumber}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{toast.body}</p>

              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  focusOrder(toast.orderNumber);
                  onDismiss(toast.id);
                  router.push("/admin/orders");
                }}
              >
                View order
                <ArrowRight />
              </Button>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label={`Dismiss alert for order ${toast.orderNumber}`}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ========================================================================== */
/*  Connection indicator                                                      */
/* ========================================================================== */

const CONNECTION_COPY: Record<ConnectionState, { label: string; hint: string; dot: string }> = {
  connecting: { label: "Connecting", hint: "Opening the live order feed…", dot: "bg-amber-500" },
  live: { label: "Live", hint: "Receiving orders in real time.", dot: "bg-fresh-500" },
  reconnecting: {
    label: "Reconnecting",
    hint: "The live feed dropped — retrying with backoff.",
    dot: "bg-amber-500",
  },
  polling: {
    label: "Polling",
    hint: "Live feed unavailable — checking for new orders every 30 seconds.",
    dot: "bg-sky-500",
  },
  offline: {
    label: "Offline",
    hint: "Not connected to the orders API. Nothing here is live.",
    dot: "bg-ink-400",
  },
};

export function ConnectionIndicator({ className }: { className?: string }) {
  const { connection } = useOrderNotifications();
  const copy = CONNECTION_COPY[connection];

  return (
    <span
      title={copy.hint}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ink-600",
        className,
      )}
    >
      <span className="relative flex size-1.5 shrink-0" aria-hidden>
        {connection === "live" && (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-70", copy.dot)} />
        )}
        <span className={cn("relative inline-flex size-1.5 rounded-full", copy.dot)} />
      </span>
      <span className="hidden sm:inline">{copy.label}</span>
      <span className="sr-only">Live order feed status: {copy.label}. {copy.hint}</span>
    </span>
  );
}

/* ========================================================================== */
/*  Sidebar unread badge                                                      */
/* ========================================================================== */

export function OrdersUnreadBadge({ className }: { className?: string }) {
  const { unreadCount } = useOrderNotifications();
  if (unreadCount === 0) return null;

  return (
    <span
      className={cn(
        "ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white",
        className,
      )}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
      <span className="sr-only">
        {" "}
        {unreadCount} unread order {unreadCount === 1 ? "notification" : "notifications"}
      </span>
    </span>
  );
}

/* ========================================================================== */
/*  Top-bar bell                                                              */
/* ========================================================================== */

export function NotificationsBell() {
  const {
    notifications,
    unreadCount,
    markAllRead,
    muted,
    toggleMuted,
    soundBlocked,
    enableSound,
    desktopAlerts,
    desktopAlertsOffered,
    requestDesktopAlerts,
    dismissDesktopAlerts,
    connection,
    focusOrder,
  } = useOrderNotifications();
  const router = useRouter();

  return (
    <DropdownMenu.Root onOpenChange={(open) => open && markAllRead()}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread ${unreadCount === 1 ? "order" : "orders"}`
              : "Notifications, none unread"
          }
          className="relative flex size-10 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 data-[state=open]:bg-ink-100"
        >
          {unreadCount > 0 ? <BellRing className="size-[18px]" /> : <Bell className="size-[18px]" />}
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-float data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-5 py-4">
            <p className="font-display text-base text-ink-900">Order alerts</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMuted}
                aria-label={muted ? "Unmute notification sound" : "Mute notification sound"}
                aria-pressed={muted}
                className="flex size-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <ConnectionIndicator />
            </div>
          </div>

          {/* Sound is never the only signal — but when it has been blocked by
              the autoplay policy, offer a one-click way to turn it back on. */}
          {soundBlocked && !muted && (
            <button
              type="button"
              onClick={enableSound}
              className="flex w-full items-center gap-2.5 border-b border-ink-100 bg-amber-50/70 px-5 py-3 text-left text-xs text-amber-800 transition-colors hover:bg-amber-100/70"
            >
              <BellOff className="size-4 shrink-0" aria-hidden />
              <span>
                <span className="block font-semibold">Sound is blocked</span>
                Your browser muted autoplay until you interact with the page. Click to enable the
                chime.
              </span>
            </button>
          )}

          {desktopAlertsOffered && (
            <div className="flex items-start gap-2.5 border-b border-ink-100 bg-brand-50/60 px-5 py-3">
              <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-800">Enable desktop alerts</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">
                  Get a system notification even when this tab is in the background.
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" onClick={requestDesktopAlerts}>
                    Enable
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissDesktopAlerts}>
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          )}

          {connection === "offline" && (
            <p className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-5 py-3 text-[11px] text-ink-500">
              <WifiOff className="size-3.5 shrink-0" aria-hidden />
              Not connected to the orders API — new orders will not appear here.
            </p>
          )}

          {notifications.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-500">
              No order alerts yet. New orders appear here the moment they are saved.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1.5">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <DropdownMenu.Item
                    onSelect={() => {
                      focusOrder(notification.orderNumber);
                      router.push("/admin/orders");
                    }}
                    className="flex cursor-pointer gap-3 px-5 py-3 outline-none transition-colors data-[highlighted]:bg-ink-50"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        notification.read ? "bg-ink-200" : "bg-brand-500",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink-900">
                          {notification.title}
                        </span>
                        <span className="shrink-0 text-[11px] tabular-nums text-ink-400">
                          {formatOrderClock(notification.at)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                        {notification.body}
                      </span>
                    </span>
                  </DropdownMenu.Item>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-ink-100 px-5 py-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-400">
              <CheckCheck className="size-3.5" aria-hidden />
              {desktopAlerts === "granted" ? "Desktop alerts on" : "Desktop alerts off"}
            </span>
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              Open orders
            </Link>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
