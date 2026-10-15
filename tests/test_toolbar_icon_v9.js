// ============================================================================
// TEST SUITE: V9 TOOLBAR ICON PRE-GENERATED PNGs & CHROME.ACTION APPEARANCE
// ============================================================================
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");
const crypto = require("crypto");
const zlib = require("zlib");

console.log("=== RUNNING V9 TOOLBAR ICON (PRE-GENERATED PNGs) TEST SUITE ===\n");

const esDict = JSON.parse(fs.readFileSync(path.join(__dirname, "../locales/es.json"), "utf8"));
const enDict = JSON.parse(fs.readFileSync(path.join(__dirname, "../locales/en.json"), "utf8"));
const achData = require("../achievements_data.js");
const { TITLE_CONFIG, ALL_TITLES, THEMES_CONFIG, BADGE_RARITY_CONFIG, BADGE_RARITY_COLORS, getCultivationState } = achData;

const TOOLBAR_DIR = path.resolve(__dirname, "../assets/toolbar");
const SIZES = [16, 24, 32, 48];
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ----------------------------------------------------------------------------
// TEST 1: ALL 34 TITLES + 4 FALLBACK BADGES EXIST IN 4 SIZES AS VALID RGBA PNGs
// ----------------------------------------------------------------------------
async function runTest1() {
  console.log("[Test 1] Pre-generated PNG Integrity (16, 24, 32, 48 px):");

  assert.ok(fs.existsSync(TOOLBAR_DIR), "assets/toolbar directory must exist");
  const titles = Object.keys(TITLE_CONFIG);
  assert.strictEqual(titles.length, 34, `Expected exactly 34 titles in TITLE_CONFIG, found ${titles.length}`);

  let totalPngChecked = 0;

  function verifyPngFile(filePath, expectedSize, label) {
    assert.ok(fs.existsSync(filePath), `Missing PNG for ${label} at ${filePath}`);
    const buf = fs.readFileSync(filePath);
    assert.ok(buf.length > 100, `PNG file suspiciously small (${buf.length} bytes) for ${label}`);

    // Check PNG signature
    assert.ok(buf.subarray(0, 8).equals(PNG_SIGNATURE), `Invalid PNG signature for ${label}`);

    // Parse IHDR
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    const bitDepth = buf.readUInt8(24);
    const colorType = buf.readUInt8(25);

    assert.strictEqual(w, expectedSize, `Width mismatch for ${label}: expected ${expectedSize}, got ${w}`);
    assert.strictEqual(h, expectedSize, `Height mismatch for ${label}: expected ${expectedSize}, got ${h}`);
    assert.strictEqual(bitDepth, 8, `Bit depth must be 8 for ${label}`);
    assert.strictEqual(colorType, 6, `Color type must be 6 (RGBA with alpha channel) for ${label}`);

    // Verify file is NOT empty or completely transparent by reading non-zero pixel bytes
    let offset = 8;
    const idatChunks = [];
    while (offset < buf.length) {
      const len = buf.readUInt32BE(offset);
      const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
      if (type === "IDAT") {
        idatChunks.push(buf.subarray(offset + 8, offset + 8 + len));
      }
      offset += 12 + len;
    }
    assert.ok(idatChunks.length > 0, `No IDAT chunk found in ${label}`);
    const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
    let nonZeroCount = 0;
    for (let i = 0; i < decompressed.length; i++) {
      if (decompressed[i] !== 0) nonZeroCount++;
    }
    assert.ok(nonZeroCount > 0, `PNG for ${label} is completely transparent!`);
    totalPngChecked++;
  }

  // 1. All 34 titles across 4 sizes (136 files)
  for (const titleId of titles) {
    for (const sz of SIZES) {
      const fileName = `${titleId}_${sz}.png`;
      const fp = path.join(TOOLBAR_DIR, fileName);
      verifyPngFile(fp, sz, fileName);
    }
  }

  // 2. All 4 Rarity Fallbacks across 4 sizes (16 files)
  for (const rarity of ["common", "rare", "epic", "legendary"]) {
    for (const sz of SIZES) {
      const fileName = `badge_${rarity}_${sz}.png`;
      const fp = path.join(TOOLBAR_DIR, fileName);
      verifyPngFile(fp, sz, fileName);
    }
  }

  assert.strictEqual(totalPngChecked, 152, `Expected exactly 152 verified PNGs, found ${totalPngChecked}`);
  console.log(`  [PASS] All 152 PNG files (34 titles + 4 fallbacks x 4 sizes) verified: valid PNG signature, exact dimensions, RGBA alpha channel, and non-transparent.`);
}

// ----------------------------------------------------------------------------
// PURE JS PNG DECODER (For Pixel Inspection & Similarity Metrics)
// ----------------------------------------------------------------------------
function decodePNG(buffer) {
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  let offset = 8;
  const idats = [];
  while (offset < buffer.length) {
    const len = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") idats.push(buffer.subarray(offset + 8, offset + 8 + len));
    offset += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idats));
  const rgba = Buffer.alloc(width * height * 4);
  const stride = width * 4;
  let srcOffset = 0;
  let prevRow = null;

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
  }

  for (let y = 0; y < height; y++) {
    const filter = decompressed[srcOffset++];
    const currentRow = rgba.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const raw = decompressed[srcOffset++];
      const left = x >= 4 ? currentRow[x - 4] : 0;
      const up = prevRow ? prevRow[x] : 0;
      const upLeft = (prevRow && x >= 4) ? prevRow[x - 4] : 0;
      let val = 0;
      if (filter === 0) val = raw;
      else if (filter === 1) val = (raw + left) & 0xff;
      else if (filter === 2) val = (raw + up) & 0xff;
      else if (filter === 3) val = (raw + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) val = (raw + paeth(left, up, upLeft)) & 0xff;
      currentRow[x] = val;
    }
    prevRow = currentRow;
  }
  return { width, height, rgba };
}

