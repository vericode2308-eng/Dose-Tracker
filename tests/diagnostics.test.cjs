const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync('src/features/diagnostics/diagnostics.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
function harness(saved = null, failRead = false, fetchImpl = async () => { throw Error("Unexpected network request"); }) {
  let value = saved, options, loads = 0;
  const sdk = { init: o => { options = o; }, reactNativeErrorHandlersIntegration: () => ({}), captureMessage: () => {} };
  const deps = {
    '@react-native-async-storage/async-storage': { getItem: async () => { if (failRead) throw Error('storage'); return value; }, setItem: async (_, v) => { value = v; }, removeItem: async () => { value = null; } },
    'react-native': { Platform: { OS: 'android' } },
    '../../../app.json': { expo: { version: '1.0.0' } },
    '@sentry/react-native': sdk,
  };
  const manager = {};
  new Function('require', 'exports', 'fetch', compiled)(name => { if (name === '@sentry/react-native') loads++; assert.ok(name in deps); return deps[name]; }, manager, fetchImpl);
  return { manager, get options() { return options; }, get loads() { return loads; }, get saved() { return value; } };
}
test('diagnostics do not load Sentry without consent or on a storage failure', async () => {
  for (const h of [harness(), harness(null, true), harness('unexpected')]) {
    await h.manager.initializeDiagnostics();
    h.manager.reportStartupError();
    assert.equal(h.loads, 0);
  }
});
test('explicit consent starts restricted diagnostics; withdrawal drops future events', async () => {
  const h = harness();
  await h.manager.setDiagnosticsConsent(true);
  assert.equal(h.loads, 1);
  assert.equal(h.options.enableNative, false);
  assert.equal(h.options.enableLogs, false);
  assert.equal(h.options.tracesSampleRate, 0);
  assert.equal(h.options.defaultIntegrations, false);
  assert.ok(h.options.beforeSend({ type: undefined }));
  await h.manager.setDiagnosticsConsent(false);
  assert.equal(h.saved, null);
  assert.equal(h.options.beforeSend({ type: undefined }), null);
  const transport = h.options.transport({ url: 'https://invalid.example' });
  assert.deepEqual(await transport.send([{}, [[{ type: 'event' }, {}]]]), {});
});
test('rapid enable then revoke never initializes diagnostics', async () => {
  const h = harness();
  await Promise.all([h.manager.setDiagnosticsConsent(true), h.manager.setDiagnosticsConsent(false)]);
  assert.equal(h.loads, 0);
  assert.equal(h.saved, null);
});
test('event allowlist removes health data from messages, context, identifiers and stack variables', () => {
  const h = harness();
  const secret = 'PRIVATE_MEDICINE_AND_PROFILE';
  const event = h.manager.sanitizeDiagnosticEvent({
    type: undefined, event_id: 'a'.repeat(32), timestamp: 123,
    message: secret, user: { id: secret }, contexts: { health: { name: secret } },
    breadcrumbs: [{ message: secret }], extra: { db: secret }, request: { url: secret }, tags: { name: secret },
    exception: { values: [{ type: secret, value: secret, stacktrace: { frames: [{ filename: secret, function: secret, vars: { name: secret }, lineno: 22, colno: 4 }] } }] },
  });
  assert.equal(JSON.stringify(event).includes(secret), false);
  assert.equal(event.exception.values[0].stacktrace.frames[0].lineno, 22);
});

 test('transport sends only sanitized events and aborts requests when consent is withdrawn', async () => {
  let sent, signal;
  const h = harness(null, false, async (_, options) => {
    sent = options.body;
    signal = options.signal;
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('aborted'))));
  });
  await h.manager.setDiagnosticsConsent(true);
  const transport = h.options.transport({ url: 'https://example.invalid/envelope' });
  const delivery = transport.send([{ event_id: 'PRIVATE_HEADER' }, [
    [{ type: 'attachment' }, 'PRIVATE_ATTACHMENT'],
    [{ type: 'event' }, { type: undefined, message: 'PRIVATE_MEDICINE' }],
  ]]);
  assert.equal(sent.includes('PRIVATE'), false);
  assert.equal(sent.split('\n').length, 3);
  await h.manager.setDiagnosticsConsent(false);
  assert.equal(signal.aborted, true);
  await delivery;
});

test('withdrawal during startup prevents a previously saved consent from restarting Sentry', async () => {
  const h = harness('enabled');
  await Promise.all([h.manager.initializeDiagnostics(), h.manager.setDiagnosticsConsent(false)]);
  assert.equal(h.loads, 0);
  assert.equal(h.saved, null);
});
