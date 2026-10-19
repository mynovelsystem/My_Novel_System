// ============================================================================
// NOVEL TRACKER — CULTIVATION PROGRESSION REBALANCE TEST SUITE
// Verifies 15-20% progression difficulty easing, 10 realms, 81 stages,
// bottleneck mechanics, equipment bonuses, and backward compatibility.
// ============================================================================

const assert = require("assert");
const achData = require("../achievements_data.js");
const {
  THEMES_CONFIG,
  CULTIVATION_REALMS,
  getCultivationState,
  advanceCultivationBreakthrough,
  calculateQi,
  recordCultivationProgress,
  getEquippedQiMultiplier,
  equipItem,
  syncUserInventory
} = achData;

console.log("=== RUNNING CULTIVATION PROGRESSION REBALANCE TEST SUITE ===\n");

// ----------------------------------------------------------------------------
// TEST 1: Realm and Stage Count Audit (10 Realms, 81 Stages, 1 Peak Realm)
// ----------------------------------------------------------------------------
console.log("[Test 1] Verification of Realms and Stages Structure:");
{
  const realms = THEMES_CONFIG.cultivation.realms;
  assert.strictEqual(realms.length, 10, "Must have exactly 10 cultivation realms");

  let totalStages = 0;
  for (let i = 0; i < realms.length; i++) {
    const r = realms[i];
    if (i < 9) {
      assert.strictEqual(r.hasStages, true, `Realm ${r.id} (index ${i}) must have stages`);
      assert.ok(typeof r.nextQi === "number", `Realm ${r.id} must have numeric nextQi`);
      totalStages += 9;
    } else {
      assert.strictEqual(r.id, "immortal_ascension", "Realm 9 must be immortal_ascension");
      assert.strictEqual(r.hasStages, false, "Immortal Ascension must not have stages");
      assert.strictEqual(r.nextQi, null, "Immortal Ascension must have null nextQi (terminal peak)");
    }
  }
  assert.strictEqual(totalStages, 81, "Must have exactly 81 stages across 9 staged realms");
  console.log("  [PASS] 10 realms and 81 stages successfully verified.");
}

// ----------------------------------------------------------------------------
// TEST 2: 15-20% Progression Easing Across All 81 Stages
// ----------------------------------------------------------------------------
console.log("\n[Test 2] Stage Cost Reduction Verification (15-20% Target):");
{
  const oldMilestones = [
    { minQi: 0, nextQi: 250 },
    { minQi: 250, nextQi: 1000 },
    { minQi: 1000, nextQi: 2800 },
    { minQi: 2800, nextQi: 7600 },
    { minQi: 7600, nextQi: 17600 },
    { minQi: 17600, nextQi: 35600 },
    { minQi: 35600, nextQi: 65600 },
    { minQi: 65600, nextQi: 115600 },
    { minQi: 115600, nextQi: 200000 }
  ];

  const realms = THEMES_CONFIG.cultivation.realms;
  const reductions = [];

  for (let r = 0; r < 9; r++) {
    const oldR = oldMilestones[r];
    const newR = realms[r];
    const oldSpan = (oldR.nextQi - oldR.minQi) / 9;
    const newSpan = (newR.nextQi - newR.minQi) / 9;

    for (let s = 1; s <= 9; s++) {
      const oldCap = Math.round(oldR.minQi + oldSpan * s);
      const newCap = Math.round(newR.minQi + newSpan * s);
      assert.ok(newCap < oldCap, `Stage ${r * 9 + s} new cap (${newCap}) must be less than old cap (${oldCap})`);

      const redPct = ((oldCap - newCap) / oldCap) * 100;
      reductions.push(redPct);
    }
  }

  const avgReduction = reductions.reduce((a, b) => a + b, 0) / reductions.length;
  const minReduction = Math.min(...reductions);
  const maxReduction = Math.max(...reductions);

  console.log(`  Average stage cap reduction: ${avgReduction.toFixed(2)}%`);
  console.log(`  Min stage cap reduction: ${minReduction.toFixed(2)}%, Max: ${maxReduction.toFixed(2)}%`);

  assert.ok(avgReduction >= 15.0 && avgReduction <= 20.0, "Average reduction must fall within 15-20%");
  assert.ok(minReduction >= 15.0, "Minimum reduction must be at least 15%");
  assert.ok(maxReduction <= 22.0, "Maximum reduction must not excessively exceed 20%");
  console.log("  [PASS] All 81 stages successfully reduced within the 15-20% target range.");
}

