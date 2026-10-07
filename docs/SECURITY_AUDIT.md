# DoseTracker security audit — 2026-10-01

> Historical baseline: the findings and verdicts below describe the source before remediation. The five findings have since received source fixes and regression coverage. See [Security corrections and lessons](/Users/shome/Documents/Projects/DoseTrackerApp/docs/SECURITY_LESSONS.md) for implemented behavior, current verification, and remaining device/release checks. The original evidence is retained unchanged.

## 1. Security Posture Rating

**🟠 NEEDS WORK — 3 MEDIUM findings, 2 LOW findings; no confirmed CRITICAL or HIGH finding.**

DoseTracker has a small remote attack surface: it is a local Expo/React Native application with no account service, public database, or application backend. Its SQLite writes, optional diagnostics, and screen-level app lock have useful safeguards. The important gaps are notification actions that bypass the optional app lock, old notification contents remaining visible after privacy is tightened, and a vulnerable URL decoder on Expo Router's query parsing path. Two lower-risk issues concern incomplete environment-file ignore rules and redundant retention of profile information. The notification findings require access to the device's notification surface; they are not demonstrated remote account takeovers. Fix these issues before relying on app lock and notification privacy as complete protections.

### Scope, architecture, and evidence limits

- Reviewed the current working tree, including pre-existing uncommitted changes, based on commit `7e1cfc5`. This report is about that source snapshot, not a certification of an installed or published release. Application code, dependencies, native configuration, and existing user changes were not modified by this audit.
- Discovery covered application routes and feature logic, SQLite migrations and queries, notification/background entry points, the tracked Android module, configuration, scripts, tests, documentation, and static landing pages. Secret scanning covered 122 current text files and 435 historical text blobs. The [source inventory][inventory] includes paths only, including the ignored local environment file; no secret values are included. Binary assets were inventoried, not exhaustively reverse-engineered. Third-party source review focused on relevant security paths rather than every dependency implementation.
- Stack: Expo `~57.0.25`, Expo Router `~57.0.23`, React Native `0.86.3`, React `19.2.3`, npm lockfile. Version-specific references were checked against the [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) and [Expo documentation index](https://docs.expo.dev/llms.txt).
- Screens and incoming `dosetracker:` links enter Expo Router. The root app lock wraps mounted screens, onboarding, profile context, and the foreground notification lifecycle. Android's headless notification task is registered separately from `index.js` and can call dose actions without mounting that wrapper.
- Health/profile data flows from local screens to validation in `src/database.js`, then app-private SQLite schema v8. Family profiles belong to one local caregiver; they are not independently authenticated tenants. Notification responses resolve saved medicine/schedule IDs before writing history, stock, or snoozes. AsyncStorage holds preferences, setup state, diagnostics consent, and the unwanted onboarding profile copy described in finding #5. SecureStore holds the app-lock flag.
- Native profile photos stay in private app documents. Import/export handles preference JSON, not health-record backups. There are no application API routes, server actions, webhooks, OAuth callbacks, account/password endpoints, cloud data buckets, or server cron jobs. The static support form composes a mail draft; it does not POST to an application backend. Optional sanitized Sentry diagnostics are the only custom outbound HTTP transport identified.
- No production infrastructure, Sentry project settings, live ingestion, current EAS release artifact, or physical-device behavior was verified. Existing local APKs were inspected read-only, but predate the current source. Synthetic reproductions use the real application functions with mocked native/SQLite boundaries; they establish missing checks, not an end-to-end Android lock-screen exploit.

### Executed verification

| Check | Result |
| --- | --- |
| `EXPO_NO_DOTENV=1 npm run lint` | PASS; [log][lint] |
| `./node_modules/.bin/tsc --noEmit` | PASS; [empty success log][types] |
| `npm test` | PASS, 101 tests; [log][tests] |
| `npm audit --json` | 0 critical, 0 high, **17 moderate package entries**, 0 low; [full JSON][audit] |
| `npm outdated --json` | 23 direct packages behind registry latest; 7 with newer versions inside their declared range; [JSON][outdated] |
| Direct-package origin/download screening | 49 names screened; metadata/download requests succeeded for 40, failed for 9; [JSON][provenance] |
| Isolated security reproductions | Missing action authorization, retained notification content, onboarding profile serialization, and slow malformed-query decoding reproduced; [results][reproduction] |

The 17 npm entries are propagation through dependency chains from **two underlying advisories**, not 17 independent exploitable defects. No dependency update or automated `npm audit fix` was applied. Tests passing does not resolve the new findings; the existing suite does not assert these security properties.

## 2. Critical And High Findings

**None confirmed in the audited scope.** This does not cover unpublished source, deployed hosting configuration, operating-system vulnerabilities, compromised devices, or exhaustive dependency malware analysis.

## 3. Quick Wins

- **Finding #1, about 5 minutes:** ignore all environment-file variants while permitting a deliberately sanitized `.env.example`. Verify the rules before committing. No exposed secret was found that would presently justify mandatory rotation.
- **Checklist 4.5 hardening, about 5 minutes:** replace unexpected `error.message` output in the shared local-query hook with a generic message. Keep known validation errors separately allowlisted. This closes a coverage gap; no remote information-disclosure exploit was demonstrated.

## 4. Prioritized Remediation Plan

Estimates cover source changes and focused automated checks; device testing, native rebuilding, and release work are additional.

1. **MEDIUM — #4, notification privacy transition: ~30 minutes.** Dismiss already-presented medication notifications that do not meet the new privacy setting, including before reconciliation returns early.
2. **MEDIUM — #3, vulnerable URL decoder: ~45 minutes.** Apply a compatible upstream fix or the bounded interim decoder below, persist any patch, and test the actual Router/Metro path.
3. **MEDIUM — #2, notification action authorization: ~60 minutes.** Enforce the saved app-lock preference in the shared background/UI action handler. Disable quick-action controls when app lock is enabled and direct users to the authenticated screen.
4. **LOW — #1, environment ignore rules: ~5 minutes.** Add the missing patterns and retain secret-history scanning.
5. **LOW — #5, redundant profile retention: ~30 minutes.** Migrate legacy setup profiles into SQLite before scrubbing the setup record, then persist setup flags without personal data.

Follow-up coverage work: verify a freshly built Android artifact and device behavior; review the nine failed provenance lookups; determine which apparently unused direct dependencies are genuinely optional; add image byte/dimension limits and a web import size check before reading. Track the transitive `uuid` advisory with an SDK-compatible tooling update. These are PARTIAL/informational items, not additional confirmed findings.

### Finding #1 — Incomplete environment-file ignore rules

````text
┌─────────────────────────────────────────────────────────┐
│ FINDING #1                                              │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ LOW
│ Category │ Secret-management guardrail
│ Location │ .gitignore:33
│ CWE      │ CWE-538 (Insertion of Sensitive Information into Externally-Accessible File or Directory)
├──────────┴──────────────────────────────────────────────┤
│ What's wrong:
│ .env and .env.production are not ignored. Local suffix variants are ignored.
│ This is a preventive-control failure; no committed credential was found.
│
│ Why it matters:
│ A later developer can accidentally commit a secret-bearing default or
│ production environment file. Exposure requires that file to contain a
│ secret and be committed/published; neither was established in this audit.
│
│ The vulnerable code:
│ ```gitignore
│ # local env files
│ .env*.local
│ ```
│
│ The fix:
│ Replace that block with:
│ ```gitignore
│ # Environment files; examples must contain placeholders only.
│ .env
│ .env.*
│ !.env.example
│ ```
│ The later duplicate .env.local entry can be removed.
│ Effort: ~5 minutes
└─────────────────────────────────────────────────────────┘
````

Evidence: `git check-ignore` matched `.env.local` and `.env.production.local`, but not `.env` or `.env.production`. The local `SENTRY_AUTH_TOKEN` is in an ignored, untracked file; its value was never included in this report. No `.env` history was found. Adding ignore rules does not remove secrets already tracked; investigate/rotate only if future scanning discovers an actual exposure.

### Finding #2 — Notification actions bypass the optional app lock

````text
┌─────────────────────────────────────────────────────────┐
│ FINDING #2                                              │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ MEDIUM
│ Category │ Missing authorization on a background entry point
│ Location │ src/notificationManager.js:532
│ CWE      │ CWE-862 (Missing Authorization)
├──────────┴──────────────────────────────────────────────┤
│ What's wrong:
│ Take Now, Skip, and Snooze run without consulting the saved app-lock flag.
│ AppLock protects mounted screens, but the Android headless task calls
│ this function directly. Category actions do not open the foreground UI.
│
│ Why it matters:
│ Someone able to press a medication notification action can change dose
│ history, stock, or snooze state without satisfying DoseTracker's app lock.
│ This includes an accessible notification shade on an already-unlocked
│ phone. Access while the DEVICE is locked depends on Android/OEM settings.
│ No arbitrary remote action injection or device-unlock bypass is claimed.
│
│ The vulnerable code:
│ ```js
│ const attempt = (async () => {
│   const dose = await doseFromResponse(response);
│   if (!dose) return;
│   if (dose.profileId) await selectProfile(dose.profileId);
│   if (action === ACTION_SNOOZE) await snoozeMedicationDose(dose, 15, response.notification.date);
│   else await recordMedicationDose(dose, action === ACTION_TAKE ? 'Taken' : 'Skipped');
│ ```
│
│ The fix:
│ Add this import to src/notificationManager.js:
│ ```js
│ import { isAuthEnabled } from './features/security/SecurityManager';
│ ```
│ Insert this immediately after the action allowlist check, before reading
│ or mutating any dose/profile data in handleReminderAction:
│ ```js
│ if (await isAuthEnabled()) return;
│ ```
│ This conservative rule denies quick actions whenever app lock is enabled.
│ An unreadable SecureStore value rejects the action instead of opening it.
│ Keep dose entry available through the authenticated app screen. Also omit
│ action buttons from the category while locked mode is enabled and refresh
│ native requests/categories on preference changes; the shared guard must
│ still reject actions from previously delivered notifications.
│ Effort: ~60 minutes
└─────────────────────────────────────────────────────────┘
````

Evidence: [backgroundActions.ts:10][background] calls the shared handler outside the root wrapper; [notificationManager.js:74][category] sets `opensAppToForeground: false`. The isolated test invoked the actual task with an enabled-lock service stub available: **one dose write, zero lock reads, zero authentication calls**. Verify Take/Skip/Snooze in foreground, background, terminated state, and with an unreadable secure setting. Also retain app-lock-off behavior and action deduplication tests. Setting a platform-specific notification authentication option alone is not a cross-platform replacement for the shared guard; consult the [SDK 57 notification API](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

### Finding #3 — Malformed deep-link queries reach a vulnerable decoder

````text
┌─────────────────────────────────────────────────────────┐
│ FINDING #3                                              │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ MEDIUM
│ Category │ Dependency denial of service
│ Location │ package-lock.json:5036
│ CWE      │ CWE-400 (Uncontrolled Resource Consumption)
├──────────┴──────────────────────────────────────────────┤
│ What's wrong:
│ decode-uri-component 0.2.2 is vulnerable to expensive malformed-percent
│ decoding. expo-router -> query-string -> decode-uri-component puts it
│ on the incoming route-query parsing path, before screen-level checks.
│
│ Why it matters:
│ An attacker-controlled dosetracker: link with a malformed query can consume
│ the application's JS thread when delivered/opened. A small input already
│ exceeds the isolated test's time limit. This is an availability issue,
│ not demonstrated code execution or data extraction. Actual device URL
│ delivery and the resulting duration still need native verification.
│
│ The vulnerable code:
│ node_modules/decode-uri-component/index.js:33
│ ```js
│ for (var i = 1; i < tokens.length; i++) {
│   input = decodeComponents(tokens, i).join('');
│   tokens = input.match(singleMatcher) || [];
│ }
│ ```
│
│ The fix:
│ Prefer a tested Router/query-string chain using a patched decoder.
│ If an upstream compatible upgrade is unavailable, replace the contents
│ of node_modules/decode-uri-component/index.js with this interim CJS shim:
│ ```js
│ 'use strict';
│ module.exports = function (encodedURI) {
│   if (typeof encodedURI !== 'string') {
│     throw new TypeError('Expected a string');
│   }
│   const normalized = encodedURI.replace(/\+/g, ' ');
│   try {
│     return decodeURIComponent(normalized);
│   } catch {
│     return normalized;
│   }
│ };
│ ```
│ Persist the replacement using the project's existing patch-package:
│ ```sh
│ ./node_modules/.bin/patch-package decode-uri-component
│ ```
│ Commit the resulting patch. This preserves malformed encodings instead
│ of attempting recursive recovery; test that intentional behavior change.
│ Effort: ~45 minutes
└─────────────────────────────────────────────────────────┘
````

The [maintainer advisory](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-vcc3-ghjq-m6fr) identifies the decoder DoS and version 0.5.0 as patched. Do not blindly override to 0.5.0: its ESM packaging differs from the installed CommonJS consumer and requires compatibility testing. Do not run `npm audit fix --force`; this audit suggested obsolete Expo/Router major versions, which are not a safe upgrade plan.

Reachability evidence: installed `expo-router/build/react-navigation/core/getStateFromPath.js:499` calls `queryString.parse(query)`; `query-string/index.js:231` invokes the affected decoder. The isolated installed-query-string probe parses `id=` followed by bounded malformed `%80` sequences. At 768 tokens it exceeded the 2-second subprocess cutoff; smaller probes show increasing CPU time in [the results][reproduction]. This test does not send the payload to a real app or an external service.

Validate valid Unicode, `+`, repeated/array parameters, malformed encodings, and end-to-end native links through a development build. The shim is a proposed mitigation, not an applied upstream upgrade; package-version scanners will continue to report the old version until the dependency chain is upgraded.

### Finding #4 — Tightening notification privacy leaves old content visible

````text
┌─────────────────────────────────────────────────────────┐
│ FINDING #4                                              │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ MEDIUM
│ Category │ Sensitive information retained in notifications
│ Location │ src/notificationManager.js:362
│ CWE      │ CWE-200 (Exposure of Sensitive Information to an Unauthorized Actor)
├──────────┴──────────────────────────────────────────────┤
│ What's wrong:
│ The privacy screen saves its setting and reconciles scheduled requests.
│ Reconciliation does not remove already-presented medication notifications
│ containing medicine names/doses from the prior Show content setting.
│
│ Why it matters:
│ A person able to view the notification tray can still read the old details
│ after the user selects Hide sensitive content or No info. The future
│ requests are correctly redacted; the leak is retained presented content.
│ Physical visibility and system notification settings constrain exposure.
│
│ The vulnerable code:
│ src/app/notification-privacy.tsx:29
│ ```ts
│ const next = { ...prefs, notificationPrivacy: value };
│ await writeSettings(next);
│ setPrefs(next);
│ await reconcileReminders();
│ router.back();
│ ```
│
│ The fix:
│ Insert this in scheduleSavedMedicines after `const api = await notifications()`
│ and before any reminders-disabled/no-request/permission early return:
│ ```js
│ if (prefs.notificationPrivacy !== 'show') {
│   for (const notification of await api.getPresentedNotificationsAsync()) {
│     const request = notification.request;
│     if (!request.identifier.startsWith(PREFIX)) continue;
│     const safe = reminderContent(prefs, '', request.content.data);
│     if (request.content.title !== safe.title || request.content.body !== safe.body) {
│       await api.dismissNotificationAsync(request.identifier);
│     }
│   }
│ }
│ ```
│ Propagate/report cleanup failures so the UI does not claim full success.
│ Run this common path for privacy changes, imports, resets, and foreground
│ reconciliation. It keeps already-generic compliant reminders visible.
│ Effort: ~30 minutes
└─────────────────────────────────────────────────────────┘
````

Evidence: the reproduction places an actual generated medication request into a mocked presented-notification tray, changes `notificationPrivacy` from `show` to `hide`, then runs actual reconciliation. Future requests contain no test medicine name; the old tray notification still does. Validate `show → hide`, `show → none`, and `hide → none`, including disabled reminders and no active medicines, on Android. Dismissal cannot recall screenshots or guarantee deletion from Android notification history. No claim is made that past exposure can be reversed.

### Finding #5 — Onboarding retains a stale duplicate of profile information

````text
┌─────────────────────────────────────────────────────────┐
│ FINDING #5                                              │
├──────────┬──────────────────────────────────────────────┤
│ Severity │ LOW
│ Category │ Unnecessary retention of personal/health information
│ Location │ src/features/onboarding/storage.ts:14
│ CWE      │ CWE-922 (Insecure Storage of Sensitive Information)
├──────────┴──────────────────────────────────────────────┤
│ What's wrong:
│ Setup serializes the profile, including date of birth, photo URI and notes,
│ to AsyncStorage even though SQLite owns profiles. Migration initializes
│ SQLite but never scrubs this copy. Later profile edits only update SQLite.
│
│ Why it matters:
│ A note removed from the live profile can remain in an old setup snapshot.
│ Reading that snapshot requires app-storage access (for example, a device
│ compromise or diagnostic extraction); this is not a new sandbox bypass.
│ SQLite is also not separately encrypted, so moving data is data minimization,
│ not an encryption fix. Erase all data does clear the onboarding key.
│
│ The vulnerable code:
│ ```ts
│ export async function writeOnboarding(data: OnboardingData): Promise<void> {
│   await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
│ }
│ ```
│
│ The fix:
│ Replace that writer after ensuring profile writes succeed in SQLite first:
│ ```ts
│ export async function writeOnboarding(data: OnboardingData): Promise<void> {
│   await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, profile: null }));
│ }
│ ```
│ Add this helper to onboarding/context.tsx and use it instead of
│ readOnboarding()+initializeProfiles() in BOTH initial-load and retry paths:
│ ```ts
│ async function loadMigratedOnboarding(): Promise<OnboardingData> {
│   const stored = await readOnboarding();
│   await initializeProfiles(stored.profile);
│   const clean = { ...stored, profile: null };
│   await writeOnboarding(clean);
│   return clean;
│ }
│ ```
│ Keep reading legacy profiles until migration succeeds; do not discard
│ them in readOnboarding. The profile screen already saves SQLite first.
│ Use the current SQLite profile for ReadyScreen's name/status instead of
│ data.profile, and stop supplying a profile snapshot to onboarding.save.
│ Effort: ~30 minutes
└─────────────────────────────────────────────────────────┘
````

Evidence: [profile.tsx:58][profile-save] saves the profile to SQLite then also stores it in setup; editing takes a separate branch. [onboarding/context.tsx:17][onboarding-load] imports without cleanup. [database.js:741][profile-migrate] imports only once. The isolated serializer probe confirms synthetic private notes are written to AsyncStorage. Test upgrades from a legacy-only profile, interrupted migration, setup reload, editing/removing notes, photo changes, and erase-all. The migration must not erase the only copy if the SQLite write fails.

## 5. What's Already Done Right

- The screen-level app lock fails closed on an unreadable SecureStore setting and encloses new routes by default. App-lock secrets are not preference-backup fields. Preserve that design while protecting background actions.
- SQLite uses bound values and controlled SQL identifiers. Dose writes validate saved schedules/occurrences, run in transactions, deduplicate actions, and maintain stock accounting. Local family profiles are not incorrectly treated as remote authorization tenants.
- Diagnostics default off and use separate explicit consent categories. The custom transport rebuilds allowlisted payloads, drops dynamic error contents, disables default PII, and aborts pending sends on withdrawal. Existing tests include real Sentry serialization with a mocked transport.
- New private-mode notification payloads redact medicine names and doses; channel visibility is not the sole privacy control. Android system notification restrictions are respected.
- Android backup is disabled, broad media/storage permissions are blocked, profile pictures use app-private documents, and the custom broadcast receiver is not exported.
- Preference imports validate their format/schema and native file size; exports exclude health records, app-lock flags, and diagnostics consent. Native temporary exports are deleted after sharing.
- The lockfile is tracked and registry packages have integrity hashes. No hardcoded privileged credential or env-history exposure was found in the scans performed.

## 6. Checklist Summary

Each original checklist item is assessed separately below. PASS means the reviewed implementation satisfies that check within the stated scope, not that all attack paths are proven safe. Web/backend-specific checks are adapted to local mobile boundaries where useful; absent backend systems are N/A.

### Section 1 — Environment Variables And Secret Management

| Item | Verdict | Evidence and assessment |
| --- | --- | --- |
| **1.1 — Hardcoded secrets** | ✅ PASS | Current-source and historical text scans found no privileged token/key. The only local env credential identified was the ignored `SENTRY_AUTH_TOKEN`; exact-token checks found no copy in tracked source or inspected APK JS/metadata. [diagnostics.ts:9][dsn] contains a public Sentry ingestion DSN, not an account/admin token. Public ingestion is not permission to query project data. Pattern and exact-match scans do not prove absence of every possible secret. |
| **1.2 — .gitignore coverage** | ❌ FAIL | **Finding #1.** [.gitignore:33][ignore] covers `.env*.local`, not `.env`/`.env.production`. No previously committed env file was found in available history. |
| **1.3 — Public prefix leaks** | ✅ PASS | [diagnostics.ts:6][dsn] uses `EXPO_PUBLIC_DIAGNOSTICS_MODE` only as a public build-mode flag. No privileged database, AI, SMTP, or Sentry auth token was found under a public prefix. |
| **1.4 — Console/error leaks of secrets** | ✅ PASS | Console/error/environment searches found no secret logging. [diagnostics.ts:26][diagnostics] rebuilds error payloads and [diagnostics.ts:91][diagnostic-init] disables default PII and restricts outgoing categories. Generic root startup errors avoid interpolating an exception. Raw local error-message coverage is separately PARTIAL in 4.5. |
| **1.5 — Build artifact exposure** | ⚠️ PARTIAL | Existing debug/release APK ZIP entries contain no `.env` or `.map`; selected JS/bundle/JSON/properties content contains no exact local token. A local ignored generated release source map has 2,347 sources and no exact local token. Maps in private build output are not themselves public exposure. These APKs predate this working tree; a fresh release, public web hosting, and Sentry artifact access were not checked. |
| **1.6 — Startup validation** | ⬚ N/A | This offline application requires no server/runtime environment secret to function. Optional diagnostics mode defaults safely; [diagnostics.ts:6][dsn] and [root layout:39][root] do not fall back to unauthenticated remote data access. Build-only Sentry upload credentials are separate from runtime startup. |

### Section 2 — Database Security

| Item | Verdict | Evidence and assessment |
| --- | --- | --- |
| **2.1 — RLS enabled** | ⬚ N/A | [database.js:74][db-migrate] creates local app-private SQLite tables. There is no public PostgreSQL schema, Supabase client, or anonymous remote database access. |
| **2.2 — RLS policies exist** | ⬚ N/A | No RLS engine or remotely queryable tables exist. SQLite integrity and app-entry authorization are the relevant controls. |
| **2.3 — WITH CHECK clauses** | ⬚ N/A | No INSERT/UPDATE RLS policies exist. Local model writes validate their inputs, including at [database.js:247][db-validation]. |
| **2.4 — Policy identity source** | ⬚ N/A | No JWT, `auth.uid()`, or user-metadata authorization policy exists. A selected local family profile is not a separate authenticated account. |
| **2.5 — Service role isolation** | ⬚ N/A | No service-role key or remote database admin client was found in source/configuration. |
| **2.6 — Storage bucket policies** | ⬚ N/A | No cloud storage bucket is used. Native photos are copied to app-private documents at [photos.ts:17][photos]. |
| **2.7 — SQL injection** | ✅ PASS | [database.js:308][db-add] binds values for inserts; updates at [database.js:423][db-update] map accepted fields to fixed column names and bind values. Migration DDL is static. Search of all raw query sites found no user-controlled SQL text interpolation. |
| **2.8 — SECURITY DEFINER functions** | ⬚ N/A | The SQLite schema has no privileged PostgreSQL functions or equivalent server execution boundary. |

### Section 3 — Authentication And Session Management

| Item | Verdict | Evidence and assessment |
| --- | --- | --- |
| **3.1 — Auth middleware exists** | ❌ FAIL | **Finding #2.** Adapted to device authentication: [root layout:51][root-lock] gates screens, but [backgroundActions.ts:10][background] directly invokes [notificationManager.js:532][actions] without the saved lock check. |
| **3.2 — Default-deny routing** | ✅ PASS | [root layout:51][root-lock] wraps the route tree in AppLock, and [AppLock.tsx:93][lock-render] returns no children while loading, locked, or errored. All newly added screens inherit the wrapper. Authentication being optional is a product choice; the separate task bypass is captured in 3.1. |
| **3.3 — getUser() vs getSession()** | ⬚ N/A | No Supabase authentication, session cookie, or JWT exists. Native identity confirmation uses [SecurityManager.js:34][security-auth]. |
| **3.4 — Auth callback handler** | ⬚ N/A | No authorization-code exchange or auth callback route exists. Incoming reminder links are navigation, not OAuth. |
| **3.5 — Session storage** | ⬚ N/A | No account session tokens are stored. The device-authentication preference is stored in SecureStore with device-only accessibility at [SecurityManager.js:5][security-store]. The separate personal-data retention problem is finding #5. |
| **3.6 — Protected API routes** | ⬚ N/A | No application API routes/server actions exist. Background local mutations are explicitly assessed under 3.1 rather than treated as authenticated HTTP endpoints. |
| **3.7 — OAuth security** | ⬚ N/A | No OAuth implementation or provider callback allowlist is present. |
| **3.8 — Password reset flows** | ⬚ N/A | No application passwords/reset tokens exist. Phone credentials and biometric verification are delegated to the OS. |

### Section 4 — Server-Side Validation

| Item | Verdict | Evidence and assessment |
| --- | --- | --- |
| **4.1 — Schema validation** | ✅ PASS | Adapted to the persistence boundary, since no server exists. [database.js:247][db-validation] validates medicine/schedule inputs, [database.js:498][db-dose] checks dose status and saved occurrence eligibility, and [database.js:776][db-profile] validates profile writes. [backup.ts:56][backup-schema] validates import structure. Manual validation is acceptable here; a particular schema library is not required. File resource bounds remain PARTIAL in 8.1. |
| **4.2 — Identity from session** | ⬚ N/A | There is no remote authenticated principal. Choosing a `profileId` intentionally selects among the caregiver's local profiles; it is not a client-supplied identity used to bypass account ownership. Saved notification IDs are checked against SQLite. |
| **4.3 — Input sanitization/XSS** | ✅ PASS | App user values render as React Native text, not executable markup. [landing/app.js:355][landing-html] uses `innerHTML` only for hardcoded showcase data. The privacy renderer escapes Markdown text before HTML output. No user-controlled HTML sink was found. |
| **4.4 — HTTP method enforcement** | ⬚ N/A | No HTTP data-mutation endpoints exist. Route links navigate; they do not directly record doses. Static support contact creates an encoded `mailto:` draft. |
| **4.5 — Error information leaks** | ⚠️ PARTIAL | Root startup and diagnostics use generic/sanitized messages, but [useLocalQuery.ts:18][query-error] and several screen catches display `error.message`, potentially including local SQL/native details. This is behind the device UI boundary; no unauthenticated network disclosure was reproduced. Introduce known-safe validation errors and generic unexpected-error messages; test SQLite/native failure paths. |
| **4.6 — Webhook signatures** | ⬚ N/A | No webhook receiver exists. The native system-event receiver is separate, non-exported, and not an HTTP webhook. |

### Section 5 — Dependency And Package Security

| Item | Verdict | Evidence and assessment |
| --- | --- | --- |
| **5.1 — Audit results** | ❌ FAIL | **Finding #3.** [npm audit JSON][audit]: 0 critical, 0 high, 17 moderate package entries, 0 low. Two underlying advisories: runtime-reachable `decode-uri-component@0.2.2`, and transitive `uuid@7.0.3` in Expo/Xcode build tooling. The installed Xcode consumer uses `uuid.v4()`, not the advisory's affected v3/v5/v6 buffer API; no affected callsite was found. |
| **5.2 — Hallucinated packages** | ⚠️ PARTIAL | Screened all 49 direct package names, lockfile origins, relevant scripts, and available metadata. Forty download/provenance requests succeeded; all returned substantial established usage (lowest 525,550 weekly downloads); nine failed and are listed in [evidence][provenance]. No suspicious invented/typosquatted package was identified. Download counts and known names are signals, not malware assurance; complete maintainer/age and transitive-source review remains unverified. |
| **5.3 — Lockfile committed** | ✅ PASS | `git ls-files` confirms [package-lock.json][lockfile] is tracked. The 1,008 registry package records resolve to `registry.npmjs.org` and carry integrity values. Root project metadata is not a downloaded package. |
| **5.4 — Outdated packages** | ❌ FAIL | **Finding #3** is a known-vulnerable old transitive version. [npm outdated][outdated] also reports 23 direct packages behind latest, seven within declared ranges. Being behind latest alone is not a vulnerability. Use Expo-compatible updates and re-audit; do not jump across SDKs or apply the audit's proposed major downgrades. |
| **5.5 — Unused dependencies** | ⚠️ PARTIAL | Direct packages with no explicit app-source import include `@expo/ui`, `expo-device`, `expo-glass-effect`, `expo-symbols`, and `expo-web-browser`; verify native/plugin/peer uses before removal. Other apparent non-imports such as `react-dom`, `react-native-web`, `react-native-screens`, `expo-font`, and worklets can be platform or transitive requirements. No packages were removed solely on text-search evidence. |

The `uuid` advisory concerns missing buffer bounds checks in selected APIs. It remains an audit debt even though the observed Xcode path uses v4 and no vulnerable invocation was demonstrated. Review a compatible dependency update with Expo tooling, then run `npx expo-doctor`, lint, typecheck, tests, and a native build. [Advisory details](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

The seven in-range direct updates reported on the audit date were `@expo/ui` 57.0.20 → 57.0.21, `expo` 57.0.25 → 57.0.26, `expo-constants` 57.0.19 → 57.0.20, `expo-document-picker` 57.0.2 → 57.0.3, `expo-router` 57.0.23 → 57.0.24, `expo-task-manager` 57.0.20 → 57.0.21, and `react-native-web` 0.21.2 → 0.21.3. These are candidates for validation, not verified fixes for the decoder advisory. Follow the project's `npx expo install` workflow when changing Expo dependencies.

### Section 6 — Rate Limiting

| Item | Verdict | Evidence and assessment |
| --- | --- | --- |
| **6.1 — Expensive operations** | ⬚ N/A | No application API calls a paid AI/payment/email/SMS service on behalf of arbitrary requesters. Diagnostics send directly to Sentry only with consent at [diagnostics.ts:133][transport]. Sentry ingestion quotas and abuse controls are external settings not verified here; the public DSN must not be treated as a secret rate-limit control. |
| **6.2 — Auth endpoints** | ⬚ N/A | No login/signup/password-reset/OTP endpoint exists. Native authentication uses system controls rather than an application password verifier. |
| **6.3 — Rate-limit implementation** | ⬚ N/A | No server rate limiter or server process exists. UI debouncing and serialized local actions are not claimed as network abuse protection. |

### Section 7 — CORS Configuration

| Item | Verdict | Evidence and assessment |
| --- | --- | --- |
| **7.1 — API route CORS** | ⬚ N/A | No sensitive HTTP API is exposed. Metro development headers and static landing assets are not authenticated data endpoints. Deployed hosting headers were not verified. |
| **7.2 — Credentials mode** | ⬚ N/A | No credentialed cross-origin application API or cookie session is implemented. Sentry transport is not a user-session API. |

### Section 8 — File Upload Security

| Item | Verdict | Evidence and assessment |
| --- | --- | --- |
| **8.1 — Server-side validation** | ⚠️ PARTIAL | No server uploads; adapted to local file imports. [backup.ts:35][backup-import] caps declared/native JSON size at 1 MiB and validates parsed schema. Its web branch reads `asset.file.text()` without independently checking `asset.file.size` if picker metadata omits size. [photos.ts:4][photo-picker] uses an image-only picker but has no explicit byte/pixel cap or independent content validation before copying. User selection is required; remote file execution was not found. Add resource bounds and test malformed/oversized local files. |
| **8.2 — Storage permissions** | ✅ PASS | [photos.ts:17][photos] writes native images to `Paths.document`, and [backup.ts:25][backup-export] writes preference-only exports to cache and deletes temporary files after sharing. There is no public bucket or server upload directory. Web data remains within the app origin; app lock is explicitly unavailable on web. |
| **8.3 — Execution prevention** | ✅ PASS | [backup.ts:56][backup-schema] uses `JSON.parse` and a format/settings allowlist, not eval or module loading. Images are rendered as image resources. No imported/uploaded content is executed by an application server or installed as code. |

### Compact verdicts

1.1 ✅ · 1.2 ❌ · 1.3 ✅ · 1.4 ✅ · 1.5 ⚠️ · 1.6 ⬚

2.1 ⬚ · 2.2 ⬚ · 2.3 ⬚ · 2.4 ⬚ · 2.5 ⬚ · 2.6 ⬚ · 2.7 ✅ · 2.8 ⬚

3.1 ❌ · 3.2 ✅ · 3.3 ⬚ · 3.4 ⬚ · 3.5 ⬚ · 3.6 ⬚ · 3.7 ⬚ · 3.8 ⬚

4.1 ✅ · 4.2 ⬚ · 4.3 ✅ · 4.4 ⬚ · 4.5 ⚠️ · 4.6 ⬚

5.1 ❌ · 5.2 ⚠️ · 5.3 ✅ · 5.4 ❌ · 5.5 ⚠️

6.1 ⬚ · 6.2 ⬚ · 6.3 ⬚

7.1 ⬚ · 7.2 ⬚

8.1 ⚠️ · 8.2 ✅ · 8.3 ✅

**41 items: 10 PASS, 4 FAIL, 5 PARTIAL, 22 N/A.** Findings #4 and #5 are additional mobile privacy/storage findings outside the supplied web-oriented checklist. Findings #1–#3 account for the four failed checklist items; #3 appears in both dependency checks and is not counted twice as a finding.

### Reproduction and release follow-up

From the repository root, with the existing locked dependencies installed:

```sh
node docs/security-audit/2026-10-01/reproduce.cjs
```

The [script][repro-script] uses synthetic data, existing test doubles, and short isolated subprocesses. It does not read the real medication database, invoke the phone UI, or send network traffic. It intentionally asserts the currently vulnerable behavior and is an audit reproducer, not a regression test that should remain passing after remediation. Convert each case to a protective regression test when implementing its fix.

Existing release APK inspected: SHA-256 `7778b8c71ff87a4afc882d371eacf0128e27c89c97b475a93b75ac41cd6f464f`. Existing debug APK: `d32569b379a60c23cf69f07ab7ade2e7fdd01c37510b9c5e0c5b7b01b2240a30`. These identify the inspected local artifacts only. No new build, dependency change, native configuration change, deployment, or release was performed.

[inventory]: /Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/source-inventory.json
[lint]: /Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/lint.log
[types]: /Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/typecheck.log
[tests]: /Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/tests.log
[audit]: /Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/npm-audit.json
[outdated]: /Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/npm-outdated.json
[provenance]: /Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/package-provenance.json
[reproduction]: /Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/reproduction-results.jsonl
[repro-script]: /Users/shome/Documents/Projects/DoseTrackerApp/docs/security-audit/2026-10-01/reproduce.cjs
[ignore]: /Users/shome/Documents/Projects/DoseTrackerApp/.gitignore:33
[dsn]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/diagnostics/diagnostics.ts:6
[diagnostics]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/diagnostics/diagnostics.ts:26
[diagnostic-init]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/diagnostics/diagnostics.ts:91
[transport]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/diagnostics/diagnostics.ts:133
[root]: /Users/shome/Documents/Projects/DoseTrackerApp/src/app/_layout.tsx:39
[root-lock]: /Users/shome/Documents/Projects/DoseTrackerApp/src/app/_layout.tsx:51
[lock-render]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/security/AppLock.tsx:93
[security-store]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/security/SecurityManager.js:5
[security-auth]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/security/SecurityManager.js:34
[background]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/notifications/backgroundActions.ts:10
[category]: /Users/shome/Documents/Projects/DoseTrackerApp/src/notificationManager.js:74
[actions]: /Users/shome/Documents/Projects/DoseTrackerApp/src/notificationManager.js:532
[profile-save]: /Users/shome/Documents/Projects/DoseTrackerApp/src/app/profile.tsx:58
[onboarding-load]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/onboarding/context.tsx:17
[profile-migrate]: /Users/shome/Documents/Projects/DoseTrackerApp/src/database.js:741
[db-migrate]: /Users/shome/Documents/Projects/DoseTrackerApp/src/database.js:74
[db-validation]: /Users/shome/Documents/Projects/DoseTrackerApp/src/database.js:247
[db-add]: /Users/shome/Documents/Projects/DoseTrackerApp/src/database.js:308
[db-update]: /Users/shome/Documents/Projects/DoseTrackerApp/src/database.js:423
[db-dose]: /Users/shome/Documents/Projects/DoseTrackerApp/src/database.js:498
[db-profile]: /Users/shome/Documents/Projects/DoseTrackerApp/src/database.js:776
[photos]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/onboarding/photos.ts:17
[photo-picker]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/onboarding/photos.ts:4
[backup-export]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/settings/backup.ts:25
[backup-import]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/settings/backup.ts:35
[backup-schema]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/settings/backup.ts:56
[query-error]: /Users/shome/Documents/Projects/DoseTrackerApp/src/features/doses/useLocalQuery.ts:18
[landing-html]: /Users/shome/Documents/Projects/DoseTrackerApp/landing/app.js:355
[lockfile]: /Users/shome/Documents/Projects/DoseTrackerApp/package-lock.json
