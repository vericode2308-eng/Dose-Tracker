import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { ErrorEvent, TransactionEvent, Span } from '@sentry/react-native';
import appConfig from '../../../app.json';

export const PRIVATE_QA_DIAGNOSTICS = process.env.EXPO_PUBLIC_DIAGNOSTICS_MODE === 'private-qa';
const LEGACY_KEY = PRIVATE_QA_DIAGNOSTICS ? '@dosetracker/diagnostics-private-qa/v1' : '@dosetracker/diagnostics-consent/v1';
const CONSENT_KEY = PRIVATE_QA_DIAGNOSTICS ? '@dosetracker/diagnostics-private-qa/v2' : '@dosetracker/diagnostics-consent/v2';
const DSN = 'https://4260ebfe901b6d04bda9c7356b2e29e2@o4512147247071232.ingest.de.sentry.io/4512156478537808';
export type DiagnosticsPreferences = { errors: boolean; logs: boolean; traces: boolean };
export const DIAGNOSTICS_OFF: DiagnosticsPreferences = { errors: false, logs: false, traces: false };
let consent = { ...DIAGNOSTICS_OFF };
let revision = 0;
let sdk: typeof import('@sentry/react-native') | undefined;
let initialized = false;
let pending = Promise.resolve();
const requests = new Set<AbortController>();
const operations = ['database.initialize', 'reminders.reconcile'] as const;
type Operation = typeof operations[number];
const isOperation = (name: unknown): name is Operation => operations.includes(name as Operation);
const metadata = () => ({ release: `dosetracker@${appConfig.expo.version}`, environment: PRIVATE_QA_DIAGNOSTICS ? 'private-qa' : 'production' });
const validTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const validId = (value: unknown, length: number): value is string => typeof value === 'string' && new RegExp(`^[a-f0-9]{${length}}$`, 'i').test(value);

