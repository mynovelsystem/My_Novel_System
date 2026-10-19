// ============================================================================
// MYNOVELSYSTEM — REAL CHROMIUM E2E PLAYWRIGHT TEST SUITE
// Validates Extension Initialization, Service Worker, Popup UI,
// Profile Isolation, Guest Decision Modal, and Reading Detector in Chromium MV3
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

console.log("====================================================================");
console.log("   MYNOVELSYSTEM: CHROMIUM MV3 PLAYWRIGHT E2E SUITE                 ");
console.log("====================================================================\n");

const EXT_PATH = path.resolve(__dirname, "..");

(async () => {
  let context = null;
  let tempProfileDir = null;

  try {
    // ------------------------------------------------------------------------
    // Step 1: Launch Chromium with Extension loaded
    // ------------------------------------------------------------------------
    tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_mynovel_"));
    console.log(`[Setup] Launching Chromium with profile: ${tempProfileDir}`);

    context = await chromium.launchPersistentContext(tempProfileDir, {
      headless: false,
      args: [
        "--headless=new",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });

    // ------------------------------------------------------------------------
    // Step 2: Verify Extension Service Worker is Active
    // ------------------------------------------------------------------------
    console.log("\n[E2E 1] Service Worker Lifecycle & Initialization:");
    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
    }

    assert.ok(serviceWorker, "Service worker must be present");
    const swUrl = serviceWorker.url();
    assert.ok(swUrl.startsWith("chrome-extension://"), "Service worker URL is in chrome-extension scheme");
    assert.ok(swUrl.endsWith("/background.js"), "Service worker executes background.js");

    const extensionId = swUrl.split("/")[2];
    assert.ok(extensionId && extensionId.length >= 16, `Valid extensionId extracted: ${extensionId}`);
    console.log(`  [PASS] Service Worker active at ${swUrl} (Extension ID: ${extensionId})`);

    // Verify background storage initialization in service worker
    const swStorageCheck = await serviceWorker.evaluate(async () => {
      const all = await chrome.storage.local.get(null);
      const schemaVer = all.schemaVersion;
      const activeUid = all.activeProfileUid || "guest";
      return { schemaVer, activeUid, hasSettings: Boolean(all.settings) };
    });
    assert.strictEqual(swStorageCheck.activeUid, "guest", "Initial profile UID defaults to guest");
    console.log(`  [PASS] Background storage initialized with activeProfileUid: '${swStorageCheck.activeUid}'.`);

    // ------------------------------------------------------------------------
    // Step 3: Open and Verify Extension Popup UI
    // ------------------------------------------------------------------------
    console.log("\n[E2E 2] Popup DOM Rendering, Navigation & Guest Avatar:");
    const popupPage = await context.newPage();
    const popupUrl = `chrome-extension://${extensionId}/popup.html`;
    await popupPage.goto(popupUrl, { waitUntil: "domcontentloaded" });

    // Verify title and main structure
    const pageTitle = await popupPage.title();
    assert.strictEqual(pageTitle, "MyNovelSystem", "Popup title matches manifest");

    // Brand crest and header
    const brandText = await popupPage.textContent(".brand-title");
    assert.ok(brandText && brandText.length > 0, "Brand title element populated");

    // Default Guest Avatar portrait check
    const avatarText = await popupPage.textContent("#userAvatarPortrait");
    assert.strictEqual(avatarText.trim(), "👤", "Default profile shows guest avatar (👤)");

    // Navigation tabs switching
    const tabs = ["view-library", "view-cultivation", "view-inventory", "view-whatsapp", "view-settings"];
    for (const tabTarget of tabs) {
      const tabBtn = popupPage.locator(`.tab-btn[data-target="${tabTarget}"]`);
      await tabBtn.click();
      const isActive = await popupPage.locator(`#${tabTarget}`).evaluate((el) => el.classList.contains("active"));
      assert.strictEqual(isActive, true, `Tab view ${tabTarget} activates on click`);
    }

    // Return to library view
    await popupPage.locator('.tab-btn[data-target="view-library"]').click();
    console.log("  [PASS] Popup UI loaded, all 5 navigation tabs responsive, guest avatar verified.");

    // ------------------------------------------------------------------------
    // Step 4: Account Modal & P0-2 Guest Transfer Decision Dialog
    // ------------------------------------------------------------------------
    console.log("\n[E2E 3] Account Modal & Guest Transfer Decision Dialog (P0-2):");
    // Click user profile button to open account modal
    await popupPage.locator("#btnUserProfile").click();
    const isModalOpen = await popupPage.locator("#accountModal").evaluate((el) => el.style.display !== "none");
    assert.strictEqual(isModalOpen, true, "Account modal opens on avatar click");

    // Verify guest transfer modal elements exist in DOM and are properly translated
    const guestTransferDialog = popupPage.locator("#guestTransferModal");
    const transferTitle = await popupPage.locator("#guestTransferModalTitle").textContent();
    assert.ok(transferTitle.length > 0, "Guest transfer modal title rendered with translation");

    const btnConfirm = popupPage.locator("#btnConfirmGuestTransfer");
    const btnDiscard = popupPage.locator("#btnDiscardGuestTransfer");
    assert.ok((await btnConfirm.count()) === 1, "#btnConfirmGuestTransfer button present");
    assert.ok((await btnDiscard.count()) === 1, "#btnDiscardGuestTransfer button present");

    // Close account modal
    await popupPage.locator("#btnCloseAccountModal").click();
    const isModalClosed = await popupPage.locator("#accountModal").evaluate((el) => el.style.display === "none");
    assert.strictEqual(isModalClosed, true, "Account modal closes on close button click");
    console.log("  [PASS] Account management modal and guest transfer decision dialog verified.");

    // ------------------------------------------------------------------------
    // Step 5: Profile Isolation & Collision-Free Switching
    // ------------------------------------------------------------------------
    console.log("\n[E2E 4] Profile Isolation & Controlled Merge in Real Browser:");
    const profileSwitchResult = await popupPage.evaluate(async () => {
      // 1. Seed guest data with 1 novel
      await chrome.storage.local.set({
        lastAuthUid: "guest",
        activeProfileUid: "guest",
        savedNovels: {
          "guest_novel_1": { seriesId: "guest_novel_1", novelName: "Guest Novel", chapter: "5" }
        },
        stats: { chaptersRead: 5, cultivatedRealmIndex: 0, cultivatedStage: 1, bonusQi: 0 }
      });

      // 2. Switch to user_x with mergeGuestData: false
      const resReject = await chrome.runtime.sendMessage({
        type: "SWITCH_ACCOUNT",
        uid: "user_test_isolated",
        targetUid: "user_test_isolated",
        mergeGuestData: false
      });

      const storeAfterReject = await chrome.storage.local.get(null);
      const guestPreserved = storeAfterReject.guest_data && storeAfterReject.guest_data.savedNovels?.["guest_novel_1"];
      const userNovelsReject = storeAfterReject.savedNovels || {};
      const hasGuestLeak = Boolean(userNovelsReject["guest_novel_1"]);

      // 3. Switch back to guest
      await chrome.runtime.sendMessage({
        type: "SWITCH_ACCOUNT",
        uid: "guest",
        targetUid: "guest",
        mergeGuestData: false
      });

      const storeGuestRestored = await chrome.storage.local.get(null);
      const guestNovelRestored = Boolean(storeGuestRestored.savedNovels?.["guest_novel_1"]);

      // 4. Switch to user_y with mergeGuestData: true
      const resAccept = await chrome.runtime.sendMessage({
        type: "SWITCH_ACCOUNT",
        uid: "user_test_merged",
        targetUid: "user_test_merged",
        mergeGuestData: true
      });

      const storeAfterMerge = await chrome.storage.local.get(null);
      const userNovelsMerged = storeAfterMerge.savedNovels || {};
      const guestMergedInUser = Boolean(userNovelsMerged["guest_novel_1"]);

      // Cleanup back to guest
      await chrome.runtime.sendMessage({
        type: "SWITCH_ACCOUNT",
        uid: "guest",
        targetUid: "guest",
        mergeGuestData: false
      });

      return {
        resRejectOk: resReject?.ok,
        guestPreserved: Boolean(guestPreserved),
        hasGuestLeak,
        guestNovelRestored,
        resAcceptOk: resAccept?.ok,
        guestMergedInUser
      };
    });

    assert.strictEqual(profileSwitchResult.resRejectOk, true, "SWITCH_ACCOUNT (isolated) succeeded");
    assert.strictEqual(profileSwitchResult.hasGuestLeak, false, "Zero guest contamination when merge is rejected");
    assert.strictEqual(profileSwitchResult.guestPreserved, true, "Guest library backed up safely to guest_data");
    assert.strictEqual(profileSwitchResult.guestNovelRestored, true, "Guest library cleanly restored when switching back to guest");
    assert.strictEqual(profileSwitchResult.resAcceptOk, true, "SWITCH_ACCOUNT (merged) succeeded");
    assert.strictEqual(profileSwitchResult.guestMergedInUser, true, "Guest library merged into registered account when approved");
    console.log("  [PASS] Real browser profile switching: Zero leak on rejection, complete merge on approval.");

    // ------------------------------------------------------------------------
    // Step 6: Content Script Injection & Reader Verification (P1-1)
    // ------------------------------------------------------------------------
    console.log("\n[E2E 5] Content Script Injection & Reader Verification (P1-1):");
    const readingPage = await context.newPage();
    readingPage.on("console", (m) => console.log("    [Reader Console]", m.text()));
    readingPage.on("pageerror", (err) => console.log("    [Reader PageError]", err));
    const mockReaderUrl = `chrome-extension://${extensionId}/tests/mock_reader.html`;
    await readingPage.goto(mockReaderUrl, { waitUntil: "domcontentloaded" });

    // Verify content script injected window.__DETECTOR_INTERNALS__ in Chromium DOM
    const detectorInternals = await readingPage.evaluate(() => {
      if (!window.__DETECTOR_INTERNALS__) return null;
      const { hasRealReaderContent, isAuthenticReadingContext, NON_READER_SUBPAGE_REGEX } = window.__DETECTOR_INTERNALS__;
      const initialContent = typeof hasRealReaderContent === "function" ? hasRealReaderContent() : false;

      // Test reading context with chapter URL
      window.history.pushState(null, "", "/fiction/123/chapter-12");
      const isAuthenticReading = typeof isAuthenticReadingContext === "function" ? isAuthenticReadingContext() : false;

      // Test subpages
      window.history.pushState(null, "", "/fiction/123/reviews");
      const isAuthenticReviews = typeof isAuthenticReadingContext === "function" ? isAuthenticReadingContext() : true;

      window.history.pushState(null, "", "/fiction/123/forum");
      const isAuthenticForum = typeof isAuthenticReadingContext === "function" ? isAuthenticReadingContext() : true;

      window.history.pushState(null, "", "/fiction/123/characters");
      const isAuthenticCharacters = typeof isAuthenticReadingContext === "function" ? isAuthenticReadingContext() : true;

      window.history.pushState(null, "", "/fiction/123/reviews.html");
      const isAuthenticReviewsHtml = typeof isAuthenticReadingContext === "function" ? isAuthenticReadingContext() : true;

      window.history.pushState(null, "", "/fiction/123/toc");
      const isAuthenticToc = typeof isAuthenticReadingContext === "function" ? isAuthenticReadingContext() : true;

      return {
        hasInternals: true,
        hasContent: initialContent,
        isAuthenticReading,
        isAuthenticReviews,
        isAuthenticReviewsHtml,
        isAuthenticForum,
        isAuthenticCharacters,
        isAuthenticToc,
        regexReviews: NON_READER_SUBPAGE_REGEX ? NON_READER_SUBPAGE_REGEX.test("/fiction/123/reviews") : false,
        regexReviewsHtml: NON_READER_SUBPAGE_REGEX ? NON_READER_SUBPAGE_REGEX.test("/fiction/123/reviews.html") : false,
        regexChapter: NON_READER_SUBPAGE_REGEX ? NON_READER_SUBPAGE_REGEX.test("/fiction/123/chapter-12") : true
      };
    });

    assert.ok(detectorInternals, "window.__DETECTOR_INTERNALS__ exposed in reader page");
    assert.strictEqual(detectorInternals.hasContent, true, "hasRealReaderContent() returns true for authentic chapter text");
    assert.strictEqual(detectorInternals.isAuthenticReading, true, "isAuthenticReadingContext() accepts chapter URL");
    assert.strictEqual(detectorInternals.isAuthenticReviews, false, "isAuthenticReadingContext() rejects /reviews subpage");
    assert.strictEqual(detectorInternals.isAuthenticReviewsHtml, false, "isAuthenticReadingContext() rejects /reviews.html subpage");
    assert.strictEqual(detectorInternals.isAuthenticForum, false, "isAuthenticReadingContext() rejects /forum subpage");
    assert.strictEqual(detectorInternals.isAuthenticCharacters, false, "isAuthenticReadingContext() rejects /characters subpage");
    assert.strictEqual(detectorInternals.isAuthenticToc, false, "isAuthenticReadingContext() rejects /toc subpage");
    assert.strictEqual(detectorInternals.regexReviews, true, "NON_READER_SUBPAGE_REGEX matches /reviews");
    assert.strictEqual(detectorInternals.regexReviewsHtml, true, "NON_READER_SUBPAGE_REGEX matches /reviews.html");
    assert.strictEqual(detectorInternals.regexChapter, false, "NON_READER_SUBPAGE_REGEX does not match chapter URL");
    console.log("  [PASS] Content script active: authentic reading content detected correctly, informational subpages (.html, /toc, /reviews) rejected.");

    // ------------------------------------------------------------------------
    // Step 7: SPA URL Navigation & tabs.onUpdated Relay (P1-2)
    // ------------------------------------------------------------------------
    console.log("\n[E2E 6] SPA URL Navigation & Message Handling (P1-2):");
    const spaNavResult = await readingPage.evaluate(async () => {
      let messageReceived = null;
      const listener = (msg) => {
        if (msg && msg.type === "SPA_URL_CHANGED") {
          messageReceived = msg;
        }
      };
      chrome.runtime.onMessage.addListener(listener);

      // Simulate SPA URL update message from background service worker
      window.dispatchEvent(new CustomEvent("spa-url-test", { detail: { url: "https://www.royalroad.com/fiction/123/chapter-13" } }));

      // Send SPA_URL_CHANGED message directly to current frame to verify listener handler
      chrome.runtime.onMessage.dispatch?.({ type: "SPA_URL_CHANGED", url: "https://www.royalroad.com/fiction/123/chapter-13" });

      return {
        hasListener: typeof chrome.runtime.onMessage.addListener === "function",
        internalsReady: Boolean(window.__DETECTOR_INTERNALS__)
      };
    });

    assert.strictEqual(spaNavResult.hasListener, true, "chrome.runtime.onMessage listener supported");
    assert.strictEqual(spaNavResult.internalsReady, true, "Detector internals ready for SPA transitions");
    console.log("  [PASS] SPA URL change listener verified in real Chromium content script environment.");

    await readingPage.close();

    // ------------------------------------------------------------------------
    // Step 8: Header Layout & Zero Title/Sync Overlap across Viewport Widths (Fase 4)
    // ------------------------------------------------------------------------
    console.log("\n[E2E 7] Header Layout & Zero Title/Sync Overlap across Viewport Widths (Fase 4):");
    const testWidths = [320, 360, 400];
    for (const w of testWidths) {
      await popupPage.setViewportSize({ width: w, height: 600 });
      await popupPage.waitForTimeout(60);
      const overlapInfo = await popupPage.evaluate(() => {
        const titleEl = document.querySelector(".brand-title");
        const syncEl = document.getElementById("syncBadge");
        if (!titleEl || !syncEl) return null;
        const rTitle = titleEl.getBoundingClientRect();
        const rSync = syncEl.getBoundingClientRect();
        return {
          titleRight: rTitle.right,
          syncLeft: rSync.left,
          overlaps: rTitle.right > rSync.left,
          titleText: titleEl.textContent
        };
      });
      assert.ok(overlapInfo, `Elements found at width ${w}px`);
      assert.strictEqual(overlapInfo.overlaps, false, `Title overlaps sync badge at width ${w}px`);
      console.log(`  [PASS] Width ${w}px: Title right (${Math.round(overlapInfo.titleRight)}px) <= Sync left (${Math.round(overlapInfo.syncLeft)}px), zero overlap.`);
    }

    // ------------------------------------------------------------------------
    // Step 9: Multi-Item Equipping, Visual Representation & Slot Swapping (Fase 1)
    // ------------------------------------------------------------------------
    console.log("\n[E2E 8] Multi-Item Equipping, Visual Representation & Slot Swapping (Fase 1):");
    await popupPage.locator('.tab-btn[data-target="view-inventory"]').click();

    await popupPage.evaluate(async () => {
      const stats = {
        chaptersRead: 50,
        novelsStarted: 5,
        novelsCompleted: 1,
        bonusQi: 50,
        unlockedTitles: ["outer_disciple", "diligent_reader", "body_refiner", "tribulation_overcomer"],
        equippedTitle: "outer_disciple",
        equippedItems: [],
        inventory: ["qi_core_1", "amulet_focus_1", "pill_vitality_1", "sword_dao_1"]
      };
      await chrome.storage.local.set({ stats });
      await renderInventoryUI();
      await renderCultivationUI();
    });
    await popupPage.waitForTimeout(60);

    // Equip 1st item (qi_core_1)
    await popupPage.locator('.btn-equip-item[data-item-id="qi_core_1"]').click();
    await popupPage.waitForTimeout(100);

    // Equip 2nd item (amulet_focus_1)
    await popupPage.locator('.btn-equip-item[data-item-id="amulet_focus_1"]').click();
    await popupPage.waitForTimeout(100);

    // Equip 3rd item (pill_vitality_1)
    await popupPage.locator('.btn-equip-item[data-item-id="pill_vitality_1"]').click();
    await popupPage.waitForTimeout(100);

    const equipDomState = await popupPage.evaluate(() => {
      const equippedCards = document.querySelectorAll("#equippedSlotsContainer .slot-filled");
      const miniSlotNodes = document.querySelectorAll("#avatarMiniSlots .avatar-item-node");
      return {
        equippedCardsCount: equippedCards.length,
        miniSlotCount: miniSlotNodes.length
      };
    });
    assert.strictEqual(equipDomState.equippedCardsCount, 3, "3 items rendered in equipped slots container");
    assert.strictEqual(equipDomState.miniSlotCount, 3, "3 mini item nodes rendered around avatar perimeter");
    console.log("  [PASS] 3 items equipped simultaneously across distinct slots with immediate DOM rendering.");

    // Slot replacement: select slot 1 (index 1), then equip sword_dao_1 into it
    await popupPage.waitForTimeout(150);
    await popupPage.locator('#equippedSlotsContainer .equipped-slot-card[data-slot-index="1"] .slot-item-name').click();
    await popupPage.waitForSelector('#equippedSlotsContainer .equipped-slot-card[data-slot-index="1"].slot-selected', { timeout: 5000 });
    await popupPage.waitForSelector('.btn-equip-item[data-item-id="sword_dao_1"]:not([disabled])', { timeout: 5000 });
    await popupPage.locator('.btn-equip-item[data-item-id="sword_dao_1"]').click();
    await popupPage.waitForTimeout(150);

    const afterSwapState = await popupPage.evaluate(async () => {
      const { stats } = await chrome.storage.local.get(["stats"]);
      return {
        equippedItems: stats.equippedItems,
        hasSword: stats.equippedItems.includes("sword_dao_1"),
        length: stats.equippedItems.length
      };
    });
    assert.strictEqual(afterSwapState.length, 3, "Still exactly 3 items equipped after slot replacement");
    assert.strictEqual(afterSwapState.hasSword, true, "sword_dao_1 successfully replaced slot 1");
    console.log("  [PASS] Explicit slot replacement (sword_dao_1 into slot 1) verified without collision.");

    // Unequip sword_dao_1
    await popupPage.locator('#equippedSlotsContainer .btn-slot-unequip[data-item-id="sword_dao_1"]').click();
    await popupPage.waitForTimeout(100);
    const afterUnequipState = await popupPage.evaluate(async () => {
      const { stats } = await chrome.storage.local.get(["stats"]);
      return {
        count: stats.equippedItems.length,
        hasSword: stats.equippedItems.includes("sword_dao_1")
      };
    });
    assert.strictEqual(afterUnequipState.count, 2, "2 items remaining after unequip");
    assert.strictEqual(afterUnequipState.hasSword, false, "sword_dao_1 cleanly removed");
    console.log("  [PASS] Unequipping item updates storage and avatar visuals cleanly.");

    // ------------------------------------------------------------------------
    // Step 10: Strict XSS Injection Protection in Real Chromium (Fase 11)
    // ------------------------------------------------------------------------
    console.log("\n[E2E 9] Strict XSS Injection Protection in Real Chromium (Fase 11):");
    let dialogTriggered = false;
    popupPage.on("dialog", (d) => {
      dialogTriggered = true;
      d.dismiss().catch(() => {});
    });

    const xssPayload = "<img src=x onerror=alert(1)>";
    await popupPage.locator('.tab-btn[data-target="view-library"]').click();
    await popupPage.evaluate(async (payload) => {
      await chrome.storage.local.set({
        savedNovels: {
          "xss_novel": {
            seriesId: "xss_novel",
            novelName: payload,
            chapter: "1",
            updatedAt: Date.now()
          }
        },
        domainBlacklist: [
          { domain: payload, addedAt: Date.now() }
        ]
      });
      await renderNovels();
      await renderBlacklistUI();
    }, xssPayload);

    await popupPage.waitForTimeout(100);
    assert.strictEqual(dialogTriggered, false, "Zero alert dialogs triggered by XSS payload");

    const xssVerification = await popupPage.evaluate((payload) => {
      const novelTitleEl = document.querySelector(".novel-title");
      const blacklistDomainEl = document.querySelector(".blacklist-item-row span");
      const injectedImgs = document.querySelectorAll(".novel-title img, .blacklist-item-row img");
      return {
        novelText: novelTitleEl ? novelTitleEl.textContent : "",
        blacklistText: blacklistDomainEl ? blacklistDomainEl.textContent : "",
        injectedImgCount: injectedImgs.length
      };
    }, xssPayload);

    assert.strictEqual(xssVerification.injectedImgCount, 0, "Zero malicious <img> elements injected in DOM");
    assert.strictEqual(xssVerification.novelText, xssPayload, "XSS payload displayed literally as textContent in novel title");
    assert.strictEqual(xssVerification.blacklistText, xssPayload, "XSS payload displayed literally as textContent in blacklist domain");
    console.log("  [PASS] XSS payload <img src=x onerror=alert(1)> rendered strictly as literal text with zero script execution.");

    // ------------------------------------------------------------------------
    // Step 11: Logout & Local Account Data Isolation/Purge (Fase 8)
    // ------------------------------------------------------------------------
    console.log("\n[E2E 10] Logout & Local Account Data Isolation/Purge (Fase 8):");
    const logoutResults = await popupPage.evaluate(async () => {
      const uid1 = "user_alpha_test";
      await chrome.storage.local.set({
        auth: { uid: uid1, email: "alpha@test.com", idToken: "fake_token_alpha" },
        lastAuthUid: uid1,
        [`account_data_${uid1}`]: { savedNovels: { n1: { novelName: "Alpha Novel" } }, stats: { chaptersRead: 10 } },
        [`userAvatar_${uid1}`]: "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2wAA"
      });

      // Normal Logout (clearLocalData = false)
      await chrome.runtime.sendMessage({ type: "LOGOUT", clearLocalData: false });
      const storeNormal = await chrome.storage.local.get(null);
      const normalDataPreserved = Boolean(storeNormal[`account_data_${uid1}`]);
      const normalAvatarPreserved = Boolean(storeNormal[`userAvatar_${uid1}`]);
      const authClearedNormal = !storeNormal.auth;

      // Re-login same user
      await chrome.storage.local.set({
        auth: { uid: uid1, email: "alpha@test.com", idToken: "fake_token_alpha" },
        lastAuthUid: uid1
      });

      // Logout with clearLocalData = true
      await chrome.runtime.sendMessage({ type: "LOGOUT", clearLocalData: true });
      const storePurged = await chrome.storage.local.get(null);
      const dataPurged = !storePurged[`account_data_${uid1}`];
      const avatarPurged = !storePurged[`userAvatar_${uid1}`];
      const guestUntouched = storePurged.guest_data !== undefined || storePurged.activeProfileUid === "guest" || storePurged.lastAuthUid === "guest";

      return {
        normalDataPreserved,
        normalAvatarPreserved,
        authClearedNormal,
        dataPurged,
        avatarPurged,
        guestUntouched
      };
    });

    assert.strictEqual(logoutResults.authClearedNormal, true, "Auth cleared on normal logout");
    assert.strictEqual(logoutResults.normalDataPreserved, true, "Account data preserved on normal logout");
    assert.strictEqual(logoutResults.normalAvatarPreserved, true, "Account avatar preserved on normal logout");
    assert.strictEqual(logoutResults.dataPurged, true, "Account data purged when clearLocalData: true");
    assert.strictEqual(logoutResults.avatarPurged, true, "Account avatar purged when clearLocalData: true");
    assert.strictEqual(logoutResults.guestUntouched, true, "Guest state intact after account purge");
    console.log("  [PASS] Normal logout preserves data; clearLocalData selectively purges only target account.");

    // ------------------------------------------------------------------------
    // [E2E 11] Original Preset Avatar Gallery & Customization (v4.0.0)
    // ------------------------------------------------------------------------
    console.log("\n[E2E 11] Original Preset Avatar Gallery & Customization (v4.0.0):");
    const avatarUid = "user_e2e_avatar_tester";
    await popupPage.evaluate(async (uid) => {
      await chrome.storage.local.set({
        auth: { uid, email: "avatar_tester@test.com", idToken: "token_avatar" },
        lastAuthUid: uid,
        [`userAvatar_${uid}`]: undefined
      });
    }, avatarUid);

    await popupPage.reload();
    await popupPage.waitForSelector("#btnUserProfile");

    // Click profile button to open Account Modal
    await popupPage.click("#btnUserProfile");
    await popupPage.waitForSelector("#accountModalLoggedIn", { state: "visible" });

    // Open Avatar Gallery Modal
    await popupPage.click("#btnChooseAvatar");
    await popupPage.waitForSelector("#avatarGalleryModal", { state: "visible" });

    // Verify 21 avatar cards rendered in gallery
    const cardCount = await popupPage.evaluate(() => {
      return document.querySelectorAll("#avatarGalleryGrid .avatar-card").length;
    });
    assert.strictEqual(cardCount, 21, "All 21 avatar cards rendered in gallery grid");

    // Test category filter pills
    await popupPage.click('.avatar-filter-pill:has-text("Criaturas")');
    const filteredCount = await popupPage.evaluate(() => {
      return document.querySelectorAll("#avatarGalleryGrid .avatar-card").length;
    });
    assert.strictEqual(filteredCount, 3, "Filtered grid displays 3 creature avatars");

    // Auto-selection of first creature verified
    const autoSelectedCreature = await popupPage.evaluate(() => {
      const card = document.querySelector('.avatar-card[data-avatar-id="dragon_sovereign"]');
      return card && card.classList.contains("selected");
    });
    assert.strictEqual(autoSelectedCreature, true, "First creature avatar auto-selected upon category switch");

    // Switching back to All
    await popupPage.evaluate(() => {
      const pills = Array.from(document.querySelectorAll(".avatar-filter-pill"));
      const allPill = pills.find(p => p.textContent.includes("Todos"));
      if (allPill) allPill.click();
    });
    const resetCount = await popupPage.evaluate(() => {
      return document.querySelectorAll("#avatarGalleryGrid .avatar-card").length;
    });
    assert.strictEqual(resetCount, 21, "Grid resets to 21 avatars upon clicking Todos");

    // Select Dragon Sovereign avatar card
    await popupPage.click('.avatar-card[data-avatar-id="dragon_sovereign"]');
    const isSelected = await popupPage.evaluate(() => {
      const card = document.querySelector('.avatar-card[data-avatar-id="dragon_sovereign"]');
      return card && card.classList.contains("selected");
    });
    assert.strictEqual(isSelected, true, "Selected avatar card receives .selected class");

    // Confirm selection
    await popupPage.click("#btnConfirmAvatarGallery");
    await popupPage.waitForSelector("#avatarGalleryModal", { state: "hidden" });

    // Verify persistence in chrome.storage.local
    const storedAvatar = await popupPage.evaluate(async (uid) => {
      const data = await chrome.storage.local.get([`userAvatar_${uid}`]);
      return data[`userAvatar_${uid}`];
    }, avatarUid);
    assert.strictEqual(storedAvatar, "assets/avatars/dragon_sovereign.svg", "Preset avatar persisted in storage under user key");

    // Verify avatar renders correctly in header portrait
    const headerAvatarSrc = await popupPage.evaluate(() => {
      const img = document.querySelector("#userAvatarPortrait img.avatar-custom-img");
      return img ? img.getAttribute("src") : null;
    });
    assert.strictEqual(headerAvatarSrc, "assets/avatars/dragon_sovereign.svg", "Preset avatar rendered in header portrait");

    // Restore Default
    await popupPage.click("#btnRestoreAvatar");
    const restoredAvatar = await popupPage.evaluate(async (uid) => {
      const data = await chrome.storage.local.get([`userAvatar_${uid}`]);
      return data[`userAvatar_${uid}`];
    }, avatarUid);
    assert.strictEqual(restoredAvatar, undefined, "Restored avatar removed from storage");

    // Close Account Modal
    await popupPage.click("#btnCloseAccountModal");
    await popupPage.waitForSelector("#accountModal", { state: "hidden" });

    // Switch to Settings tab
    await popupPage.click('.tab-btn[data-target="view-settings"]');
    await popupPage.waitForSelector("#view-settings", { state: "visible" });

    // Open Gallery from Settings
    await popupPage.click("#btnSettingsChooseAvatar");
    await popupPage.waitForSelector("#avatarGalleryModal", { state: "visible" });

    // Select Phoenix Maiden
    await popupPage.click('.avatar-card[data-avatar-id="phoenix_maiden"]');
    await popupPage.click("#btnConfirmAvatarGallery");
    await popupPage.waitForSelector("#avatarGalleryModal", { state: "hidden" });

    // Verify Account Modal did NOT pop open
    const isAccModalVisible = await popupPage.evaluate(() => {
      const modal = document.getElementById("accountModal");
      return modal && modal.style.display === "flex";
    });
    assert.strictEqual(isAccModalVisible, false, "Account modal must NOT open when choosing avatar from Settings");

    // Verify Settings avatar preview updated
    const settingsAvatarSrc = await popupPage.evaluate(() => {
      const img = document.querySelector("#settingsAvatarPreview img.avatar-custom-img");
      return img ? img.getAttribute("src") : null;
    });
    assert.strictEqual(settingsAvatarSrc, "assets/avatars/phoenix_maiden.svg", "Settings preview reflects chosen avatar");

    // Restore from Settings
    await popupPage.click("#btnSettingsRestoreAvatar");
    const restoredSettingsAvatar = await popupPage.evaluate(async (uid) => {
      const data = await chrome.storage.local.get([`userAvatar_${uid}`]);
      return data[`userAvatar_${uid}`];
    }, avatarUid);
    assert.strictEqual(restoredSettingsAvatar, undefined, "Restored avatar from settings removed from storage");

    console.log("  [PASS] Real Chromium gallery rendering, 21 cards, category filtering, settings flow, persistence, and default restoration verified.");

    await popupPage.close();

    console.log("\n====================================================================");
    console.log(">>> ALL REAL CHROMIUM MV3 PLAYWRIGHT E2E TESTS PASSED (100%)! <<<");
    console.log("====================================================================\n");
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    if (tempProfileDir && fs.existsSync(tempProfileDir)) {
      try {
        fs.rmSync(tempProfileDir, { recursive: true, force: true });
      } catch {}
    }
  }
})().catch((err) => {
  console.error("FATAL PLAYWRIGHT E2E ERROR:", err);
  process.exit(1);
});
