// Test suite for P0: mergeStatsObjects preservation
const fs = require("fs");
const assert = require("assert");

// Helper to create mock event
const mockEvent = () => ({ addListener: () => {}, removeListener: () => {} });

// Mock browser / extension environment
let mockStorageData = {};
const mockChrome = {
  storage: {
    local: {
      get: (keys) => {
        if (!keys) return Promise.resolve({ ...mockStorageData });
        if (Array.isArray(keys)) {
          const res = {};
          keys.forEach((k) => { if (mockStorageData[k] !== undefined) res[k] = mockStorageData[k]; });
          return Promise.resolve(res);
        }
        return Promise.resolve({ [keys]: mockStorageData[keys] });
      },
      set: (items) => {
        Object.assign(mockStorageData, items);
        return Promise.resolve();
      },
      remove: (keys) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        arr.forEach((k) => delete mockStorageData[k]);
        return Promise.resolve();
      }
    },
    sync: { set: () => Promise.resolve() },
    onChanged: mockEvent()
  },
  action: {
    setIcon: () => Promise.resolve(),
    setBadgeText: () => Promise.resolve(),
    setBadgeBackgroundColor: () => Promise.resolve(),
    setTitle: () => Promise.resolve()
  },
  runtime: {
    onInstalled: mockEvent(),
    onStartup: mockEvent(),
    onMessage: mockEvent(),
    getManifest: () => ({ version: "4.0.0" })
  },
  tabs: {
    onRemoved: mockEvent(),
    onUpdated: mockEvent(),
    onActivated: mockEvent(),
    query: () => Promise.resolve([]),
    get: () => Promise.resolve({})
  },
  alarms: {
    create: () => {},
    clear: () => {},
    get: () => Promise.resolve(null),
    onAlarm: mockEvent()
  },
  omnibox: {
    onInputChanged: mockEvent(),
    onInputEntered: mockEvent()
  },
  commands: {
    onCommand: mockEvent()
  }
};

// Read background.js content
const bgCode = fs.readFileSync(__dirname + "/../background.js", "utf8");

const vm = require("vm");
const context = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  Set,
  Map,
  Promise,
  parseFloat,
  parseInt,
  isNaN,
  URL,
  importScripts: () => {},
  chrome: mockChrome,
  t: (k) => k,
  initI18n: () => Promise.resolve(),
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
};
vm.createContext(context);
vm.runInContext(bgCode, context);

const { mergeStatsObjects, getDefaultStats, handleImportData, getCultivationState } = context;

console.log("=== RUNNING P0 REGRESSION & SIMULATION TESTS ===");

let hasFailed = false;

// Scenario 1: Local has manual breakthrough (Realm 1, Stage 3), Cloud has older state (Realm 0, Stage 9)
{
  const localStats = {
    ...getDefaultStats(),
    chaptersRead: 150,
    cultivatedRealmIndex: 1,
    cultivatedStage: 3,
    lastBreakthrough: { realmId: "foundation_establishment", stage: 3, timestamp: 2000 },
    updatedAt: 2000
  };

  const cloudStats = {
    ...getDefaultStats(),
    chaptersRead: 100,
    cultivatedRealmIndex: 0,
    cultivatedStage: 9,
    lastBreakthrough: { realmId: "qi_condensation", stage: 9, timestamp: 1000 },
    updatedAt: 1000
  };

  const merged = mergeStatsObjects(localStats, cloudStats);

  console.log("Scenario 1 (Local ahead, Cloud older):");
  try {
    assert.strictEqual(merged.cultivatedRealmIndex, 1, "cultivatedRealmIndex must be preserved as 1");
    assert.strictEqual(merged.cultivatedStage, 3, "cultivatedStage must be preserved as 3");
    console.log("  [PASS] Scenario 1");
  } catch (err) {
    console.error("  [FAIL] Scenario 1:", err.message);
    hasFailed = true;
  }
}

// Scenario 2: Cloud has manual breakthrough from another device (newer updatedAt)
{
  const localStats = {
    ...getDefaultStats(),
    chaptersRead: 100,
    cultivatedRealmIndex: 0,
    cultivatedStage: 9,
    updatedAt: 1000
  };

  const cloudStats = {
    ...getDefaultStats(),
    chaptersRead: 120,
    cultivatedRealmIndex: 1,
    cultivatedStage: 1,
    lastBreakthrough: { realmId: "foundation_establishment", stage: 1, timestamp: 2500 },
    updatedAt: 2500
  };

  const merged = mergeStatsObjects(localStats, cloudStats);

  console.log("Scenario 2 (Cloud ahead, Local older):");
  try {
    assert.strictEqual(merged.cultivatedRealmIndex, 1, "cultivatedRealmIndex must be 1 from Cloud");
    assert.strictEqual(merged.cultivatedStage, 1, "cultivatedStage must be 1 from Cloud");
    console.log("  [PASS] Scenario 2");
  } catch (err) {
    console.error("  [FAIL] Scenario 2:", err.message);
    hasFailed = true;
  }
}