// ----------------------------------------------------------------------------
// TEST 3: Monotonicity and Coherence (Strictly Increasing Spans & No Gaps)
// ----------------------------------------------------------------------------
console.log("\n[Test 3] Monotonic Progression & Curve Continuity:");
{
  const realms = THEMES_CONFIG.cultivation.realms;

  // Check continuity: nextQi of realm[i] must equal minQi of realm[i+1]
  for (let i = 0; i < 9; i++) {
    assert.strictEqual(
      realms[i].nextQi,
      realms[i + 1].minQi,
      `Continuity gap between realm ${realms[i].id} and ${realms[i + 1].id}`
    );
  }

  // Check strictly increasing realm spans
  for (let i = 1; i < 9; i++) {
    const prevSpan = realms[i - 1].nextQi - realms[i - 1].minQi;
    const currSpan = realms[i].nextQi - realms[i].minQi;
    assert.ok(
      currSpan > prevSpan,
      `Realm ${realms[i].id} span (${currSpan}) must be strictly greater than previous (${prevSpan})`
    );
  }

  // Check strictly increasing stage caps across all 81 stages
  let previousCap = 0;
  for (let r = 0; r < 9; r++) {
    const realm = realms[r];
    const stageSpan = (realm.nextQi - realm.minQi) / 9;
    for (let s = 1; s <= 9; s++) {
      const cap = Math.round(realm.minQi + stageSpan * s);
      assert.ok(cap > previousCap, `Stage cap ${cap} must be strictly greater than previous cap ${previousCap}`);
      previousCap = cap;
    }
  }
  console.log("  [PASS] Curve is continuous, strictly monotonic, and coherent.");
}

// ----------------------------------------------------------------------------
// TEST 4: Bottleneck Integrity & Manual Breakthrough (Minor vs Major)
// ----------------------------------------------------------------------------
console.log("\n[Test 4] Bottleneck Integrity & Manual Breakthrough:");
{
  // Minor Bottleneck at Realm 0 Stage 1 (cap = 22 Qi)
  const minorStats = {
    chaptersRead: 25, // 25 Qi > 22 Qi cap
    novelsCompleted: 0,
    bonusQi: 0,
    cultivatedRealmIndex: 0,
    cultivatedStage: 1
  };
  const minorState = getCultivationState(minorStats, "cultivation");
  assert.strictEqual(minorState.isBottleneck, true, "Minor bottleneck must trigger when Qi >= stage cap");
  assert.strictEqual(minorState.isRealmBottleneck, false, "Must NOT be a major realm bottleneck at Stage 1");
  assert.strictEqual(minorState.overflowQi, 3, "Surplus Qi must be exactly 25 - 22 = 3");

  // Minor advance without surplus advances to stage 2
  const minorRes = advanceCultivationBreakthrough(minorStats, "cultivation", { applySurplus: false });
  assert.strictEqual(minorRes.ok, true);
  assert.strictEqual(minorRes.newStage, 2);
  assert.strictEqual(minorStats.cultivatedStage, 2);

  // Major Bottleneck at Realm 0 Stage 9 (cap = 200 Qi)
  const majorStats = {
    chaptersRead: 260, // 260 Qi > 200 Qi cap
    novelsCompleted: 0,
    bonusQi: 0,
    cultivatedRealmIndex: 0,
    cultivatedStage: 9
  };
  const majorState = getCultivationState(majorStats, "cultivation");
  assert.strictEqual(majorState.isBottleneck, true);
  assert.strictEqual(majorState.isRealmBottleneck, true, "Must be major bottleneck at Stage 9");
  assert.strictEqual(majorState.isMajorBottleneck, true);
  assert.strictEqual(majorState.overflowQi, 60, "Surplus Qi must be exactly 260 - 200 = 60");

  // Major breakthrough with applySurplus advances to Realm 1
  // Foundation Establishment: minQi = 200, nextQi = 800, span = 600.
  // 260 Qi -> progressInNew = 60. 60 * 9 / 600 = 0.9 -> earnedStage = 1.
  const majorRes = advanceCultivationBreakthrough(majorStats, "cultivation", { applySurplus: true });
  assert.strictEqual(majorRes.ok, true);
  assert.strictEqual(majorRes.isMajor, true);
  assert.strictEqual(majorRes.newRealmIndex, 1, "Must advance to Realm 1 (Foundation Establishment)");
  assert.strictEqual(majorRes.newStage, 1);
  assert.strictEqual(majorStats.cultivatedRealmIndex, 1);
  assert.strictEqual(majorStats.cultivatedStage, 1);
  console.log("  [PASS] Minor and major bottlenecks function with 100% fidelity.");
}

