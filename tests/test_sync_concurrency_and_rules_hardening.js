// ============================================================================
// TEST SUITE: SYNC CONCURRENCY, ETAGS, PULL CACHE & FIREBASE RULES HARDENING
// Validates the 9 mandatory scenarios for cross-device sync & cloud persistence
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("=== RUNNING SYNC CONCURRENCY & RULES HARDENING TEST SUITE ===\n");

const rootDir = path.resolve(__dirname, "..");
const i18nSource = fs.readFileSync(path.join(rootDir, "i18n.js"), "utf8");
const achSource = fs.readFileSync(path.join(rootDir, "achievements_data.js"), "utf8");
const bgSource = fs.readFileSync(path.join(rootDir, "background.js"), "utf8");
const rulesSource = fs.readFileSync(path.join(rootDir, "database.rules.json"), "utf8");
const rtdbRules = JSON.parse(rulesSource);

// Helper: build sandbox with background.js loaded
function createSandbox(initialStore = {}, mockFetchHandler = null) {
  const store = { ...initialStore };

  const mockChrome = {
    _store: store,
    runtime: {
      id: "test-ext-id",
      getManifest: () => ({ version: "4.0.0" }),
      getURL: (p) => p || "",
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: { addListener: () => {} },
      sendMessage: () => {},
      lastError: null
    },
    storage: {
      local: {
        get: async (keys) => {
          if (keys === null) return { ...store };
          if (typeof keys === "string") return { [keys]: store[keys] };
          if (Array.isArray(keys)) {
            const res = {};
            keys.forEach((k) => {
              if (store[k] !== undefined) res[k] = store[k];
            });
            return res;
          }
          if (typeof keys === "object") {
            const res = {};
            for (const [k, v] of Object.entries(keys)) {
              res[k] = store[k] !== undefined ? store[k] : v;
            }
            return res;
          }
          return { ...store };
        },
        set: async (items) => {
          Object.assign(store, items);
        },
        remove: async (keys) => {
          const arr = Array.isArray(keys) ? keys : [keys];
          arr.forEach((k) => delete store[k]);
        }
      },
      onChanged: { addListener: () => {} }
    },
    action: {
      setIcon: async () => {},
      setBadgeText: async () => {},
      setBadgeBackgroundColor: async () => {},
      setTitle: async () => {}
    },
    tabs: {
      query: async () => [],
      get: async (id) => ({ id, incognito: false }),
      create: async () => ({ id: 2 }),
      update: async () => ({ id: 1 }),
      sendMessage: async () => {},
      onActivated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} }
    },
    alarms: {
      create: () => {},
      clear: () => {},
      get: async () => null,
      getAll: async () => [],
      onAlarm: { addListener: () => {} }
    },
    omnibox: {
      onInputChanged: { addListener: () => {} },
      onInputEntered: { addListener: () => {} }
    },
    commands: {
      onCommand: { addListener: () => {} }
    },
    notifications: {
      create: () => {},
      onClicked: { addListener: () => {} }
    }
  };

  const defaultFetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({})
  });

  const sandbox = {
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {}
    },
    chrome: mockChrome,
    setTimeout: (fn, ms) => setTimeout(fn, ms || 0),
    clearTimeout: () => {},
    setInterval: () => {},
    clearInterval: () => {},
    fetch: mockFetchHandler || defaultFetch,
    URL,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Promise,
    parseFloat,
    parseInt,
    isNaN,
    importScripts: () => {},
    store // direct reference for assertions
  };

  vm.createContext(sandbox);
  vm.runInContext(i18nSource, sandbox);
  vm.runInContext(achSource, sandbox);
  vm.runInContext(bgSource, sandbox);
  return sandbox;
}

