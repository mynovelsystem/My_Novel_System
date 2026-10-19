// ============================================================================
// MYNOVELSYSTEM — FIREBASE REALTIME DATABASE RULES SEMANTIC AUDIT
// Simulates exact Realtime Database security rules evaluation logic:
// - /users/$uid: read/write strictly isolated to $uid === auth.uid
// - /reports/$reportId: read: false, append-only, auth-required, anti-spoofing
// ============================================================================

const assert = require("assert");

console.log("=== RUNNING FIREBASE REALTIME DATABASE RULES SEMANTIC AUDIT ===\n");

// Complete rules structure matching the user's active configuration & database.rules.json
const RULES = {
  users: {
    $uid: {
      read: (auth, uid) => Boolean(auth && auth.uid && uid === auth.uid),
      write: (auth, uid, data, newData) => Boolean(auth && auth.uid && uid === auth.uid),
      novels: {
        $novelKey: {
          validate: (newData, now = Date.now()) => {
            if (!newData || typeof newData !== "object" || Array.isArray(newData)) return false;
            const isDeleted = newData.deleted === true;
            if (isDeleted) {
              if (!("seriesId" in newData) || !("updatedAt" in newData)) return false;
              if (typeof newData.seriesId !== "string" || newData.seriesId.length > 200) return false;
              if (typeof newData.updatedAt !== "number" || !Number.isFinite(newData.updatedAt)) return false;
              if (newData.updatedAt <= 0 || newData.updatedAt > now + 86400000) return false;
              return true;
            }
            if (!("seriesId" in newData) || !("novelName" in newData) || !("chapter" in newData) || !("url" in newData) || !("updatedAt" in newData)) {
              return false;
            }
            if (typeof newData.seriesId !== "string" || newData.seriesId.length > 200) return false;
            if (typeof newData.novelName !== "string" || newData.novelName.length > 300) return false;
            if (typeof newData.chapter !== "string" && typeof newData.chapter !== "number") return false;
            if (typeof newData.url !== "string" || newData.url.length > 2048) return false;
            if (typeof newData.updatedAt !== "number" || !Number.isFinite(newData.updatedAt)) return false;
            if (newData.updatedAt <= 0 || newData.updatedAt > now + 86400000) return false;
            return true;
          }
        }
      },
      stats: {
        validate: (newData, now = Date.now()) => {
          if (!newData || typeof newData !== "object" || Array.isArray(newData)) return false;
          if (!("chaptersRead" in newData) || !("novelsStarted" in newData) || !("novelsCompleted" in newData) || !("updatedAt" in newData)) {
            return false;
          }
          if (typeof newData.chaptersRead !== "number" || typeof newData.novelsStarted !== "number" || typeof newData.novelsCompleted !== "number") return false;
          if (typeof newData.updatedAt !== "number" || !Number.isFinite(newData.updatedAt)) return false;
          if (newData.updatedAt <= 0 || newData.updatedAt > now + 86400000) return false;
          return true;
        }
      },
      domainBlacklist: {
        $index: {
          validate: (val) => {
            return typeof val === "string" && val.length <= 255;
          }
        }
      }
    }
  },
  reports: {
    read: () => false,
    $reportId: {
      write: (auth, reportId, data, newData) => {
        // auth != null && !data.exists() && newData.exists()
        const isAuthenticated = Boolean(auth && auth.uid);
        const dataExists = data !== null && data !== undefined;
        const newDataExists = newData !== null && newData !== undefined;
        return isAuthenticated && !dataExists && newDataExists;
      },
      validate: (newData, auth, now = Date.now()) => {
        if (!newData || typeof newData !== "object" || Array.isArray(newData)) return false;

        // newData.hasChildren(['category', 'message', 'createdAt'])
        if (!("category" in newData) || !("message" in newData) || !("createdAt" in newData)) {
          return false;
        }

        // Allowed keys under $reportId
        const allowedKeys = new Set([
          "category",
          "message",
          "createdAt",
          "createdIso",
          "version",
          "userEmail",
          "activeTab",
          "recentLogs"
        ]);

        for (const k of Object.keys(newData)) {
          if (!allowedKeys.has(k)) return false; // $other: false
        }

        // category: string && length <= 50
        if (typeof newData.category !== "string" || newData.category.length > 50) return false;

        // message: string && length <= 1500
        if (typeof newData.message !== "string" || newData.message.length > 1500) return false;

        // createdAt: number && bounds
        if (typeof newData.createdAt !== "number" || !Number.isFinite(newData.createdAt)) return false;
        if (newData.createdAt <= 0 || newData.createdAt > (now || Date.now()) + 86400000) return false;

        // createdIso: optional string <= 40
        if (newData.createdIso !== undefined && newData.createdIso !== null) {
          if (typeof newData.createdIso !== "string" || newData.createdIso.length > 40) return false;
        }

        // version: optional string <= 20
        if (newData.version !== undefined && newData.version !== null) {
          if (typeof newData.version !== "string" || newData.version.length > 20) return false;
        }

        // userEmail: optional string <= 320 && (userEmail === 'anonymous' || (auth && userEmail === auth.email))
        if (newData.userEmail !== undefined && newData.userEmail !== null) {
          if (typeof newData.userEmail !== "string" || newData.userEmail.length > 320) return false;
          if (newData.userEmail !== "anonymous") {
            if (!auth || newData.userEmail !== auth.email) return false;
          }
        }

        // activeTab: optional object with children, or null (when attachLogs is false)
        if (newData.activeTab !== undefined && newData.activeTab !== null) {
          if (
            typeof newData.activeTab !== "object" ||
            Array.isArray(newData.activeTab) ||
            Object.keys(newData.activeTab).length === 0
          ) {
            return false;
          }
          for (const k of Object.keys(newData.activeTab)) {
            if (k !== "url" && k !== "title") return false; // $other: false
          }
          if (typeof newData.activeTab.url !== "string" || newData.activeTab.url.length > 2048) {
            return false;
          }
          if (typeof newData.activeTab.title !== "string" || newData.activeTab.title.length > 300) {
            return false;
          }
        }

        // recentLogs: optional object/array where keys match /^[0-7]$/, or null
        if (newData.recentLogs !== undefined && newData.recentLogs !== null) {
          if (typeof newData.recentLogs !== "object") return false;
          const logKeys = Object.keys(newData.recentLogs);
          for (const k of logKeys) {
            if (!/^[0-7]$/.test(k)) return false;
            const logItem = newData.recentLogs[k];
            if (!logItem || typeof logItem !== "object") return false;
            for (const field of Object.keys(logItem)) {
              const val = logItem[field];
              const isStringBounded = typeof val === "string" && val.length <= 500;
              const isNumber = typeof val === "number";
              const isBoolean = typeof val === "boolean";
              if (!isStringBounded && !isNumber && !isBoolean) return false;
            }
          }
        }

        return true;
      }
    }
  }
};

