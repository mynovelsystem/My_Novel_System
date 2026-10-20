// ============================================================================
// TEST SUITE: CWS PRIVACY, BUG REPORT CONSENT, & ACCOUNT DELETION INTEGRITY
// ============================================================================
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

console.log("=== CWS PRIVACY & BUG REPORT CONSENT AUDIT SUITE ===\n");

const rootDir = path.resolve(__dirname, "..");
const bgSource = fs.readFileSync(path.join(rootDir, "background.js"), "utf8");
const popupHtmlSource = fs.readFileSync(path.join(rootDir, "popup.html"), "utf8");
const popupJsSource = fs.readFileSync(path.join(rootDir, "popup.js"), "utf8");
const privacyHtmlSource = fs.readFileSync(path.join(rootDir, "privacy.html"), "utf8");
const privacyMdSource = fs.readFileSync(path.join(rootDir, "PRIVACY.md"), "utf8");
const esLocale = JSON.parse(fs.readFileSync(path.join(rootDir, "locales/es.json"), "utf8"));
const enLocale = JSON.parse(fs.readFileSync(path.join(rootDir, "locales/en.json"), "utf8"));
const i18nSource = fs.readFileSync(path.join(rootDir, "i18n.js"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "manifest.json"), "utf8"));

(async () => {
  // ----------------------------------------------------------------------------
  // Test 1: Bug Report UI & Checkboxes Consent Integrity
  // ----------------------------------------------------------------------------
  console.log("[Test 1] Bug Report UI Elements & Consent Integrity:");
  {
    assert.ok(popupHtmlSource.includes('id="reportAttachLogs"'), "reportAttachLogs checkbox present in popup.html");
    assert.ok(popupHtmlSource.includes('id="reportIncludeEmail"'), "reportIncludeEmail checkbox present in popup.html");

    // Verify checkboxes are UNCHECKED by default
    const attachLogsMatch = popupHtmlSource.match(/<input[^>]*id="reportAttachLogs"[^>]*>/);
    assert.ok(attachLogsMatch, "reportAttachLogs input tag found");
    assert.strictEqual(attachLogsMatch[0].includes("checked"), false, "reportAttachLogs must NOT be checked by default");

    const includeEmailMatch = popupHtmlSource.match(/<input[^>]*id="reportIncludeEmail"[^>]*>/);
    assert.ok(includeEmailMatch, "reportIncludeEmail input tag found");
    assert.strictEqual(includeEmailMatch[0].includes("checked"), false, "reportIncludeEmail must NOT be checked by default");

    // Verify popup.js reads both flags and passes them to message payload
    assert.ok(popupJsSource.includes('document.getElementById("reportIncludeEmail")?.checked'), "popup.js checks reportIncludeEmail");
    assert.ok(popupJsSource.includes('document.getElementById("reportAttachLogs")?.checked'), "popup.js checks reportAttachLogs");
    assert.ok(popupJsSource.includes('includeEmail'), "popup.js includes includeEmail in payload");
    assert.ok(popupJsSource.includes('reportIncludeEmail') && popupJsSource.includes('.checked = false'), "popup.js resets checkboxes after sending");

    console.log("  [PASS] UI elements present and strictly unchecked by default (explicit opt-in).");
  }

  // ----------------------------------------------------------------------------
  // Test 2: Multi-Language i18n Consistency & Regional Variants
  // ----------------------------------------------------------------------------
  console.log("\n[Test 2] Multi-Language i18n Consistency & Regional Variants:");
  {
    assert.ok(esLocale.report_include_email, "es.json contains report_include_email");
    assert.ok(enLocale.report_include_email, "en.json contains report_include_email");
    assert.ok(i18nSource.includes('"report_include_email"'), "i18n.js fallback dicts contain report_include_email");

    // Full key parity check between es.json and en.json
    const esKeys = Object.keys(esLocale);
    const enKeys = Object.keys(enLocale);
    assert.strictEqual(esKeys.length, enKeys.length, `Key counts must match (es: ${esKeys.length}, en: ${enKeys.length})`);
    const missingInEn = esKeys.filter((k) => enLocale[k] === undefined);
    const missingInEs = enKeys.filter((k) => esLocale[k] === undefined);
    assert.deepStrictEqual(missingInEn, [], "No keys in es.json missing from en.json");
    assert.deepStrictEqual(missingInEs, [], "No keys in en.json missing from es.json");

    // Regional variants handling verification (es-ES, es-MX, es-419, en-US, en-GB)
    const i18nSandbox = {
      chrome: {
        i18n: { getUILanguage: () => "es-ES" },
        runtime: { getURL: (p) => p },
        storage: { local: { get: async () => ({}) } }
      },
      fetch: async (url) => ({
        json: async () => (url.includes("es.json") ? esLocale : enLocale)
      })
    };
    vm.createContext(i18nSandbox);
    vm.runInContext(i18nSource, i18nSandbox);

    assert.strictEqual(typeof i18nSandbox.normalizeLang, "function", "normalizeLang is defined in i18n.js");
    assert.strictEqual(i18nSandbox.normalizeLang("es-ES"), "es", "es-ES normalizes to es");
    assert.strictEqual(i18nSandbox.normalizeLang("es-MX"), "es", "es-MX normalizes to es");
    assert.strictEqual(i18nSandbox.normalizeLang("es-419"), "es", "es-419 normalizes to es");
    assert.strictEqual(i18nSandbox.normalizeLang("en-US"), "en", "en-US normalizes to en");
    assert.strictEqual(i18nSandbox.normalizeLang("en-GB"), "en", "en-GB normalizes to en");
    assert.strictEqual(i18nSandbox.normalizeLang("fr-FR"), null, "unsupported language returns null");

    // Test setCurrentLang with regional variants
    i18nSandbox.setCurrentLang("en-US");
    assert.strictEqual(i18nSandbox.getCurrentLang(), "en", "setCurrentLang(en-US) sets currentLang to en");
    i18nSandbox.setCurrentLang("es-ES");
    assert.strictEqual(i18nSandbox.getCurrentLang(), "es", "setCurrentLang(es-ES) sets currentLang to es");

    console.log("  - ES:", esLocale.report_include_email);
    console.log("  - EN:", enLocale.report_include_email);
    console.log(`  - 100% key parity verified across ${esKeys.length} dictionary entries.`);
    console.log("  - Regional variants (es-ES, es-MX, en-US, en-GB) normalized and verified.");
    console.log("  [PASS] Multi-language consistency, regional variants, and key parity verified.");
  }

  // ----------------------------------------------------------------------------
  // Test 3: Background handleSubmitBugReport Strict Privacy Execution
  // ----------------------------------------------------------------------------
  console.log("\n[Test 3] Background handleSubmitBugReport Execution & Privacy Isolation:");
  {
    function createTestSandbox(initialStorage, customFetch, mockGetValidAuth, mockTab) {
      let sentPayload = null;
      let sentUrl = null;
      let tabsQueried = false;

      const mockChrome = {
        runtime: {
          getManifest: () => ({ version: "4.0.0" }),
          onMessage: { addListener: () => {} },
          onInstalled: { addListener: () => {} }
        },
        storage: {
          local: {
            get: async (keys) => {
              const res = {};
              for (const k of keys) {
                if (initialStorage[k] !== undefined) res[k] = initialStorage[k];
              }
              return res;
            },
            set: async () => {},
            remove: async () => {}
          }
        },
        tabs: {
          query: async (queryInfo) => {
            tabsQueried = true;
            if (mockTab) return [mockTab];
            return [{ id: 99, url: "https://testnovel.com/chapter-1", title: "Test Novel Chapter 1" }];
          }
        }
      };

      const fetchHandler = customFetch || (async (url, opts) => {
        sentUrl = url;
        sentPayload = JSON.parse(opts.body);
        return { ok: true, status: 200, json: async () => ({}) };
      });

      const sandbox = {
        chrome: mockChrome,
        fetch: fetchHandler,
        console: { log: () => {}, warn: () => {}, error: () => {} },
        importScripts: () => {},
        Date,
        String,
        Number,
        Boolean,
        Array,
        Object,
        JSON,
        isFinite,
        setTimeout,
        clearTimeout,
        Promise,
        encodeURIComponent,
        FIREBASE_DB_URL: "https://novel-tracker-1d134-default-rtdb.firebaseio.com",
        FIREBASE_API_KEY: "AIzaTestKeyMock",
        appendDiagnosticLog: async () => {},
        withStorageLock: async (fn) => fn()
      };

      if (typeof mockGetValidAuth === "function") {
        sandbox.getValidAuth = mockGetValidAuth;
      }

      vm.createContext(sandbox);

      // Extract helpers and handleSubmitBugReport function implementation from background.js
      const getFirebaseUrlMatch = bgSource.match(/function getFirebaseUrl\(path, idToken\)[\s\S]*?\n\}/);
      if (getFirebaseUrlMatch) vm.runInContext(getFirebaseUrlMatch[0], sandbox);
      const fnCodeMatch = bgSource.match(/async function handleSubmitBugReport\(payload\)[\s\S]*?\n\}/);
      assert.ok(fnCodeMatch, "handleSubmitBugReport function found in background.js");
      vm.runInContext(fnCodeMatch[0], sandbox);
      const sanitizeMatch = bgSource.match(/function sanitizeLogsForReport\(logs\)[\s\S]*?\n\}/);
      assert.ok(sanitizeMatch, "sanitizeLogsForReport function found in background.js");
      vm.runInContext(sanitizeMatch[0], sandbox);

      return {
        runSubmit: (payload) => sandbox.handleSubmitBugReport(payload),
        sanitizeLogs: (logs) => sandbox.sanitizeLogsForReport(logs),
        getLastPayload: () => sentPayload,
        getLastUrl: () => sentUrl,
        wasTabsQueried: () => tabsQueried
      };
    }

    // Case A: User is logged in with email, but includeEmail is FALSE and attachLogs is FALSE
    {
      const initialStorage = {
        auth: { uid: "user_123", email: "secret_user@example.com", idToken: "tok_123" },
        diagnosticLogs: [{ event: "TEST_LOG_1" }, { event: "TEST_LOG_2" }]
      };
      const testEnv = createTestSandbox(initialStorage);
      const result = await testEnv.runSubmit({
        category: "wrong_name",
        message: "Title is wrong",
        attachLogs: false,
        includeEmail: false
      });

      assert.strictEqual(result.ok, true, "Report submission returns ok: true");
      const payload = testEnv.getLastPayload();
      assert.strictEqual(payload.userEmail, "anonymous", "Email MUST BE anonymous when includeEmail is false");
      assert.strictEqual(payload.activeTab, undefined, "activeTab MUST BE undefined (omitted) when attachLogs is false");
      assert.strictEqual(payload.recentLogs, undefined, "recentLogs MUST BE undefined (omitted) when attachLogs is false");
      assert.strictEqual(testEnv.wasTabsQueried(), false, "tabs.query MUST NOT be called when attachLogs is false");
      console.log("  [PASS] Case A: Authenticated user report with false consent remains 100% anonymous without logs/tabs.");
    }

    // Case B: User enables attachLogs=true, but includeEmail is FALSE
    {
      const initialStorage = {
        auth: { uid: "user_456", email: "reader@domain.com", idToken: "tok_456" },
        diagnosticLogs: [{ event: "EVENT_A" }, { event: "EVENT_B" }]
      };
      const testEnv = createTestSandbox(initialStorage);
      const result = await testEnv.runSubmit({
        category: "not_detected",
        message: "No chapters detected here",
        attachLogs: true,
        includeEmail: false
      });

      assert.strictEqual(result.ok, true, "Report submission returns ok: true");
      const payload = testEnv.getLastPayload();
      assert.strictEqual(payload.userEmail, "anonymous", "Email MUST STILL BE anonymous even if attachLogs is true");
      assert.ok(payload.activeTab, "activeTab is included when attachLogs is true");
      assert.strictEqual(payload.activeTab.url, "https://testnovel.com/chapter-1");
      assert.ok(Array.isArray(payload.recentLogs), "recentLogs is array when attachLogs is true");
      assert.strictEqual(testEnv.wasTabsQueried(), true, "tabs.query was invoked for active tab info");
      console.log("  [PASS] Case B: attachLogs=true attaches diagnostics while email strictly remains anonymous.");
    }

    // Case C: User explicitly checks includeEmail=true while logged in
    {
      const initialStorage = {
        auth: { uid: "user_789", email: "willing_contact@test.com", idToken: "tok_789" },
        diagnosticLogs: []
      };
      const testEnv = createTestSandbox(initialStorage);
      const result = await testEnv.runSubmit({
        category: "sync",
        message: "Sync conflict noticed",
        attachLogs: false,
        includeEmail: true
      });

      assert.strictEqual(result.ok, true, "Report submission returns ok: true");
      const payload = testEnv.getLastPayload();
      assert.strictEqual(payload.userEmail, "willing_contact@test.com", "User email included when explicitly authorized");
      assert.strictEqual(payload.activeTab, undefined, "activeTab undefined (omitted) since attachLogs was false");
      console.log("  [PASS] Case C: includeEmail=true correctly conveys email upon explicit user consent.");
    }

    // Case D: User checks includeEmail=true but has NO account (guest) -> MUST BE REJECTED
    {
      const initialStorage = {
        diagnosticLogs: []
      };
      const testEnv = createTestSandbox(initialStorage);
      const result = await testEnv.runSubmit({
        category: "other",
        message: "Great extension!",
        attachLogs: false,
        includeEmail: true
      });

      assert.strictEqual(result.ok, false, "Report submission rejected without active session");
      assert.strictEqual(result.error, "AUTH_REQUIRED", "Error code is 'AUTH_REQUIRED'");
      assert.ok(
        result.message && (result.message.includes("Inicia sesión") || result.message.includes("Sign in")),
        "Controlled i18n error message returned"
      );
      assert.strictEqual(testEnv.getLastPayload(), null, "No network request dispatched without auth token");
      console.log("  [PASS] Case D: Unauthenticated user cleanly rejected with controlled i18n error.");
    }

    // Case E: Empty message rejection
    {
      const testEnv = createTestSandbox({});
      const result = await testEnv.runSubmit({
        category: "other",
        message: "   ",
        attachLogs: false,
        includeEmail: false
      });

      assert.strictEqual(result.ok, false, "Empty message rejected");
      assert.strictEqual(result.error, "empty", "Error code is 'empty'");
      assert.strictEqual(testEnv.getLastPayload(), null, "No network request dispatched on empty message");
      console.log("  [PASS] Case E: Blank message rejected before network dispatch.");
    }

    // Case F: getValidAuth renewal integration
    {
      let getValidAuthCalled = false;
      const mockGetValidAuth = async () => {
        getValidAuthCalled = true;
        return { uid: "user_refreshed", email: "fresh@domain.com", idToken: "fresh_token_xyz" };
      };

      const testEnv = createTestSandbox(
        { auth: { uid: "user_stale", email: "stale@domain.com", idToken: "stale_token" } },
        null,
        mockGetValidAuth
      );

      const result = await testEnv.runSubmit({
        category: "sync",
        message: "Testing fresh token dispatch",
        attachLogs: false,
        includeEmail: true
      });

      assert.strictEqual(result.ok, true, "Submission succeeds with renewed auth");
      assert.strictEqual(getValidAuthCalled, true, "getValidAuth was invoked to refresh credentials");
      assert.strictEqual(testEnv.getLastPayload().userEmail, "fresh@domain.com", "Refreshed email used");
      assert.ok(testEnv.getLastUrl().includes("auth=fresh_token_xyz"), "Refreshed token encoded in auth query param");
      console.log("  [PASS] Case F: getValidAuth renewal seamlessly refreshes credentials and encodes auth param.");
    }

    // Case G: Deep Sanitization of Diagnostic Logs (tokens, secrets, nested objects, length bounds)
    {
      const testEnv = createTestSandbox({});
      const rawDiagnosticLogs = [
        {
          event: "LOGIN_ATTEMPT",
          password: "super_secret_password",
          idToken: "token_12345",
          apiKey: "AIzaSyCBLWg72OnEmDUUxhc_33MQ9bXdu9rnSTU",
          user_auth: "admin_role",
          status: 200,
          url: "https://user:mypassword@novel-tracker.firebaseio.com/data?key=AIzaSyCBLWg72OnEmDUUxhc_33MQ9bXdu9rnSTU&auth=jwt_secret_token&token=query_token_123",
          header: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature_secret",
          longData: "X".repeat(1200),
          meta: {
            step: 3,
            secret_field: "must_not_appear",
            nestedArray: ["safe_val_1", "safe_val_2"]
          }
        },
        null,
        "malformed_string_log",
        { event: "CLEAN_EVENT", ok: true }
      ];

      const sanitized = testEnv.sanitizeLogs(rawDiagnosticLogs);
      assert.strictEqual(Array.isArray(sanitized), true, "Sanitized logs must be array");
      assert.strictEqual(sanitized[0].password, undefined, "password field must be purged");
      assert.strictEqual(sanitized[0].idToken, undefined, "idToken field must be purged");
      assert.strictEqual(sanitized[0].apiKey, undefined, "apiKey field must be purged");
      assert.strictEqual(sanitized[0].user_auth, undefined, "user_auth field must be purged");
      assert.strictEqual(sanitized[0].event, "LOGIN_ATTEMPT");
      assert.strictEqual(sanitized[0].status, 200);

      // Secret string pattern redaction
      assert.ok(!sanitized[0].url.includes("AIzaSyCBLWg72OnEmDUUxhc_33MQ9bXdu9rnSTU"), "API Key redacted from URL string");
      assert.ok(!sanitized[0].url.includes("jwt_secret_token"), "auth parameter secret token redacted from URL string");
      assert.ok(!sanitized[0].url.includes("query_token_123"), "token parameter secret redacted from URL string");
      assert.ok(!sanitized[0].url.includes("mypassword"), "URL credentials redacted");
      assert.ok(sanitized[0].url.includes("auth=[REDACTED]"), "auth query param replaced with [REDACTED]");
      assert.ok(sanitized[0].url.includes("token=[REDACTED]"), "token query param replaced with [REDACTED]");
      assert.ok(sanitized[0].url.includes("[CREDENTIALS_REDACTED]"), "URL credentials replaced with [CREDENTIALS_REDACTED]");
      assert.ok(!sanitized[0].header.includes("signature_secret"), "JWT secret redacted from header string");

      // Length bound
      assert.strictEqual(sanitized[0].longData.length, 500, "String field strictly capped at 500 characters");

      // Nested structures
      assert.strictEqual(sanitized[0].meta.step, 3, "Nested safe numeric preserved");
      assert.strictEqual(sanitized[0].meta.secret_field, undefined, "Nested sensitive key purged");
      assert.deepStrictEqual([...sanitized[0].meta.nestedArray], ["safe_val_1", "safe_val_2"], "Nested array preserved");

      // Malformed inputs handled safely
      assert.strictEqual(Object.keys(sanitized[1]).length, 0, "null entry yields safe empty object");
      assert.strictEqual(Object.keys(sanitized[2]).length, 0, "string entry yields safe empty object");
      assert.strictEqual(sanitized[3].event, "CLEAN_EVENT");
      assert.strictEqual(sanitized[3].ok, true);

      console.log("  [PASS] Case G: Deep sanitization strictly purges sensitive keys, redacts tokens in strings, bounds lengths, and handles nested/malformed structures.");
    }

    // Case H: Active Tab URL sanitization (credentials and token query param redaction)
    {
      const initialStorage = {
        auth: { uid: "user_case_h", idToken: "token_case_h" },
        diagnosticLogs: []
      };
      const customTab = {
        url: "https://user:secretpass@novelreader.com/chapter-5?token=SECRET_SESSION_TOKEN&apiKey=AIzaSy123456789012345678901234567890123",
        title: "Novel Chapter 5 - Safe Title"
      };
      const testEnv = createTestSandbox(initialStorage, null, null, customTab);
      const result = await testEnv.runSubmit({
        category: "formatting",
        message: "Check tab sanitization",
        attachLogs: true,
        includeEmail: false
      });

      assert.strictEqual(result.ok, true);
      const payload = testEnv.getLastPayload();
      assert.ok(payload.activeTab, "activeTab present");
      assert.ok(!payload.activeTab.url.includes("SECRET_SESSION_TOKEN"), "Token redacted from activeTab URL");
      assert.ok(!payload.activeTab.url.includes("secretpass"), "Credentials redacted from activeTab URL");
      console.log("  [PASS] Case H: Active tab URL safely sanitized against leaked credentials and tokens.");
    }
  }

  // ----------------------------------------------------------------------------
  // Test 4: Privacy Policy & Legal Terms Coherence
  // ----------------------------------------------------------------------------
  console.log("\n[Test 4] Privacy Policy Coherence (privacy.html, PRIVACY.md & docs/index.html):");
  {
    const docsIndexPath = path.join(rootDir, "docs", "index.html");
    assert.ok(fs.existsSync(docsIndexPath), "Public docs/index.html must exist for GitHub Pages");
    const docsIndexSource = fs.readFileSync(docsIndexPath, "utf8");

    const policyDocs = [
      ["privacy.html", privacyHtmlSource],
      ["PRIVACY.md", privacyMdSource],
      ["docs/index.html", docsIndexSource]
    ];

    for (const [name, doc] of policyDocs) {
      // 1. Contact email maintained
      assert.ok(doc.includes("mynovelsystem@gmail.com"), `${name} must include contact email mynovelsystem@gmail.com`);

      // 2. Publication date intact
      assert.ok(doc.includes("19 de octubre de 2026"), `${name} must preserve update date 19 de octubre de 2026`);

      // 3. No sale of data / No advertising declaration
      assert.ok(
        doc.toLowerCase().includes("no vende") && doc.toLowerCase().includes("publicidad"),
        `${name} must explicitly declare that data is not sold and no advertising is used`
      );

      // 4. In-extension account deletion explained
      assert.ok(
        doc.includes("Eliminar cuenta") && doc.includes("Firebase"),
        `${name} must explain the in-app account deletion capability`
      );

      // 5. Bug reporting consent and anonymous default explained
      assert.ok(
        doc.toLowerCase().includes("anónimo") || doc.toLowerCase().includes("anónimos"),
        `${name} must state bug reports are anonymous by default`
      );
      assert.ok(
        doc.includes("Incluir mi correo de contacto"),
        `${name} must detail the explicit email consent option`
      );
    }
    console.log("  [PASS] Both privacy.html and PRIVACY.md meet all legal and store policy requirements.");
  }

  // ----------------------------------------------------------------------------
  // Test 5: Firebase RTDB Endpoints & Security Scopes
  // ----------------------------------------------------------------------------
  console.log("\n[Test 5] Firebase RTDB Routes & Scope Verification:");
  {
    // Check endpoints in background.js
    assert.ok(bgSource.includes("/reports.json"), "Bug reports routed to /reports.json");
    assert.ok(bgSource.includes("/users/${auth.uid}/novels.json"), "User novels isolated to /users/${auth.uid}/");
    assert.ok(bgSource.includes("/users/${auth.uid}/stats.json"), "User stats isolated to /users/${auth.uid}/");
    assert.ok(bgSource.includes("/users/${auth.uid}/domainBlacklist.json"), "User blacklist isolated to /users/${auth.uid}/");
    assert.ok(bgSource.includes("/users/${auth.uid}.json"), "Account deletion purges /users/${auth.uid}.json");

    // Verify all RTDB calls target only expected routes (via getFirebaseUrl or dbCleanUrl)
    const matches = bgSource.match(/getFirebaseUrl\(`([^`]+)`/g) || bgSource.match(/fetch\(`\$\{dbCleanUrl\}\/([^`]+)`/g) || [];
    assert.ok(matches.length >= 5, "Expected at least 5 RTDB calls in background.js");
    for (const m of matches) {
      const route = m.replace(/^getFirebaseUrl\(`\/?/, "").replace(/^fetch\(`\$\{dbCleanUrl\}\//, "").replace(/`$/, "");
      const isUserRoute = route.startsWith("users/${auth.uid}");
      const isReportRoute = route.startsWith("reports.json");
      assert.ok(isUserRoute || isReportRoute, `Unexpected RTDB route in background.js: ${route}`);
    }
    console.log(`  [PASS] All ${matches.length} RTDB endpoints strictly restricted to /users/\${auth.uid}/* and /reports.json.`);
  }

  // ----------------------------------------------------------------------------
  // Test 6: Zero Functional Supabase Integrations
  // ----------------------------------------------------------------------------
  console.log("\n[Test 6] Supabase Residual Verification:");
  {
    assert.strictEqual(manifest.host_permissions.some((h) => h.includes("supabase")), false, "No supabase in manifest.json");
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    assert.strictEqual(Object.keys(deps).some((d) => d.includes("supabase")), false, "No supabase dependencies in package.json");

    // Check background.js: only harmless cleanup of deprecated keys allowed
    const bgLinesWithSupabase = bgSource.split("\n").filter((l) => l.toLowerCase().includes("supabase"));
    for (const line of bgLinesWithSupabase) {
      const isCleanup = line.includes("chrome.storage.local.remove") || line.includes("supabase_auth") || line.includes("supabase_config") || line.includes("pending_supabase_signup_email");
      assert.ok(isCleanup, `Unexpected active supabase reference in background.js: ${line}`);
    }
    console.log("  [PASS] Zero active Supabase functional code; legacy key cleanup preserved without data loss.");
  }

  // ----------------------------------------------------------------------------
  // Test 7: API Call Audit for 'tabs' and Minimal Permissions
  // ----------------------------------------------------------------------------
  console.log("\n[Test 7] Manifest Permissions Justification Audit:");
  {
    assert.ok(manifest.permissions.includes("tabs"), "Manifest includes 'tabs'");
    assert.strictEqual(manifest.permissions.includes("activeTab"), false, "Manifest must NOT include redundant 'activeTab'");

    // Check that chrome.tabs.onUpdated, chrome.tabs.onActivated, chrome.tabs.onRemoved exist in background.js
    assert.ok(bgSource.includes("chrome.tabs.onUpdated"), "chrome.tabs.onUpdated requires 'tabs'");
    assert.ok(bgSource.includes("chrome.tabs.onActivated"), "chrome.tabs.onActivated requires 'tabs'");
    assert.ok(bgSource.includes("chrome.tabs.onRemoved"), "chrome.tabs.onRemoved requires 'tabs'");
    assert.ok(bgSource.includes("chrome.tabs.query({})"), "chrome.tabs.query({}) requires 'tabs'");

    console.log("  [PASS] 'tabs' permission required by multi-tab lifecycle listeners & domain blacklisting.");
    console.log("  [PASS] 'activeTab' permission removed as redundant with 'tabs' to minimize attack surface.");
  }

  console.log("\n>>> ALL CWS PRIVACY & BUG REPORT TESTS PASSED (100%)! <<<");
})().catch((err) => {
  console.error("FATAL ERROR IN TEST SUITE:", err);
  process.exit(1);
});