// Scenario 3: Merging legacy stats where one or both lack cultivatedRealmIndex
{
  const localStats = {
    ...getDefaultStats(),
    chaptersRead: 80,
    cultivatedRealmIndex: 0,
    cultivatedStage: 5,
    updatedAt: 3000
  };

  const legacyCloudStats = {
    chaptersRead: 120,
    novelsStarted: 2,
    updatedAt: 1000
  };

  const merged = mergeStatsObjects(localStats, legacyCloudStats);

  console.log("Scenario 3 (Local has fields, Cloud is legacy without fields):");
  try {
    assert.strictEqual(merged.cultivatedRealmIndex, 0, "cultivatedRealmIndex must survive legacy merge");
    assert.strictEqual(merged.cultivatedStage, 5, "cultivatedStage must survive legacy merge");
    console.log("  [PASS] Scenario 3");
  } catch (err) {
    console.error("  [FAIL] Scenario 3:", err.message);
    hasFailed = true;
  }
}

// Scenario 4: Simulated Export -> Import roundtrip
async function runAsyncScenarios() {
  console.log("Scenario 4 (Export -> Import roundtrip simulation):");
  mockStorageData = {
    savedNovels: {
      novel_1: { seriesId: "novel_1", novelName: "Omniscient Reader", chapter: "25", maxCounted: 25, updatedAt: 5000 }
    },
    stats: {
      ...getDefaultStats(),
      chaptersRead: 450,
      cultivatedRealmIndex: 2,
      cultivatedStage: 4,
      lastBreakthrough: { realmId: "golden_core", stage: 4, timestamp: 5000 },
      updatedAt: 5000
    },
    settings: { language: "es" }
  };

  // Simulate exporting
  const exportedPayload = JSON.parse(JSON.stringify({
    version: "4.0.0",
    exportedAt: Date.now(),
    novels: mockStorageData.savedNovels,
    stats: mockStorageData.stats,
    settings: mockStorageData.settings
  }));

  // Clear local storage or simulate restoring to a device with empty or older stats
  mockStorageData.stats = {
    ...getDefaultStats(),
    chaptersRead: 50,
    cultivatedRealmIndex: 0,
    cultivatedStage: 1,
    updatedAt: 1000
  };

  // Execute handleImportData
  const importResult = await handleImportData(exportedPayload);
  assert.strictEqual(importResult.ok, true, "Import must succeed");

  const restoredStats = mockStorageData.stats;
  console.log("  Imported realmIndex:", restoredStats.cultivatedRealmIndex);
  console.log("  Imported stage:", restoredStats.cultivatedStage);
  try {
    assert.strictEqual(restoredStats.cultivatedRealmIndex, 2, "cultivatedRealmIndex must survive import");
    assert.strictEqual(restoredStats.cultivatedStage, 4, "cultivatedStage must survive import");
    assert.strictEqual(restoredStats.chaptersRead, 450, "chaptersRead must be merged");
    console.log("  [PASS] Scenario 4");
  } catch (err) {
    console.error("  [FAIL] Scenario 4:", err.message);
    hasFailed = true;
  }

  // Scenario 5: Breakthrough on Device A (cultivatedRealmIndex: 3, stage: 1), Device B has higher chaptersRead (800) but older realm (2, stage 5)
  console.log("Scenario 5 (Cross-device sync: Device A has breakthrough, Device B has more chapters):");
  const deviceA = {
    ...getDefaultStats(),
    chaptersRead: 600,
    cultivatedRealmIndex: 3,
    cultivatedStage: 1,
    lastBreakthrough: { realmId: "nascent_soul", stage: 1, timestamp: 9000 },
    updatedAt: 9000
  };

  const deviceB = {
    ...getDefaultStats(),
    chaptersRead: 800,
    cultivatedRealmIndex: 2,
    cultivatedStage: 5,
    lastBreakthrough: { realmId: "golden_core", stage: 5, timestamp: 8000 },
    updatedAt: 8500
  };

  const mergedCross = mergeStatsObjects(deviceB, deviceA);
  try {
    assert.strictEqual(mergedCross.chaptersRead, 800, "Chapters must be the max (800)");
    assert.strictEqual(mergedCross.cultivatedRealmIndex, 3, "Realm must be the highest achieved (Realm 3 Nascent Soul)");
    assert.strictEqual(mergedCross.cultivatedStage, 1, "Stage must correspond to Realm 3");
    console.log("  [PASS] Scenario 5");
  } catch (err) {
    console.error("  [FAIL] Scenario 5:", err.message);
    hasFailed = true;
  }

  if (hasFailed) {
    console.log("\n>>> SOME TESTS FAILED. <<<");
    process.exit(1);
  } else {
    console.log("\n>>> ALL P0 SCENARIOS AND SIMULATIONS PASSED CLEANLY! <<<");
  }
}

runAsyncScenarios();
