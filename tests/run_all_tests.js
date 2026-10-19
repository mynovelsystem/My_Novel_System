// ============================================================================
// MYNOVELSYSTEM — MASTER TEST SUITE RUNNER
// Runs all unit, integration, security, and Playwright E2E suites reproducibly
// ============================================================================

const { spawnSync } = require("child_process");
const path = require("path");

const suites = [
  { name: "Audit Corrections Verification (V13)", file: "test_audit_v13_fixes.js" },
  { name: "Toolbar Icons Integrity (V9)", file: "test_toolbar_icon_v9.js" },
  { name: "Chapter Detector Comprehensive Audit (Fase 2)", file: "test_detector_comprehensive_audit.js" },
  { name: "Comprehensive Technical Audit (V10)", file: "test_audit_comprehensive_v10.js" },
  { name: "Audit Architecture Suite (V12)", file: "test_audit_v12_complete.js" },
  { name: "Cultivation Merge Architecture (P0)", file: "test_p0_merge.js" },
  { name: "Theme Isolation & Architectural Blocks (P1/P2)", file: "test_p1_blocks.js" },
  { name: "Security Audit SEC-01 to SEC-08 (V8)", file: "test_security_audit_v8.js" },
  { name: "Achievements & Cultivation System (V4)", file: "test_achievements_v4.js" },
  { name: "Blacklist Buttons UI (V5)", file: "test_blacklist_buttons_v5.js" },
  { name: "Breakthrough & Cultivation Progression (V6)", file: "test_breakthrough_v6.js" },
  { name: "Header Badges & Action UI (V7)", file: "test_header_badge_v7.js" },
  { name: "MyNovelSystem Core Suite (V11)", file: "test_mynovelsystem_v11.js" },
  { name: "Chrome Web Store Package Verifier", file: "verify_cws_package.js" },
  { name: "Real Chromium MV3 Playwright E2E Suite", file: "test_e2e_playwright.js" },
  { name: "Webnovel Continuous Scroll Playwright MV3", file: "test_webnovel_continuous_scroll_mv3.js" },
  { name: "Fase 2 Comprehensive Suite (UI, Items, Qi, Pagination, System Achievements, Danger Zone, Ads)", file: "test_fase2_comprehensive.js" },
  { name: "Emergency Recovery & WIP Regression Suite (V14)", file: "test_emergency_recovery_v14.js" },
  { name: "Theme Progression & Resource Personalization (V4)", file: "test_theme_progression_v4.js" },
  { name: "Chapter Rewind Setting & Legal Audit", file: "test_chapter_rewind_setting.js" },
  { name: "SkyNovels Investigation & Navigation Verification", file: "test_skynovels_detection_investigation.js" },
  { name: "Qi Claiming, Achievement Tiers & Avatar Audit (V15)", file: "test_qi_claiming_and_avatar_v15.js" },
  { name: "Cultivation Progression Rebalance (15-20% Curve Easing)", file: "test_cultivation_progression_rebalance.js" },
  { name: "Original Preset Avatars Collection & Selection (V16)", file: "test_preset_avatars_v16.js" },
  { name: "CWS Privacy, Consent & Reporting Audit", file: "test_cws_privacy_and_reporting.js" },
  { name: "Onboarding Lifecycle & Welcome Experience", file: "test_onboarding_lifecycle.js" },
  { name: "Account Isolation & Security Hardening", file: "test_account_isolation_sec2.js" },
  { name: "Security Audit Sec2 Hardening (Import, URLs, Permissions)", file: "test_security_audit_sec2_hardening.js" },
  { name: "Firebase RTDB Security Rules Simulation", file: "test_firebase_rules_simulation.js" },
  { name: "V4.0.0 Audit & Hardening Suite (Incognito, Passwords, Sync)", file: "test_audit_v4_comprehensive_hardening.js" }
];

console.log("====================================================================");
console.log("       MYNOVELSYSTEM MASTER TEST RUNNER — ALL 30 SUITES            ");
console.log("====================================================================\n");

let passedCount = 0;
let failedCount = 0;
const failures = [];

for (let i = 0; i < suites.length; i++) {
  const s = suites[i];
  const filePath = path.join(__dirname, s.file);
  console.log(`[${i + 1}/${suites.length}] Running ${s.name} (${s.file})...`);

  const startTime = Date.now();
  const res = spawnSync(process.execPath, [filePath], {
    stdio: "inherit",
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env }
  });
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  if (res.status === 0) {
    passedCount++;
    console.log(`  -> OK (${elapsed}s)\n`);
  } else {
    failedCount++;
    failures.push({ name: s.name, file: s.file, status: res.status });
    console.error(`  -> FAILED with exit code ${res.status} (${elapsed}s)\n`);
  }
}

console.log("====================================================================");
console.log(`FINAL RESULT: ${passedCount}/${suites.length} SUITES PASSED (${failures.length === 0 ? "100%" : "FAILURES DETECTED"})`);
console.log("====================================================================");

if (failures.length > 0) {
  console.error("Failing suites:");
  failures.forEach((f) => console.error(`  - ${f.name} (${f.file}) [Exit: ${f.status}]`));
  process.exit(1);
} else {
  console.log("All suites passed cleanly!\n");
  process.exit(0);
}