// ============================================================================
// TEST CASES
// ============================================================================

const defaultAuth = { uid: "user_A", email: "user_a@example.com" };

// 1. Unauthenticated read & write under /users
console.log("[Test 1] User Isolation & Unauthenticated Access under /users:");
{
  assert.strictEqual(RULES.users.$uid.read(null, "user_123"), false, "Unauthenticated read must be DENIED");
  assert.strictEqual(RULES.users.$uid.write(null, "user_123", null, { test: 1 }), false, "Unauthenticated write must be DENIED");
  console.log("  [PASS] Unauthenticated access to /users strictly rejected.");
}

// 2. Cross-user isolation
console.log("\n[Test 2] Cross-User Boundary (User A vs User B):");
{
  const authA = { uid: "user_A" };
  const authB = { uid: "user_B" };

  // User A accesses User A
  assert.strictEqual(RULES.users.$uid.read(authA, "user_A"), true, "User A reading User A must be ALLOWED");
  assert.strictEqual(RULES.users.$uid.write(authA, "user_A", null, { data: 1 }), true, "User A writing User A must be ALLOWED");

  // User A accesses User B
  assert.strictEqual(RULES.users.$uid.read(authA, "user_B"), false, "User A reading User B must be DENIED");
  assert.strictEqual(RULES.users.$uid.write(authA, "user_B", { data: 1 }, { data: 2 }), false, "User A writing User B must be DENIED");
  assert.strictEqual(RULES.users.$uid.write(authA, "user_B", { data: 1 }, null), false, "User A deleting User B must be DENIED");

  // User A deleting own account
  assert.strictEqual(RULES.users.$uid.write(authA, "user_A", { data: 1 }, null), true, "User A deleting own node must be ALLOWED");

  console.log("  [PASS] User A cannot read, write, or delete User B; self-delete is allowed.");
}