// ----------------------------------------------------------------------------
// TEST 2: TOP-LEFT "N" AREA SIMILARITY TO BASE ICON (>75% THRESHOLD)
// ----------------------------------------------------------------------------
async function runTest2() {
  console.log("\n[Test 2] Top-Left 'N' Area Similarity to Standalone Base Icon:");
  const titles = Object.keys(TITLE_CONFIG);
  const rootDir = path.resolve(__dirname, "..");
  const base16 = decodePNG(fs.readFileSync(path.join(rootDir, "assets/icon16.png")));
  const base32 = decodePNG(fs.readFileSync(path.join(rootDir, "assets/icon32.png")));
  const base48 = decodePNG(fs.readFileSync(path.join(rootDir, "assets/icon48.png")));

  let minSimilarity16 = 100;
  let minSimilarity24 = 100;
  let minSimilarity32 = 100;
  let minSimilarity48 = 100;

  for (const id of titles) {
    // 1. Inspect 16px composite icon
    const comp16 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${id}_16.png`)));
    let tlDiff16 = 0;
    let tlCount16 = 0;
    let tlNonZero16 = 0;

    // Top-left quadrant (x < 7, y < 7)
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const idx = (y * 16 + x) * 4;
        const bA = base16.rgba[idx + 3];
        const cA = comp16.rgba[idx + 3];
        if (cA > 30) tlNonZero16++;
        if (bA > 30 || cA > 30) {
          tlCount16++;
          tlDiff16 += (Math.abs(base16.rgba[idx] - comp16.rgba[idx])
                    + Math.abs(base16.rgba[idx + 1] - comp16.rgba[idx + 1])
                    + Math.abs(base16.rgba[idx + 2] - comp16.rgba[idx + 2])) / 3;
        }
      }
    }

    assert.ok(tlNonZero16 > 10, `Top-left quadrant of 16px composite for '${id}' is empty!`);
    const sim16 = 100 - (tlDiff16 / (tlCount16 * 2.55));
    if (sim16 < minSimilarity16) minSimilarity16 = sim16;
    assert.ok(sim16 >= 75, `Top-left 'N' similarity too low for '${id}' at 16px: ${sim16.toFixed(1)}% < 75%`);

    // 2. Inspect 24px composite icon (x < 11, y < 11)
    const comp24 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${id}_24.png`)));
    let tlNonZero24 = 0;
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 11; x++) {
        const idx = (y * 24 + x) * 4;
        if (comp24.rgba[idx + 3] > 30) tlNonZero24++;
      }
    }
    assert.ok(tlNonZero24 > 25, `Top-left quadrant of 24px composite for '${id}' is empty!`);

    // 3. Inspect 32px composite icon (x < 15, y < 15)
    const comp32 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${id}_32.png`)));
    let tlDiff32 = 0;
    let tlCount32 = 0;
    let tlNonZero32 = 0;

    for (let y = 0; y < 15; y++) {
      for (let x = 0; x < 15; x++) {
        const idx = (y * 32 + x) * 4;
        const bA = base32.rgba[idx + 3];
        const cA = comp32.rgba[idx + 3];
        if (cA > 30) tlNonZero32++;
        if (bA > 30 || cA > 30) {
          tlCount32++;
          tlDiff32 += (Math.abs(base32.rgba[idx] - comp32.rgba[idx])
                    + Math.abs(base32.rgba[idx + 1] - comp32.rgba[idx + 1])
                    + Math.abs(base32.rgba[idx + 2] - comp32.rgba[idx + 2])) / 3;
        }
      }
    }
    assert.ok(tlNonZero32 > 50, `Top-left quadrant of 32px composite for '${id}' is empty!`);
    const sim32 = 100 - (tlDiff32 / (tlCount32 * 2.55));
    if (sim32 < minSimilarity32) minSimilarity32 = sim32;
    assert.ok(sim32 >= 75, `Top-left 'N' similarity too low for '${id}' at 32px: ${sim32.toFixed(1)}% < 75%`);

    // 4. Inspect 48px composite icon (x < 22, y < 22)
    const comp48 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${id}_48.png`)));
    let tlDiff48 = 0;
    let tlCount48 = 0;
    let tlNonZero48 = 0;

    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 22; x++) {
        const idx = (y * 48 + x) * 4;
        const bA = base48.rgba[idx + 3];
        const cA = comp48.rgba[idx + 3];
        if (cA > 30) tlNonZero48++;
        if (bA > 30 || cA > 30) {
          tlCount48++;
          tlDiff48 += (Math.abs(base48.rgba[idx] - comp48.rgba[idx])
                    + Math.abs(base48.rgba[idx + 1] - comp48.rgba[idx + 1])
                    + Math.abs(base48.rgba[idx + 2] - comp48.rgba[idx + 2])) / 3;
        }
      }
    }

    assert.ok(tlNonZero48 > 100, `Top-left quadrant of 48px composite for '${id}' is empty!`);
    const sim48 = 100 - (tlDiff48 / (tlCount48 * 2.55));
    if (sim48 < minSimilarity48) minSimilarity48 = sim48;
    assert.ok(sim48 >= 75, `Top-left 'N' similarity too low for '${id}' at 48px: ${sim48.toFixed(1)}% < 75%`);
  }

  console.log(`  [PASS] Top-left 'N' area verified across all 34 titles: non-empty, with minimum similarity of ${minSimilarity16.toFixed(1)}% at 16px, ${minSimilarity32.toFixed(1)}% at 32px, and ${minSimilarity48.toFixed(1)}% at 48px (well above 75% threshold).`);
}

