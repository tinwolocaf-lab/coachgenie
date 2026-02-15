type IssueKind =
  | 'fatal_exception'
  | 'unhandled_rejection'
  | 'navigation_action_warning'
  | 'console_error'
  | 'console_warning';

export interface AppIssue {
  kind: IssueKind;
  message: string;
  timestamp: number;
  stack?: string;
}

interface ErrorUtilsLike {
  getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
}

interface RejectionEventLike {
  reason?: unknown;
}

type IssueListener = (issue: AppIssue) => void;

const listeners = new Set<IssueListener>();
const recentlyEmitted = new Map<string, number>();

let initialized = false;
let teardownFns: (() => void)[] = [];

function normalizeMessage(input: unknown): string {
  if (typeof input === 'string') return input;
  if (input instanceof Error) return input.message || 'Unknown error';
  if (input && typeof input === 'object') {
    try {
      return JSON.stringify(input);
    } catch {
      return 'Unknown error object';
    }
  }
  return String(input ?? 'Unknown error');
}

function dedupeKey(kind: IssueKind, message: string): string {
  return `${kind}:${message}`;
}

function emitIssue(issue: AppIssue) {
  const key = dedupeKey(issue.kind, issue.message);
  const now = Date.now();
  const last = recentlyEmitted.get(key) ?? 0;

  // Avoid flooding UI with duplicate issues.
  if (now - last < 1500) return;

  recentlyEmitted.set(key, now);

  // Keep the dedupe cache bounded.
  if (recentlyEmitted.size > 300) {
    for (const [cacheKey, timestamp] of recentlyEmitted) {
      if (now - timestamp > 60_000) {
        recentlyEmitted.delete(cacheKey);
      }
    }
  }

  listeners.forEach((listener) => listener(issue));
}

function detectConsoleIssueKind(level: 'error' | 'warn', message: string): IssueKind {
  if (
    message.includes("The action '") &&
    message.includes('was not handled by any navigator')
  ) {
    return 'navigation_action_warning';
  }
  return level === 'error' ? 'console_error' : 'console_warning';
}

function shouldCaptureConsoleIssue(level: 'error' | 'warn', message: string): boolean {
  // Avoid re-reporting internal boundary logging.
  if (message.includes('[GlobalErrorBoundary] Render error:')) {
    return false;
  }

  const lowerMessage = message.toLowerCase();

  // RevenueCat emits transient billing/update diagnostics (for example when
  // users back out of Play purchase flow). These are non-fatal and should not
  // surface as crash-style runtime banners in production.
  if (
    !__DEV__ &&
    lowerMessage.includes('[revenuecat]') &&
    (
      lowerMessage.includes('billingwrapper purchases failed to update') ||
      lowerMessage.includes('purchases failed to update') ||
      lowerMessage.includes('debugmessage')
    )
  ) {
    return false;
  }

  // RevenueCat purchase cancellation is an expected user action and should not
  // surface as a runtime error banner.
  if (
    lowerMessage.includes('purchasecancellederror') ||
    lowerMessage.includes('purchase_cancelled_error') ||
    lowerMessage.includes('purchase cancelled')
  ) {
    return false;
  }

  // These are expected environment/service-availability states that should not
  // trigger crash-style global issue overlays.
  if (
    lowerMessage.includes('"code":"not_found"') ||
    lowerMessage.includes('requested function was not found') ||
    lowerMessage.includes('"code":"pgrst205"') ||
    lowerMessage.includes('could not find the table')
  ) {
    return false;
  }

  if (level === 'warn') {
    return (
      message.includes('Possible Unhandled Promise Rejection') ||
      message.includes('was not handled by any navigator')
    );
  }

  return true;
}

function getErrorUtils(): ErrorUtilsLike | null {
  const maybe = globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsLike };
  return maybe.ErrorUtils ?? null;
}

function installGlobalExceptionHandler() {
  const errorUtils = getErrorUtils();
  const getGlobalHandler = errorUtils?.getGlobalHandler;
  const setGlobalHandler = errorUtils?.setGlobalHandler;
  if (!getGlobalHandler || !setGlobalHandler) return;

  const previous = getGlobalHandler();
  const nextHandler = (error: Error, isFatal?: boolean) => {
    emitIssue({
      kind: 'fatal_exception',
      message: error.message || 'Unhandled exception',
      timestamp: Date.now(),
      stack: error.stack,
    });

    previous?.(error, isFatal);
  };

  setGlobalHandler(nextHandler);
  teardownFns.push(() => {
    if (previous) {
      setGlobalHandler(previous);
    }
  });
}

function installUnhandledRejectionHandler() {
  const root = globalThis as typeof globalThis & {
    onunhandledrejection?: ((event: RejectionEventLike) => void) | null;
  };

  const previous = root.onunhandledrejection ?? null;
  root.onunhandledrejection = (event: RejectionEventLike) => {
    const reason = event?.reason;
    const message = normalizeMessage(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;

    emitIssue({
      kind: 'unhandled_rejection',
      message,
      timestamp: Date.now(),
      stack,
    });

    previous?.(event);
  };

  teardownFns.push(() => {
    root.onunhandledrejection = previous;
  });
}

function installConsoleIssueCapture() {
  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    const message = args.map(normalizeMessage).join(' ');
    if (shouldCaptureConsoleIssue('error', message)) {
      emitIssue({
        kind: detectConsoleIssueKind('error', message),
        message,
        timestamp: Date.now(),
      });
    }
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args.map(normalizeMessage).join(' ');
    if (shouldCaptureConsoleIssue('warn', message)) {
      emitIssue({
        kind: detectConsoleIssueKind('warn', message),
        message,
        timestamp: Date.now(),
      });
    }
    originalWarn(...args);
  };

  teardownFns.push(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });
}

export function initializeGlobalErrorHandling() {
  if (initialized) {
    return () => undefined;
  }

  initialized = true;
  teardownFns = [];

  installGlobalExceptionHandler();
  installUnhandledRejectionHandler();
  installConsoleIssueCapture();

  return () => {
    teardownFns.forEach((fn) => fn());
    teardownFns = [];
    initialized = false;
  };
}

export function subscribeToAppIssues(listener: IssueListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