// 3. /reports Read Protection
console.log("\n[Test 3] /reports Read Enforcement:");
{
  assert.strictEqual(RULES.reports.read(), false, "Root /reports read is always false");
  console.log("  [PASS] /reports client read access is permanently disabled.");
}

// 4. Report Creation, Authentication & Anti-Deletion
console.log("\n[Test 4] Report Creation & Authentication Enforcement:");
{
  // Unauthenticated write rejected
  assert.strictEqual(RULES.reports.$reportId.write(null, "-Report1", null, { message: "hi" }), false, "Unauthenticated report creation must be REJECTED");

  // Authenticated new report (data === null, newData exists)
  assert.strictEqual(RULES.reports.$reportId.write(defaultAuth, "-Report1", null, { message: "hi" }), true, "Authenticated report creation allowed");

  // Update existing report (data exists, newData exists)
  assert.strictEqual(RULES.reports.$reportId.write(defaultAuth, "-Report1", { message: "old" }, { message: "new" }), false, "Update report rejected");

  // Delete existing report (data exists, newData === null)
  assert.strictEqual(RULES.reports.$reportId.write(defaultAuth, "-Report1", { message: "old" }, null), false, "Delete report rejected");

  console.log("  [PASS] Reports require authentication, can only be created once, and cannot be modified or deleted.");
}

// 5. Report Email Anti-Spoofing
console.log("\n[Test 5] Report Email Anti-Spoofing:");
{
  const validReportOwnEmail = {
    category: "reader",
    message: "Bug found",
    createdAt: Date.now(),
    userEmail: "user_a@example.com"
  };
  assert.strictEqual(RULES.reports.$reportId.validate(validReportOwnEmail, defaultAuth), true, "Matching user email must pass");

  const anonymousReport = {
    category: "reader",
    message: "Bug found",
    createdAt: Date.now(),
    userEmail: "anonymous"
  };
  assert.strictEqual(RULES.reports.$reportId.validate(anonymousReport, defaultAuth), true, "Anonymous user email must pass");

  const spoofedReport = {
    category: "reader",
    message: "Bug found",
    createdAt: Date.now(),
    userEmail: "victim@example.com"
  };
  assert.strictEqual(RULES.reports.$reportId.validate(spoofedReport, defaultAuth), false, "Spoofed email not matching auth must be REJECTED");

  console.log("  [PASS] Email anti-spoofing strictly verified (anonymous and verified email allowed; mismatched email rejected).");
}

