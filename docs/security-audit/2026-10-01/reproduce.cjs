// Run from the repository root. Uses synthetic data and isolated subprocesses only.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const ts = require(process.cwd() + '/node_modules/typescript');

async function main() {
  let lockReads = 0;
  let authenticationCalls = 0;
  const security = {
    isAuthEnabled: async () => { lockReads++; return true; },
    authenticateUser: async () => { authenticationCalls++; return false; },
  };
  let fixture = fs.readFileSync('tests/notificationManager.test.cjs', 'utf8')
    .split('for (const [action, status]')[0];
  fixture = fixture.replace('const dependencies = {',
    "const dependencies = { './features/security/SecurityManager': security,");
  const fixtureRequire = name => name === 'typescript' ? ts : require(name);
  const { harness, nativeResponse } = new Function('require', 'security',
    fixture + '\nreturn { harness, nativeResponse };')(fixtureRequire, security);
  const h = harness({ profiles: true });
  await h.runTask(nativeResponse('take-now'));
  assert.equal(h.history.length, 1);
  assert.equal(lockReads, 0);
  assert.equal(authenticationCalls, 0);
  console.log(JSON.stringify({ scenario: 'headless action with enabled-lock service available',
    writes: h.history.length, lockReads, authenticationCalls,
    limitation: 'Mocked OS and database boundaries; not a device lock-screen test.' }));

  const privacy = harness();
  await privacy.manager.reconcileReminders();
  const deliveredId = [...privacy.stored.keys()][0];
  const tray = new Map([[deliveredId, structuredClone(privacy.stored.get(deliveredId))]]);
  privacy.api.getPresentedNotificationsAsync = async () => [...tray].map(([identifier, request]) => ({ request: { ...request, identifier } }));
  privacy.api.dismissNotificationAsync = async id => { tray.delete(id); };
  privacy.api.dismissAllNotificationsAsync = async () => { tray.clear(); };
  privacy.prefs.notificationPrivacy = 'hide';
  await privacy.manager.reconcileReminders();
  assert.equal(tray.size, 1);
  assert.match(tray.get(deliveredId).content.body, /Test medicine/);
  assert.doesNotMatch([...privacy.stored.values()][0].content.body, /Test medicine/);
  console.log(JSON.stringify({ scenario: 'show-to-hide notification transition',
    futureRequestsRedacted: true, previousPresentedNotificationRetained: true }));

  const values = new Map();
  const model = ts.transpileModule(fs.readFileSync('src/features/onboarding/model.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const modelExports = {};
  new Function('exports', model)(modelExports);
  const storage = ts.transpileModule(fs.readFileSync('src/features/onboarding/storage.ts', 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const storageExports = {};
  new Function('require', 'exports', storage)(name => name === './model' ? modelExports : {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => values.set(key, value), removeItem: async key => values.delete(key),
  }, storageExports);
  await storageExports.writeOnboarding({ version: 1, completed: true, notificationChoice: 'skipped',
    profile: { name: 'Synthetic Person', color: '#123456', photoUri: null, dateOfBirth: '2000-01-01', notes: 'SYNTHETIC_PRIVATE_NOTE' } });
  assert.ok([...values.values()].some(value => value.includes('SYNTHETIC_PRIVATE_NOTE')));
  console.log(JSON.stringify({ scenario: 'onboarding persistence', profileNotesStoredInAsyncStorage: true }));

  for (const count of [192, 384, 768]) {
    const script = "const {performance}=require('node:perf_hooks'); const q=require('query-string'); const start=performance.now(); q.parse('id='+'%80'.repeat(" + count + ")); console.log(Math.round(performance.now()-start));";
    const result = spawnSync(process.execPath, ['-e', script], { cwd: process.cwd(), timeout: 2000, encoding: 'utf8' });
    console.log(JSON.stringify({ scenario: 'installed query-string malformed query', percentTokens: count,
      timeoutMs: result.error?.code === 'ETIMEDOUT' ? 2000 : undefined,
      parseMs: result.status === 0 ? Number(result.stdout.trim()) : undefined }));
    if (result.error) break;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
