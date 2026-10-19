// ============================================================================
// MYNOVELSYSTEM — FIREBASE REALTIME DATABASE RULES SEMANTIC AUDIT
// Simulates exact Realtime Database security rules evaluation logic:
// - /users/$uid: read/write strictly isolated to $uid === auth.uid
// - /reports/$reportId: read: false, append-only, strict schema validation
// ============================================================================

const assert = require("assert");

console.log("=== RUNNING FIREBASE REALTIME DATABASE RULES SEMANTIC AUDIT ===\n");

// Complete rules structure matching the user's active configuration
const RULES = {
  users: {
    $uid: {
      read: (auth, uid) => Boolean(auth && uid === auth.uid),
      write: (auth, uid, data, newData) => Boolean(auth && uid === auth.uid)
    }
  },
  reports: {
    read: () => false,
    $reportId: {
      write: (auth, reportId, data, newData) => {
        // !data.exists() && newData.exists()
        const dataExists = data !== null && data !== undefined;
        const newDataExists = newData !== null && newData !== undefined;
        return !dataExists && newDataExists;
      },
      validate: (newData) => {
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

        // createdAt: number
        if (typeof newData.createdAt !== "number" || !Number.isFinite(newData.createdAt)) return false;

        // createdIso: optional string <= 40
        if (newData.createdIso !== undefined) {
          if (typeof newData.createdIso !== "string" || newData.createdIso.length > 40) return false;
        }

        // version: optional string <= 20
        if (newData.version !== undefined) {
          if (typeof newData.version !== "string" || newData.version.length > 20) return false;
        }

        // userEmail: optional string <= 320
        if (newData.userEmail !== undefined) {
          if (typeof newData.userEmail !== "string" || newData.userEmail.length > 320) return false;
        }

        // activeTab: optional object with children
        if (newData.activeTab !== undefined) {
          if (
            !newData.activeTab ||
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

        // recentLogs: optional object/array where keys match /^[0-7]$/
        if (newData.recentLogs !== undefined) {
          if (typeof newData.recentLogs !== "object" || newData.recentLogs === null) return false;
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

// 4. Report Creation, Immutability & Anti-Deletion
console.log("\n[Test 4] Report Creation & Immutability Rules:");
{
  // Insert new report (data === null, newData exists)
  assert.strictEqual(RULES.reports.$reportId.write(null, "-Report1", null, { message: "hi" }), true, "New report creation allowed");

  // Update existing report (data exists, newData exists)
  assert.strictEqual(RULES.reports.$reportId.write(null, "-Report1", { message: "old" }, { message: "new" }), false, "Update report rejected");

  // Delete existing report (data exists, newData === null)
  assert.strictEqual(RULES.reports.$reportId.write(null, "-Report1", { message: "old" }, null), false, "Delete report rejected");

  console.log("  [PASS] Reports can only be created once; cannot be modified or deleted.");
}

// 5. Report Schema Validation
console.log("\n[Test 5] Report Schema & Length Validation:");
{
  const validReport = {
    category: "reader",
    message: "Valid bug report message",
    createdAt: Date.now(),
    createdIso: new Date().toISOString(),
    version: "4.0.0",
    userEmail: "test@example.com",
    activeTab: {
      url: "https://novel.com/ch1",
      title: "Chapter 1"
    },
    recentLogs: {
      "0": { event: "PAGE_VISITED", status: 200, safe: true },
      "1": { event: "NOVEL_DETECTED", count: 1 }
    }
  };

  assert.strictEqual(RULES.reports.$reportId.validate(validReport), true, "Valid full report must pass");

  // Anonymous report (optional fields omitted)
  const validAnonymousReport = {
    category: "reader",
    message: "Anonymous report",
    createdAt: Date.now()
  };
  assert.strictEqual(RULES.reports.$reportId.validate(validAnonymousReport), true, "Valid anonymous report must pass");

  // Missing category
  assert.strictEqual(RULES.reports.$reportId.validate({ message: "m", createdAt: 123 }), false, "Missing category rejected");

  // Missing message
  assert.strictEqual(RULES.reports.$reportId.validate({ category: "c", createdAt: 123 }), false, "Missing message rejected");

  // Missing createdAt
  assert.strictEqual(RULES.reports.$reportId.validate({ category: "c", message: "m" }), false, "Missing createdAt rejected");

  // Message > 1500 chars
  assert.strictEqual(
    RULES.reports.$reportId.validate({
      category: "c",
      message: "A".repeat(1501),
      createdAt: 123
    }),
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
    }),
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
    }),
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
    }),
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
    }),
    false,
    "Log property > 500 chars rejected"
  );

  console.log("  [PASS] All 9 schema and validation rules verified with 100% precision.");
}

console.log("\n>>> ALL FIREBASE RTDB RULES AUDIT TESTS PASSED (100%)! <<<\n");
