// ============================================================================
// NOVEL TRACKER — TEST SUITE V6: CULTIVATION BREAKTHROUGH & BOTTLENECK MECHANICS
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const achData = require("../achievements_data.js");
const {
  THEMES_CONFIG,
  getCultivationState,
  advanceCultivationBreakthrough,
  calculateQi,
  recordCultivationProgress
} = achData;

console.log("=== RUNNING V6 CULTIVATION BREAKTHROUGH & BOTTLENECK TEST SUITE ===\n");

// ----------------------------------------------------------------------------
// TEST 1: No breakthrough allowed when Qi is below stage cap
// ----------------------------------------------------------------------------
console.log("[Test 1] Strict Stage Cap Gating (No free clicks without Qi):");
{
  const stats = {
    chaptersRead: 5, // 5 Qi in Realm 0 (Qi Condensation, span 0-100, stage 1 cap = 11)
    novelsCompleted: 0,
    bonusQi: 0,
    cultivatedRealmIndex: 0,
    cultivatedStage: 1
  };
  const state = getCultivationState(stats, "cultivation");
  assert.strictEqual(state.isBottleneckReady, false, "Must not be bottleneck ready at 5 Qi (cap is 11 Qi)");
  assert.strictEqual(state.isBottleneck, false);

  const res = advanceCultivationBreakthrough(stats, "cultivation", { applySurplus: true });
  assert.strictEqual(res.ok, false, "Breakthrough must fail if Qi < cap");
  assert.strictEqual(res.reason, "not_ready");
  assert.strictEqual(stats.cultivatedStage, 1, "Stage must remain unchanged");
  console.log("  [PASS] Cannot advance stage when Qi is insufficient.");
}

// ----------------------------------------------------------------------------
// TEST 2: Breakthrough consumes backlog and clears button (No infinite spam)
// ----------------------------------------------------------------------------
console.log("\n[Test 2] Surplus Application & Button Deactivation (Prevent spam clicking):");
{
  // User has read 90 chapters -> 90 Qi.
  // In Realm 0 (0-200): Stage 1 cap = 22, Stage 2 cap = 44, Stage 3 cap = 67, Stage 4 cap = 89, Stage 5 cap = 111.
  // At stage 1 with 90 Qi, user is ready to breakthrough.
  const stats = {
    chaptersRead: 90,
    novelsCompleted: 0,
    bonusQi: 0,
    cultivatedRealmIndex: 0,
    cultivatedStage: 1
  };
  let state = getCultivationState(stats, "cultivation");
  assert.strictEqual(state.isBottleneckReady, true, "Ready for breakthrough at 90 Qi > 22 Qi");

  // User clicks breakthrough with applySurplus: true
  const res = advanceCultivationBreakthrough(stats, "cultivation", { applySurplus: true });
  assert.strictEqual(res.ok, true, "Breakthrough succeeds");
  assert.strictEqual(res.newStage, 5, "Surplus 90 Qi properly places user in Stage 5 (earned stage)");

  // Now inspect state AFTER breakthrough:
  state = getCultivationState(stats, "cultivation");
  assert.strictEqual(state.stage, 5);
  assert.strictEqual(state.currentStageCapQi, 111);
  assert.strictEqual(state.isBottleneckReady, false, "Bottleneck must be FALSE because 90 Qi < 111 Qi cap");
  assert.strictEqual(state.isBottleneck, false);

  // If user tries to click the button again immediately:
  const resSpam = advanceCultivationBreakthrough(stats, "cultivation", { applySurplus: true });
  assert.strictEqual(resSpam.ok, false, "Second immediate click must be rejected");
  assert.strictEqual(resSpam.reason, "not_ready");
  console.log("  [PASS] Surplus advances to earned stage and button immediately disables.");
}

