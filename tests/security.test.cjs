const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

function compile(path, dependencies = {}) {
  const result = {};
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  new Function('require', 'exports', js)(name => {
    assert.ok(name in dependencies, 'Unexpected dependency: ' + name);
    return dependencies[name];
  }, result);
  return result;
}
const errors = compile('src/features/security/errors.js');
const model = compile('src/features/onboarding/model.ts');
const profile = { name: 'Synthetic Person', color: '#123456', photoUri: null, dateOfBirth: '2000-01-01', notes: 'SYNTHETIC_PRIVATE_NOTE' };

test('a saved lock preference fails closed when native screen protection fails', async () => {
  const states = ['unlocked', false];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const lock = compile('src/features/security/AppLock.tsx', {
    'react': { createContext: () => ({ Provider: 'provider' }), useCallback: fn => fn,
      useRef: value => ({ current: value }), useEffect: () => {},
      useState: () => { const index = cursor++; return [states[index], value => { states[index] = value; }]; } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Platform: { OS: 'android' }, AppState: { currentState: 'active' } },
    'expo-screen-capture': { preventScreenCaptureAsync: async () => { throw Error('Native unavailable'); } },
    './SecurityManager': {},
  });
  const unlocked = lock.AppLock({ children: 'private content' });
  await assert.rejects(unlocked.props.value.setEnabled(true));
  assert.deepEqual(states, ['error', true]);
  cursor = 0;
  const failed = lock.AppLock({ children: 'private content' });
  assert.notEqual(failed.type, 'provider');
  assert.doesNotMatch(JSON.stringify(failed), /private content/);
});

test('secure app-lock storage denies corrupt values and read failures', async () => {
  const options = { value: null };
  const security = compile('src/features/security/SecurityManager.js', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-local-authentication': {},
    'expo-secure-store': { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only', getItemAsync: async () => {
      if (options.fail) throw Error('Unavailable');
      return options.value;
    } },
  });
  for (const [value, expected] of [[null, false], ['off', false], ['on', true]]) {
    options.value = value;
    assert.equal(await security.isAuthEnabled(), expected);
  }
  options.value = 'corrupt';
  await assert.rejects(security.isAuthEnabled());
  options.fail = true;
  await assert.rejects(security.isAuthEnabled());
});

function onboardingHarness(options = {}) {
  let raw = JSON.stringify({ ...model.INITIAL_DATA, completed: true, profile, extraPrivateField: 'discard-me' });
  let savedProfile;
  const storage = compile('src/features/onboarding/storage.ts', {
    './model': model,
    '@react-native-async-storage/async-storage': {
      getItem: async () => raw,
      setItem: async (_key, value) => { if (options.failCleanup) throw Error('Storage failed'); raw = value; },
      removeItem: async () => { raw = null; },
    },
  });
  const migration = compile('src/features/onboarding/migration.ts', {
    './storage': storage, '@/database': { initializeProfiles: async value => {
      if (options.failDatabase) throw Error('Database failed');
      savedProfile ??= structuredClone(value);
    } },
  });
  return { storage, migration, get raw() { return raw; }, get profile() { return savedProfile; } };
}

test('onboarding migrates before scrubbing and future writes retain only setup flags', async () => {
  const h = onboardingHarness();
  const clean = await h.migration.loadOnboarding();
  assert.deepEqual(h.profile, profile);
  assert.equal(clean.completed, true);
  assert.equal(clean.profile, null);
  assert.doesNotMatch(h.raw, /Synthetic|SYNTHETIC|discard-me|2000/);
  await h.storage.writeOnboarding({ ...clean, profile, extraPrivateField: 'discard-me' });
  assert.deepEqual(Object.keys(JSON.parse(h.raw)).sort(), ['completed', 'notificationChoice', 'profile', 'version']);
  assert.equal(JSON.parse(h.raw).profile, null);
  await h.storage.clearOnboarding();
  assert.equal(h.raw, null);
});

test('failed SQLite migration retains the only legacy profile and completion flag', async () => {
  const options = { failDatabase: true };
  const h = onboardingHarness(options);
  await assert.rejects(h.migration.loadOnboarding());
  assert.match(h.raw, /SYNTHETIC_PRIVATE_NOTE/);
  options.failDatabase = false;
  await h.migration.loadOnboarding();
  assert.deepEqual(h.profile, profile);
  assert.equal(JSON.parse(h.raw).completed, true);
});

test('interrupted cleanup retries without overwriting a migrated, subsequently edited profile', async () => {
  const options = { failCleanup: true };
  const h = onboardingHarness(options);
  await assert.rejects(h.migration.loadOnboarding());
  h.profile.notes = '';
  options.failCleanup = false;
  await h.migration.loadOnboarding();
  assert.equal(h.profile.notes, '');
  assert.equal(JSON.parse(h.raw).profile, null);
});

test('unexpected database/native errors and forged objects do not reach the UI', () => {
  const generic = 'Please retry.';
  for (const error of [Error('SQLITE /private/path token=secret'), { message: 'secret', name: 'UserFacingError' }, 'secret', null]) {
    assert.equal(errors.publicErrorMessage(error, generic), generic);
  }
  assert.equal(errors.publicErrorMessage(new errors.UserFacingError('Choose a valid time.'), generic), 'Choose a valid time.');
});