// ----------------------------------------------------------------------------
// TEST 3: BOTTOM-RIGHT PATCH AREA DIFFERENTIATION & BADGE UNIQUENESS
// ----------------------------------------------------------------------------
async function runTest3() {
  console.log("\n[Test 3] Bottom-Right Patch Area Differentiation & Uniqueness:");
  const titles = Object.keys(TITLE_CONFIG);
  const rootDir = path.resolve(__dirname, "..");
  const base16 = decodePNG(fs.readFileSync(path.join(rootDir, "assets/icon16.png")));
  const base48 = decodePNG(fs.readFileSync(path.join(rootDir, "assets/icon48.png")));

  const patchHashes16 = new Set();
  const patchHashes24 = new Set();
  const patchHashes32 = new Set();
  const patchHashes48 = new Set();
  let minPatchDiff16 = 999;

  for (const id of titles) {
    // 1. Inspect bottom-right quadrant of 16px composite (x >= 8, y >= 8)
    const comp16 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${id}_16.png`)));
    let brDiff16 = 0;
    let brCount16 = 0;
    const brBuf16 = Buffer.alloc(8 * 8 * 4);
    let bIdx16 = 0;

    for (let y = 8; y < 16; y++) {
      for (let x = 8; x < 16; x++) {
        const idx = (y * 16 + x) * 4;
        brCount16++;
        brDiff16 += (Math.abs(base16.rgba[idx] - comp16.rgba[idx])
                  + Math.abs(base16.rgba[idx + 1] - comp16.rgba[idx + 1])
                  + Math.abs(base16.rgba[idx + 2] - comp16.rgba[idx + 2])) / 3;
        brBuf16[bIdx16++] = comp16.rgba[idx];
        brBuf16[bIdx16++] = comp16.rgba[idx + 1];
        brBuf16[bIdx16++] = comp16.rgba[idx + 2];
        brBuf16[bIdx16++] = comp16.rgba[idx + 3];
      }
    }

    const avgDiff16 = brDiff16 / brCount16;
    if (avgDiff16 < minPatchDiff16) minPatchDiff16 = avgDiff16;
    assert.ok(avgDiff16 > 30, `Bottom-right patch for '${id}' too similar to base icon (${avgDiff16.toFixed(1)} <= 30)`);

    const h16 = crypto.createHash("sha256").update(brBuf16).digest("hex");
    patchHashes16.add(h16);

    // 2. Inspect 24px bottom-right (x >= 12, y >= 12)
    const comp24 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${id}_24.png`)));
    const brBuf24 = Buffer.alloc(12 * 12 * 4);
    let bIdx24 = 0;
    for (let y = 12; y < 24; y++) {
      for (let x = 12; x < 24; x++) {
        const idx = (y * 24 + x) * 4;
        brBuf24[bIdx24++] = comp24.rgba[idx];
        brBuf24[bIdx24++] = comp24.rgba[idx + 1];
        brBuf24[bIdx24++] = comp24.rgba[idx + 2];
        brBuf24[bIdx24++] = comp24.rgba[idx + 3];
      }
    }
    patchHashes24.add(crypto.createHash("sha256").update(brBuf24).digest("hex"));

    // 3. Inspect 32px bottom-right (x >= 16, y >= 16)
    const comp32 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${id}_32.png`)));
    const brBuf32 = Buffer.alloc(16 * 16 * 4);
    let bIdx32 = 0;
    for (let y = 16; y < 32; y++) {
      for (let x = 16; x < 32; x++) {
        const idx = (y * 32 + x) * 4;
        brBuf32[bIdx32++] = comp32.rgba[idx];
        brBuf32[bIdx32++] = comp32.rgba[idx + 1];
        brBuf32[bIdx32++] = comp32.rgba[idx + 2];
        brBuf32[bIdx32++] = comp32.rgba[idx + 3];
      }
    }
    patchHashes32.add(crypto.createHash("sha256").update(brBuf32).digest("hex"));

    // 4. Inspect bottom-right quadrant of 48px composite (x >= 24, y >= 24)
    const comp48 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${id}_48.png`)));
    const brBuf48 = Buffer.alloc(24 * 24 * 4);
    let bIdx48 = 0;
    for (let y = 24; y < 48; y++) {
      for (let x = 24; x < 48; x++) {
        const idx = (y * 48 + x) * 4;
        brBuf48[bIdx48++] = comp48.rgba[idx];
        brBuf48[bIdx48++] = comp48.rgba[idx + 1];
        brBuf48[bIdx48++] = comp48.rgba[idx + 2];
        brBuf48[bIdx48++] = comp48.rgba[idx + 3];
      }
    }
    const h48 = crypto.createHash("sha256").update(brBuf48).digest("hex");
    patchHashes48.add(h48);
  }

  assert.strictEqual(patchHashes16.size, 34, `Expected 34 unique 16px patch hashes, got ${patchHashes16.size}`);
  assert.strictEqual(patchHashes24.size, 34, `Expected 34 unique 24px patch hashes, got ${patchHashes24.size}`);
  assert.strictEqual(patchHashes32.size, 34, `Expected 34 unique 32px patch hashes, got ${patchHashes32.size}`);
  assert.strictEqual(patchHashes48.size, 34, `Expected 34 unique 48px patch hashes, got ${patchHashes48.size}`);
  console.log(`  [PASS] Bottom-right patch area verified: clearly differentiated from base icon (min avg channel diff ${minPatchDiff16.toFixed(1)} > 30) and 100% unique across all 34 titles across all sizes (34 unique patch hashes).`);
}