// ----------------------------------------------------------------------------
// SCENARIO 1: Computer A adds novel, Computer B has older copy
// ----------------------------------------------------------------------------
console.log("[Scenario 1] Computer A adds novel, Computer B preserves both (no overwrite):");
{
  const sandbox = createSandbox();
  const mergeNovelsMaps = sandbox.mergeNovelsMaps;

  // Cloud already has novel-A from Computer A
  const cloudMap = {
    "novel-A": {
      seriesId: "novel-A",
      novelName: "Lord of the Mysteries",
      novelUrl: "https://example.com/lotm",
      chapter: "100",
      updatedAt: 1000
    }
  };

  // Local Computer B has novel-B, but doesn't have novel-A yet
  const localMap = {
    "novel-B": {
      seriesId: "novel-B",
      novelName: "Shadow Slave",
      novelUrl: "https://example.com/shadow-slave",
      chapter: "50",
      updatedAt: 2000
    }
  };

  const { mergedNovels } = mergeNovelsMaps(localMap, cloudMap, true);
  const allNovels = Object.values(mergedNovels);
  const novelA = allNovels.find((n) => n.novelName === "Lord of the Mysteries");
  const novelB = allNovels.find((n) => n.novelName === "Shadow Slave");

  assert.ok(novelA, "Cloud novel-A must be preserved in merged result");
  assert.ok(novelB, "Local novel-B must be preserved in merged result");
  assert.strictEqual(novelA.chapter, "100");
  assert.strictEqual(novelB.chapter, "50");

  console.log("  [PASS] Computer B merge successfully retains both novel-A and novel-B without wiping remote.");
}

// ----------------------------------------------------------------------------
// SCENARIO 2: Both computers add different novels concurrently
// ----------------------------------------------------------------------------
console.log("\n[Scenario 2] Concurrent additions from Computer A and Computer B:");
{
  const sandbox = createSandbox();
  const mergeNovelsMaps = sandbox.mergeNovelsMaps;

  const computerA_Novels = {
    "series-1": { seriesId: "series-1", novelName: "Reverend Insanity", chapter: "200", updatedAt: 1000 },
    "series-2": { seriesId: "series-2", novelName: "Omniscient Reader", chapter: "120", updatedAt: 1100 }
  };

  const computerB_Novels = {
    "series-2": { seriesId: "series-2", novelName: "Omniscient Reader", chapter: "125", updatedAt: 1200 },
    "series-3": { seriesId: "series-3", novelName: "Cradle", chapter: "45", updatedAt: 1300 }
  };

  const { mergedNovels } = mergeNovelsMaps(computerB_Novels, computerA_Novels, true);
  const allNovels = Object.values(mergedNovels);
  assert.strictEqual(allNovels.length, 3, "Union of all novels must be preserved");

  const ri = allNovels.find((n) => n.novelName === "Reverend Insanity");
  const or = allNovels.find((n) => n.novelName === "Omniscient Reader");
  const cr = allNovels.find((n) => n.novelName === "Cradle");

  assert.ok(ri && or && cr, "All novels preserved");
  assert.strictEqual(ri.chapter, "200");
  assert.strictEqual(or.chapter, "125"); // Computer B had newer updatedAt
  assert.strictEqual(cr.chapter, "45");

  console.log("  [PASS] Union of all concurrent novels preserved with conflict-free resolution.");
}

// ----------------------------------------------------------------------------
// SCENARIO 3: Both modify the same novel (with and without allowRewind)
// ----------------------------------------------------------------------------
console.log("\n[Scenario 3] Same novel modified concurrently (with & without allowRewind):");
{
  const sandbox = createSandbox();
  const mergeNovelsMaps = sandbox.mergeNovelsMaps;

  const remote = {
    "ss": { seriesId: "ss", novelName: "Shadow Slave", chapter: "500", updatedAt: 1000 }
  };
  const localOlderChapNewerTime = {
    "ss": { seriesId: "ss", novelName: "Shadow Slave", chapter: "400", updatedAt: 5000 }
  };

  // Case 3A: allowRewind = false -> Highest chapter MUST WIN
  {
    const { mergedNovels } = mergeNovelsMaps(localOlderChapNewerTime, remote, false);
    const ss = Object.values(mergedNovels).find((n) => n.novelName === "Shadow Slave");
    assert.ok(ss);
    assert.strictEqual(
      String(ss.chapter),
      "500",
      "When allowRewind is false, chapter 500 must win over chapter 400 despite older updatedAt"
    );
    console.log("  [PASS] allowRewind: false preserves maximum chapter progress (500 > 400).");
  }

  // Case 3B: allowRewind = true -> Most recent updatedAt wins
  {
    const { mergedNovels } = mergeNovelsMaps(localOlderChapNewerTime, remote, true);
    const ss = Object.values(mergedNovels).find((n) => n.novelName === "Shadow Slave");
    assert.ok(ss);
    assert.strictEqual(
      String(ss.chapter),
      "400",
      "When allowRewind is true, more recent updatedAt (5000) allows rewinding to chapter 400"
    );
    console.log("  [PASS] allowRewind: true honors user intention to rewind based on timestamp.");
  }
}

