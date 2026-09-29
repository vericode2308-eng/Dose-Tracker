import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { ErrorEvent } from '@sentry/react-native';
import appConfig from '../../../app.json';

const CONSENT_KEY = '@dosetracker/diagnostics-consent/v1';
const DSN = 'https://4260ebfe901b6d04bda9c7356b2e29e2@o4512147247071232.ingest.de.sentry.io/4512156478537808';
let consent = false;
let revision = 0;
let sdk: typeof import('@sentry/react-native') | undefined;
let initialized = false;
let pending = Promise.resolve();
const requests = new Set<AbortController>();

// Construct a fresh allowlisted event: error messages, local variables, breadcrumbs,
// URLs, user/device identifiers, health records and arbitrary context never pass through.
export function sanitizeDiagnosticEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: /^[a-f0-9]{32}$/i.test(event.event_id || '') ? event.event_id : undefined,
    timestamp: typeof event.timestamp === 'number' ? event.timestamp : undefined,
    platform: 'javascript',
    release: `dosetracker@${appConfig.expo.version}`,
    environment: 'production',
    level: 'error',
    message: 'DoseTracker application error',
    tags: { runtime: Platform.OS },
    exception: event.exception ? { values: event.exception.values?.slice(0, 1).map(value => ({
      type: 'Error', value: 'Error details removed for privacy',
      stacktrace: { frames: value.stacktrace?.frames?.slice(-30).map(frame => ({
        filename: 'app:///index.bundle',
        lineno: Number.isSafeInteger(frame.lineno) ? frame.lineno : undefined,
        colno: Number.isSafeInteger(frame.colno) ? frame.colno : undefined,
      })) },
    })) } : undefined,
  };
}

function serialize(task: () => Promise<void>) {
  const result = pending.then(task);
  pending = result.catch(() => undefined);
  return result;
}

async function start() {
  if (!consent) return;
  const expectedRevision = revision;
  sdk ??= await import('@sentry/react-native');
  if (!consent || expectedRevision !== revision) return;
  if (initialized) return;
  sdk.init({
    dsn: DSN,
    release: `dosetracker@${appConfig.expo.version}`,
    sendDefaultPii: false,
    // Native crash dumps and disk caching cannot be scrubbed by our JS allowlist.
    enableNative: false,
    enableNativeCrashHandling: false,
    autoInitializeNativeSdk: false,
    enableAutoSessionTracking: false,
    enableAutoPerformanceTracing: false,
    enableLogs: false,
    sendClientReports: false,
    tracesSampleRate: 0,
    tracePropagationTargets: [],
    attachScreenshot: false,
    attachViewHierarchy: false,
    defaultIntegrations: false,
    integrations: [sdk.reactNativeErrorHandlersIntegration()],
    beforeBreadcrumb: () => null,
    beforeSend: event => consent ? sanitizeDiagnosticEvent(event) : null,
    // Send only sanitized error envelopes over HTTPS, with no durable offline queue.
    transport: options => ({
      send: async envelope => {
        if (!consent) return {};
        const items = envelope[1].filter(item => item[0].type === 'event');
        if (!items.length) return {};
        const controller = new AbortController();
        requests.add(controller);
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const body = [JSON.stringify({}), ...items.flatMap(item => [
            JSON.stringify({ type: 'event' }),
            JSON.stringify(sanitizeDiagnosticEvent(item[1] as ErrorEvent)),
          ])].join('\n');
          const result = await fetch(options.url, { method: 'POST', body,
            headers: { 'Content-Type': 'application/x-sentry-envelope' }, signal: controller.signal });
          return { statusCode: result.status };
        } catch { return {}; }
        finally { clearTimeout(timeout); requests.delete(controller); }
      },
      flush: async () => requests.size === 0,
    }),
  });
  initialized = true;
}

export async function readDiagnosticsConsent(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(CONSENT_KEY)) === 'enabled'; }
  catch { return false; }
}

export function initializeDiagnostics() {
  const expectedRevision = revision;
  return serialize(async () => {
    const saved = await readDiagnosticsConsent();
    if (expectedRevision !== revision) return;
    consent = saved;
    if (consent) {
      try { await start(); }
      catch { consent = false; }
    }
  });
}

export function setDiagnosticsConsent(enabled: boolean) {
  const expectedRevision = ++revision;
  // Stop collection immediately, even if saving the withdrawn choice fails.
  if (!enabled) {
    consent = false;
    for (const request of requests) request.abort();
  }
  return serialize(async () => {
    if (expectedRevision !== revision) return;
    if (!enabled) {
      consent = false;
      for (const request of requests) request.abort();
      await AsyncStorage.removeItem(CONSENT_KEY);
      return;
    }
    await AsyncStorage.setItem(CONSENT_KEY, 'enabled');
    consent = true;
    try { await start(); }
    catch {
      consent = false;
      await AsyncStorage.removeItem(CONSENT_KEY);
      throw new Error('Diagnostics could not be enabled.');
    }
  });
}

export function reportStartupError() {
  if (consent) sdk?.captureMessage('DoseTracker application error', 'error');
}
