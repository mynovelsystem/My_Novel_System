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
  // User has read 35 chapters -> 35 Qi.
  // In Realm 0: Stage 1 cap = 11, Stage 2 cap = 22, Stage 3 cap = 33, Stage 4 cap = 44.
  // At stage 1 with 35 Qi, user is ready to breakthrough.
  const stats = {
    chaptersRead: 35,
    novelsCompleted: 0,
    bonusQi: 0,
    cultivatedRealmIndex: 0,
    cultivatedStage: 1
  };
  let state = getCultivationState(stats, "cultivation");
  assert.strictEqual(state.isBottleneckReady, true, "Ready for breakthrough at 35 Qi > 11 Qi");

  // User clicks breakthrough with applySurplus: true
  const res = advanceCultivationBreakthrough(stats, "cultivation", { applySurplus: true });
  assert.strictEqual(res.ok, true, "Breakthrough succeeds");
  assert.strictEqual(res.newStage, 4, "Surplus 35 Qi properly places user in Stage 4 (earned stage)");

  // Now inspect state AFTER breakthrough:
  state = getCultivationState(stats, "cultivation");
  assert.strictEqual(state.stage, 4);
  assert.strictEqual(state.currentStageCapQi, 44);
  assert.strictEqual(state.isBottleneckReady, false, "Bottleneck must be FALSE because 35 Qi < 44 Qi cap");
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
  // User in Realm 0 (Qi Condensation), Stage 9 with 120 Qi (cap is 100 Qi)
  const stats = {
    chaptersRead: 120,
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
  // Foundation Establishment: minQi = 100, nextQi = 400 (span = 300).
  // progressInNew = 120 - 100 = 20.
  // earnedStage = floor(20 * 9 / 300) + 1 = 1.
  assert.strictEqual(res.newStage, 1, "New realm starts at Stage 1 for 120 Qi");

  // Check state in Realm 1 Stage 1
  state = getCultivationState(stats, "cultivation");
  assert.strictEqual(state.realmIndex, 1);
  assert.strictEqual(state.realmId, "foundation_establishment");
  // Foundation Stage 1 cap = 100 + 300/9 = 133 Qi.
  assert.strictEqual(state.currentStageCapQi, 133);
  assert.strictEqual(state.isBottleneckReady, false, "In Realm 1, 120 Qi < 133 Qi so button disappears!");
  console.log("  [PASS] Stage 9/9 ascends to Realm 1 and stops at next stage cap.");
}

// ----------------------------------------------------------------------------
// TEST 4: Supreme Peak Realm (Immortal Ascension, stage === null) Guard
// ----------------------------------------------------------------------------
console.log("\n[Test 4] Supreme Peak Realm Termination & Immortality Guard:");
{
  const stats = {
    chaptersRead: 45000,
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