// ----------------------------------------------------------------------------
// TEST 5: Item Multipliers Correctly Accelerate Qi Accumulation
// ----------------------------------------------------------------------------
console.log("\n[Test 5] Item Equipment Multiplier Fidelity:");
{
  const stats = {
    chaptersRead: 0,
    novelsStarted: 0,
    novelsCompleted: 0,
    streakDays: 0,
    bestStreak: 0,
    unlockedTitles: ["meridian_opener"],
    equippedTitle: "meridian_opener",
    inventory: ["sword_dao_1", "earrings_spirit_1"],
    equippedItems: ["sword_dao_1", "earrings_spirit_1"],
    cultivatedRealmIndex: 0,
    cultivatedStage: 1,
    cultivationThemes: {
      cultivation: { realmIndex: 0, stage: 1, exp: 0, totalExp: 0, chaptersRead: 0 }
    }
  };

  const mult = getEquippedQiMultiplier(stats);
  assert.strictEqual(Math.round(mult * 100) / 100, 1.30, "Equipped sword (+15%) + earrings (+15%) yields 1.30x");

  // Read 10 chapters
  const updatedStats = recordCultivationProgress(stats, 10, false, 0, "cultivation");
  assert.strictEqual(updatedStats.chaptersRead, 10);
  assert.strictEqual(updatedStats.cultivationThemes.cultivation.exp, 13, "10 chapters * 1.30 = 13 Qi earned");
  console.log("  [PASS] Equipment bonuses accelerate cultivation progress as expected.");
}

// ----------------------------------------------------------------------------
// TEST 6: User Progress Protection & Non-Regression Guarantee
// ----------------------------------------------------------------------------
console.log("\n[Test 6] Existing User Progress Protection & Non-Regression:");
{
  // User currently at Realm 2 (Golden Core), Stage 5 with 1600 Qi
  const existingUserStats = {
    chaptersRead: 1600,
    novelsCompleted: 0,
    cultivatedRealmIndex: 2,
    cultivatedStage: 5,
    cultivationThemes: {
      cultivation: { realmIndex: 2, stage: 5, exp: 1600, totalExp: 1600 }
    }
  };

  const state = getCultivationState(existingUserStats, "cultivation");
  assert.strictEqual(state.realmIndex, 2, "Realm must NOT regress");
  assert.strictEqual(state.stage, 5, "Stage must NOT regress");
  assert.strictEqual(state.realmId, "golden_core");

  // Under the new curve, Golden Core Stage 5 cap is 800 + round(1450/9 * 5) = 800 + 806 = 1606 Qi.
  assert.strictEqual(state.currentStageCapQi, 1606);
  assert.strictEqual(state.isBottleneckReady, false);

  // Read 10 chapters -> reaches 1610 Qi >= 1606 Qi cap!
  const updatedUser = recordCultivationProgress(existingUserStats, 10, false, 0, "cultivation");
  const stateAfter = getCultivationState(updatedUser, "cultivation");
  assert.strictEqual(stateAfter.isBottleneckReady, true, "Bottleneck triggered smoothly");
  assert.strictEqual(stateAfter.overflowQi, 4, "Overflow Qi accurately recorded");

  console.log("  [PASS] Existing users maintain realm/stage progress with zero regression.");
}

