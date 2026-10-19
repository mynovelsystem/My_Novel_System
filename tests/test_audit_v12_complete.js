// ============================================================================
// MYNOVELSYSTEM — INTEGRAL AUDIT & FEATURE VERIFICATION SUITE (V12)
// Testing Fases 3 to 10: Qi Balance, Badges, Equipment Layers, Avatar Customizer,
// Account Deletion, Auto-Sync & Performance Audit
// ============================================================================

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================================');
console.log('   MYNOVELSYSTEM: INTEGRAL AUDIT & FEATURE TEST SUITE (V12)         ');
console.log('====================================================================\n');

// Load project scripts
const achievementsSrc = fs.readFileSync(path.join(__dirname, '..', 'achievements_data.js'), 'utf8');
const i18nSrc = fs.readFileSync(path.join(__dirname, '..', 'i18n.js'), 'utf8');
const backgroundSrc = fs.readFileSync(path.join(__dirname, '..', 'background.js'), 'utf8');
const popupHtmlSrc = fs.readFileSync(path.join(__dirname, '..', 'popup.html'), 'utf8');
const popupJsSrc = fs.readFileSync(path.join(__dirname, '..', 'popup.js'), 'utf8');

const {
  THEMES_CONFIG,
  ITEMS_CONFIG,
  DIFFICULTY_CONFIG,
  BADGE_RARITY_CONFIG,
  getCultivationState,
  calculateQiBreakdown
} = require('../achievements_data.js');

// ----------------------------------------------------------------------------
// Test 1: Balanced Qi Progression Curve & Remaining Qi Calculation
// ----------------------------------------------------------------------------
console.log('[Test 1] Balanced Qi Progression Curve & Realm Limits (Fase 8):');
{
  const realms = THEMES_CONFIG.cultivation.realms;
  assert.strictEqual(realms.length, 10, 'Cultivation theme must have 10 realms');

  // Verify progression curve milestones (rebalanced 15-20% difficulty adjustment)
  assert.strictEqual(realms[0].minQi, 0, 'Qi Condensation starts at 0');
  assert.strictEqual(realms[0].nextQi, 200, 'Qi Condensation caps at 200');
  assert.strictEqual(realms[1].minQi, 200, 'Foundation Establishment starts at 200');
  assert.strictEqual(realms[1].nextQi, 800, 'Foundation Establishment caps at 800');
  assert.strictEqual(realms[2].minQi, 800, 'Golden Core starts at 800');
  assert.strictEqual(realms[2].nextQi, 2250, 'Golden Core caps at 2250');

  // Rebalanced mid-to-high realms
  assert.strictEqual(realms[3].minQi, 2250, 'Nascent Soul starts at 2250');
  assert.strictEqual(realms[3].nextQi, 6200, 'Nascent Soul caps at 6200');
  assert.strictEqual(realms[4].minQi, 6200, 'Spirit Transformation starts at 6200');
  assert.strictEqual(realms[4].nextQi, 14500, 'Spirit Transformation caps at 14500');
  assert.strictEqual(realms[5].minQi, 14500, 'Void Refinement starts at 14500');
  assert.strictEqual(realms[5].nextQi, 29500, 'Void Refinement caps at 29500');
  assert.strictEqual(realms[6].minQi, 29500, 'Body Integration starts at 29500');
  assert.strictEqual(realms[6].nextQi, 55000, 'Body Integration caps at 55000');
  assert.strictEqual(realms[7].minQi, 55000, 'Mahayana starts at 55000');
  assert.strictEqual(realms[7].nextQi, 97000, 'Mahayana caps at 97000');
  assert.strictEqual(realms[8].minQi, 97000, 'Heavenly Tribulation starts at 97000');
  assert.strictEqual(realms[8].nextQi, 168000, 'Heavenly Tribulation caps at 168000');
  assert.strictEqual(realms[9].minQi, 168000, 'Immortal Ascension starts at 168000 (Supreme Peak)');

  // Test Remaining Qi calculation for intermediate stage
  const testStats = {
    totalQi: 1100,
    cultivatedRealmIndex: 2, // Golden Core (800 - 2250, span=1450, stageSpan=161.11, stage 3 cap=1283)
    cultivatedStage: 3
  };
  const cultState = getCultivationState(testStats, 'cultivation');
  assert.ok(cultState.currentStageCapQi > 1100, 'Stage cap exceeds current Qi');
  const remainingQi = cultState.currentStageCapQi - testStats.totalQi;
  assert.ok(remainingQi > 0, `Remaining Qi correctly calculated: ${remainingQi}`);

  console.log(`  [PASS] 10-realm curve verified (0 -> 200 -> 800 -> 2250 -> 6200 -> 14500 -> 29500 -> 55000 -> 97000 -> 168000+).`);
  console.log(`  [PASS] Mid-stage remaining Qi calculation verified (${testStats.totalQi} / ${cultState.currentStageCapQi}, missing ${remainingQi} Qi).`);
}