// ----------------------------------------------------------------------------
// TEST 4: STATIC AURA CONTAINMENT & NO CLIPPED PIXELS AT CANVAS EDGES
// ----------------------------------------------------------------------------
async function runTest4() {
  console.log("\n[Test 4] Static Aura Containment & Edge Clipping Guard:");
  const allIds = [
    ...Object.keys(TITLE_CONFIG),
    "badge_common", "badge_rare", "badge_epic", "badge_legendary"
  ];

  for (const sz of SIZES) {
    let unclippedCount = 0;
    for (const id of allIds) {
      const fn = `${id}_${sz}.png`;
      const fp = path.join(TOOLBAR_DIR, fn);
      const dec = decodePNG(fs.readFileSync(fp));

      // 1. Extreme corner pixel (sz - 1, sz - 1) must be completely transparent (alpha = 0)
      const cornerAlpha = dec.rgba[((sz - 1) * sz + (sz - 1)) * 4 + 3];
      assert.strictEqual(cornerAlpha, 0, `Aura clipping detected at extreme corner (${sz-1}, ${sz-1}) in ${fn} (alpha=${cornerAlpha})`);

      // 2. Top-right and bottom-left corners must also be transparent
      const trAlpha = dec.rgba[(0 * sz + (sz - 1)) * 4 + 3];
      const blAlpha = dec.rgba[((sz - 1) * sz + 0) * 4 + 3];
      assert.strictEqual(trAlpha, 0, `Unexpected pixel at top-right corner in ${fn}`);
      assert.strictEqual(blAlpha, 0, `Unexpected pixel at bottom-left corner in ${fn}`);

      // 3. Entire right border (x = sz - 1) and bottom border (y = sz - 1) must have alpha === 0
      // strictly ensuring no aura pixels are glued to the canvas border
      for (let y = 0; y < sz; y++) {
        const a = dec.rgba[(y * sz + (sz - 1)) * 4 + 3];
        assert.strictEqual(a, 0, `Right edge clipping detected at (x=${sz-1}, y=${y}) in ${fn} (alpha=${a})`);
      }
      for (let x = 0; x < sz; x++) {
        const a = dec.rgba[((sz - 1) * sz + x) * 4 + 3];
        assert.strictEqual(a, 0, `Bottom edge clipping detected at (x=${x}, y=${sz-1}) in ${fn} (alpha=${a})`);
      }

      unclippedCount++;
    }
    assert.strictEqual(unclippedCount, 38, `Expected 38 unclipped icons for size ${sz}`);
  }

  console.log(`  [PASS] All 152 composite icons (34 titles + 4 fallbacks x 4 sizes) verified: aura is smoothly contained within canvas with zero clipping at outer borders.`);
}

// ----------------------------------------------------------------------------
// MOCK CHROME RUNTIME & VM CONTEXT
// ----------------------------------------------------------------------------
async function createMockEnvironment() {
  const store = {};
  const actionCalls = {
    setIcon: [],
    setBadgeText: [],
    setBadgeBackgroundColor: [],
    setTitle: []
  };

  const mockContext = {
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
    importScripts: (...files) => {
      for (const f of files) {
        try {
          const p = path.resolve(__dirname, "..", f);
          if (fs.existsSync(p)) {
            vm.runInContext(fs.readFileSync(p, "utf8"), mockContext);
          }
        } catch (e) {
          console.error("Error importing script in test VM:", f, e);
        }
      }
    },
    chrome: {
      storage: {
        local: {
          get: async (keys) => {
            if (keys === null) return { ...store };
            if (typeof keys === "string") return { [keys]: store[keys] };
            if (Array.isArray(keys)) {
              const res = {};
              keys.forEach((k) => (res[k] = store[k]));
              return res;
            }
            return { ...store };
          },
          set: async (items) => {
            Object.assign(store, items);
          },
          remove: async (keys) => {
            const arr = Array.isArray(keys) ? keys : [keys];
            arr.forEach((k) => delete store[k]);
          }
        },
        onChanged: { addListener: () => {} }
      },
      action: {
        setIcon: async (opts) => {
          actionCalls.setIcon.push(opts);
          if (mockContext.actionFailures && typeof mockContext.actionFailures.setIcon === "function") {
            const err = mockContext.actionFailures.setIcon(opts);
            if (err) throw err;
          }
        },
        setBadgeText: async (opts) => {
          actionCalls.setBadgeText.push(opts);
        },
        setBadgeBackgroundColor: async (opts) => {
          actionCalls.setBadgeBackgroundColor.push(opts);
        },
        setTitle: async (opts) => {
          actionCalls.setTitle.push(opts);
        }
      },
      runtime: {
        id: "novel-tracker-test-id",
        getManifest: () => ({ version: "4.0.0" }),
        getURL: (p) => p || "",
        onInstalled: { addListener: () => {} },
        onStartup: { addListener: () => {} },
        onMessage: { addListener: () => {} }
      },
      tabs: {
        onRemoved: { addListener: () => {} },
        onUpdated: { addListener: () => {} },
        onActivated: { addListener: () => {} }
      },
      alarms: { onAlarm: { addListener: () => {} } },
      omnibox: { onInputChanged: { addListener: () => {} }, onInputEntered: { addListener: () => {} } },
      commands: { onCommand: { addListener: () => {} } }
    },
    fetch: async (url) => {
      const u = String(url || "");
      if (u.includes("locales/es.json")) return { ok: true, json: async () => esDict };
      if (u.includes("locales/en.json")) return { ok: true, json: async () => enDict };
      return { ok: true, json: async () => ({}) };
    }
  };

  vm.createContext(mockContext);
  const bgCode = fs.readFileSync(path.join(__dirname, "../background.js"), "utf8");
  vm.runInContext(bgCode, mockContext);

  await new Promise((resolve) => setTimeout(resolve, 20));
  actionCalls.setIcon.length = 0;
  actionCalls.setBadgeText.length = 0;
  actionCalls.setBadgeBackgroundColor.length = 0;
  actionCalls.setTitle.length = 0;
  if (typeof mockContext.resetRenderedStateKey === "function") {
    mockContext.resetRenderedStateKey();
  }

  return { mockContext, store, actionCalls };
}

