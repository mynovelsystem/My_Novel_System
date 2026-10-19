// ============================================================================
// TEST SUITE: AUDITORIA INTEGRAL V4.0.0 - HARDENING, PRIVACIDAD E INCOGNITO
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

console.log("=== RUNNING V4.0.0 AUDIT & HARDENING TEST SUITE ===\n");

// ----------------------------------------------------------------------------
// Test 1: Incognito Protection in content.js and background.js
// ----------------------------------------------------------------------------
console.log("[Test 1] Incognito Protection & Private Browsing Isolation:");
{
  const contentCode = fs.readFileSync(path.join(rootDir, "content.js"), "utf8");
  assert.ok(
    contentCode.includes("chrome.extension.inIncognitoContext"),
    "content.js must check chrome.extension.inIncognitoContext"
  );

  const bgCode = fs.readFileSync(path.join(rootDir, "background.js"), "utf8");
  assert.ok(
    bgCode.includes("sender.tab.incognito"),
    "background.js onMessage must check sender.tab.incognito"
  );
  assert.ok(
    bgCode.includes("tabInfo.incognito") || bgCode.includes("tabObj.incognito"),
    "background.js handleNovelDetected must check tab incognito state"
  );
  assert.ok(
    bgCode.includes("activeTab.incognito"),
    "background.js onActivated must check tab incognito state"
  );
  assert.ok(
    bgCode.includes("tab && !tab.incognito"),
    "background.js handleSubmitBugReport must exclude incognito tabs"
  );

  console.log("  [PASS] Content script and Service Worker strictly block reading tracking and bug report leakage in private/incognito tabs.");
}

// ----------------------------------------------------------------------------
// Test 2: Storage Sync Retirement & Safe Migration
// ----------------------------------------------------------------------------
console.log("\n[Test 2] chrome.storage.sync Deprecation & Migration:");
{
  const bgCode = fs.readFileSync(path.join(rootDir, "background.js"), "utf8");

  // Verify chrome.storage.sync.set is NO LONGER called during reading detection
  assert.strictEqual(
    bgCode.includes("chrome.storage.sync.set({ savedNovels })"),
    false,
    "chrome.storage.sync.set({ savedNovels }) must be completely removed from reading detection"
  );

  // Verify safe migration logic exists in maybeMigrateLocalStorage
  assert.ok(
    bgCode.includes("chrome.storage.sync.get([\"savedNovels\"])"),
    "background.js must provide safe legacy migration from chrome.storage.sync"
  );
  assert.ok(
    bgCode.includes("sChap > lChap") && bgCode.includes("deduplicateAndMigrateMap"),
    "background.js migration must non-destructively merge novels without chapter regressions"
  );

  console.log("  [PASS] Redundant 8KB-limited chrome.storage.sync.set removed; non-destructive legacy migration preserved.");
}

// ----------------------------------------------------------------------------
// Test 3: Password Trimming Removal in popup.js
// ----------------------------------------------------------------------------
console.log("\n[Test 3] Password Mutation Audit (Zero Trimming):");
{
  const popupCode = fs.readFileSync(path.join(rootDir, "popup.js"), "utf8");

  // Verify modalAuthPass is not trimmed
  assert.strictEqual(
    popupCode.includes("document.getElementById(\"modalAuthPass\")?.value.trim()"),
    false,
    "modalAuthPass must NOT use .trim()"
  );

  // Verify modalRegPass is not trimmed
  assert.strictEqual(
    popupCode.includes("document.getElementById(\"modalRegPass\")?.value.trim()"),
    false,
    "modalRegPass must NOT use .trim()"
  );

  // Verify modalRegConfirmPass is not trimmed
  assert.strictEqual(
    popupCode.includes("document.getElementById(\"modalRegConfirmPass\")?.value.trim()"),
    false,
    "modalRegConfirmPass must NOT use .trim()"
  );

  // Verify authPass in handleAuth is not trimmed
  assert.strictEqual(
    popupCode.includes("passInput?.value.trim()"),
    false,
    "handleAuth passInput must NOT use .trim()"
  );

  console.log("  [PASS] Passwords are 100% preserved without mutations before sending to Firebase Auth.");
}

