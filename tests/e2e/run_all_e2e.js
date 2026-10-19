/**
 * MYNOVELSYSTEM v4.0.0 — MASTER E2E RUNNER
 * 
 * Orchestrates the full Playwright MV3 E2E test suites:
 * 1. Platforms Matrix Suite (25 tests across 13 domains)
 * 2. Genres & Content Types Audit Suite (10 tests)
 * 3. Navigation, SPA & Continuous Scroll Suite (6 tests)
 * 4. Regressions & False Positives Suite (8 tests)
 * 5. Storage, Popup DOM & Persistence Suite (5 tests)
 * 
 * Total: 54 E2E Test Cases executing in real Chromium MV3
 */

const { runPlatformsAudit } = require("./e2e_platforms_suite");
const { runGenresAuditSuite } = require("./e2e_genres_audit_suite");
const { runNavigationSpaScrollSuite } = require("./e2e_navigation_spa_scroll_suite");
const { runRegressionsFalsePositivesSuite } = require("./e2e_regressions_false_positives_suite");
const { runStoragePersistenceSuite } = require("./e2e_storage_sync_persistence_suite");
const { generateReports } = require("./generate_report");

async function runAllE2E() {
  const startTime = Date.now();
  console.log("====================================================================");
  console.log("   MYNOVELSYSTEM v4.0.0 — MASTER E2E AUDIT CAMPAIGN (PLAYWRIGHT MV3)");
  console.log("====================================================================\n");

  const suites = [
    { name: "Platforms Matrix Audit (25 Tests)", fn: runPlatformsAudit },
    { name: "Genres & Achievements Audit (13 Tests)", fn: runGenresAuditSuite },
    { name: "Navigation, SPA & Scroll Audit (6 Tests)", fn: runNavigationSpaScrollSuite },
    { name: "False Positives & Regressions Audit (8 Tests)", fn: runRegressionsFalsePositivesSuite },
    { name: "Storage, Popup DOM & Persistence Audit (5 Tests)", fn: runStoragePersistenceSuite }
  ];

  let passedSuites = 0;
  let failedSuites = 0;

  for (const s of suites) {
    try {
      console.log(`\n>>> STARTING SUITE: ${s.name} <<<\n`);
      await s.fn();
      passedSuites++;
    } catch (err) {
      console.error(`\n>>> SUITE FAILED: ${s.name} <<<`, err);
      failedSuites++;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n====================================================================");
  console.log(`MASTER E2E CAMPAIGN FINISHED in ${durationSec}s`);
  console.log(`SUITES PASSED: ${passedSuites} / ${suites.length}`);
  console.log(`SUITES FAILED: ${failedSuites} / ${suites.length}`);
  console.log("====================================================================\n");

  // Automatically regenerate consolidated reports
  try {
    generateReports();
  } catch (err) {
    console.error("Warning: could not generate reports:", err);
  }

  if (failedSuites > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAllE2E().catch((err) => {
    console.error("FATAL ERROR IN MASTER E2E RUNNER:", err);
    process.exit(1);
  });
}

module.exports = { runAllE2E };