// ----------------------------------------------------------------------------
// TEST 5: EQUIPPING CALLS setIcon WITH ACHIEVEMENT PNGs, UNEQUIP RETURNS TO BASE,
//         UNKNOWN USES RARITY FALLBACK WITHOUT THROWING
// ----------------------------------------------------------------------------
async function runTest5() {
  console.log("\n[Test 5] Equipping, Unequipping, and Fallback Chain via chrome.action.setIcon:");
  const { mockContext, store, actionCalls } = await createMockEnvironment();
  const { refreshBrowserActionAppearance, getDefaultStats, resetRenderedStateKey, BASE_TOOLBAR_ICONS } = mockContext;

  // 1. Initial State: Unequipped -> calls setIcon with BASE_TOOLBAR_ICONS (the "N" icon)
  store.stats = { ...getDefaultStats(), equippedTitle: "", unlockedTitles: [] };
  store.settings = { activeThemeId: "cultivation", language: "es" };
  await refreshBrowserActionAppearance();

  assert.ok(actionCalls.setIcon.length > 0, "setIcon must be called on unequipped startup");
  const unequippedIconCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual(unequippedIconCall.path, BASE_TOOLBAR_ICONS, "Unequipped state must set BASE_TOOLBAR_ICONS");

  // 2. Equip Outer Disciple (Common)
  store.stats = { ...getDefaultStats(), equippedTitle: "outer_disciple", unlockedTitles: ["outer_disciple"] };
  resetRenderedStateKey();
  await refreshBrowserActionAppearance();

  const outerDiscipleIconCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual({ ...outerDiscipleIconCall.path }, {
    16: "assets/toolbar/outer_disciple_16.png",
    24: "assets/toolbar/outer_disciple_24.png",
    32: "assets/toolbar/outer_disciple_32.png",
    48: "assets/toolbar/outer_disciple_48.png"
  }, "Equipping outer_disciple must set outer_disciple PNG paths");

  // 3. Switch to Shadow Monarch (Epic)
  store.stats = { ...getDefaultStats(), equippedTitle: "shadow_monarch", unlockedTitles: ["outer_disciple", "shadow_monarch"] };
  resetRenderedStateKey();
  await refreshBrowserActionAppearance();

  const monarchIconCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual({ ...monarchIconCall.path }, {
    16: "assets/toolbar/shadow_monarch_16.png",
    24: "assets/toolbar/shadow_monarch_24.png",
    32: "assets/toolbar/shadow_monarch_32.png",
    48: "assets/toolbar/shadow_monarch_48.png"
  }, "Switching to shadow_monarch must set shadow_monarch PNG paths");

  // 4. Switch to Cosmic Sovereign (Legendary)
  store.stats = { ...getDefaultStats(), equippedTitle: "cosmic_sovereign", unlockedTitles: ["outer_disciple", "shadow_monarch", "cosmic_sovereign"] };
  resetRenderedStateKey();
  await refreshBrowserActionAppearance();

  const cosmicIconCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual({ ...cosmicIconCall.path }, {
    16: "assets/toolbar/cosmic_sovereign_16.png",
    24: "assets/toolbar/cosmic_sovereign_24.png",
    32: "assets/toolbar/cosmic_sovereign_32.png",
    48: "assets/toolbar/cosmic_sovereign_48.png"
  }, "Switching to cosmic_sovereign must set cosmic_sovereign PNG paths");

  // 5. Unequip Title -> must return to BASE_TOOLBAR_ICONS
  store.stats = { ...getDefaultStats(), equippedTitle: "", unlockedTitles: ["outer_disciple"] };
  resetRenderedStateKey();
  await refreshBrowserActionAppearance();

  const reUnequippedIconCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual({ ...reUnequippedIconCall.path }, { ...BASE_TOOLBAR_ICONS }, "Unequipping must revert to BASE_TOOLBAR_ICONS");

  // 6. Unknown achievement ID with unlocked state
  store.stats = {
    ...getDefaultStats(),
    equippedTitle: "mystic_dragon_nonexistent",
    unlockedTitles: ["mystic_dragon_nonexistent"],
    equippedRarity: "rare"
  };
  resetRenderedStateKey();
  let threw = false;
  try {
    await refreshBrowserActionAppearance();
  } catch (err) {
    threw = true;
    console.error("Unknown title threw:", err);
  }
  assert.strictEqual(threw, false, "Unknown title must never throw an exception");

  const unknownCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual({ ...unknownCall.path }, {
    16: "assets/toolbar/badge_rare_16.png",
    24: "assets/toolbar/badge_rare_24.png",
    32: "assets/toolbar/badge_rare_32.png",
    48: "assets/toolbar/badge_rare_48.png"
  }, "Unknown achievement must cleanly fall back to rarity fallback PNGs");

  // 7. Unknown achievement ID with EMPTY unlockedTitles (must still use rarity fallback, not wipe to base)
  store.stats = {
    ...getDefaultStats(),
    equippedTitle: "unknown_custom_title",
    unlockedTitles: [],
    equippedRarity: "epic",
    equippedTier: 3
  };
  resetRenderedStateKey();
  threw = false;
  try {
    await refreshBrowserActionAppearance();
  } catch (err) {
    threw = true;
  }
  assert.strictEqual(threw, false, "Unknown title with empty unlockedTitles must never throw");
  const unknownEmptyUnlockedCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual({ ...unknownEmptyUnlockedCall.path }, {
    16: "assets/toolbar/badge_epic_16.png",
    24: "assets/toolbar/badge_epic_24.png",
    32: "assets/toolbar/badge_epic_32.png",
    48: "assets/toolbar/badge_epic_48.png"
  }, "Unknown title with empty unlockedTitles must fall back to rarity fallback PNGs");

  // Verify unknown title tooltip retains achievement identity
  const unknownTooltip = actionCalls.setTitle[actionCalls.setTitle.length - 1].title;
  assert.ok(unknownTooltip.includes("unknown_custom_title"), `Tooltip for unknown title should include title id: ${unknownTooltip}`);
  assert.ok(unknownTooltip.includes("Épico") || unknownTooltip.includes("epic"), `Tooltip for unknown title should include rarity: ${unknownTooltip}`);

  // 8. Unknown achievement with default/missing rarity fallback
  store.stats = {
    ...getDefaultStats(),
    equippedTitle: "alien_artifact_unknown",
    unlockedTitles: []
  };
  resetRenderedStateKey();
  threw = false;
  try {
    await refreshBrowserActionAppearance();
  } catch {
    threw = true;
  }
  assert.strictEqual(threw, false, "Unknown title without rarity must not throw");
  const unknownCommonCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual({ ...unknownCommonCall.path }, {
    16: "assets/toolbar/badge_common_16.png",
    24: "assets/toolbar/badge_common_24.png",
    32: "assets/toolbar/badge_common_32.png",
    48: "assets/toolbar/badge_common_48.png"
  }, "Unknown achievement defaults safely to common rarity fallback PNG");

  // 9. Full Fallback Chain Resilience: Simulated setIcon rejections
  // Case A: titlePaths fails -> falls back to rarity fallbackPaths
  store.stats = {
    ...getDefaultStats(),
    equippedTitle: "outer_disciple",
    unlockedTitles: ["outer_disciple"]
  };
  resetRenderedStateKey();
  mockContext.actionFailures = {
    setIcon: (opts) => {
      // Simulate disk failure loading outer_disciple PNG
      if (opts?.path?.[16]?.includes("outer_disciple")) {
        return new Error("Simulated chrome.action.setIcon failed to load title image");
      }
      return null;
    }
  };
  await refreshBrowserActionAppearance();
  const titleFailedFallbackCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual({ ...titleFailedFallbackCall.path }, {
    16: "assets/toolbar/badge_common_16.png",
    24: "assets/toolbar/badge_common_24.png",
    32: "assets/toolbar/badge_common_32.png",
    48: "assets/toolbar/badge_common_48.png"
  }, "When titlePaths fails, setIcon must cleanly fall back to rarity fallbackPaths");

  // Case B: BOTH titlePaths and fallbackPaths fail -> falls back to BASE_TOOLBAR_ICONS
  resetRenderedStateKey();
  mockContext.actionFailures = {
    setIcon: (opts) => {
      // Reject both outer_disciple and badge_common
      if (opts?.path?.[16]?.includes("outer_disciple") || opts?.path?.[16]?.includes("badge_common")) {
        return new Error("Simulated failure for title and rarity fallback");
      }
      return null;
    }
  };
  await refreshBrowserActionAppearance();
  const bothFailedBaseCall = actionCalls.setIcon[actionCalls.setIcon.length - 1];
  assert.deepStrictEqual({ ...bothFailedBaseCall.path }, { ...BASE_TOOLBAR_ICONS },
    "When both title and rarity fallback fail, setIcon must fall back to BASE_TOOLBAR_ICONS");

  // Clear simulated failures
  mockContext.actionFailures = null;

  console.log("  [PASS] Equipping sets achievement PNGs, switching updates paths, unequipping returns to base 'N', and unknown title / missing file cleanly falls through 3-stage fallback chain without throwing.");
}