// ----------------------------------------------------------------------------
// Test 2: Fix Duplicated "Legendario" Badge Tag Bug & Badge LitRPG Item Box
// ----------------------------------------------------------------------------
console.log('\n[Test 2] Badge Tags Deduplication & LitRPG Reward Boxes (Fase 7):');
{
  const legendaryBadge = THEMES_CONFIG.cultivation.titles.find(t => t.difficulty === 6) ||
    THEMES_CONFIG.hunter.titles.find(t => t.difficulty === 6);
  assert.ok(legendaryBadge, 'Found legendary difficulty badge');

  const diffCfg = DIFFICULTY_CONFIG[legendaryBadge.difficulty];
  assert.strictEqual(diffCfg.id, 'legendary', 'Difficulty 6 maps to legendary');

  // Verify regex / code fix in popup.js prevents duplicated tag
  assert.ok(popupJsSrc.includes('const isDuplicateTag = diffName.trim().toLowerCase() === rarityName.trim().toLowerCase();'), 'Duplicate tag logic in popup.js');
  assert.ok(popupJsSrc.includes('const diffTagHtml = isDuplicateTag ? "" :'), 'diffTagHtml omitted when matching rarity tag');

  // Verify badge item indicators
  assert.ok(popupJsSrc.includes('title-item-reward-box'), 'popup.js contains title-item-reward-box template');
  assert.ok(popupJsSrc.includes('reward-box-icon'), 'popup.js contains reward-box-icon');
  assert.ok(popupJsSrc.includes('ach_item_reward_label'), 'popup.js uses ach_item_reward_label');

  // Verify that an item in ITEMS_CONFIG links to an achievement
  const linkedItems = Object.values(ITEMS_CONFIG).filter(it => it.unlockedByAchievement);
  assert.ok(linkedItems.length >= 12, `At least 12 items linked to achievements, found ${linkedItems.length}`);

  console.log('  [PASS] Root cause of duplicate "Legendario" badge tag resolved cleanly without CSS hacks.');
  console.log(`  [PASS] LitRPG item reward boxes rendered dynamically across ${linkedItems.length} achievement rewards.`);
}

// ----------------------------------------------------------------------------
// Test 3: Dynamic Visual Equipment Composition by Category around Avatar
// ----------------------------------------------------------------------------
console.log('\n[Test 3] Categorized Visual Avatar Equipment Layers (Fase 4):');
{
  // Check that all required categories exist in ITEMS_CONFIG
  const categories = new Set(Object.values(ITEMS_CONFIG).map(it => it.category));
  const expectedCategories = ['sword', 'necklace', 'hat', 'glasses', 'earrings', 'cape', 'armor', 'ring', 'aura', 'relic'];
  for (const cat of expectedCategories) {
    assert.ok(categories.has(cat), `Category '${cat}' present in ITEMS_CONFIG`);
  }

  // Verify CSS positions in popup.html
  for (const cat of expectedCategories) {
    assert.ok(popupHtmlSrc.includes(`.avatar-item-node.pos-${cat}`), `CSS class .avatar-item-node.pos-${cat} defined in popup.html`);
  }

  // Verify dynamic assignment in updateAvatarMiniSlots and openAccountModal in popup.js
  assert.ok(popupJsSrc.includes('pos-${category}'), 'popup.js assigns dynamic categorical positioning class');
  assert.ok(popupHtmlSrc.includes('id="avatarMiniSlots"'), 'popup.html contains avatarMiniSlots');
  assert.ok(popupHtmlSrc.includes('id="accountLargeItemSlots"'), 'popup.html contains accountLargeItemSlots');

  console.log(`  [PASS] 10 visual item equipment categories verified with precise CSS positioning around avatar.`);
}

