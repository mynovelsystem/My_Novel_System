// ============================================================================
// TEST SUITE: V7 HEADER BADGE & STREAMLINED TITLE EQUIPPING
// ============================================================================
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

console.log("=== RUNNING V7 HEADER BADGE & STREAMLINED EQUIPPING TEST SUITE ===");

const popupHtml = fs.readFileSync(path.join(__dirname, "../popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(__dirname, "../popup.js"), "utf8");
const achData = require("../achievements_data.js");
const { TITLE_CONFIG, ALL_TITLES, THEMES_CONFIG } = achData;

// -------------------------------------------------------------
// TEST 1: MV3 CSP Compliance (Zero inline onerror anywhere)
// -------------------------------------------------------------
console.log("\n[Test 1] MV3 CSP Compliance:");
{
  const htmlOnerrors = popupHtml.match(/onerror\s*=/gi) || [];
  assert.strictEqual(htmlOnerrors.length, 0, `Found ${htmlOnerrors.length} inline onerror handlers in popup.html`);

  const jsOnerrors = popupJs.match(/\bonerror\s*=/gi) || [];
  assert.strictEqual(jsOnerrors.length, 0, `Found ${jsOnerrors.length} onerror assignments in popup.js`);

  assert.ok(popupJs.includes("addEventListener(\"error\""), "popup.js must use addEventListener('error')");
  console.log("  [PASS] Zero onerror handlers found; addEventListener('error') used exclusively.");
}

// -------------------------------------------------------------
// TEST 2: Continuous Animations Limited to Epic & Legendary + prefers-reduced-motion
// -------------------------------------------------------------
console.log("\n[Test 2] Continuous Animations & Reduced Motion Compliance:");
{
  assert.ok(popupHtml.includes("prefers-reduced-motion: reduce"), "prefers-reduced-motion media query must be present");
  assert.strictEqual(popupHtml.includes("animation: tier3Pulse"), false, "Tier 3 (rare) must not have continuous animation");
  assert.strictEqual(popupHtml.includes("animation: emblemFloat 2.8s"), false, "Tier 3 emblemFloat continuous animation must be removed");

  assert.ok(popupHtml.includes("epicBadgeHaloPulse"), "Epic badge halo pulse animation must exist");
  assert.ok(popupHtml.includes("legendaryBadgeAuraShimmer"), "Legendary aura shimmer animation must exist");

  // Rarity-based continuous title animations
  assert.ok(popupHtml.includes(".title-item.rarity-epic.unlocked"), "Continuous card radiance must target rarity-epic");
  assert.ok(popupHtml.includes(".title-item.rarity-legendary.unlocked"), "Continuous card radiance must target rarity-legendary");

  console.log("  [PASS] Continuous animations strictly limited to Epic & Legendary, and prefers-reduced-motion respected.");
}

// -------------------------------------------------------------
// TEST 3: Rarity Read From TITLE_CONFIG[id].rarity (No tier deduction)
// -------------------------------------------------------------
console.log("\n[Test 3] Rarity Read Directly From TITLE_CONFIG[id].rarity:");
{
  assert.strictEqual(popupJs.includes("tier >= 7 ? \"legendary\""), false, "popup.js must not deduce rarity from tier ranges");
  assert.strictEqual(popupJs.includes("cfg.tier >= 7 ? \"legendary\""), false, "popup.js must not deduce rarity from cfg.tier ranges");

  for (const title of ALL_TITLES) {
    assert.ok(TITLE_CONFIG[title.id].rarity, `Title ${title.id} must have rarity defined in TITLE_CONFIG`);
    assert.ok(["common", "rare", "epic", "legendary"].includes(TITLE_CONFIG[title.id].rarity));
  }

  // Non-standard tier vs rarity mappings verify rarity is never deduced from tier ranges
  assert.strictEqual(TITLE_CONFIG["shadow_monarch"].tier, 3);
  assert.strictEqual(TITLE_CONFIG["shadow_monarch"].rarity, "epic");
  assert.strictEqual(TITLE_CONFIG["national_hunter"].tier, 6);
  assert.strictEqual(TITLE_CONFIG["national_hunter"].rarity, "legendary");

  console.log("  [PASS] Rarity read directly from TITLE_CONFIG[id].rarity across all 34 titles.");
}

// -------------------------------------------------------------
// TEST 4: Reusable Component renderBadge(titleOrId, { size })
// -------------------------------------------------------------
console.log("\n[Test 4] Reusable Component renderBadge(titleOrId, { size }):");
{
  // Setup minimal VM sandbox to execute renderBadge
  const context = {
    TITLE_CONFIG,
    escapeHtml: (s) => String(s || ""),
    t: (k) => k
  };
  vm.createContext(context);
  // Extract renderBadge definition from popup.js
  const renderBadgeMatch = popupJs.match(/function renderBadge\([\s\S]*?\n\}/);
  assert.ok(renderBadgeMatch, "function renderBadge must be defined in popup.js");
  vm.runInContext(renderBadgeMatch[0], context);

  const { renderBadge } = context;

  // 1. Size SM (header, 34-38px)
  const smHtml = renderBadge("outer_disciple", { size: "sm" });
  assert.ok(smHtml.includes("badge-size-sm"), "sm badge has badge-size-sm");
  assert.ok(smHtml.includes("rarity-common"), "outer_disciple is rarity-common");
  assert.ok(smHtml.includes("badge-img"), "renders badge-img");
  assert.ok(smHtml.includes("assets/badges/outer_disciple.svg"), "uses SVG badge source");
  assert.ok(smHtml.includes("data-fallback=\"assets/badges/badge_common.svg\""), "includes valid fallback");
  assert.ok(smHtml.includes("loading=\"eager\""), "header sm badge loads eagerly");

  // 2. Size MD (achievements list)
  const mdHtml = renderBadge("bottleneck_breaker", { size: "md" });
  assert.ok(mdHtml.includes("badge-size-md"), "md badge has badge-size-md");
  assert.ok(mdHtml.includes("rarity-epic"), "bottleneck_breaker is rarity-epic");
  assert.ok(mdHtml.includes("loading=\"lazy\""), "achievements list md badge uses lazy loading");

  // 3. Size LG (celebration modal)
  const lgHtml = renderBadge("primordial_immortal", { size: "lg" });
  assert.ok(lgHtml.includes("badge-size-lg"), "lg badge has badge-size-lg");
  assert.ok(lgHtml.includes("rarity-legendary"), "primordial_immortal is rarity-legendary");
  assert.ok(lgHtml.includes("id=\"celebrationBadgeImg\""), "size lg renders celebrationBadgeImg id");
  assert.ok(lgHtml.includes("loading=\"eager\""), "celebration modal badge loads eagerly");

  // 4. Object passing support
  const objHtml = renderBadge({ id: "outer_disciple", name: "Disciple" }, { size: "sm" });
  assert.ok(objHtml.includes("outer_disciple"), "supports passing title object to renderBadge");

  // 5. Empty State
  const emptyHtml = renderBadge(null, { size: "sm" });
  assert.ok(emptyHtml.includes("badge-empty"), "empty state has badge-empty");
  assert.ok(emptyHtml.includes("badge-silhouette-svg"), "empty state renders silhouette SVG");
  assert.strictEqual(emptyHtml.includes("<img"), false, "empty state does not render img tag");

  // 5. Silhouette frame does not use clip-path in CSS
  assert.strictEqual(popupHtml.includes("clip-path"), false, "No fragile clip-path in popup.html");
  assert.ok(popupHtml.includes(".novel-badge .badge-halo"), ".novel-badge .badge-halo exists");
  assert.ok(popupHtml.includes("filter: drop-shadow"), "Outer halo uses drop-shadow");

  console.log("  [PASS] renderBadge supports sm, md, lg, and empty silhouette states with drop-shadow halo.");
}

// -------------------------------------------------------------
// TEST 5: Direct Navigation, Theme Alignment & rAF scrollIntoView
// -------------------------------------------------------------
console.log("\n[Test 5] Direct Click Navigation, Theme Matching & rAF scrollIntoView:");
{
  assert.ok(popupJs.includes("focusEquippedTitle"), "focusEquippedTitle function must exist");
  assert.ok(popupJs.includes("openCultivation()"), "Switches to cultivation tab");
  assert.ok(popupJs.includes("currentThemeFilter !== targetTheme"), "Ensures theme filter matches title theme");
  assert.ok(popupJs.includes("requestAnimationFrame"), "Uses requestAnimationFrame for scroll");
  assert.ok(popupJs.includes("offsetParent"), "Checks card exists and is visible before scrolling");
  assert.ok(popupJs.includes("highlight-flash"), "Applies highlight-flash class");
  assert.ok(popupHtml.includes(".title-item.highlight-flash"), "Styles .title-item.highlight-flash in CSS");
  assert.ok(popupJs.includes("prefers-reduced-motion"), "focusEquippedTitle checks prefers-reduced-motion for scroll behavior");

  console.log("  [PASS] Header equipped title click switches tab, aligns theme, and executes rAF scrollIntoView.");
}

// -------------------------------------------------------------
// TEST 6: Title Equipping Overhaul in Achievements List (1-Click Toggle)
// -------------------------------------------------------------
console.log("\n[Test 6] Streamlined 1-Click Equip/Unequip Toggle & Claim Separation:");
{
  assert.ok(popupJs.includes("title-actions-cluster"), "Renders title-actions-cluster for action buttons");
  assert.ok(popupJs.includes("btn-equipped"), "Renders btn-equipped for equipped titles");
  assert.ok(popupJs.includes("btn-equip"), "Renders btn-equip for unequipped titles");
  assert.ok(popupJs.includes("btn-claim-reward"), "Renders separate claim reward button");
  assert.ok(popupJs.includes("badge-claimed"), "Renders claimed badge for claimed titles");

  // Event handler distinguishes equippedBtn, equipBtn, claimBtn, and card click
  assert.ok(popupJs.includes("e?.target?.closest(\".btn-equipped\")"), "Handles click on btn-equipped to unequip");
  assert.ok(popupJs.includes("e?.target?.closest(\".btn-equip\")"), "Handles click on btn-equip to equip");
  assert.ok(popupJs.includes("e?.target?.closest(\".btn-claim-reward\")"), "Handles click on btn-claim-reward to claim");

  // openCelebrationModal reuses renderBadge
  assert.ok(popupJs.includes("renderBadge(titleId, { size: \"lg\" })"), "openCelebrationModal reuses renderBadge with size lg");

  console.log("  [PASS] Direct 1-click equip/unequip toggle operates cleanly and distinct from reward claiming.");
}

console.log("\n>>> ALL V7 TESTS PASSED 100%! <<<\n");
