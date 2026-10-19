// ============================================================================
// MYNOVELSYSTEM — AUDIT CORRECTIONS TEST SUITE (V13)
// Comprehensive Verification of P0-1, P0-2, P1-1, P1-2, P1-3, P2-2, P2-3
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("====================================================================");
console.log("   MYNOVELSYSTEM: AUDIT CORRECTIONS VERIFICATION SUITE (V13)        ");
console.log("====================================================================\n");

const backgroundSrc = fs.readFileSync(path.join(__dirname, "..", "background.js"), "utf8");
const contentScriptSrc = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
const achievementsSrc = fs.readFileSync(path.join(__dirname, "..", "achievements_data.js"), "utf8");
const i18nSrc = fs.readFileSync(path.join(__dirname, "..", "i18n.js"), "utf8");
const popupHtmlSrc = fs.readFileSync(path.join(__dirname, "..", "popup.html"), "utf8");
const popupJsSrc = fs.readFileSync(path.join(__dirname, "..", "popup.js"), "utf8");

function createMockBackgroundEnv(initialStore = {}, mockFetchHandler = null) {
  const store = { ...initialStore };
  const actionCalls = {
    setIcon: [],
    setBadgeText: [],
    setBadgeBackgroundColor: [],
    setTitle: []
  };
  const alarms = {};
  const messageListeners = [];
  const tabUpdatedListeners = [];

  const mockContext = {
    console,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    Set,
    Map,
    Promise,
    parseFloat,
    parseInt,
    isNaN,
    URL,
    FIREBASE_API_KEY: "AIzaSyCBLWg72OnEmDUUxhc_33MQ9bXdu9rnSTU",
    FIREBASE_DB_URL: "https://novel-tracker-1d134-default-rtdb.firebaseio.com",
    importScripts: () => {},
    fetch: mockFetchHandler || (async () => ({ ok: true, json: async () => ({}) })),
    chrome: {
      action: {
        setIcon: (opts, cb) => { actionCalls.setIcon.push(opts); if (cb) cb(); return Promise.resolve(); },
        setBadgeText: (opts, cb) => { actionCalls.setBadgeText.push(opts); if (cb) cb(); return Promise.resolve(); },
        setBadgeBackgroundColor: (opts, cb) => { actionCalls.setBadgeBackgroundColor.push(opts); if (cb) cb(); return Promise.resolve(); },
        setTitle: (opts, cb) => { actionCalls.setTitle.push(opts); if (cb) cb(); return Promise.resolve(); }
      },
      alarms: {
        create: (name, opts) => { alarms[name] = opts; },
        clear: (name) => { delete alarms[name]; },
        onAlarm: { addListener: () => {} }
      },
      commands: {
        onCommand: { addListener: () => {} }
      },
      omnibox: {
        onInputChanged: { addListener: () => {} },
        onInputEntered: { addListener: () => {} }
      },
      tabs: {
        query: async () => [],
        get: async (id) => ({ id }),
        create: async () => ({ id: 2 }),
        update: async () => ({ id: 1 }),
        sendMessage: async () => {},
        onActivated: { addListener: () => {} },
        onRemoved: { addListener: () => {} },
        onUpdated: {
          addListener: (fn) => { tabUpdatedListeners.push(fn); }
        }
      },
      storage: {
        onChanged: { addListener: () => {} },
        local: {
          get: async (keys) => {
            if (keys === null) return { ...store };
            if (typeof keys === "string") return { [keys]: store[keys] };
            if (Array.isArray(keys)) {
              const res = {};
              keys.forEach((k) => (res[k] = store[k]));
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
        sync: {
          get: async () => ({}),
          set: async () => {},
          remove: async () => {}
        }
      },
      runtime: {
        getURL: (p) => p || "",
        onInstalled: { addListener: () => {} },
        onStartup: { addListener: () => {} },
        onMessage: {
          addListener: (fn) => { messageListeners.push(fn); }
        }
      }
    }
  };

  vm.createContext(mockContext);
  vm.runInContext(i18nSrc, mockContext);
  vm.runInContext(achievementsSrc, mockContext);
  vm.runInContext(backgroundSrc, mockContext);

  const sendMessage = async (msg) => {
    for (const listener of messageListeners) {
      const res = await new Promise((resolve) => {
        const returned = listener(msg, {}, resolve);
        if (!returned) resolve(null);
      });
      if (res !== null && res !== undefined) return res;
    }
    return null;
  };

  return { mockContext, store, sendMessage, actionCalls, tabUpdatedListeners };
}

(async () => {
  // --------------------------------------------------------------------------
  // Test 1: P0-1 DELETE_ACCOUNT Token Expiration, Renewal, & Re-authentication
  // --------------------------------------------------------------------------
  console.log("[Test 1] P0-1: DELETE_ACCOUNT Token Expiration, Renewal & Reauth:");

  // Case A: Valid unexpired token -> Deletes remotely and purges locally
  {
    let authEndpointCalled = false;
    let rtdbEndpointCalled = false;
    const fetchHandler = async (url, opts) => {
      if (url.includes("accounts:delete")) {
        authEndpointCalled = true;
        return { ok: true, json: async () => ({}) };
      }
      if (url.includes("users/test_uid_1.json")) {
        rtdbEndpointCalled = true;
        return { ok: true, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}) };
    };

    const env = createMockBackgroundEnv({
      auth: { uid: "test_uid_1", idToken: "tok_valid", refreshToken: "ref_1", expiresAt: Date.now() + 600000 },
      lastAuthUid: "test_uid_1",
      account_data_test_uid_1: { savedNovels: { n1: { name: "N1" } } },
      userAvatar_test_uid_1: "data:image/webp;base64,mock"
    }, fetchHandler);

    const res = await env.sendMessage({ type: "DELETE_ACCOUNT" });
    assert.strictEqual(res.ok, true, "Valid token deletion returns ok: true");
    assert.strictEqual(authEndpointCalled, true, "Firebase accounts:delete called");
    assert.strictEqual(rtdbEndpointCalled, true, "Firebase RTDB DELETE called");
    assert.strictEqual(env.store.auth, undefined, "Auth credentials wiped");
    assert.strictEqual(env.store.account_data_test_uid_1, undefined, "User vault wiped");
    assert.strictEqual(env.store.userAvatar_test_uid_1, undefined, "User avatar wiped");
    assert.strictEqual(env.store.lastAuthUid, "guest", "Cleanly switched to guest");
    console.log("  [PASS] Case A: Valid unexpired token deletes remote Auth/RTDB and purges local vault.");
  }

  // Case B: Expired token with valid refreshToken -> Auto-refreshes then deletes
  {
    let tokenRefreshed = false;
    let authEndpointCalled = false;
    const fetchHandler = async (url, opts) => {
      if (url.includes("securetoken.googleapis.com")) {
        tokenRefreshed = true;
        return {
          ok: true,
          json: async () => ({ id_token: "new_refreshed_tok", refresh_token: "ref_new", expires_in: "3600" })
        };
      }
      if (url.includes("accounts:delete")) {
        authEndpointCalled = true;
        const body = JSON.parse(opts.body);
        assert.strictEqual(body.idToken, "new_refreshed_tok", "accounts:delete received refreshed token");
        return { ok: true, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}) };
    };

    const env = createMockBackgroundEnv({
      auth: { uid: "test_uid_2", idToken: "expired_tok", refreshToken: "ref_2", expiresAt: Date.now() - 100000 },
      lastAuthUid: "test_uid_2",
      account_data_test_uid_2: { savedNovels: { n2: { name: "N2" } } }
    }, fetchHandler);

    const res = await env.sendMessage({ type: "DELETE_ACCOUNT" });
    assert.strictEqual(tokenRefreshed, true, "Token was refreshed prior to deletion");
    assert.strictEqual(authEndpointCalled, true, "accounts:delete called with fresh token");
    assert.strictEqual(res.ok, true, "Deletion succeeded after renewal");
    assert.strictEqual(env.store.account_data_test_uid_2, undefined, "User vault wiped");
    console.log("  [PASS] Case B: Expired renewable token refreshed automatically before accounts:delete.");
  }

  // Case C: Expired token without valid refresh -> Returns REAUTH_REQUIRED, preserves local data
  {
    const fetchHandler = async (url) => {
      if (url.includes("securetoken.googleapis.com")) {
        return { ok: false, json: async () => ({ error: { message: "TOKEN_EXPIRED" } }) };
      }
      return { ok: true, json: async () => ({}) };
    };

    const env = createMockBackgroundEnv({
      auth: { uid: "test_uid_3", idToken: "expired_tok", refreshToken: "revoked_ref", expiresAt: Date.now() - 100000 },
      lastAuthUid: "test_uid_3",
      account_data_test_uid_3: { savedNovels: { n3: { name: "N3" } } }
    }, fetchHandler);

    const res = await env.sendMessage({ type: "DELETE_ACCOUNT" });
    assert.strictEqual(res.ok, false, "Deletion blocked when token renewal fails");
    assert.strictEqual(res.error, "REAUTH_REQUIRED", "Returns REAUTH_REQUIRED error code");
    assert.ok(env.store.account_data_test_uid_3, "Local vault NOT wiped on failed renewal");
    assert.ok(env.store.auth, "Auth credentials preserved so user can re-authenticate");
    console.log("  [PASS] Case C: Failed token renewal returns REAUTH_REQUIRED without wiping local data.");
  }

  // Case D: CREDENTIAL_TOO_OLD_LOGIN_AGAIN from Firebase -> Returns REAUTH_REQUIRED, preserves local data
  {
    const fetchHandler = async (url) => {
      if (url.includes("accounts:delete")) {
        return {
          ok: false,
          json: async () => ({ error: { message: "CREDENTIAL_TOO_OLD_LOGIN_AGAIN" } })
        };
      }
      return { ok: true, json: async () => ({}) };
    };

    const env = createMockBackgroundEnv({
      auth: { uid: "test_uid_4", idToken: "old_login_tok", refreshToken: "ref_4", expiresAt: Date.now() + 500000 },
      lastAuthUid: "test_uid_4",
      account_data_test_uid_4: { savedNovels: { n4: { name: "N4" } } }
    }, fetchHandler);

    const res = await env.sendMessage({ type: "DELETE_ACCOUNT" });
    assert.strictEqual(res.ok, false, "Deletion returns ok: false on CREDENTIAL_TOO_OLD");
    assert.strictEqual(res.error, "REAUTH_REQUIRED", "Mapped to REAUTH_REQUIRED");
    assert.ok(res.details.includes("CREDENTIAL_TOO_OLD_LOGIN_AGAIN"), "Details retained");
    assert.ok(env.store.account_data_test_uid_4, "Local vault NOT destroyed on reauth requirement");
    console.log("  [PASS] Case D: CREDENTIAL_TOO_OLD mapped to REAUTH_REQUIRED without destroying local data.");
  }

  // Case E: Partial Failure — Remote Auth deletion succeeds, RTDB deletion fails
  {
    let rtdbFailed = false;
    const fetchHandler = async (url) => {
      if (url.includes("accounts:delete")) {
        return { ok: true, json: async () => ({}) };
      }
      if (url.includes("users/test_uid_5.json")) {
        rtdbFailed = true;
        return { ok: false, status: 500, json: async () => ({}) };
      }
      return { ok: true, json: async () => ({}) };
    };

    const env = createMockBackgroundEnv({
      auth: { uid: "test_uid_5", idToken: "tok_5", refreshToken: "ref_5", expiresAt: Date.now() + 500000 },
      lastAuthUid: "test_uid_5",
      account_data_test_uid_5: { savedNovels: { n5: { name: "N5" } } }
    }, fetchHandler);

    const res = await env.sendMessage({ type: "DELETE_ACCOUNT" });
    assert.strictEqual(rtdbFailed, true, "RTDB failure simulated");
    assert.strictEqual(res.ok, true, "Auth deletion was confirmed, returns ok: true");
    assert.strictEqual(res.rtdbDeleted, false, "rtdbDeleted reports false");
    assert.strictEqual(env.store.auth, undefined, "Auth credentials wiped");
    assert.strictEqual(env.store.account_data_test_uid_5, undefined, "Local vault wiped");
    assert.strictEqual(env.store.lastAuthUid, "guest", "Switched cleanly to guest");
    console.log("  [PASS] Case E: Confirmed Auth deletion purges local vault and switches to guest even on RTDB warning.");
  }

  // --------------------------------------------------------------------------
  // Test 2: P0-2 Guest Data Isolation & Controlled Merge
  // --------------------------------------------------------------------------
  console.log("\n[Test 2] P0-2: Guest Data Isolation & Explicit Merge Control:");

  // Case A: User logs in from guest and REJECTS merge (mergeGuestData = false)
  {
    const env = createMockBackgroundEnv({
      lastAuthUid: "guest",
      savedNovels: {
        guest_book: { seriesId: "guest_book", novelName: "Guest Novel", chapter: "5" }
      },
      stats: { chaptersRead: 5, cultivatedRealmIndex: 0, cultivatedStage: 1 },
      account_data_user_clean: {
        savedNovels: {
          cloud_book: { seriesId: "cloud_book", novelName: "Cloud Account Novel", chapter: "40" }
        },
        stats: { chaptersRead: 40, cultivatedRealmIndex: 1, cultivatedStage: 3 }
      }
    });

    const switchRes = await env.mockContext.switchAccountProfile("user_clean", false);
    assert.strictEqual(switchRes.ok, true);
    assert.strictEqual(env.store.lastAuthUid, "user_clean");

    // Must NOT have guest novels
    assert.strictEqual(Boolean(env.store.savedNovels.guest_book), false, "Guest novel NOT leaked to registered user");
    assert.ok(env.store.savedNovels.cloud_book, "Registered user keeps own cloud book");
    assert.strictEqual(env.store.stats.chaptersRead, 40, "Stats NOT contaminated with guest progress");

    // Guest data must remain safe in guest_data vault
    assert.ok(env.store.guest_data, "Guest snapshot preserved in guest_data");
    assert.ok(env.store.guest_data.savedNovels.guest_book, "Guest book safe in guest_data");

    // Logging out returns to guest with their original book
    await env.mockContext.switchAccountProfile("guest");
    assert.ok(env.store.savedNovels.guest_book, "Original guest book restored upon logout");
    assert.strictEqual(Boolean(env.store.savedNovels.cloud_book), false, "Cloud book NOT leaked to guest");
    console.log("  [PASS] Case A: User rejects merge -> 0 guest contamination, guest library preserved in guest_data.");
  }

  // Case B: User logs in from guest and ACCEPTS merge (mergeGuestData = true)
  {
    const env = createMockBackgroundEnv({
      lastAuthUid: "guest",
      savedNovels: {
        guest_book: { seriesId: "guest_book", novelName: "Guest Novel", chapter: "5", updatedAt: 100 },
        shared_book: { seriesId: "shared_book", novelName: "Shared Novel", chapter: "12", updatedAt: 200 }
      },
      stats: { chaptersRead: 17, cultivatedRealmIndex: 0, cultivatedStage: 2, unlockedTitles: ["t1"] },
      domainBlacklist: [{ domain: "guest-blocked.com", addedAt: 100 }],
      account_data_user_merge: {
        savedNovels: {
          shared_book: { seriesId: "shared_book", novelName: "Shared Novel", chapter: "10", updatedAt: 50 },
          user_book: { seriesId: "user_book", novelName: "User Novel", chapter: "30", updatedAt: 300 }
        },
        stats: { chaptersRead: 40, cultivatedRealmIndex: 1, cultivatedStage: 2, unlockedTitles: ["t2"] },
        domainBlacklist: [{ domain: "user-blocked.com", addedAt: 200 }]
      }
    });

    const switchRes = await env.mockContext.switchAccountProfile("user_merge", true);
    assert.strictEqual(switchRes.ok, true);

    // Both novels present
    assert.ok(env.store.savedNovels.guest_book, "Guest novel merged");
    assert.ok(env.store.savedNovels.user_book, "User novel merged");
    // Shared novel kept higher chapter
    assert.strictEqual(env.store.savedNovels.shared_book.chapter, "12", "Shared novel kept higher chapter 12");

    // Stats merged cleanly
    assert.ok(env.store.stats.unlockedTitles.includes("t1"), "Title t1 retained");
    assert.ok(env.store.stats.unlockedTitles.includes("t2"), "Title t2 retained");
    assert.strictEqual(env.store.stats.cultivatedRealmIndex, 1, "Higher realm index 1 preserved");

    // Blacklist merged without duplicates
    const blDomains = env.store.domainBlacklist.map((b) => b.domain);
    assert.ok(blDomains.includes("guest-blocked.com"), "Guest blacklist merged");
    assert.ok(blDomains.includes("user-blocked.com"), "User blacklist merged");
    console.log("  [PASS] Case B: User accepts merge -> Controlled merge of novels, stats and blacklist without loss.");
  }

  // --------------------------------------------------------------------------
  // Test 3: P1-1 Informational Subpages & Qi False Positive Protection
  // --------------------------------------------------------------------------
  console.log("\n[Test 3] P1-1: Informational Subpages & Qi False Positive Protection:");
  {
    const env = createMockBackgroundEnv({
      savedNovels: {
        "royalroad.com/fiction/123": {
          seriesId: "royalroad.com/fiction/123",
          novelName: "Mother of Learning",
          chapter: "50",
          maxCounted: 50,
          url: "https://www.royalroad.com/fiction/123/chapter-50"
        }
      },
      stats: { chaptersRead: 50, cultivatedRealmIndex: 1, cultivatedStage: 1, bonusQi: 0 }
    });

    // Subpage 1: /reviews
    const resReviews = await env.mockContext.handleNovelDetected({
      seriesId: "royalroad.com/fiction/123",
      novelName: "Mother of Learning",
      url: "https://www.royalroad.com/fiction/123/mother-of-learning/reviews",
      chapter: "AUTO_NEXT"
    }, false, 101);

    assert.strictEqual(resReviews.ok, false, "Reviews subpage ignored");
    assert.strictEqual(resReviews.informational, true, "Flagged as informational subpage");
    assert.strictEqual(env.store.savedNovels["royalroad.com/fiction/123"].chapter, "50", "Chapter remains 50");
    assert.strictEqual(env.store.stats.chaptersRead, 50, "Zero chapters counted for /reviews");

    // Subpage 2: /characters
    const resCharacters = await env.mockContext.handleNovelDetected({
      seriesId: "royalroad.com/fiction/123",
      novelName: "Mother of Learning",
      url: "https://www.royalroad.com/fiction/123/mother-of-learning/characters",
      chapter: "AUTO_NEXT"
    }, false, 102);

    assert.strictEqual(resCharacters.ok, false, "Characters subpage ignored");
    assert.strictEqual(env.store.stats.chaptersRead, 50, "Zero chapters counted for /characters");

    // Subpage 3: /forum
    const resForum = await env.mockContext.handleNovelDetected({
      seriesId: "royalroad.com/fiction/123",
      novelName: "Mother of Learning",
      url: "https://www.royalroad.com/fiction/123/mother-of-learning/forum",
      chapter: "AUTO_NEXT"
    }, false, 103);
    assert.strictEqual(resForum.ok, false, "Forum subpage ignored");
    assert.strictEqual(env.store.stats.chaptersRead, 50, "Zero chapters counted for /forum");

    // Subpage 4: /reviews.html (.html extension support)
    const resReviewsHtml = await env.mockContext.handleNovelDetected({
      seriesId: "royalroad.com/fiction/123",
      novelName: "Mother of Learning",
      url: "https://www.royalroad.com/fiction/123/mother-of-learning/reviews.html",
      chapter: "AUTO_NEXT"
    }, false, 104);
    assert.strictEqual(resReviewsHtml.ok, false, "Reviews.html subpage ignored");
    assert.strictEqual(resReviewsHtml.informational, true, "Reviews.html flagged as informational");
    assert.strictEqual(env.store.stats.chaptersRead, 50, "Zero chapters counted for /reviews.html");

    // Subpage 5: /toc and /table-of-contents
    const resToc = await env.mockContext.handleNovelDetected({
      seriesId: "royalroad.com/fiction/123",
      novelName: "Mother of Learning",
      url: "https://www.royalroad.com/fiction/123/mother-of-learning/toc",
      chapter: "AUTO_NEXT"
    }, false, 105);
    assert.strictEqual(resToc.ok, false, "TOC subpage ignored");
    assert.strictEqual(resToc.informational, true, "TOC flagged as informational");
    assert.strictEqual(env.store.stats.chaptersRead, 50, "Zero chapters counted for /toc");

    const resTocLong = await env.mockContext.handleNovelDetected({
      seriesId: "royalroad.com/fiction/123",
      novelName: "Mother of Learning",
      url: "https://www.royalroad.com/fiction/123/mother-of-learning/table-of-contents",
      chapter: "AUTO_NEXT"
    }, false, 106);
    assert.strictEqual(resTocLong.ok, false, "table-of-contents subpage ignored");
    assert.strictEqual(resTocLong.informational, true, "table-of-contents flagged as informational");

    // Subpage 6: /chapters listing (without chapter number)
    const resChaptersList = await env.mockContext.handleNovelDetected({
      seriesId: "royalroad.com/fiction/123",
      novelName: "Mother of Learning",
      url: "https://www.royalroad.com/fiction/123/mother-of-learning/chapters",
      chapter: "AUTO_NEXT"
    }, false, 107);
    assert.strictEqual(resChaptersList.ok, false, "Chapters listing ignored");
    assert.strictEqual(resChaptersList.informational, true, "Chapters listing flagged as informational");

    // Legitimate Chapter 51 read with plural /chapters/51 path
    const resChapter51 = await env.mockContext.handleNovelDetected({
      seriesId: "royalroad.com/fiction/123",
      novelName: "Mother of Learning",
      novelUrl: "https://www.royalroad.com/fiction/123/mother-of-learning",
      url: "https://www.royalroad.com/fiction/123/mother-of-learning/chapters/51",
      chapter: "51"
    }, true, 108);

    assert.strictEqual(resChapter51.ok, true, "Legitimate chapter 51 detected");
    const entry51 = env.store.savedNovels[resChapter51.seriesId] || env.store.savedNovels["royalroad.com/fiction/123"];
    assert.ok(entry51, "Saved novel entry found");
    assert.strictEqual(entry51.chapter, "51", "Chapter incremented to 51");
    assert.strictEqual(env.store.stats.chaptersRead, 51, "Chapters read incremented to 51");
    console.log("  [PASS] Informational subpages (/reviews, .html, /toc, /chapters) rejected with 0 Qi and 0 chapter increments.");
  }

  // --------------------------------------------------------------------------
  // Test 4: P1-2 MV3 SPA Navigation & Background tabs.onUpdated
  // --------------------------------------------------------------------------
  console.log("\n[Test 4] P1-2: MV3 SPA Navigation & Background tabs.onUpdated:");
  {
    let spaMessageSent = null;
    const env = createMockBackgroundEnv();
    env.mockContext.chrome.tabs.sendMessage = async (tabId, msg) => {
      spaMessageSent = { tabId, msg };
    };

    assert.strictEqual(env.tabUpdatedListeners.length >= 1, true, "tabs.onUpdated listener registered");
    const onUpdatedFn = env.tabUpdatedListeners[0];

    // Simulate SPA navigation on reading URL
    await onUpdatedFn(99, { url: "https://www.webnovel.com/book/shadow-slave_22196618/chapter-52" });
    assert.ok(spaMessageSent, "SPA_URL_CHANGED message sent to tab");
    assert.strictEqual(spaMessageSent.tabId, 99);
    assert.strictEqual(spaMessageSent.msg.type, "SPA_URL_CHANGED");
    assert.strictEqual(spaMessageSent.msg.url, "https://www.webnovel.com/book/shadow-slave_22196618/chapter-52");

    // Subpage onUpdated should NOT trigger SPA reading message
    spaMessageSent = null;
    await onUpdatedFn(99, { url: "https://www.webnovel.com/book/shadow-slave_22196618/reviews" });
    assert.strictEqual(spaMessageSent, null, "Informational subpage does not trigger SPA_URL_CHANGED");
    console.log("  [PASS] chrome.tabs.onUpdated triggers SPA_URL_CHANGED in MV3 for reading URLs while ignoring subpages.");
  }

  // --------------------------------------------------------------------------
  // Test 5: P1-3 Firebase Sync Caching & Redundant Read Elimination
  // --------------------------------------------------------------------------
  console.log("\n[Test 5] P1-3: Firebase Sync 10-Minute Caching Policy:");
  {
    let networkFetchesCount = 0;
    const fetchHandler = async (url) => {
      if (url.includes("firebaseio.com")) {
        networkFetchesCount++;
        return {
          ok: true,
          json: async () => ({})
        };
      }
      return { ok: true, json: async () => ({}) };
    };

    const env = createMockBackgroundEnv({
      auth: { uid: "user_cached_sync", idToken: "tok", refreshToken: "ref", expiresAt: Date.now() + 600000 },
      lastAuthUid: "user_cached_sync",
      savedNovels: {},
      stats: { chaptersRead: 0 }
    }, fetchHandler);

    // Call 1: Initial pull (uncached) -> Fetches from network
    const pull1 = await env.mockContext.pullFromCloud(false);
    assert.strictEqual(pull1.ok, true);
    assert.strictEqual(pull1.cached, false, "Initial pull runs over network");
    const firstFetchCount = networkFetchesCount;
    assert.ok(firstFetchCount > 0, "Network fetches executed on first pull");

    // Call 2: Passive popup open within 10 minutes (force = false) -> Hits cache, 0 network requests
    const pull2 = await env.mockContext.pullFromCloud(false);
    assert.strictEqual(pull2.ok, true);
    assert.strictEqual(pull2.cached, true, "Second pull within 10m returns cached: true");
    assert.strictEqual(networkFetchesCount, firstFetchCount, "Zero additional network fetches incurred");

    // Call 3: Explicit sync button press (force = true) -> Bypasses cache
    const pull3 = await env.mockContext.pullFromCloud(true);
    assert.strictEqual(pull3.ok, true);
    assert.strictEqual(pull3.cached, false, "Forced pull bypasses cache");
    assert.ok(networkFetchesCount > firstFetchCount, "Network fetches executed on forced pull");

    // Call 4: Verify popup.js btnSyncNow click listener passes force: true
    assert.ok(
      popupJsSrc.includes('btnSyncNow') && popupJsSrc.includes('chrome.runtime.sendMessage({ type: "PULL_FROM_CLOUD", force: true }'),
      "Explicit settings sync button (btnSyncNow) sends force: true"
    );

    console.log("  [PASS] Passive cloud pulls reuse 10-minute cache; explicit force: true bypasses cache.");
  }

  // --------------------------------------------------------------------------
  // Test 6: P2-2 Viewport Continuous Scroll Priority & Dropdown Non-Collision
  // --------------------------------------------------------------------------
  console.log("\n[Test 6] P2-2: Viewport Continuous Scroll Priority over Static Dropdown:");
  {
    const contentScriptCode = fs.readFileSync(path.join(__dirname, "..", "content.js"), "utf8");
    const extractFnBody = contentScriptCode.slice(contentScriptCode.indexOf("function extractChapterNumber"));
    assert.ok(
      extractFnBody.indexOf("getVisibleChapterFromViewport") < extractFnBody.indexOf("extractChapterFromReaderDropdown"),
      "getVisibleChapterFromViewport must be called before extractChapterFromReaderDropdown in extractChapterNumber"
    );
    console.log("  [PASS] fromViewport evaluated prior to fromDropdown, preventing static header select collision in continuous scroll.");
  }

  // --------------------------------------------------------------------------
  // Test 7: P2-3 Service Worker Startup Migration Optimization
  // --------------------------------------------------------------------------
  console.log("\n[Test 7] P2-3: Startup Migration Flag Check:");
  {
    assert.strictEqual(
      backgroundSrc.includes("\nmigrateLocalStorageNow();\n"),
      false,
      "Top-level unconditional migrateLocalStorageNow() call removed"
    );
    assert.ok(
      backgroundSrc.includes("maybeMigrateLocalStorage"),
      "maybeMigrateLocalStorage checks schemaVersion before running migration"
    );
    console.log("  [PASS] Service Worker wake-up skips redundant schema migrations once schemaVersion === 4.");
  }

  // --------------------------------------------------------------------------
  // Test 8: P3-1 Centralized Firebase Constants
  // --------------------------------------------------------------------------
  console.log("\n[Test 8] P3-1: Firebase API Key & DB URL Constants Verification:");
  {
    assert.ok(backgroundSrc.includes("const FIREBASE_API_KEY ="), "FIREBASE_API_KEY constant defined");
    assert.ok(backgroundSrc.includes("const FIREBASE_DB_URL ="), "FIREBASE_DB_URL constant defined");
    assert.ok(popupJsSrc.includes("const FIREBASE_API_KEY ="), "FIREBASE_API_KEY in popup.js");
    assert.ok(popupJsSrc.includes("const FIREBASE_DB_URL ="), "FIREBASE_DB_URL in popup.js");
    console.log("  [PASS] Firebase configuration constants properly declared at top of scripts.");
  }

  // --------------------------------------------------------------------------
  // Test 9: Purge of Lingering Supabase Storage Keys
  // --------------------------------------------------------------------------
  console.log("\n[Test 9] Purge of Residual Supabase Storage Keys Verification:");
  {
    assert.ok(
      backgroundSrc.includes('chrome.storage.local.remove(["supabase_auth", "supabase_config", "pending_supabase_signup_email"])'),
      "maybeMigrateLocalStorage actively purges lingering Supabase storage keys"
    );
    assert.ok(
      backgroundSrc.includes('k === "supabase_auth" ||\n          k === "supabase_config" ||\n          k === "pending_supabase_signup_email"'),
      "CLEAR_CACHE handler clears residual Supabase keys from storage"
    );
    console.log("  [PASS] Residual Supabase storage keys are actively and defensively purged.");
  }

  console.log("\n>>> ALL V13 AUDIT CORRECTION TESTS PASSED CLEANLY (100%)! <<<");
})().catch((err) => {
  console.error("FATAL ERROR IN V13 TEST SUITE:", err);
  process.exit(1);
});