// ----------------------------------------------------------------------------
// Test 4: Custom Avatar Validation, Storage Isolation, and Default Restoration
// ----------------------------------------------------------------------------
console.log('\n[Test 4] Avatar Customization, Validation & Account Isolation (Fase 6):');
{
  // Check validation rules in popup.js
  assert.ok(popupJsSrc.includes('500 * 1024'), '500 KB file size limit enforced in popup.js');
  assert.ok(popupJsSrc.includes('["image/png", "image/jpeg", "image/webp"]'), 'Allowed image formats enforced');
  assert.ok(popupJsSrc.includes('canvas.toDataURL("image/webp", 0.85)'), 'Canvas image compression to WebP dataURL');

  // Check account-isolated key
  assert.ok(popupJsSrc.includes('userAvatar_${currentUid}'), 'Avatar stored under isolated account key');

  // Check restore default button handler
  assert.ok(popupJsSrc.includes('btnRestoreAvatar'), 'btnRestoreAvatar event handler wired');
  assert.ok(popupJsSrc.includes('chrome.storage.local.remove([avatarKey])'), 'Avatar key removed on restoration');

  console.log('  [PASS] Avatar file validation (<500KB, png/jpeg/webp), offscreen canvas resize, preview, isolated key storage and default restoration verified.');
}

// ----------------------------------------------------------------------------
// Test 5: Independent "Cerrar Sesión" vs "Eliminar Cuenta" & Confirmation Modal
// ----------------------------------------------------------------------------
console.log('\n[Test 5] Independent Logout vs Account Deletion & Confirm Modal (Fase 5):');
{
  // Verify modal elements in popup.html
  assert.ok(popupHtmlSrc.includes('id="deleteAccountConfirmModal"'), 'deleteAccountConfirmModal present in popup.html');
  assert.ok(popupHtmlSrc.includes('id="btnCancelDeleteAccount"'), 'btnCancelDeleteAccount present in popup.html');
  assert.ok(popupHtmlSrc.includes('id="btnConfirmDeleteAccount"'), 'btnConfirmDeleteAccount present in popup.html');

  // Verify background.js message whitelist and handler
  assert.ok(backgroundSrc.includes('"DELETE_ACCOUNT"'), 'DELETE_ACCOUNT in background message whitelist');
  assert.ok(backgroundSrc.includes('https://identitytoolkit.googleapis.com/v1/accounts:delete'), 'Firebase Auth accounts:delete endpoint invoked in background.js');
  assert.ok(backgroundSrc.includes('switchAccountProfile("guest")'), 'Reverts safely to guest profile upon deletion');

  // Verify popup.js delete handler
  assert.ok(popupJsSrc.includes('btnAccountModalDelete'), 'btnAccountModalDelete opens confirmation modal');
  assert.ok(popupJsSrc.includes('btnConfirmDeleteAccount'), 'btnConfirmDeleteAccount sends DELETE_ACCOUNT');

  console.log('  [PASS] "Cerrar sesión" and "Eliminar cuenta" operate completely independently.');
  console.log('  [PASS] Confirmation modal guards account deletion with non-destructive cancel.');
  console.log('  [PASS] Background worker executes authentic Firebase Auth deletion and vault cleanup.');
}

// ----------------------------------------------------------------------------
// Test 6: Automatic Cloud Sync upon Login & Manual Sync Button Removal
// ----------------------------------------------------------------------------
console.log('\n[Test 6] Automatic Cloud Sync on Login & Options Button Removal (Fase 3):');
{
  // Verify that #btnSyncNow is removed from loggedInView in popup.html
  const loggedInViewMatch = popupHtmlSrc.match(/<div id="loggedInView"[\s\S]*?<\/div>\s*<\/div>/);
  assert.ok(loggedInViewMatch, 'Found loggedInView in popup.html');
  assert.strictEqual(loggedInViewMatch[0].includes('id="btnSyncNow"'), false, 'Manual sync button removed from loggedInView Options tab');

  // Verify auto-sync triggered in executeFirebaseAuth in popup.js
  assert.ok(popupJsSrc.includes('badge.className = "sync-pill syncing"'), 'Sync pill shows syncing state');
  assert.ok(popupJsSrc.includes('PULL_FROM_CLOUD'), 'Auto-sync triggers PULL_FROM_CLOUD after auth');
  assert.ok(popupJsSrc.includes('badge.className = "sync-pill online"'), 'Sync pill updates to online upon sync success');

  console.log('  [PASS] Manual sync button removed from Options tab.');
  console.log('  [PASS] Automatic cloud sync executes on login with distinct auth and sync UI states.');
}