test('patched query-string preserves normal Router query parsing and bounds malformed work', () => {
  const query = require('query-string');
  assert.deepEqual({ ...query.parse('name=Jos%C3%A9+Doe&id=a%2Fb&n=1&n=2') }, { id: 'a/b', n: ['1', '2'], name: 'José Doe' });
  const { getStateFromPath } = require('expo-router/build/react-navigation/core/getStateFromPath');
  assert.equal(getStateFromPath('/medicine?id=caf%C3%A9', { screens: { medicine: 'medicine' } }).routes[0].params.id, 'café');
  const script = "const {getStateFromPath}=require('expo-router/build/react-navigation/core/getStateFromPath'); const text='%80'.repeat(10000); const state=getStateFromPath('/medicine?id='+text,{screens:{medicine:'medicine'}}); if(state.routes[0].params.id!==text) process.exit(2);";
  const run = spawnSync(process.execPath, ['-e', script], { timeout: 2000, encoding: 'utf8' });
  assert.equal(run.error, undefined);
  assert.equal(run.status, 0, run.stderr);
});

test('upgraded Xcode UUID generator retains its required identifier format', () => {
  const project = require('xcode').project('/tmp/security-fixture.pbxproj');
  project.hash = { project: { objects: {} } };
  const ids = Array.from({ length: 100 }, () => project.generateUuid());
  assert.ok(ids.every(id => /^[A-F0-9]{24}$/.test(id)));
  assert.equal(new Set(ids).size, 100);
  const uuid = require('uuid');
  assert.throws(() => uuid.v5('test', uuid.v5.DNS, new Uint8Array(8)), RangeError);
});

test('image bounds and signatures reject oversized, invalid, and executable content', () => {
  const validation = compile('src/features/onboarding/photoValidation.ts', { '@/features/security/errors': errors });
  for (const size of [0, -1, NaN, Infinity, validation.MAX_PHOTO_BYTES + 1]) assert.throws(() => validation.validatePhotoSize(size));
  for (const [w, h] of [[0, 10], [9000, 1], [6000, 6000], [NaN, 1]]) assert.throws(() => validation.validatePhotoDimensions(w, h));
  validation.validatePhotoSize(1024);
  validation.validatePhotoDimensions(3000, 3000);
  assert.equal(validation.photoFormat(Uint8Array.from([255, 216, 255, 224])).extension, 'jpg');
  assert.equal(validation.photoFormat(Uint8Array.from([137,80,78,71,13,10,26,10])).extension, 'png');
  assert.throws(() => validation.photoFormat(Buffer.from('<svg onload="evil()">')));
  assert.throws(() => validation.photoFormat(Buffer.from('MZ renamed-malware.jpg')));
});

test('photo picker checks the actual web file before reading its contents', async () => {
  let read = false;
  const validation = compile('src/features/onboarding/photoValidation.ts', { '@/features/security/errors': errors });
  const photos = compile('src/features/onboarding/photos.ts', {
    'react-native': { Platform: { OS: 'web' } }, 'expo-crypto': {}, './photoValidation': validation,
    'expo-image-picker': { launchImageLibraryAsync: async () => ({ canceled: false, assets: [{
      width: 100, height: 100, file: { size: validation.MAX_PHOTO_BYTES + 1, slice() { read = true; } },
    }] }) },
  });
  await assert.rejects(photos.choosePhoto(), /8 MB/);
  assert.equal(read, false);
});

test('native photo copying rejects renamed non-images and closes its bounded file handle', async () => {
  let closed = false;
  let copied = false;
  const validation = compile('src/features/onboarding/photoValidation.ts', { '@/features/security/errors': errors });
  const photos = compile('src/features/onboarding/photos.ts', {
    'react-native': { Platform: { OS: 'android' } }, 'expo-crypto': { randomUUID: () => 'test-id' },
    './photoValidation': validation, 'expo-image-picker': {},
    'expo-file-system': { Paths: { document: { uri: 'file:///documents/' } }, File: class {
      size = 1024;
      open() { return { readBytes: size => { assert.equal(size, 32); return Buffer.from('<svg>not a photo</svg>'); }, close: () => { closed = true; } }; }
      copy() { copied = true; }
    } },
  });
  await assert.rejects(photos.keepPhoto('file:///cache/fake.jpg'), /JPEG/);
  assert.equal(closed, true);
  assert.equal(copied, false);
});

function backupHarness(platform, asset, options = {}) {
  const settings = compile('src/features/settings/storage.ts', { '@react-native-async-storage/async-storage': {} });
  const backup = compile('src/features/settings/backup.ts', {
    'react-native': { Platform: { OS: platform } }, './storage': settings,
    'expo-document-picker': { getDocumentAsync: async () => ({ canceled: false, assets: [asset] }) },
    'expo-file-system': { File: class {
      constructor() { this.size = options.size; this.exists = true; }
      text() { options.read = true; return Promise.resolve(options.content); }
      delete() { options.deleted = true; }
    } },
  });
  return { backup, settings };
}

test('web preference import rejects oversized actual File before reading when picker size is missing', async () => {
  let read = false;
  const { backup } = backupHarness('web', { file: { size: 1024 * 1024 + 1, text: () => { read = true; return '{}'; } } });
  await assert.rejects(backup.importPreferences(), /too large/);
  assert.equal(read, false);
});

test('native preference import enforces actual size and removes its temporary copy', async () => {
  const options = { size: 1024 * 1024 + 1 };
  const { backup } = backupHarness('android', { uri: 'file:///cache/test.json' }, options);
  await assert.rejects(backup.importPreferences(), /too large/);
  assert.equal(options.read, undefined);
  assert.equal(options.deleted, true);
});

test('valid preferences import excludes injected security and health fields', async () => {
  const { DEFAULT_SETTINGS } = compile('src/features/settings/storage.ts', { '@react-native-async-storage/async-storage': {} });
  const content = JSON.stringify({ format: 'dosetracker-preferences-v1', settings: { ...DEFAULT_SETTINGS, appLock: false, notes: 'private' } });
  const { backup } = backupHarness('web', { file: { size: content.length, text: async () => content } });
  assert.deepEqual(await backup.importPreferences(), DEFAULT_SETTINGS);
});
