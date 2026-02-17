import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

type TelemetryLevel = 'info' | 'warning' | 'error';

interface TelemetryMetadata {
  [key: string]: unknown;
}

export interface NonFatalLogOptions {
  scope: string;
  message?: string;
  level?: TelemetryLevel;
  metadata?: TelemetryMetadata;
}

export interface RuntimeIssueTelemetry {
  kind: string;
  message: string;
  timestamp: number;
  stack?: string;
}

const SENTRY_DSN = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? '').trim();

let hasTelemetryBeenInitialized = false;
let isTelemetryEnabled = false;

function hasContent(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getExpoVersion(): string {
  if (hasContent(Constants.expoConfig?.version)) {
    return Constants.expoConfig.version;
  }
  if (hasContent(Constants.nativeAppVersion)) {
    return Constants.nativeAppVersion;
  }
  return '0.0.0';
}

function getBuildNumber(): string {
  const expoConfig = Constants.expoConfig;
  if (Platform.OS === 'android') {
    const androidCode = expoConfig?.android?.versionCode;
    if (typeof androidCode === 'number') {
      return String(androidCode);
    }
  } else if (Platform.OS === 'ios') {
    if (hasContent(expoConfig?.ios?.buildNumber)) {
      return expoConfig.ios.buildNumber;
    }
  }

  if (hasContent(Constants.nativeBuildVersion)) {
    return Constants.nativeBuildVersion;
  }

  return '0';
}

function getReleaseTag(): string {
  const version = getExpoVersion();
  const build = getBuildNumber();
  return `coachgenie-${Platform.OS}@${version}+${build}`;
}

function applyMetadata(scope: Sentry.Scope, metadata: TelemetryMetadata | undefined): void {
  if (!metadata) return;

  for (const [key, value] of Object.entries(metadata)) {
    scope.setExtra(key, value);
  }
}

function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  const message =
    typeof error === 'string'
      ? error
      : (() => {
          try {
            return JSON.stringify(error);
          } catch {
            return String(error ?? 'Unknown error');
          }
        })();

  return new Error(message);
}

function toSentryLevel(level: TelemetryLevel): Sentry.SeverityLevel {
  if (level === 'info') return 'info';
  if (level === 'warning') return 'warning';
  return 'error';
}

export function initializeTelemetry(): void {
  if (hasTelemetryBeenInitialized) return;

  hasTelemetryBeenInitialized = true;

  if (!SENTRY_DSN) {
    isTelemetryEnabled = false;
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: true,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    release: getReleaseTag(),
    dist: getBuildNumber(),
    attachStacktrace: true,
    tracesSampleRate: __DEV__ ? 1 : 0.2,
  });

  isTelemetryEnabled = true;
}

export function setTelemetryUser(userId: string | null): void {
  if (!isTelemetryEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export function captureTelemetryMessage(
  message: string,
  level: TelemetryLevel = 'error',
  metadata?: TelemetryMetadata
): void {
  if (!isTelemetryEnabled) return;

  Sentry.withScope((scope) => {
    scope.setLevel(toSentryLevel(level));
    applyMetadata(scope, metadata);
    Sentry.captureMessage(message);
  });
}

export function captureTelemetryException(
  error: unknown,
  level: TelemetryLevel = 'error',
  metadata?: TelemetryMetadata
): void {
  if (!isTelemetryEnabled) return;

  const normalizedError = normalizeError(error);
  Sentry.withScope((scope) => {
    scope.setLevel(toSentryLevel(level));
    applyMetadata(scope, metadata);
    Sentry.captureException(normalizedError);
  });
}

export function reportRuntimeIssue(issue: RuntimeIssueTelemetry): void {
  const level: TelemetryLevel = issue.kind === 'console_warning' ? 'warning' : 'error';
  const title = `[RuntimeIssue] ${issue.kind}`;

  captureTelemetryMessage(title, level, {
    kind: issue.kind,
    message: issue.message,
    timestamp: issue.timestamp,
    stack: issue.stack,
  });
}

export function logNonFatal(error: unknown, options: NonFatalLogOptions): void {
  const {
    scope,
    message = 'Non-fatal operation failed',
    level = 'warning',
    metadata,
  } = options;

  if (__DEV__) {
    console.warn(`[${scope}] ${message}`, error);
  }

  captureTelemetryException(error, level, {
    scope,
    message,
    ...metadata,
  });
}