// ----------------------------------------------------------------------------
// TEST 6: BADGE TEXT (DISABLED BY DEFAULT, RESTORED ON TOGGLE) & DUAL-LANG TOOLTIPS
// ----------------------------------------------------------------------------
async function runTest6() {
  console.log("\n[Test 6] Badge Text (Tier hidden by default) & Dual-Language Tooltips (ES & EN):");
  const { mockContext, store, actionCalls } = await createMockEnvironment();
  const { refreshBrowserActionAppearance, getDefaultStats, resetRenderedStateKey, TIER_ROMAN } = mockContext;

  const titles = Object.keys(TITLE_CONFIG);

  for (const titleId of titles) {
    const cfg = TITLE_CONFIG[titleId];
    store.stats = { ...getDefaultStats(), equippedTitle: titleId, unlockedTitles: [titleId] };

    // Case A: Default settings (showTierOnIcon is undefined/false) -> setBadgeText must be ""
    store.settings = { activeThemeId: "cultivation", language: "es" };
    resetRenderedStateKey();
    await refreshBrowserActionAppearance();

    const lastBadgeDefault = actionCalls.setBadgeText[actionCalls.setBadgeText.length - 1].text;
    assert.strictEqual(lastBadgeDefault, "", `Default badge text for ${titleId} must be empty ('')`);

    // Verify Spanish tooltip
    const esName = esDict[`title_${titleId}_name`];
    const esRarity = esDict[`ach_rarity_${cfg.rarity}`];
    const esActualTitle = actionCalls.setTitle[actionCalls.setTitle.length - 1].title;
    const esExpectedTooltip = `MyNovelSystem — ${esName} · ${esRarity} · Tier ${cfg.tier}`;
    assert.strictEqual(esActualTitle, esExpectedTooltip, `ES tooltip mismatch for ${titleId}`);

    // Case B: English tooltip
    store.settings = { activeThemeId: "cultivation", language: "en" };
    resetRenderedStateKey();
    await refreshBrowserActionAppearance();

    const enName = enDict[`title_${titleId}_name`];
    const enRarity = enDict[`ach_rarity_${cfg.rarity}`];
    const enActualTitle = actionCalls.setTitle[actionCalls.setTitle.length - 1].title;
    const enExpectedTooltip = `MyNovelSystem — ${enName} · ${enRarity} · Tier ${cfg.tier}`;
    assert.strictEqual(enActualTitle, enExpectedTooltip, `EN tooltip mismatch for ${titleId}`);

    // Case C: User explicitly activates showTierOnIcon: true -> badge text displays Roman numeral
    store.settings = { activeThemeId: "cultivation", language: "es", showTierOnIcon: true };
    resetRenderedStateKey();
    await refreshBrowserActionAppearance();

    const lastBadgeWithSetting = actionCalls.setBadgeText[actionCalls.setBadgeText.length - 1].text;
    const expectedRoman = TIER_ROMAN[cfg.tier];
    assert.strictEqual(lastBadgeWithSetting, expectedRoman, `With showTierOnIcon: true, badge must show '${expectedRoman}' for tier ${cfg.tier}`);
  }

  // Case D: Unknown title tier rendering with showTierOnIcon
  // D1: Unknown title with equippedTier: 4 and showTierOnIcon: true
  store.stats = { ...getDefaultStats(), equippedTitle: "custom_unknown", equippedTier: 4, equippedRarity: "epic" };
  store.settings = { activeThemeId: "cultivation", language: "es", showTierOnIcon: true };
  resetRenderedStateKey();
  await refreshBrowserActionAppearance();
  const unknownWithTierBadge = actionCalls.setBadgeText[actionCalls.setBadgeText.length - 1].text;
  assert.strictEqual(unknownWithTierBadge, "IV", "With showTierOnIcon: true and equippedTier: 4, badge must show 'IV'");

  // D2: Unknown title with equippedTier: 0 / missing and showTierOnIcon: true
  store.stats = { ...getDefaultStats(), equippedTitle: "custom_unknown", equippedRarity: "epic" };
  store.settings = { activeThemeId: "cultivation", language: "es", showTierOnIcon: true };
  resetRenderedStateKey();
  await refreshBrowserActionAppearance();
  const unknownWithoutTierBadge = actionCalls.setBadgeText[actionCalls.setBadgeText.length - 1].text;
  assert.strictEqual(unknownWithoutTierBadge, "", "With showTierOnIcon: true and missing tier, badge text must be empty ('')");

  console.log("  [PASS] By default setBadgeText is '' across all 34 titles; when enabled, it shows Roman numeral; tooltips verified in ES and EN; unknown title tier edge cases verified.");
}