// ----------------------------------------------------------------------------
// SCENARIO 4: One advances chapter while other edits metadata (customName)
// ----------------------------------------------------------------------------
console.log("\n[Scenario 4] Simultaneous chapter advancement and customName editing:");
{
  const sandbox = createSandbox();
  const mergeNovelsMaps = sandbox.mergeNovelsMaps;

  // Computer A advanced chapter to 850
  const computerA = {
    "lotm": {
      seriesId: "lotm",
      novelName: "Lord of the Mysteries",
      novelUrl: "https://example.com/lotm",
      chapter: "850",
      maxCounted: 850,
      updatedAt: 2000
    }
  };

  // Computer B customized the display name
  const computerB = {
    "lotm": {
      seriesId: "lotm",
      novelName: "Lord of the Mysteries",
      customName: "El Señor de los Misterios (Favorito)",
      novelUrl: "https://example.com/lotm",
      chapter: "800",
      maxCounted: 800,
      updatedAt: 1500
    }
  };

  const { mergedNovels } = mergeNovelsMaps(computerB, computerA, false);
  const entry = Object.values(mergedNovels).find(
    (n) => n.novelName === "Lord of the Mysteries" || n.customName?.includes("Misterios")
  );

  assert.ok(entry, "Merged entry must exist");
  assert.strictEqual(entry.chapter, "850", "Must have chapter 850 from Computer A");
  assert.strictEqual(entry.customName, "El Señor de los Misterios (Favorito)", "Must preserve customName from Computer B");
  assert.strictEqual(entry.maxCounted, 850, "maxCounted must be 850");

  console.log("  [PASS] Merged entry combines highest chapter (850) and customized title successfully.");
}