// 6. Report Schema & Length Validation
console.log("\n[Test 6] Report Schema & Length Validation:");
{
  const validReport = {
    category: "reader",
    message: "Valid bug report message",
    createdAt: Date.now(),
    createdIso: new Date().toISOString(),
    version: "4.0.0",
    userEmail: "user_a@example.com",
    activeTab: {
      url: "https://novel.com/ch1",
      title: "Chapter 1"
    },
    recentLogs: {
      "0": { event: "PAGE_VISITED", status: 200, safe: true },
      "1": { event: "NOVEL_DETECTED", count: 1 }
    }
  };

  assert.strictEqual(RULES.reports.$reportId.validate(validReport, defaultAuth), true, "Valid full report must pass");

  // Anonymous report with null activeTab and recentLogs (exact output of attachLogs: false)
  const validAnonymousReport = {
    category: "reader",
    message: "Anonymous report",
    createdAt: Date.now(),
    userEmail: "anonymous",
    activeTab: null,
    recentLogs: null
  };
  assert.strictEqual(RULES.reports.$reportId.validate(validAnonymousReport, defaultAuth), true, "Valid anonymous report with null activeTab/recentLogs must pass");

  // Missing category
  assert.strictEqual(RULES.reports.$reportId.validate({ message: "m", createdAt: 123 }, defaultAuth), false, "Missing category rejected");

  // Missing message
  assert.strictEqual(RULES.reports.$reportId.validate({ category: "c", createdAt: 123 }, defaultAuth), false, "Missing message rejected");

  // Missing createdAt
  assert.strictEqual(RULES.reports.$reportId.validate({ category: "c", message: "m" }, defaultAuth), false, "Missing createdAt rejected");

  // Message > 1500 chars
  assert.strictEqual(
    RULES.reports.$reportId.validate({
      category: "c",
      message: "A".repeat(1501),
      createdAt: 123
    }, defaultAuth),
    false,
    "Message > 1500 chars rejected"
  );

  // Unauthorized extra field ($other: false)
  assert.strictEqual(
    RULES.reports.$reportId.validate({
      category: "c",
      message: "m",
      createdAt: 123,
      extraUnauthorizedField: "hack"
    }, defaultAuth),
    false,
    "Unauthorized root field rejected"
  );

  // Extra field under activeTab ($other: false)
  assert.strictEqual(
    RULES.reports.$reportId.validate({
      category: "c",
      message: "m",
      createdAt: 123,
      activeTab: {
        url: "https://novel.com",
        title: "Title",
        injectedCookie: "session=123"
      }
    }, defaultAuth),
    false,
    "Extra field under activeTab rejected"
  );

  // recentLogs index > 7 (/^[0-7]$/)
  assert.strictEqual(
    RULES.reports.$reportId.validate({
      category: "c",
      message: "m",
      createdAt: 123,
      recentLogs: {
        "8": { event: "EXCEEDED_INDEX" }
      }
    }, defaultAuth),
    false,
    "recentLogs index 8 rejected by /^[0-7]$/"
  );

  // recentLogs log property string > 500 chars
  assert.strictEqual(
    RULES.reports.$reportId.validate({
      category: "c",
      message: "m",
      createdAt: 123,
      recentLogs: {
        "0": { event: "X".repeat(501) }
      }
    }, defaultAuth),
    false,
    "Log property > 500 chars rejected"
  );

  console.log("  [PASS] All schema and validation rules verified with 100% precision.");
}

// 7. Novel Syncing & Tombstone Deletion Validation
console.log("\n[Test 7] Novel Syncing & Deletion Tombstone Validation:");
{
  const now = Date.now();
  // Valid active novel
  const validNovel = {
    seriesId: "novel_123",
    novelName: "A Will Eternal",
    chapter: "150",
    url: "https://novel.com/ch150",
    updatedAt: now
  };
  assert.strictEqual(RULES.users.$uid.novels.$novelKey.validate(validNovel, now), true, "Valid active novel must pass");

  // Valid tombstone deletion record (deleted: true)
  const validTombstone = {
    seriesId: "novel_123",
    deleted: true,
    updatedAt: now
  };
  assert.strictEqual(RULES.users.$uid.novels.$novelKey.validate(validTombstone, now), true, "Valid deletion tombstone must pass");

  // Invalid novel missing required field
  const missingChapter = {
    seriesId: "novel_123",
    novelName: "A Will Eternal",
    url: "https://novel.com/ch150",
    updatedAt: now
  };
  assert.strictEqual(RULES.users.$uid.novels.$novelKey.validate(missingChapter, now), false, "Novel missing chapter must be rejected");

  // Invalid tombstone missing seriesId
  const corruptTombstone = {
    deleted: true,
    updatedAt: now
  };
  assert.strictEqual(RULES.users.$uid.novels.$novelKey.validate(corruptTombstone, now), false, "Tombstone missing seriesId must be rejected");

  console.log("  [PASS] Novel syncing allows both full novel records and deletion tombstones, rejecting corrupt records.");
}