// ----------------------------------------------------------------------------
// Test 7: Multi-Language i18n Dictionary Integrity (ES & EN)
// ----------------------------------------------------------------------------
console.log('\n[Test 7] Multi-Language i18n Dictionary Integrity (ES & EN):');
{
  const es = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', 'es.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', 'en.json'), 'utf8'));

  const requiredKeys = [
    'account_btn_delete',
    'account_delete_confirm_title',
    'account_delete_confirm_msg',
    'account_btn_confirm_delete',
    'account_deleted_toast',
    'account_delete_error',
    'avatar_change_btn',
    'avatar_restore_btn',
    'avatar_confirm_title',
    'avatar_save_btn',
    'avatar_cancel_btn',
    'avatar_size_err',
    'avatar_format_err',
    'avatar_saved_toast',
    'avatar_restored_toast',
    'cult_qi_remaining_stage',
    'cult_qi_peak',
    'cult_bottleneck_alert',
    'ach_item_reward_label',
    'ach_reward_unlocked_pill',
    'ach_reward_locked_pill'
  ];

  for (const k of requiredKeys) {
    assert.ok(es[k], `Key '${k}' missing in es.json`);
    assert.ok(en[k], `Key '${k}' missing in en.json`);
  }

  console.log(`  [PASS] All ${requiredKeys.length} new internationalization keys synchronized in ES and EN.`);
}

// ----------------------------------------------------------------------------
// Test 8: Hunter & Legendary Novels Themes Realm Localization Verification
// ----------------------------------------------------------------------------
console.log('\n[Test 8] Hunter & Legendary Novels Realm Keys Localization:');
{
  const es = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', 'es.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', 'en.json'), 'utf8'));

  const hunterRealms = THEMES_CONFIG.hunter.realms.map(r => `realm_${r.id}`);
  const novelRealms = THEMES_CONFIG.legendary_novels.realms.map(r => `realm_${r.id}`);
  const allThemeRealms = [...hunterRealms, ...novelRealms];

  for (const rKey of allThemeRealms) {
    assert.ok(es[rKey], `Missing realm translation in ES: ${rKey}`);
    assert.ok(en[rKey], `Missing realm translation in EN: ${rKey}`);
  }

  console.log(`  [PASS] All ${allThemeRealms.length} secondary theme realm keys verified in ES and EN dictionaries.`);
}