// Fresh allowlists exclude health data, arbitrary context and device identifiers.
export function sanitizeDiagnosticEvent(event: ErrorEvent): ErrorEvent {
  return {
    type: undefined,
    event_id: /^[a-f0-9]{32}$/i.test(event.event_id || '') ? event.event_id : undefined,
    timestamp: typeof event.timestamp === 'number' ? event.timestamp : undefined,
    platform: 'javascript',
    release: `dosetracker@${appConfig.expo.version}`,
    environment: PRIVATE_QA_DIAGNOSTICS ? 'private-qa' : 'production',
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


function sanitizeTrace(event: TransactionEvent): TransactionEvent | null {
  const trace = event.contexts?.trace;
  if (!consent.traces || trace?.data?.consent_revision !== revision || !isOperation(event.transaction)
    || !validTime(event.start_timestamp) || !validTime(event.timestamp) || event.timestamp < event.start_timestamp
    || !validId(trace.trace_id, 32) || !validId(trace.span_id, 16)) return null;
  return {
    type: 'transaction', transaction: event.transaction, ...metadata(), platform: 'javascript',
    event_id: validId(event.event_id, 32) ? event.event_id : undefined,
    start_timestamp: event.start_timestamp, timestamp: event.timestamp,
    contexts: { trace: { trace_id: trace.trace_id, span_id: trace.span_id, op: 'app.operation',
      status: trace.status === 'ok' ? 'ok' : 'internal_error', data: { consent_revision: revision } } },
    tags: { runtime: Platform.OS }, spans: [],
  };
}

// The Sentry SDK serializes log attributes after beforeSendLog. Rebuild the wire
// payload too, because SDK scope attributes can be added after that hook.
function sanitizeWireLog(value: unknown) {
  if (!consent.logs || !value || typeof value !== 'object') return null;
  const log = value as { body?: unknown; timestamp?: unknown; attributes?: Record<string, { value?: unknown }> };
  const operation = log.attributes?.operation?.value;
  const outcome = log.attributes?.outcome?.value;
  if (log.attributes?.consent_revision?.value !== revision || !isOperation(operation)
    || !['ok', 'failed'].includes(outcome as string) || !validTime(log.timestamp)) return null;
  return { timestamp: log.timestamp, level: outcome === 'ok' ? 'info' : 'error',
    severity_number: outcome === 'ok' ? 9 : 17, body: `${operation}: ${outcome}`,
    attributes: Object.fromEntries(Object.entries({ ...metadata(), runtime: Platform.OS, operation, outcome })
      .map(([key, val]) => [key, { type: 'string', value: val }])) };
}

function serialize(task: () => Promise<void>) {
  const result = pending.then(task);
  pending = result.catch(() => undefined);
  return result;
}

async function start() {
  if (!Object.values(consent).some(Boolean)) return;
  const expectedRevision = revision;
  sdk ??= await import('@sentry/react-native');
  if (expectedRevision !== revision || !Object.values(consent).some(Boolean) || initialized) return;
  sdk.init({
    dsn: DSN, ...metadata(), sendDefaultPii: false,
    enableNative: false, enableNativeCrashHandling: false, autoInitializeNativeSdk: false,
    enableAutoSessionTracking: false, enableAutoPerformanceTracing: false,
    enableLogs: true, sendClientReports: false,
    // Only our two manually instrumented operations are sampled; no network/navigation capture.
    tracesSampler: () => consent.traces ? 1 : 0,
    tracePropagationTargets: [], attachScreenshot: false, attachViewHierarchy: false,
    defaultIntegrations: false, integrations: [sdk.reactNativeErrorHandlersIntegration()],
    beforeBreadcrumb: () => null,
    beforeSend: event => consent.errors ? sanitizeDiagnosticEvent(event) : null,
    beforeSendTransaction: sanitizeTrace,
    beforeSendLog: log => {
      const { operation, outcome, consent_revision } = log.attributes || {};
      if (!consent.logs || consent_revision !== revision || !isOperation(operation) || !['ok', 'failed'].includes(outcome as string)) return null;
      return { level: outcome === 'ok' ? 'info' : 'error', message: `${operation}: ${outcome}`,
        attributes: { operation, outcome, consent_revision } };
    },
    // No persistent queue. Recheck consent and scrub every item at the network boundary.
    transport: options => ({
      send: async envelope => {
        const items: [Record<string, unknown>, unknown][] = [];
        for (const [header, payload] of envelope[1]) {
          if (header.type === 'event' && consent.errors) {
            items.push([{ type: 'event' }, sanitizeDiagnosticEvent(payload as ErrorEvent)]);
          } else if (header.type === 'transaction') {
            const event = sanitizeTrace(payload as TransactionEvent);
            if (event) {
              delete event.contexts!.trace!.data;
              items.push([{ type: 'transaction' }, event]);
            }
          } else if (header.type === 'log') {
            const logs = (payload as { items?: unknown[] }).items;
            const safe = Array.isArray(logs) ? logs.map(sanitizeWireLog).filter(Boolean) : [];
            if (safe.length) items.push([{ type: 'log', item_count: safe.length, content_type: 'application/vnd.sentry.items.log+json' }, { items: safe }]);
          }
        }
        if (!items.length) return {};
        const controller = new AbortController();
        requests.add(controller);
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
          const body = [JSON.stringify({}), ...items.flatMap(([header, payload]) => [JSON.stringify(header), JSON.stringify(payload)])].join('\n');
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

function parsePreferences(value: unknown): DiagnosticsPreferences {
  if (!value || typeof value !== 'object') return { ...DIAGNOSTICS_OFF };
  const prefs = value as DiagnosticsPreferences;
  return { errors: prefs.errors === true, logs: prefs.logs === true, traces: prefs.traces === true };
}

export async function readDiagnosticsConsent(): Promise<DiagnosticsPreferences> {
  try {
    const saved = await AsyncStorage.getItem(CONSENT_KEY);
    if (saved !== null) return parsePreferences(JSON.parse(saved));
    // Previous explicit consent covered errors only, never the new categories.
    return { ...DIAGNOSTICS_OFF, errors: await AsyncStorage.getItem(LEGACY_KEY) === 'enabled' };
  } catch { return { ...DIAGNOSTICS_OFF }; }
}

export function initializeDiagnostics() {
  const expectedRevision = revision;
  return serialize(async () => {
    const saved = await readDiagnosticsConsent();
    if (expectedRevision !== revision) return;
    consent = saved;
    try { await start(); } catch { consent = { ...DIAGNOSTICS_OFF }; }
  });
}

export function setDiagnosticsConsent(preferences: DiagnosticsPreferences | false) {
  const next = parsePreferences(preferences);
  const expectedRevision = ++revision;
  // Suspend immediately, including buffered operations, even if persistence fails.
  consent = { ...DIAGNOSTICS_OFF };
  for (const request of requests) request.abort();
  return serialize(async () => {
    if (expectedRevision !== revision) return;
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    if (!Object.values(next).some(Boolean)) {
      // Erasure/withdrawal also disables both legacy and other-build consent.
      for (const key of ['@dosetracker/diagnostics-consent/v1', '@dosetracker/diagnostics-private-qa/v1']) await AsyncStorage.setItem(key, 'disabled');
      for (const key of ['@dosetracker/diagnostics-consent/v2', '@dosetracker/diagnostics-private-qa/v2']) await AsyncStorage.setItem(key, JSON.stringify(DIAGNOSTICS_OFF));
    }
    if (expectedRevision !== revision) return;
    consent = next;
    try { await start(); }
    catch { consent = { ...DIAGNOSTICS_OFF }; await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify(DIAGNOSTICS_OFF)); throw new Error('Diagnostics could not be enabled.'); }
  });
}

export function reportStartupError() {
  if (consent.errors) sdk?.captureMessage('DoseTracker application error', 'error');
}

/** No arguments, results, error messages or health records enter telemetry. */
export async function measureDiagnosticOperation<T>(operation: Operation, task: () => Promise<T>): Promise<T> {
  const expectedRevision = revision;
  let span: Span | undefined;
  try {
    if (consent.traces && isOperation(operation)) span = sdk?.startInactiveSpan({ name: operation, op: 'app.operation',
      forceTransaction: true, parentSpan: null, attributes: { consent_revision: expectedRevision } });
  } catch { /* Diagnostics must never prevent app operations. */ }
  let outcome: 'ok' | 'failed' = 'ok';
  try { return await task(); }
  catch (error) { outcome = 'failed'; throw error; }
  finally {
    try {
      span?.setStatus({ code: outcome === 'ok' ? 1 : 2 });
      span?.end();
      if (consent.logs && expectedRevision === revision && isOperation(operation)) {
        sdk?.logger[outcome === 'ok' ? 'info' : 'error'](`${operation}: ${outcome}`, { operation, outcome, consent_revision: expectedRevision });
      }
    } catch { /* Reporting cannot change the operation's result. */ }
  }
}