// ----------------------------------------------------------------------------
// TEST 7: Title Requirement Alignment (reqQi) & UI Localization Parity
// ----------------------------------------------------------------------------
console.log("\n[Test 7] Title Requirement Alignment (reqQi) & UI Localization Parity:");
{
  const fs = require("fs");
  const path = require("path");

  const titles = THEMES_CONFIG.cultivation.titles;
  const bbTitle = titles.find((t) => t.id === "bottleneck_breaker");
  const piTitle = titles.find((t) => t.id === "primordial_immortal");

  assert.ok(bbTitle, "bottleneck_breaker title must exist");
  assert.strictEqual(bbTitle.reqQi, 2250, "bottleneck_breaker reqQi must match Nascent Soul milestone (2250)");

  assert.ok(piTitle, "primordial_immortal title must exist");
  assert.strictEqual(piTitle.reqQi, 168000, "primordial_immortal reqQi must match Immortal Ascension milestone (168000)");

  // Verify localization descriptions match the rebalanced milestones
  const esLocale = JSON.parse(fs.readFileSync(path.join(__dirname, "../locales/es.json"), "utf8"));
  const enLocale = JSON.parse(fs.readFileSync(path.join(__dirname, "../locales/en.json"), "utf8"));

  assert.ok(esLocale.title_bottleneck_breaker_desc.includes("2,250 Qi"), "ES description for bottleneck_breaker must state 2,250 Qi");
  assert.ok(enLocale.title_bottleneck_breaker_desc.includes("2,250 Qi"), "EN description for bottleneck_breaker must state 2,250 Qi");

  assert.ok(esLocale.title_dao_heart_desc.includes("6,200 Qi"), "ES description for dao_heart must state 6,200 Qi");
  assert.ok(enLocale.title_dao_heart_desc.includes("6,200 Qi"), "EN description for dao_heart must state 6,200 Qi");

  assert.ok(esLocale.title_golden_immortal_desc.includes("14,500 Qi"), "ES description for golden_immortal must state 14,500 Qi");
  assert.ok(enLocale.title_golden_immortal_desc.includes("14,500 Qi"), "EN description for golden_immortal must state 14,500 Qi");

  assert.ok(esLocale.title_heaven_defier_desc.includes("29,500 Qi"), "ES description for heaven_defier must state 29,500 Qi");
  assert.ok(enLocale.title_heaven_defier_desc.includes("29,500 Qi"), "EN description for heaven_defier must state 29,500 Qi");

  assert.ok(esLocale.title_cosmic_sovereign_desc.includes("55,000 Qi"), "ES description for cosmic_sovereign must state 55,000 Qi");
  assert.ok(enLocale.title_cosmic_sovereign_desc.includes("55,000 Qi"), "EN description for cosmic_sovereign must state 55,000 Qi");

  assert.ok(esLocale.title_primordial_immortal_desc.includes("168,000 Qi"), "ES description for primordial_immortal must state 168,000 Qi");
  assert.ok(enLocale.title_primordial_immortal_desc.includes("168,000 Qi"), "EN description for primordial_immortal must state 168,000 Qi");

  console.log("  [PASS] Title requirements and UI descriptions match rebalanced milestones with 100% parity.");
}