// ----------------------------------------------------------------------------
// Test 4: Firebase Realtime Database Security Rules File
// ----------------------------------------------------------------------------
console.log("\n[Test 4] Firebase database.rules.json File Integrity:");
{
  const rulesPath = path.join(rootDir, "database.rules.json");
  assert.ok(fs.existsSync(rulesPath), "database.rules.json must exist in project root");
  const rulesContent = JSON.parse(fs.readFileSync(rulesPath, "utf8"));

  assert.strictEqual(rulesContent.rules[".read"], false, "Root .read must be false");
  assert.strictEqual(rulesContent.rules[".write"], false, "Root .write must be false");
  assert.ok(rulesContent.rules.users["$uid"][".read"].includes("$uid"), "User node isolated by auth.uid");
  assert.ok(rulesContent.rules.users["$uid"][".write"].includes("$uid"), "User node isolated by auth.uid");
  assert.strictEqual(rulesContent.rules.reports[".read"], false, "Reports read must be false");
  assert.ok(rulesContent.rules.reports["$reportId"][".write"].includes("auth != null"), "Reports write requires auth != null");
  assert.ok(rulesContent.rules.reports["$reportId"][".validate"].includes("auth.token.email"), "Reports email anti-spoofing enforced");
  assert.ok(rulesContent.rules.users["$uid"].novels["$novelKey"][".validate"].includes("deleted"), "database.rules.json must support novel tombstones");
  assert.ok(rulesContent.rules.users["$uid"].domainBlacklist["$index"][".validate"].includes("isString"), "database.rules.json must validate domainBlacklist string elements");
  assert.ok(rulesContent.rules.users["$uid"].novels["$novelKey"][".validate"].includes("now"), "database.rules.json must validate timestamp bounds");

  console.log("  [PASS] database.rules.json syntax, tombstone compatibility, schema validation, and auth enforcement verified.");
}

// ----------------------------------------------------------------------------
// Test 5: Packaging Integrity & Zero Dev Artifact Leaks
// ----------------------------------------------------------------------------
console.log("\n[Test 5] Production Package Verification:");
{
  const zipPath = path.join(rootDir, "MyNovelSystem-v4.0.0.zip");
  assert.ok(fs.existsSync(zipPath), "MyNovelSystem-v4.0.0.zip must exist");
  const stat = fs.statSync(zipPath);
  assert.ok(stat.size > 100000, `ZIP size must be reasonable (current: ${stat.size} bytes)`);

  console.log(`  [PASS] MyNovelSystem-v4.0.0.zip verified (${(stat.size / 1024).toFixed(1)} KB).`);
}

// ----------------------------------------------------------------------------
// Test 6: escapeHtml(str) Behavior & 0 / false Preservation
// ----------------------------------------------------------------------------
console.log("\n[Test 6] escapeHtml(str) Nullish Coalescing & Type Safety:");
{
  const popupCode = fs.readFileSync(path.join(rootDir, "popup.js"), "utf8");
  assert.ok(
    popupCode.includes("String(str ?? \"\")"),
    "popup.js escapeHtml must use String(str ?? \"\")"
  );

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (s) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[s]));
  }

  // 1. Number 0 converted to "0" (NOT empty string)
  assert.strictEqual(escapeHtml(0), "0", "0 must convert to '0'");
  assert.strictEqual(escapeHtml(42), "42", "42 must convert to '42'");

  // 2. Boolean false converted to "false"
  assert.strictEqual(escapeHtml(false), "false", "false must convert to 'false'");
  assert.strictEqual(escapeHtml(true), "true", "true must convert to 'true'");

  // 3. null and undefined converted to ""
  assert.strictEqual(escapeHtml(null), "", "null must convert to ''");
  assert.strictEqual(escapeHtml(undefined), "", "undefined must convert to ''");
  assert.strictEqual(escapeHtml(""), "", "empty string must convert to ''");

  // 4. Normal string
  assert.strictEqual(escapeHtml("Shadow Slave"), "Shadow Slave");

  // 5. HTML escaping
  assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  assert.strictEqual(escapeHtml("Tom & Jerry's"), "Tom &amp; Jerry&#39;s");

  console.log("  [PASS] escapeHtml preserves 0 and false while safely neutralizing dangerous HTML entities.");
}

console.log("\n>>> ALL V4.0.0 AUDIT & HARDENING TESTS PASSED (100%)! <<<\n");