// ----------------------------------------------------------------------------
// TEST 7: BOTTLENECK READY PRIORITY ('⚡') OVER TITLE
// ----------------------------------------------------------------------------
async function runTest7() {
  console.log("\n[Test 7] Cultivation Bottleneck Ready Priority ('⚡' in Crimson):");
  const { mockContext, store, actionCalls } = await createMockEnvironment();
  const { refreshBrowserActionAppearance, getDefaultStats } = mockContext;

  store.stats = {
    ...getDefaultStats(),
    equippedTitle: "outer_disciple",
    unlockedTitles: ["outer_disciple"],
    chaptersRead: 100,
    cultivationThemes: {
      cultivation: { realmIndex: 0, stage: 1 }
    }
  };
  // Even with showTierOnIcon: true, bottleneck takes absolute priority
  store.settings = { activeThemeId: "cultivation", showTierOnIcon: true };

  await refreshBrowserActionAppearance();
  const lastBadgeText = actionCalls.setBadgeText[actionCalls.setBadgeText.length - 1].text;
  const lastBadgeColor = actionCalls.setBadgeBackgroundColor[actionCalls.setBadgeBackgroundColor.length - 1].color;
  const lastTitle = actionCalls.setTitle[actionCalls.setTitle.length - 1].title;

  assert.strictEqual(lastBadgeText, "⚡", "Bottleneck ready must override badge text with '⚡'");
  assert.strictEqual(lastBadgeColor, "#e11d48", "Bottleneck badge color must be crimson (#e11d48)");
  assert.ok(lastTitle.includes("⚡"), "Tooltip must include bottleneck alert icon ⚡");

  console.log("  [PASS] Bottleneck ready takes visual priority over tier badge text.");
}

