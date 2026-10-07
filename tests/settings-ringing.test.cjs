const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function harness() {
  let raw = null;
  const storage = { getItem: async () => raw, setItem: async (_key, value) => { raw = value; } };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/features/settings/storage.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', code)(() => storage, exports);
  return { settings: exports, seed: value => { raw = JSON.stringify(value); } };
}

test('old saved preferences remain readable with ringing off; new preference round-trips', async () => {
  const h = harness();
  const old = { ...h.settings.DEFAULT_SETTINGS };
  delete old.reminderRinging;
  h.seed(old);
  assert.equal((await h.settings.readSettings()).reminderRinging, false);
  await h.settings.writeSettings({ ...old, reminderRinging: true });
  assert.equal((await h.settings.readSettings()).reminderRinging, true);
});

test('ringing validation rejects malformed preference values and excludes injected fields', async () => {
  const { settings } = harness();
  for (const value of ['true', 1, null]) {
    await assert.rejects(settings.writeSettings({ ...settings.DEFAULT_SETTINGS, reminderRinging: value }));
  }
  const safe = settings.preferencesOnly({ ...settings.DEFAULT_SETTINGS, reminderRinging: true,
    appLock: false, medicine: 'private' });
  assert.equal(safe.reminderRinging, true);
  assert.equal(safe.appLock, undefined);
  assert.equal(safe.medicine, undefined);
  assert.equal(settings.migrateLegacySettings({ theme: 'system', snoozeMinutes: 10,
    notificationPrivacy: 'hide', soundAndVibration: true }).reminderRinging, false);
});