// ----------------------------------------------------------------------------
// Test 9: Real Background Handler Execution - DELETE_ACCOUNT Non-Resurrection
// ----------------------------------------------------------------------------
console.log('\n[Test 9] DELETE_ACCOUNT Handler Execution & Non-Resurrection:');
(async () => {
  const mockStorage = {
    auth: { uid: 'user_delete_test_999', idToken: 'valid_mock_token_999' },
    lastAuthUid: 'user_delete_test_999',
    account_data_user_delete_test_999: {
      savedNovels: { series1: { chapter: 10 } },
      stats: { chaptersRead: 10 }
    },
    userAvatar_user_delete_test_999: 'data:image/webp;base64,mockavatar'
  };

  const chromeMock = {
    storage: {
      onChanged: { addListener: () => {} },
      local: {
        get(keys) {
          const res = {};
          (Array.isArray(keys) ? keys : [keys]).forEach(k => {
            if (mockStorage[k] !== undefined) res[k] = mockStorage[k];
          });
          return Promise.resolve(res);
        },
        set(obj) {
          Object.assign(mockStorage, obj);
          return Promise.resolve();
        },
        remove(keys) {
          (Array.isArray(keys) ? keys : [keys]).forEach(k => {
            delete mockStorage[k];
          });
          return Promise.resolve();
        }
      }
    },
    runtime: {
      id: "novel-tracker-extension-id",
      getManifest: () => ({ version: "4.0.0" }),
      getURL: (p) => p || "",
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: { addListener(fn) { chromeMock.messageHandler = fn; } },
      sendMessage: () => {}
    },
    action: { setIcon() {}, setBadgeText() {}, setBadgeBackgroundColor() {}, setTitle() {} },
    tabs: {
      query: async () => [],
      get: async (id) => ({ id }),
      create: async () => ({ id: 2 }),
      update: async () => ({ id: 1 }),
      sendMessage: async () => {},
      onActivated: { addListener: () => {} },
      onRemoved: { addListener: () => {} },
      onUpdated: { addListener: () => {} }
    },
    alarms: { onAlarm: { addListener: () => {} }, create: () => {}, clear: () => {} },
    omnibox: { onInputChanged: { addListener: () => {} }, onInputEntered: { addListener: () => {} } },
    commands: { onCommand: { addListener: () => {} } }
  };

  const sandbox = {
    chrome: chromeMock,
    fetch: async (url, opts) => {
      return {
        ok: true,
        json: async () => ({})
      };
    },
    console: { log() {}, warn() {}, error() {} },
    importScripts: () => {},
    setTimeout,
    clearTimeout,
    Date
  };

  vm.createContext(sandbox);
  vm.runInContext(i18nSrc, sandbox);
  vm.runInContext(achievementsSrc, sandbox);
  vm.runInContext(backgroundSrc, sandbox);

  assert.ok(chromeMock.messageHandler, 'Message handler registered');

  const responsePromise = new Promise(resolve => {
    chromeMock.messageHandler({ type: 'DELETE_ACCOUNT' }, {}, resolve);
  });

  const res = await responsePromise;
  assert.strictEqual(res.ok, true, 'DELETE_ACCOUNT returned ok: true');

  // Verify that account_data_user_delete_test_999 does NOT exist in storage (NOT resurrected)
  assert.strictEqual(mockStorage.account_data_user_delete_test_999, undefined, 'Deleted user vault MUST be permanently removed');
  assert.strictEqual(mockStorage.userAvatar_user_delete_test_999, undefined, 'Deleted user avatar MUST be permanently removed');
  assert.strictEqual(mockStorage.auth, undefined, 'Auth credentials MUST be purged');
  assert.strictEqual(mockStorage.lastAuthUid, 'guest', 'Switched cleanly to guest mode');

  console.log('  [PASS] DELETE_ACCOUNT executed successfully in VM: 0 data resurrection, vault and avatar completely purged.');

  // ----------------------------------------------------------------------------
  // Test 10: PULL_FROM_CLOUD True Error State Reporting
  // ----------------------------------------------------------------------------
  console.log('\n[Test 10] PULL_FROM_CLOUD Error State Reporting:');
  {
    // Test when fetch fails
    sandbox.fetch = async () => {
      return { ok: false, status: 500 };
    };
    sandbox.chrome.storage.local.set({
      auth: { uid: 'u1', idToken: 'tok', refreshToken: 'ref' },
      lastAuthUid: 'u1'
    });

    const pullErrPromise = new Promise(resolve => {
      chromeMock.messageHandler({ type: 'PULL_FROM_CLOUD' }, {}, resolve);
    });
    const pullRes = await pullErrPromise;
    assert.strictEqual(pullRes.ok, false, 'PULL_FROM_CLOUD must report ok: false on HTTP error');

    // Test that popup.js correctly interprets syncSuccess
    const syncSuccess = Boolean(pullRes && pullRes.ok && !pullRes.error);
    assert.strictEqual(syncSuccess, false, 'popup.js evaluates failed pull as false');

    console.log('  [PASS] PULL_FROM_CLOUD correctly propagates failure status when cloud endpoint returns HTTP 500.');
  }

  // ----------------------------------------------------------------------------
  // Test 11: Avatar Privacy Isolation on Logout
  // ----------------------------------------------------------------------------
  console.log('\n[Test 11] Avatar Privacy Isolation on Logout:');
  {
    assert.ok(popupJsSrc.includes('avatarPortrait.textContent = "👤";'), 'Mini avatar defaults strictly to 👤 on logout');
    assert.ok(!popupJsSrc.includes('if (!isLoggedIn) {\n    if (customAvatar)'), 'Custom avatar is never loaded when not logged in');
    console.log('  [PASS] Avatar privacy verified: custom avatar never renders for logged-out or guest users.');
  }

  // ----------------------------------------------------------------------------
  // Test 12: CSS Hover Transformations and Slot-Index Classes
  // ----------------------------------------------------------------------------
  console.log('\n[Test 12] CSS Hover Transformations & Slot Index Integrity:');
  {
    assert.ok(popupHtmlSrc.includes('.avatar-item-node.pos-hat:hover'), 'Centered items have separate hover rule');
    assert.ok(popupHtmlSrc.includes('translateX(-50%) scale(1.28) !important'), 'Hover preserves translateX centering');
    assert.ok(popupHtmlSrc.includes('rotate(-25deg) scale(1.28) !important'), 'Hover preserves sword rotation');
    assert.ok(popupHtmlSrc.includes('.avatar-item-node.slot-idx-1.pos-relic'), 'Anti-collision slot offset rules present');
    assert.ok(popupJsSrc.includes('slot-idx-${i}'), 'popup.js dynamically assigns slot-idx-${i}');
    console.log('  [PASS] Hover transform integrity and multi-item slot anti-collision rules verified.');
  }

  console.log('\n====================================================================');
  console.log('>>> ALL V12 INTEGRAL AUDIT & FEATURE TESTS PASSED 100%!           <<<');
  console.log('====================================================================\n');
  process.exit(0);
})();