// ----------------------------------------------------------------------------
// TEST 8: REGISTRY.JSON DISK AND ZIP PACKAGE INTEGRITY
// ----------------------------------------------------------------------------
async function runTest8() {
  console.log("\n[Test 8] assets/toolbar/registry.json & Release ZIP Package Integrity:");

  const regPath = path.join(TOOLBAR_DIR, "registry.json");
  assert.ok(fs.existsSync(regPath), "assets/toolbar/registry.json must exist");
  const reg = JSON.parse(fs.readFileSync(regPath, "utf8"));

  assert.ok(reg.titles, "registry.json must contain titles map");
  assert.ok(reg.rarityFallbacks, "registry.json must contain rarityFallbacks map");
  assert.ok(reg.baseIcon, "registry.json must contain baseIcon map");

  const rootDir = path.resolve(__dirname, "..");
  const zipPath = path.join(rootDir, "novel-chapter-tracker-v4.0.0.zip");
  assert.ok(fs.existsSync(zipPath), `novel-chapter-tracker-v4.0.0.zip must exist at ${zipPath}`);

  // Verify all files referenced in registry exist on disk
  for (const [titleId, tObj] of Object.entries(reg.titles)) {
    assert.strictEqual(typeof tObj.isSimplified16, "boolean", `isSimplified16 boolean missing for ${titleId}`);
    for (const [sz, relP] of Object.entries(tObj.files)) {
      const fullP = path.join(rootDir, relP);
      assert.ok(fs.existsSync(fullP), `File referenced in registry missing on disk: ${relP}`);
    }
  }

  for (const [rarity, fObj] of Object.entries(reg.rarityFallbacks)) {
    for (const [sz, relP] of Object.entries(fObj)) {
      const fullP = path.join(rootDir, relP);
      assert.ok(fs.existsSync(fullP), `Fallback referenced in registry missing on disk: ${relP}`);
    }
  }

  // Read ZIP central directory to verify all registry files are bundled and no excluded dev files exist
  const zipBuf = fs.readFileSync(zipPath);
  assert.ok(zipBuf.length > 50000, "ZIP buffer too small");

  // Simple ZIP entry name extractor from Central Directory
  const zipEntries = [];
  let offset = 0;
  while (offset < zipBuf.length - 4) {
    if (zipBuf.readUInt32LE(offset) === 0x02014b50) {
      const nameLen = zipBuf.readUInt16LE(offset + 28);
      const extraLen = zipBuf.readUInt16LE(offset + 30);
      const commentLen = zipBuf.readUInt16LE(offset + 32);
      const name = zipBuf.subarray(offset + 46, offset + 46 + nameLen).toString("utf8");
      zipEntries.push(name);
      offset += 46 + nameLen + extraLen + commentLen;
    } else {
      offset++;
    }
  }

  assert.ok(zipEntries.length >= 200, `Expected at least 200 entries in ZIP, found ${zipEntries.length}`);
  const zipSet = new Set(zipEntries);

  // Assert toolbar PNGs and registry.json are inside ZIP
  assert.ok(zipSet.has("assets/toolbar/registry.json"), "registry.json must be in ZIP");
  for (const [titleId, tObj] of Object.entries(reg.titles)) {
    for (const [sz, relP] of Object.entries(tObj.files)) {
      assert.ok(zipSet.has(relP), `Toolbar icon ${relP} missing from ZIP package`);
    }
  }
  for (const [rarity, fObj] of Object.entries(reg.rarityFallbacks)) {
    for (const [sz, relP] of Object.entries(fObj)) {
      assert.ok(zipSet.has(relP), `Fallback icon ${relP} missing from ZIP package`);
    }
  }

  // Assert NO excluded directories inside ZIP
  for (const entry of zipEntries) {
    assert.ok(!entry.startsWith("scripts/"), `scripts/ found in release ZIP: ${entry}`);
    assert.ok(!entry.startsWith("node_modules/"), `node_modules/ found in release ZIP: ${entry}`);
    assert.ok(!entry.startsWith("tests/"), `tests/ found in release ZIP: ${entry}`);
    assert.ok(!entry.startsWith("preview/"), `preview/ found in release ZIP: ${entry}`);
    assert.ok(!entry.startsWith("scratch/"), `scratch/ found in release ZIP: ${entry}`);
    assert.ok(!entry.startsWith("_backup_"), `_backup_ found in release ZIP: ${entry}`);
    assert.ok(entry !== "package.json", `Dev package.json found in release ZIP`);
    assert.ok(entry !== "package-lock.json", `Dev package-lock.json found in release ZIP`);
  }

  console.log(`  [PASS] All paths in registry.json exist on disk and inside release ZIP (${zipEntries.length} package files). No dev folders in ZIP.`);
}

// ----------------------------------------------------------------------------
// TEST 9: MEMOIZATION & BACKWARD COMPATIBILITY
// ----------------------------------------------------------------------------
async function runTest9() {
  console.log("\n[Test 9] State Memoization & Backward Compatibility with Legacy Storage:");
  const { mockContext, store, actionCalls } = await createMockEnvironment();
  const { refreshBrowserActionAppearance, getDefaultStats } = mockContext;

  store.stats = {
    ...getDefaultStats(),
    equippedTitle: "outer_disciple",
    unlockedTitles: ["outer_disciple"]
  };
  store.settings = { activeThemeId: "cultivation" };

  await refreshBrowserActionAppearance();
  const setIconCallsBefore = actionCalls.setIcon.length;
  const setTitleCallsBefore = actionCalls.setTitle.length;

  // Identical call -> memoized, no redundant calls
  await refreshBrowserActionAppearance();
  assert.strictEqual(actionCalls.setIcon.length, setIconCallsBefore, "Memoized call must not invoke setIcon again");
  assert.strictEqual(actionCalls.setTitle.length, setTitleCallsBefore, "Memoized call must not invoke setTitle again");

  // Simulation of legacy schemas
  store.savedNovels = { "n-1": { novelName: "CD", chapter: "1" } };
  delete store.stats;
  delete store.settings;
  let threw = false;
  try {
    await refreshBrowserActionAppearance();
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, false, "Legacy v1.0 storage must execute without error");

  store.stats = { totalChaptersRead: 45, streakDays: 3 };
  threw = false;
  try {
    await refreshBrowserActionAppearance();
  } catch {
    threw = true;
  }
  assert.strictEqual(threw, false, "Legacy v3.0 storage must execute without error");

  console.log("  [PASS] Memoization prevents redundant chrome.action invocations and legacy storage backward compatibility verified.");
}

// ----------------------------------------------------------------------------
// MAIN EXECUTION
// ----------------------------------------------------------------------------
(async () => {
  await runTest1();
  await runTest2();
  await runTest3();
  await runTest4();
  await runTest5();
  await runTest6();
  await runTest7();
  await runTest8();
  await runTest9();
  console.log("\n>>> ALL V9 TOOLBAR ICON & APPEARANCE TESTS PASSED 100%! <<<");
})().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