// ----------------------------------------------------------------------------
// SCENARIO 5: Simultaneous writes triggering ETag HTTP 412 and retry recovery
// ----------------------------------------------------------------------------
console.log("\n[Scenario 5] Concurrency conflict: ETag HTTP 412 triggers merge & retry recovery:");
(async () => {
  let attempt = 0;
  const mockFetch = async (url, opts = {}) => {
    const method = opts.method || "GET";

    if (url.includes("/novels.json")) {
      if (method === "GET") {
        if (attempt === 0) {
          return {
            ok: true,
            status: 200,
            headers: { get: (h) => (h.toLowerCase() === "etag" ? '"etag-version-1"' : null) },
            json: async () => ({
              "novel-remote-1": { seriesId: "novel-remote-1", novelName: "Omniscient Reader", chapter: "10" }
            })
          };
        } else {
          // Second GET after 412 conflict
          return {
            ok: true,
            status: 200,
            headers: { get: (h) => (h.toLowerCase() === "etag" ? '"etag-version-2"' : null) },
            json: async () => ({
              "novel-remote-1": { seriesId: "novel-remote-1", novelName: "Omniscient Reader", chapter: "12" },
              "novel-remote-2": { seriesId: "novel-remote-2", novelName: "Overgeared", chapter: "1" }
            })
          };
        }
      } else if (method === "PUT") {
        attempt++;
        const ifMatch = opts.headers && opts.headers["If-Match"];
        if (ifMatch === '"etag-version-1"') {
          // First PUT fails with 412 Precondition Failed
          return {
            ok: false,
            status: 412,
            headers: { get: () => null },
            json: async () => ({ error: "Precondition Failed" })
          };
        } else if (ifMatch === '"etag-version-2"') {
          // Second PUT succeeds with new ETag
          return {
            ok: true,
            status: 200,
            headers: { get: (h) => (h.toLowerCase() === "etag" ? '"etag-version-3"' : null) },
            json: async () => ({ ok: true })
          };
        }
      }
    }

    // Default stats & blacklist response
    return {
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => ({})
    };
  };

  const initialStore = {
    auth: { uid: "test-user-123", idToken: "token-abc", refreshToken: "ref-xyz", expiresAt: Date.now() + 3600000 },
    settings: { allowRewind: false },
    savedNovels: {
      "local-novel": { seriesId: "local-novel", novelName: "Solo Leveling", chapter: "5" }
    }
  };

  const sandbox = createSandbox(initialStore, mockFetch);
  const pushToCloudUnlocked = sandbox.pushToCloudUnlocked;

  const result = await pushToCloudUnlocked(sandbox.store.savedNovels);

  assert.strictEqual(result.ok, true, "pushToCloudUnlocked must succeed after handling 412");
  assert.strictEqual(result.retries, 1, "Must have succeeded on retry attempt 1");

  // Verify consolidated local store has all novels (local + both remote from 2nd GET)
  const saved = Object.values(sandbox.store.savedNovels);
  assert.ok(saved.find((n) => n.novelName === "Solo Leveling"), "Local novel preserved");
  assert.ok(saved.find((n) => n.novelName === "Omniscient Reader"), "Remote novel 1 preserved");
  assert.ok(saved.find((n) => n.novelName === "Overgeared"), "Remote novel 2 from conflict branch preserved");

  // Verify persistent sync metadata recorded new ETag
  const meta = sandbox.store["cloud_sync_meta_test-user-123"];
  assert.ok(meta, "cloud_sync_meta must be set in local storage");
  assert.strictEqual(meta.novelsETag, '"etag-version-3"', "Must store latest ETag");

  console.log("  [PASS] HTTP 412 caught, remote novel re-merged, retry with new ETag succeeded.");
})().then(() => {

  // ----------------------------------------------------------------------------
  // SCENARIO 6: Service worker restarts and pull cache persists in storage
  // ----------------------------------------------------------------------------
  console.log("\n[Scenario 6] Service worker restart & persistent pull cache in chrome.storage.local:");
  (async () => {
    let networkCalls = 0;
    const mockFetch = async () => {
      networkCalls++;
      return {
        ok: true,
        status: 200,
        headers: { get: () => '"test-etag"' },
        json: async () => ({})
      };
    };

    const T0 = Date.now() - 60 * 1000; // 1 minute ago (within 10-minute cache window)
    const initialStore = {
      auth: { uid: "sw-user", idToken: "tok", refreshToken: "ref", expiresAt: Date.now() + 3600000 },
      "cloud_sync_meta_sw-user": {
        lastPullAt: T0,
        novelsETag: '"cached-etag"'
      }
    };

    // Simulate SW startup: fresh sandbox, in-memory lastCloudPullTimestamps is empty
    const sandbox = createSandbox(initialStore, mockFetch);
    const pullFromCloud = sandbox.pullFromCloud;

    const pullResult = await pullFromCloud(false); // passive read (force = false)

    assert.strictEqual(pullResult.ok, true);
    assert.strictEqual(pullResult.cached, true, "Must hit persistent cache from storage");
    assert.strictEqual(pullResult.lastSyncAt, T0, "Must return lastSyncAt from storage meta");
    assert.strictEqual(networkCalls, 0, "Zero network requests should be made when cache is valid");

    console.log("  [PASS] Service worker reboot cleanly read cloud_sync_meta from storage without redundant network call.");
  })().then(() => {

    // ----------------------------------------------------------------------------
    // SCENARIO 7: Network error during sync (no false timestamp update)
    // ----------------------------------------------------------------------------
    console.log("\n[Scenario 7] Network failure during sync: metadata timestamp unchanged:");
    (async () => {
      const mockFetch = async () => {
        throw new Error("Failed to fetch: Network offline");
      };

      const initialStore = {
        auth: { uid: "net-err-user", idToken: "tok", refreshToken: "ref", expiresAt: Date.now() + 3600000 },
        "cloud_sync_meta_net-err-user": {
          lastPullAt: 12345,
          novelsETag: '"etag-prior"'
        }
      };

      const sandbox = createSandbox(initialStore, mockFetch);
      const pullFromCloud = sandbox.pullFromCloud;

      const pullResult = await pullFromCloud(true);

      assert.strictEqual(pullResult.ok, false, "Pull must report error");
      assert.ok(pullResult.error.includes("Failed to fetch"), "Error must contain network failure details");

      // Verify metadata timestamp was NOT updated to Date.now()
      const meta = sandbox.store["cloud_sync_meta_net-err-user"];
      assert.strictEqual(meta.lastPullAt, 12345, "Failed pull must NOT overwrite previous lastPullAt");

      console.log("  [PASS] Network failure reported correctly and did not advance cache timestamp.");
    })().then(() => {

      // ----------------------------------------------------------------------------
      // SCENARIO 8: Cross-UID access rejected in Firebase RTDB rules
      // ----------------------------------------------------------------------------
      console.log("\n[Scenario 8] Firebase RTDB Rules: Cross-UID isolation strictly enforced:");
      {
        const userRules = rtdbRules.rules.users["$uid"];
        const readRule = userRules[".read"];
        const writeRule = userRules[".write"];

        // Helper to evaluate RTDB rule expression
        function evalRule(ruleExpr, auth, uidVar) {
          const fn = new Function("auth", "$uid", `return Boolean(${ruleExpr});`);
          return fn(auth, uidVar);
        }

        // Test 8A: Own account read/write
        const ownAuth = { uid: "user_alpha" };
        assert.strictEqual(evalRule(readRule, ownAuth, "user_alpha"), true, "User can read own profile");
        assert.strictEqual(evalRule(writeRule, ownAuth, "user_alpha"), true, "User can write own profile");

        // Test 8B: Cross-user read/write
        assert.strictEqual(evalRule(readRule, ownAuth, "user_beta"), false, "User A CANNOT read User B");
        assert.strictEqual(evalRule(writeRule, ownAuth, "user_beta"), false, "User A CANNOT write User B");

        // Test 8C: Unauthenticated access
        assert.strictEqual(evalRule(readRule, null, "user_alpha"), false, "Unauthenticated cannot read");
        assert.strictEqual(evalRule(writeRule, null, "user_alpha"), false, "Unauthenticated cannot write");

        console.log("  [PASS] Realtime Database security rules guarantee absolute isolation between users.");
      }

      // ----------------------------------------------------------------------------
      // SCENARIO 9: Firebase rules reject invalid structures without blocking legitimate writes
      // ----------------------------------------------------------------------------
      console.log("\n[Scenario 9] Firebase RTDB Rules: Schema validation allows valid models, rejects corrupt records:");
      {
        const userRules = rtdbRules.rules.users["$uid"];

        // Helper evaluating newData validation
        function evalValidation(ruleObj, newDataVal, dataVal = null) {
          const expr = ruleObj[".validate"];
          if (!expr) return true;
          const context = {
            newData: {
              val: () => newDataVal,
              isString: () => typeof newDataVal === "string",
              isNumber: () => typeof newDataVal === "number",
              isBoolean: () => typeof newDataVal === "boolean",
              hasChildren: (keys) => {
                if (!newDataVal || typeof newDataVal !== "object") return false;
                return keys.every((k) => k in newDataVal);
              },
              child: (childPath) => {
                const parts = childPath.split("/");
                let cur = newDataVal;
                for (const p of parts) {
                  if (cur && typeof cur === "object" && p in cur) {
                    cur = cur[p];
                  } else {
                    cur = null;
                  }
                }
                return {
                  val: () => cur,
                  isString: () => typeof cur === "string",
                  isNumber: () => typeof cur === "number",
                  isBoolean: () => typeof cur === "boolean",
                  exists: () => cur !== null && cur !== undefined
                };
              }
            },
            data: {
              val: () => dataVal,
              exists: () => dataVal !== null && dataVal !== undefined
            },
            now: Date.now()
          };

          const fn = new Function("newData", "data", "now", `return Boolean(${expr});`);
          return fn(context.newData, context.data, context.now);
        }

        // Test 9A: domainBlacklist validation (modern object vs legacy string)
        const blItemRule = userRules.domainBlacklist["$index"];
        assert.strictEqual(
          evalValidation(blItemRule, "novelbin.com"),
          true,
          "Legacy string domain blacklist must pass validation"
        );
        assert.strictEqual(
          evalValidation(blItemRule, { domain: "novelbin.com", addedAt: Date.now() }),
          true,
          "Modern object { domain, addedAt } must pass validation"
        );
        assert.strictEqual(
          evalValidation(blItemRule, 12345),
          false,
          "Invalid blacklist entry (number) must be rejected"
        );

        // Test 9B: stats.updatedAt validation (supports 0 for default stats and positive numbers)
        const statsRule = userRules.stats;
        assert.strictEqual(
          evalValidation(statsRule, {
            chaptersRead: 0,
            novelsStarted: 0,
            novelsCompleted: 0,
            readingDays: 0,
            currentStreak: 0,
            maxStreak: 0,
            cultivatedQi: 0,
            updatedAt: 0
          }),
          true,
          "Initial stats with updatedAt: 0 must pass validation"
        );
        assert.strictEqual(
          evalValidation(statsRule, {
            chaptersRead: 5,
            novelsStarted: 2,
            novelsCompleted: 1,
            readingDays: 1,
            currentStreak: 1,
            maxStreak: 1,
            cultivatedQi: 50,
            updatedAt: Date.now()
          }),
          true,
          "Active stats with current timestamp must pass validation"
        );
        assert.strictEqual(
          evalValidation(statsRule, {
            chaptersRead: "not-a-number",
            novelsStarted: 0,
            novelsCompleted: 0,
            updatedAt: Date.now()
          }),
          false,
          "Stats with corrupt types must be rejected"
        );

        // Test 9C: novel deletion tombstone vs active novel record
        const novelRule = userRules.novels["$novelKey"];
        assert.strictEqual(
          evalValidation(novelRule, {
            deleted: true,
            seriesId: "nov-tombstone",
            updatedAt: Date.now()
          }),
          true,
          "Deletion tombstone must pass validation"
        );
        assert.strictEqual(
          evalValidation(novelRule, {
            novelName: "Shadow Slave",
            chapter: "123",
            url: "https://example.com/chapter-123",
            seriesId: "nov-active",
            updatedAt: Date.now()
          }),
          true,
          "Valid active novel must pass validation"
        );
        assert.strictEqual(
          evalValidation(novelRule, {
            novelName: "Corrupted Novel",
            // missing chapter and url and not deleted
            updatedAt: Date.now()
          }),
          false,
          "Corrupted novel record must be rejected by rules"
        );

        console.log("  [PASS] Rules cleanly accept legitimate models (tombstones, stats updatedAt>=0, blacklist objects) and reject corruption.");
      }

      // ----------------------------------------------------------------------------
      // SCENARIO 10: X-Firebase-ETag, GET failure protection (no PUT/overwrite) & lastSyncError
      // ----------------------------------------------------------------------------
      console.log("\n[Scenario 10] ETag header, GET failure abort protection & lastSyncError persistence:");
      (async () => {
        let sentHeaders = null;
        let putExecuted = false;

        const mockFailingFetch = async (url, opts = {}) => {
          const method = opts.method || "GET";
          if (method === "GET") {
            sentHeaders = opts.headers || {};
            return {
              ok: false,
              status: 500,
              headers: { get: () => null },
              json: async () => ({ error: "Internal Server Error" })
            };
          }
          if (method === "PUT") {
            putExecuted = true;
            return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({}) };
          }
          return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({}) };
        };

        const initialStore = {
          auth: { uid: "user-sec-10", idToken: "tok", refreshToken: "ref", expiresAt: Date.now() + 3600000 },
          savedNovels: {
            "my-precious-novel": { seriesId: "my-precious-novel", novelName: "Precious Local Novel", chapter: "99" }
          }
        };

        const sandbox = createSandbox(initialStore, mockFailingFetch);
        const pushResult = await sandbox.pushToCloudUnlocked(sandbox.store.savedNovels);

        assert.strictEqual(sentHeaders["X-Firebase-ETag"], "true", "GET request MUST include X-Firebase-ETag: true");
        assert.strictEqual(pushResult.ok, false, "Push must fail when GET fails with 500");
        assert.strictEqual(putExecuted, false, "CRITICAL: NO PUT must ever be executed if GET fails!");
        assert.strictEqual(
          sandbox.store.savedNovels["my-precious-novel"].chapter,
          "99",
          "Local novels must NOT be overwritten when GET fails"
        );
        assert.ok(sandbox.store.lastSyncError, "lastSyncError must be saved in storage on failure");
        assert.strictEqual(sandbox.store.lastSyncError.error, "Error: GET_NOVELS_500");

        console.log("  [PASS] X-Firebase-ETag header sent; GET failure aborted before any PUT; lastSyncError persisted.");
      })().then(() => {
        console.log("\n====================================================================");
        console.log(">>> ALL 10 SYNC CONCURRENCY & RULES HARDENING SCENARIOS PASSED! <<<");
        console.log("====================================================================\n");
      });
    });
  });
});
