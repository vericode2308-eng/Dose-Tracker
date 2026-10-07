const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/features/diagnostics/diagnostics.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const OFF = { errors: false, logs: false, traces: false };
const ALL = { errors: true, logs: true, traces: true };
const PUBLIC = '@dosetracker/diagnostics-consent/v2';
const QA = '@dosetracker/diagnostics-private-qa/v2';
function harness({ saved = {}, failRead = false, mode, realSdk = false, fetchImpl } = {}) {
  let options, loads = 0, failWrite = false, client;
  const values = new Map(Object.entries(saved));
  const sent = [], logs = [], spans = [];
  const core = realSdk ? require('@sentry/core') : null;
  const sdk = {
    init: o => {
      options = o;
      if (realSdk) {
        client = new (require('@sentry/browser').BrowserClient)({ stackParser: () => [], ...o });
        core.setCurrentClient(client);
        client.init();
      }
    },
    reactNativeErrorHandlersIntegration: () => ({ name: 'MockNativeErrorHandlers' }),
    captureMessage: (...args) => core?.captureMessage(...args),
    logger: realSdk ? core.logger : { info: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    startInactiveSpan: realSdk ? core.startInactiveSpan : o => {
      const span = { options: o, setStatus: v => { span.status = v; }, end: () => { span.ended = true; } };
      spans.push(span); return span;
    },
  };
  const deps = {
    '@react-native-async-storage/async-storage': {
      getItem: async key => { if (failRead) throw Error('storage'); return values.get(key) ?? null; },
      setItem: async (key, v) => { if (failWrite) throw Error('storage'); values.set(key, v); },
    },
    'react-native': { Platform: { OS: 'android' } },
    '../../../app.json': { expo: { version: '1.0.0' } }, '@sentry/react-native': sdk,
  };
  const manager = {};
  new Function('require', 'exports', 'fetch', 'process', compiled)(name => {
    if (name === '@sentry/react-native') loads++; assert.ok(name in deps); return deps[name];
  }, manager, fetchImpl || (async (_, o) => { sent.push(o.body); return { status: 200 }; }), { env: { EXPO_PUBLIC_DIAGNOSTICS_MODE: mode } });
  return { manager, values, sent, logs, spans, core, get client() { return client; }, get options() { return options; }, get loads() { return loads; },
    failWrites() { failWrite = true; }, transport: () => options.transport({ url: 'https://example.invalid/envelope' }) };
}
const trace = (revision = 1) => ({ type: 'transaction', transaction: 'database.initialize', start_timestamp: 1, timestamp: 2,
  contexts: { trace: { trace_id: 'a'.repeat(32), span_id: 'b'.repeat(16), status: 'ok', data: { consent_revision: revision, health: 'SECRET' } } },
  user: { id: 'SECRET' }, spans: [{ description: 'SECRET' }], tags: { medicine: 'SECRET' }, request: { url: 'SECRET' } });
const log = (revision = 1) => ({ timestamp: 1, body: 'SECRET', trace_id: 'SECRET', attributes: {
  operation: { value: 'database.initialize' }, outcome: { value: 'ok' }, consent_revision: { value: revision }, user: { value: 'SECRET' },
} });

test('all build modes require opt-in and storage failures or malformed values fail closed', async () => {
  for (const mode of [undefined, 'public', 'production', 'private-qa', 'typo']) {
    const h = harness({ mode }); await h.manager.initializeDiagnostics(); h.manager.reportStartupError();
    assert.equal(h.loads, 0); assert.deepEqual(await h.manager.readDiagnosticsConsent(), OFF);
  }
  for (const config of [{ failRead: true }, { saved: { [PUBLIC]: 'broken' } }, { saved: { [PUBLIC]: 'true' } }, { saved: { [PUBLIC]: '{"logs":"true"}' } }]) {
    const h = harness(config); await h.manager.initializeDiagnostics(); assert.equal(h.loads, 0);
  }
});
test('v1 consent migrates only explicitly enabled errors, including QA; new categories stay off', async () => {
  for (const mode of [undefined, 'private-qa']) {
    const key = mode ? '@dosetracker/diagnostics-private-qa/v1' : '@dosetracker/diagnostics-consent/v1';
    for (const value of ['enabled', 'disabled', 'unexpected']) {
      const h = harness({ mode, saved: { [key]: value } });
      assert.deepEqual(await h.manager.readDiagnosticsConsent(), { ...OFF, errors: value === 'enabled' });
    }
  }
});
test('new consent persists independently and QA choices never opt a public build in', async () => {
  const qa = harness({ mode: 'private-qa' }); await qa.manager.setDiagnosticsConsent(ALL);
  assert.equal(qa.values.has(PUBLIC), false);
  const publicBuild = harness({ saved: Object.fromEntries(qa.values) }); await publicBuild.manager.initializeDiagnostics();
  assert.equal(publicBuild.loads, 0);
  const restarted = harness({ mode: 'private-qa', saved: Object.fromEntries(qa.values) });
  assert.deepEqual(await restarted.manager.readDiagnosticsConsent(), ALL);
});
test('each category gates hooks and transport independently, without initializing native or automatic capture', async () => {
  for (const category of ['errors', 'logs', 'traces']) {
    const h = harness(); await h.manager.setDiagnosticsConsent({ ...OFF, [category]: true });
    assert.equal(h.options.enableNative, false); assert.equal(h.options.defaultIntegrations, false);
    assert.equal(h.options.enableAutoPerformanceTracing, false); assert.equal(h.options.beforeBreadcrumb({}), null);
    assert.equal(!!h.options.beforeSend({}), category === 'errors');
    assert.equal(h.options.tracesSampler({}), category === 'traces' ? 1 : 0);
    assert.equal(!!h.options.beforeSendTransaction(trace()), category === 'traces');
    assert.equal(!!h.options.beforeSendLog({ attributes: { operation: 'database.initialize', outcome: 'ok', consent_revision: 1 } }), category === 'logs');
    await h.transport().send([{}, [[{ type: 'event' }, {}], [{ type: 'log' }, { items: [log()] }], [{ type: 'transaction' }, trace()]]]);
    const lines = h.sent[0].split('\n').map(JSON.parse);
    assert.equal(lines.length, 3); assert.equal(lines[1].type, { errors: 'event', logs: 'log', traces: 'transaction' }[category]);
  }
});
test('rapid enable/revoke and startup/withdrawal races cannot restart reporting', async () => {
  for (const starting of [false, true]) {
    const h = harness({ saved: { [PUBLIC]: JSON.stringify(ALL) } });
    await Promise.all([starting ? h.manager.initializeDiagnostics() : h.manager.setDiagnosticsConsent(ALL), h.manager.setDiagnosticsConsent(false)]);
    assert.equal(h.loads, 0); assert.deepEqual(await h.manager.readDiagnosticsConsent(), OFF);
  }
});
test('withdrawal disables both build modes and legacy choices; consent is still off after restart', async () => {
  const h = harness({ saved: { [QA]: JSON.stringify(ALL), '@dosetracker/diagnostics-consent/v1': 'enabled' } });
  await h.manager.setDiagnosticsConsent(false);
  for (const mode of [undefined, 'private-qa']) {
    const restarted = harness({ mode, saved: Object.fromEntries(h.values) }); await restarted.manager.initializeDiagnostics(); assert.equal(restarted.loads, 0);
  }
});
test('failed consent writes suspend collection immediately and do not initialize reporting', async () => {
  const h = harness(); h.failWrites(); await assert.rejects(h.manager.setDiagnosticsConsent(ALL)); assert.equal(h.loads, 0);
  const running = harness(); await running.manager.setDiagnosticsConsent(ALL); running.failWrites();
  await assert.rejects(running.manager.setDiagnosticsConsent(false)); assert.equal(running.options.beforeSend({}), null);
  await running.transport().send([{}, [[{ type: 'log' }, { items: [log()] }]]]); assert.equal(running.sent.length, 0);
});
test('error allowlist removes health data, dynamic messages, identifiers and stack variables', () => {
  const h = harness();
  const event = h.manager.sanitizeDiagnosticEvent({ type: undefined, event_id: 'a'.repeat(32), timestamp: 123,
    message: 'SECRET', user: { id: 'SECRET' }, contexts: { health: { name: 'SECRET' } }, breadcrumbs: [{ message: 'SECRET' }],
    extra: { db: 'SECRET' }, request: { url: 'SECRET' }, tags: { name: 'SECRET' },
    exception: { values: [{ type: 'SECRET', value: 'SECRET', stacktrace: { frames: [{ filename: 'SECRET', function: 'SECRET', vars: { name: 'SECRET' }, lineno: 22, colno: 4 }] } }] },
  });
  assert.equal(JSON.stringify(event).includes('SECRET'), false); assert.equal(event.exception.values[0].stacktrace.frames[0].lineno, 22);
});
test('wire payloads strip arbitrary log attributes, spans, attachments, envelope headers and internal consent markers', async () => {
  const h = harness(); await h.manager.setDiagnosticsConsent(ALL);
  await h.transport().send([{ secret: 'SECRET' }, [[{ type: 'transaction', secret: 'SECRET' }, trace()], [{ type: 'log' }, { items: [log()] }], [{ type: 'attachment' }, 'SECRET']]]);
  assert.equal(h.sent.length, 1); assert.equal(h.sent[0].includes('SECRET'), false); assert.equal(h.sent[0].includes('consent_revision'), false);
  assert.equal(h.sent[0].split('\n').length, 5);
});
test('unexpected logs/traces and invalid times are dropped, never forwarded', async () => {
  const h = harness(); await h.manager.setDiagnosticsConsent(ALL);
  assert.equal(h.options.beforeSendLog({ message: 'console SECRET' }), null);
  assert.equal(h.options.beforeSendTransaction({ ...trace(), transaction: 'medicine/SECRET' }), null);
  assert.equal(h.options.beforeSendTransaction({ ...trace(), timestamp: NaN }), null);
  await h.transport().send([{}, [[{ type: 'log' }, { items: [{ body: 'SECRET' }, { ...log(), timestamp: Infinity }] }]]]);
  assert.equal(h.sent.length, 0);
});
test('withdrawal aborts active HTTPS requests', async () => {
  let signal;
  const h = harness({ fetchImpl: async (_, o) => { signal = o.signal; return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted')))); } });
  await h.manager.setDiagnosticsConsent(ALL); const delivery = h.transport().send([{}, [[{ type: 'event' }, {}]]]);
  await h.manager.setDiagnosticsConsent(false); assert.equal(signal.aborted, true); await delivery;
});
test('buffered logs and unfinished traces cannot cross withdrawal/re-enable', async () => {
  const h = harness(); await h.manager.setDiagnosticsConsent(ALL);
  let finish; const pending = h.manager.measureDiagnosticOperation('database.initialize', () => new Promise(resolve => { finish = resolve; }));
  await h.manager.setDiagnosticsConsent(false); await h.manager.setDiagnosticsConsent(ALL);
  finish('result'); assert.equal(await pending, 'result'); assert.equal(h.logs.length, 0);
  await h.transport().send([{}, [[{ type: 'log' }, { items: [log(1)] }], [{ type: 'transaction' }, trace(1)]]]);
  assert.equal(h.sent.length, 0);
  await h.transport().send([{}, [[{ type: 'log' }, { items: [log(3)] }], [{ type: 'transaction' }, trace(3)]]]);
  assert.equal(h.sent.length, 1);
});
test('operation instrumentation preserves results/errors and records only fixed outcomes', async () => {
  const h = harness(); await h.manager.setDiagnosticsConsent(ALL);
  assert.equal(await h.manager.measureDiagnosticOperation('database.initialize', async () => 'SECRET'), 'SECRET');
  const error = Error('SECRET'); await assert.rejects(h.manager.measureDiagnosticOperation('reminders.reconcile', async () => { throw error; }), e => e === error);
  assert.equal(JSON.stringify(h.logs).includes('SECRET'), false); assert.equal(h.logs.length, 2);
  assert.ok(h.spans.every(s => s.ended)); assert.equal(h.spans[1].status.code, 2);
  await h.manager.setDiagnosticsConsent(false);
  assert.equal(await h.manager.measureDiagnosticOperation('database.initialize', async () => 42), 42);
  assert.equal(h.logs.length, 2); assert.equal(h.spans.length, 2);
});
test('real installed Sentry core serializes opted-in logs and transactions through the sanitized transport', async () => {
  const h = harness({ realSdk: true });
  try {
    await h.manager.setDiagnosticsConsent(ALL);
    h.core.getCurrentScope().setUser({ id: 'SECRET' });
    h.core.getCurrentScope().setAttribute('medicine', 'SECRET');
    await h.manager.measureDiagnosticOperation('database.initialize', async () => 'SECRET');
    h.manager.reportStartupError();
    await h.client.flush(2000);
    const types = h.sent.flatMap(body => body.split('\n').filter((_, i) => i % 2 === 1).map(s => JSON.parse(s).type));
    assert.ok(types.includes('log'), JSON.stringify(types)); assert.ok(types.includes('transaction'), JSON.stringify(types)); assert.ok(types.includes('event'));
    assert.equal(h.sent.join('').includes('SECRET'), false);
    const before = h.sent.length;
    await h.manager.setDiagnosticsConsent(false);
    await h.manager.measureDiagnosticOperation('database.initialize', async () => 1);
    h.manager.reportStartupError(); await h.client.flush(2000); assert.equal(h.sent.length, before);
  } finally { h.core.getCurrentScope().clear(); await h.client?.close(2000); h.core.setCurrentClient(undefined); }
});