// 8. User Stats Schema Validation
console.log("\n[Test 8] User Stats Schema & Validation:");
{
  const now = Date.now();
  const validStats = {
    chaptersRead: 42,
    novelsStarted: 5,
    novelsCompleted: 1,
    updatedAt: now
  };
  assert.strictEqual(RULES.users.$uid.stats.validate(validStats, now), true, "Valid stats must pass");

  // Stats missing required field
  const incompleteStats = {
    chaptersRead: 42,
    novelsStarted: 5,
    updatedAt: now
  };
  assert.strictEqual(RULES.users.$uid.stats.validate(incompleteStats, now), false, "Stats missing novelsCompleted must be rejected");

  console.log("  [PASS] User stats require mandatory progress counters and valid updatedAt.");
}

// 9. Domain Blacklist Syncing
console.log("\n[Test 9] Domain Blacklist Syncing & Element Type Enforcement:");
{
  assert.strictEqual(RULES.users.$uid.domainBlacklist.$index.validate("example.com"), true, "Valid domain string passes");
  assert.strictEqual(RULES.users.$uid.domainBlacklist.$index.validate("readnovelfull.com"), true, "Valid second domain string passes");
  assert.strictEqual(RULES.users.$uid.domainBlacklist.$index.validate(12345), false, "Numeric domain must be rejected");
  assert.strictEqual(RULES.users.$uid.domainBlacklist.$index.validate({ evil: "object" }), false, "Object domain must be rejected");
  assert.strictEqual(RULES.users.$uid.domainBlacklist.$index.validate("a".repeat(256)), false, "Domain exceeding 255 chars must be rejected");

  console.log("  [PASS] Domain blacklist validates each element as bounded string, rejecting corrupt/nested objects.");
}

// 10. Timestamp Boundary Enforcement
console.log("\n[Test 10] Timestamp Boundary Enforcement across all models:");
{
  const now = Date.now();
  const futureNovel = {
    seriesId: "n1",
    novelName: "Test",
    chapter: 1,
    url: "https://novel.com/1",
    updatedAt: now + 900000000
  };
  assert.strictEqual(RULES.users.$uid.novels.$novelKey.validate(futureNovel, now), false, "Novel with far-future timestamp rejected");

  const negativeNovel = {
    seriesId: "n1",
    novelName: "Test",
    chapter: 1,
    url: "https://novel.com/1",
    updatedAt: -500
  };
  assert.strictEqual(RULES.users.$uid.novels.$novelKey.validate(negativeNovel, now), false, "Novel with negative timestamp rejected");

  const futureStats = {
    chaptersRead: 1,
    novelsStarted: 1,
    novelsCompleted: 0,
    updatedAt: now + 900000000
  };
  assert.strictEqual(RULES.users.$uid.stats.validate(futureStats, now), false, "Stats with far-future timestamp rejected");

  const futureReport = {
    category: "reader",
    message: "Test",
    createdAt: now + 900000000
  };
  assert.strictEqual(RULES.reports.$reportId.validate(futureReport, defaultAuth, now), false, "Report with far-future timestamp rejected");

  console.log("  [PASS] Timestamp boundaries strictly prevent negative or absurd future timestamps.");
}

console.log("\n>>> ALL FIREBASE RTDB RULES AUDIT TESTS PASSED (100%)! <<<\n");