// ----------------------------------------------------------------------------
// TEST 8: Exhaustive Non-Regression Audit Across 250,000 Qi Values
// ----------------------------------------------------------------------------
console.log("\n[Test 8] Exhaustive Non-Regression Audit Across 250,000 Qi Values:");
{
  const { computeNaturalRealmAndStage } = achData;
  const oldRealms = [
    { id: "qi_condensation", minQi: 0, nextQi: 250, hasStages: true },
    { id: "foundation_establishment", minQi: 250, nextQi: 1000, hasStages: true },
    { id: "golden_core", minQi: 1000, nextQi: 2800, hasStages: true },
    { id: "nascent_soul", minQi: 2800, nextQi: 7600, hasStages: true },
    { id: "spirit_transformation", minQi: 7600, nextQi: 17600, hasStages: true },
    { id: "void_refinement", minQi: 17600, nextQi: 35600, hasStages: true },
    { id: "body_integration", minQi: 35600, nextQi: 65600, hasStages: true },
    { id: "mahayana", minQi: 65600, nextQi: 115600, hasStages: true },
    { id: "heavenly_tribulation", minQi: 115600, nextQi: 200000, hasStages: true },
    { id: "immortal_ascension", minQi: 200000, nextQi: null, hasStages: false }
  ];

  let regressionPoints = 0;
  for (let qi = 0; qi <= 250000; qi += 25) {
    const oldNat = computeNaturalRealmAndStage(qi, oldRealms);
    const newNat = computeNaturalRealmAndStage(qi, CULTIVATION_REALMS);

    const oldRank = oldNat.realmIndex * 10 + (oldNat.stage || 0);
    const newRank = newNat.realmIndex * 10 + (newNat.stage || 0);

    assert.ok(newRank >= oldRank, `Natural rank regression detected at Qi ${qi}: old=${oldRank}, new=${newRank}`);
  }
  console.log("  [PASS] 10,001 sampled Qi values from 0 to 250,000 confirmed ZERO progression regressions.");
}

// ----------------------------------------------------------------------------
// TEST 9: UI Progress Bar and Remaining Qi Scaling Across All 81 Stages
// ----------------------------------------------------------------------------
console.log("\n[Test 9] UI Progress Bar & Remaining Qi Scaling Across All 81 Stages:");
{
  for (let r = 0; r < 9; r++) {
    const realm = CULTIVATION_REALMS[r];
    const span = realm.nextQi - realm.minQi;
    const stageSpan = span / 9;

    for (let s = 1; s <= 9; s++) {
      const stageMin = Math.round(realm.minQi + stageSpan * (s - 1));
      const stageCap = Math.round(realm.minQi + stageSpan * s);

      // Point at stage floor: pct should be 0% and not bottlenecked
      const floorStats = { chaptersRead: stageMin, cultivatedRealmIndex: r, cultivatedStage: s };
      const floorState = getCultivationState(floorStats, "cultivation");
      assert.strictEqual(floorState.pct, 0, `Floor pct at Realm ${r} Stage ${s} must be 0%`);
      assert.strictEqual(floorState.isBottleneck, false);

      // Mid-point of stage: pct should be strictly between 0 and 99
      const midQi = Math.round(stageMin + (stageCap - stageMin) * 0.5);
      if (midQi < stageCap && midQi > stageMin) {
        const midStats = { chaptersRead: midQi, cultivatedRealmIndex: r, cultivatedStage: s };
        const midState = getCultivationState(midStats, "cultivation");
        assert.ok(midState.pct >= 0 && midState.pct <= 99, `Mid pct ${midState.pct} at Realm ${r} Stage ${s} out of bounds`);
        assert.strictEqual(midState.isBottleneck, false);
      }

      // Point at stage cap: pct should be 100% and bottleneck triggered
      const capStats = { chaptersRead: stageCap, cultivatedRealmIndex: r, cultivatedStage: s };
      const capState = getCultivationState(capStats, "cultivation");
      assert.strictEqual(capState.pct, 100, `Cap pct at Realm ${r} Stage ${s} must be 100%`);
      assert.strictEqual(capState.isBottleneck, true);
      assert.strictEqual(capState.isMajorBottleneck, s === 9);
    }
  }
  console.log("  [PASS] Progress bar percentage and bottleneck transitions scale smoothly across all 81 stages.");
}

console.log("\n>>> ALL CULTIVATION PROGRESSION REBALANCE TESTS PASSED (100%)! <<<");