// ----------------------------------------------------------------------------
// TEST 3: Stage 9/9 Major Realm Bottleneck (Does NOT loop back to Stage 1 in same realm)
// ----------------------------------------------------------------------------
console.log("\n[Test 3] Stage 9/9 Major Realm Bottleneck & Ascension to Next Realm:");
{
  // User in Realm 0 (Qi Condensation), Stage 9 with 280 Qi (cap is 200 Qi)
  const stats = {
    chaptersRead: 280,
    novelsCompleted: 0,
    bonusQi: 0,
    cultivatedRealmIndex: 0,
    cultivatedStage: 9
  };
  let state = getCultivationState(stats, "cultivation");
  assert.strictEqual(state.isBottleneckReady, true);
  assert.strictEqual(state.isMajorBottleneck, true, "Stage 9/9 with Qi >= cap is a MAJOR bottleneck");
  assert.strictEqual(state.nextRealmId, "foundation_establishment");

  // User ascends major realm
  const res = advanceCultivationBreakthrough(stats, "cultivation", { applySurplus: true });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.isMajor, true);
  assert.strictEqual(res.newRealmIndex, 1, "Must advance to Realm 1 (Foundation Establishment)");
  assert.strictEqual(res.realmObj.id, "foundation_establishment");
  // Foundation Establishment: minQi = 200, nextQi = 800 (span = 600).
  // progressInNew = 280 - 200 = 80.
  // earnedStage = floor(80 * 9 / 600) + 1 = 1 + 1 = 2.
  assert.strictEqual(res.newStage, 2, "New realm places user at earned Stage 2 for 280 Qi");

  // Check state in Realm 1 Stage 2
  state = getCultivationState(stats, "cultivation");
  assert.strictEqual(state.realmIndex, 1);
  assert.strictEqual(state.realmId, "foundation_establishment");
  assert.strictEqual(state.stage, 2);
  // Foundation Stage 2 cap = 200 + 600/9 * 2 = 333 Qi.
  assert.strictEqual(state.currentStageCapQi, 333);
  assert.strictEqual(state.isBottleneckReady, false, "In Realm 1, 280 Qi < 333 Qi so button disappears!");
  console.log("  [PASS] Stage 9/9 ascends to Realm 1 and stops at next stage cap.");
}

// ----------------------------------------------------------------------------
// TEST 4: Supreme Peak Realm (Immortal Ascension, stage === null) Guard
// ----------------------------------------------------------------------------
console.log("\n[Test 4] Supreme Peak Realm Termination & Immortality Guard:");
{
  const stats = {
    chaptersRead: 250000,
    novelsCompleted: 0,
    bonusQi: 0,
    cultivatedRealmIndex: 9, // Realm 9 is immortal_ascension
    cultivatedStage: null
  };
  const state = getCultivationState(stats, "cultivation");
  assert.strictEqual(state.isPeakRealm, true, "Realm 9 is peak realm");
  assert.strictEqual(state.stage, null);
  assert.strictEqual(state.isBottleneckReady, false, "Peak realm must NEVER be bottleneck ready");
  assert.strictEqual(state.isBottleneck, false);

  const res = advanceCultivationBreakthrough(stats, "cultivation", { applySurplus: true });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, "already_max_level", "Must return already_max_level and prevent breakthrough");
  console.log("  [PASS] Peak realm immortal_ascension never displays button or allows breakthrough.");
}

// ----------------------------------------------------------------------------
// TEST 5: Hunter & Legendary Themes Peak & Transition Verification
// ----------------------------------------------------------------------------
console.log("\n[Test 5] Hunter & Legendary Themes Bounds & Peak Safety:");
{
  // Hunter theme has 7 realms (0 to 6, 6 is hunter_national)
  const hunterStats = {
    chaptersRead: 20000,
    cultivationThemes: {
      hunter: {
        realmIndex: 6,
        stage: null
      }
    }
  };
  const hunterState = getCultivationState(hunterStats, "hunter");
  assert.strictEqual(hunterState.isPeakRealm, true);
  assert.strictEqual(hunterState.isBottleneckReady, false);

  const hunterRes = advanceCultivationBreakthrough(hunterStats, "hunter", { applySurplus: true });
  assert.strictEqual(hunterRes.ok, false);
  assert.strictEqual(hunterRes.reason, "already_max_level");

  // Legendary Novels theme has 4 realms (0 to 3, 3 is mythic_chronicler)
  const novelStats = {
    chaptersRead: 5000,
    cultivationThemes: {
      legendary_novels: {
        realmIndex: 3,
        stage: null
      }
    }
  };
  const novelState = getCultivationState(novelStats, "legendary_novels");
  assert.strictEqual(novelState.isPeakRealm, true);
  assert.strictEqual(novelState.isBottleneckReady, false);

  const novelRes = advanceCultivationBreakthrough(novelStats, "legendary_novels", { applySurplus: true });
  assert.strictEqual(novelRes.ok, false);
  assert.strictEqual(novelRes.reason, "already_max_level");
  console.log("  [PASS] Hunter and Legendary themes respect peak realm and prevent infinite looping.");
}

console.log("\n>>> ALL V6 CULTIVATION BREAKTHROUGH TESTS PASSED 100%! <<<");
