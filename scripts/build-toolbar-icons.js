// ============================================================================
// NOVELTRACK — TOOLBAR ICON PRE-GENERATOR SCRIPT
// Rasterizes authentic SVG badges into crisp PNGs (16, 24, 32, 48 px)
// with static soft rarity aura for chrome.action.
// ============================================================================
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const os = require("os");

const achData = require("../achievements_data.js");
const { TITLE_CONFIG, BADGE_RARITY_CONFIG, BADGE_RARITY_COLORS } = achData;

const SIZES = [16, 24, 32, 48];
const OUTPUT_DIR = path.resolve(__dirname, "../assets/toolbar");
const BADGES_DIR = path.resolve(__dirname, "../assets/badges");

// Standard Edge / Chrome executable paths on Windows
const BROWSER_CANDIDATES = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];

function findBrowserBinary() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  // Try PATH fallback
  return "msedge.exe";
}

// ----------------------------------------------------------------------------
// 16px LEGIBILITY & SIMPLIFICATION LOGIC
// ----------------------------------------------------------------------------
// Fine micro-details (lines < 2px, tiny dots r < 3, dashes) become illegible at 16px.
// For selected badges, we generate a streamlined variant of the exact same SVG
// (emboldened strokes, larger central emblem, removed micro-noise) exclusively for 16px.
const TITLES_NEEDING_16PX_SIMPLIFICATION = new Set([
  "outer_disciple",
  "scroll_initiate",
  "diligent_reader",
  "body_refiner",
  "meridian_opener",
  "thousand_scrolls",
  "spirit_temperer",
  "pill_refiner",
  "constellation_reader",
  "nano_symbiosis",
  "dungeon_scout"
]);

function getSvgForSize(id, rawSvg, size) {
  if (size !== 16 || !TITLES_NEEDING_16PX_SIMPLIFICATION.has(id)) {
    return rawSvg;
  }

  let s = rawSvg;

  if (id === "outer_disciple") {
    // Replace 4 thin scroll lines with 2 bold readable lines + thicker scroll border
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <rect x="32" y="25" width="36" height="50" rx="4" fill="#fbbf24" stroke="#78350f" stroke-width="3" />
    <line x1="38" y1="39" x2="62" y2="39" stroke="#78350f" stroke-width="4" stroke-linecap="round" />
    <line x1="38" y1="53" x2="62" y2="53" stroke="#78350f" stroke-width="4" stroke-linecap="round" />
  </g>`
    );
  } else if (id === "scroll_initiate") {
    // Embolden the open scroll curves and spine
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <path d="M26 34 C38 28 48 38 50 42 C52 38 62 28 74 34 L74 68 C62 62 52 72 50 68 C48 72 38 62 26 68 Z" fill="#fef08a" stroke="#78350f" stroke-width="3.5" stroke-linejoin="round" />
    <line x1="50" y1="42" x2="50" y2="68" stroke="#78350f" stroke-width="3.5" />
  </g>`
    );
  } else if (id === "meridian_opener") {
    // Solid thick constellation path and larger glowing star nodes (no dashes)
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <polyline points="50,30 62,44 50,56 38,70" stroke="#fef08a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="50" cy="30" r="5.5" fill="#f0fdf4" stroke="#047857" stroke-width="2" />
    <circle cx="62" cy="44" r="5.5" fill="#f0fdf4" stroke="#047857" stroke-width="2" />
    <circle cx="50" cy="56" r="6.5" fill="#fef08a" stroke="#b45309" stroke-width="2" />
    <circle cx="38" cy="70" r="5.5" fill="#f0fdf4" stroke="#047857" stroke-width="2" />
  </g>`
    );
  } else if (id === "constellation_reader") {
    // Bolder constellation stars and connections
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <polyline points="32,46 44,32 58,40 68,28" stroke="#fef08a" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="32" cy="46" r="5" fill="#fef08a" stroke="#7e22ce" stroke-width="1.5" />
    <circle cx="44" cy="32" r="5" fill="#fef08a" stroke="#7e22ce" stroke-width="1.5" />
    <circle cx="58" cy="40" r="5.5" fill="#ffffff" stroke="#7e22ce" stroke-width="1.5" />
    <circle cx="68" cy="28" r="5" fill="#fef08a" stroke="#7e22ce" stroke-width="1.5" />
  </g>`
    );
  } else if (id === "nano_symbiosis") {
    // Thicker circuit nodes and core circle
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <circle cx="50" cy="50" r="18" fill="#0891b2" stroke="#67e8f9" stroke-width="3.5" />
    <circle cx="50" cy="50" r="9" fill="#0e7490" stroke="#fef08a" stroke-width="2.5" />
    <line x1="50" y1="22" x2="50" y2="32" stroke="#67e8f9" stroke-width="4" stroke-linecap="round" />
    <line x1="50" y1="68" x2="50" y2="78" stroke="#67e8f9" stroke-width="4" stroke-linecap="round" />
    <line x1="22" y1="50" x2="32" y2="50" stroke="#67e8f9" stroke-width="4" stroke-linecap="round" />
    <line x1="68" y1="50" x2="78" y2="50" stroke="#67e8f9" stroke-width="4" stroke-linecap="round" />
  </g>`
    );
  } else if (id === "thousand_scrolls") {
    // 2 bold book spines with distinct contrast
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <rect x="28" y="32" width="44" height="15" rx="3" fill="#d97706" stroke="#78350f" stroke-width="2.5" />
    <rect x="26" y="51" width="48" height="17" rx="3" fill="#059669" stroke="#064e3b" stroke-width="2.5" />
    <line x1="33" y1="39" x2="67" y2="39" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round" />
    <line x1="31" y1="59" x2="69" y2="59" stroke="#a7f3d0" stroke-width="2.5" stroke-linecap="round" />
  </g>`
    );
  } else if (id === "diligent_reader") {
    // Large prominent candle flame and candle
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <rect x="42" y="46" width="16" height="28" rx="2" fill="#fef08a" stroke="#78350f" stroke-width="2.5" />
    <path d="M50 26 C44 34 44 42 50 46 C56 42 56 34 50 26 Z" fill="#f59e0b" stroke="#dc2626" stroke-width="2" />
  </g>`
    );
  } else if (id === "body_refiner") {
    // Bolder fist/martial emblem
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <circle cx="50" cy="50" r="17" fill="#ea580c" stroke="#fef08a" stroke-width="3.5" />
    <path d="M42 50 L48 56 L58 44" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>`
    );
  } else if (id === "spirit_temperer") {
    // Bolder crystal sphere with inner glow
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <circle cx="50" cy="50" r="18" fill="#6d28d9" stroke="#c084fc" stroke-width="3.5" />
    <circle cx="45" cy="45" r="5" fill="#f5d0fe" />
  </g>`
    );
  } else if (id === "pill_refiner") {
    // Bolder cauldron silhouette and glowing pill core
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <path d="M32 44 C32 64 68 64 68 44 Z" fill="#047857" stroke="#34d399" stroke-width="3" />
    <circle cx="50" cy="38" r="7" fill="#fbbf24" stroke="#78350f" stroke-width="2" />
  </g>`
    );
  } else if (id === "dungeon_scout") {
    // Bolder dungeon gate
    s = s.replace(
      /<g class="badge-art"[\s\S]*?<\/g>/,
      `<g class="badge-art" filter="url(#badgeShadow)">
    <rect x="34" y="32" width="32" height="40" rx="3" fill="#065f46" stroke="#34d399" stroke-width="3.5" />
    <path d="M42 32 C42 44 58 44 58 32" stroke="#fef08a" stroke-width="3" fill="none" />
  </g>`
    );
  }

  return s;
}

// ----------------------------------------------------------------------------
// COLLECT ALL BADGES TO GENERATE
// ----------------------------------------------------------------------------
function collectBadges() {
  const items = [];

  // 1. All 34 Titles from TITLE_CONFIG
  for (const [id, cfg] of Object.entries(TITLE_CONFIG)) {
    const svgRel = cfg.badge;
    const svgAbs = path.resolve(__dirname, "..", svgRel);
    if (!fs.existsSync(svgAbs)) {
      throw new Error(`SVG badge missing on disk for title '${id}': ${svgAbs}`);
    }
    const rawSvg = fs.readFileSync(svgAbs, "utf8");
    items.push({
      id,
      rarity: cfg.rarity || "common",
      tier: cfg.tier || 1,
      themeId: cfg.themeId || "cultivation",
      isFallback: false,
      rawSvg
    });
  }

  // 2. The 4 Rarity Fallback Badges
  const fallbackRarities = ["common", "rare", "epic", "legendary"];
  for (const rarity of fallbackRarities) {
    const id = `badge_${rarity}`;
    const svgAbs = path.join(BADGES_DIR, `${id}.svg`);
    if (!fs.existsSync(svgAbs)) {
      throw new Error(`Fallback SVG missing on disk: ${svgAbs}`);
    }
    const rawSvg = fs.readFileSync(svgAbs, "utf8");
    items.push({
      id,
      rarity,
      tier: 1,
      themeId: "core",
      isFallback: true,
      rawSvg
    });
  }

  return items;
}

// ----------------------------------------------------------------------------
// BASE "N" ICONS LOADING
// ----------------------------------------------------------------------------
const rootDir = path.resolve(__dirname, "..");
const baseNDataUris = {
  16: `data:image/png;base64,${fs.readFileSync(path.join(rootDir, "assets/icon16.png")).toString("base64")}`,
  32: `data:image/png;base64,${fs.readFileSync(path.join(rootDir, "assets/icon32.png")).toString("base64")}`,
  48: `data:image/png;base64,${fs.readFileSync(path.join(rootDir, "assets/icon48.png")).toString("base64")}`
};

// Representative sample titles for Variant A & B comparison in contact sheet
const COMPARISON_SAMPLE_IDS = ["outer_disciple", "dungeon_scout", "shadow_monarch", "cosmic_sovereign"];
const VARIANTS_DIR = path.resolve(__dirname, "../preview/variants");

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// BUILD BATCH HTML RENDERER PAGE
// ----------------------------------------------------------------------------
function buildBatchHtml(batchItems) {
  const queueJson = JSON.stringify(batchItems);
  const rarityConfigJson = JSON.stringify(BADGE_RARITY_CONFIG);
  const baseNUrisJson = JSON.stringify(baseNDataUris);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:transparent; margin:0; padding:0;">
<script>
  const QUEUE = ${queueJson};
  const RARITY_CONFIG = ${rarityConfigJson};
  const BASE_N_URIS = ${baseNUrisJson};

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image: " + src.slice(0, 40)));
      img.src = src;
    });
  }

  // Reusable canvases to prevent GPU memory build-up in headless Chromium
  const mainCanvas = document.createElement("canvas");
  const mainCtx = mainCanvas.getContext("2d", { willReadFrequently: true });
  mainCtx.imageSmoothingEnabled = true;
  mainCtx.imageSmoothingQuality = "high";

  const silCanvas = document.createElement("canvas");
  const silCtx = silCanvas.getContext("2d", { willReadFrequently: true });

  function renderComposite(item, badgeImg, baseNImgs, variant) {
    const sz = item.size;
    mainCanvas.width = sz;
    mainCanvas.height = sz;
    mainCtx.clearRect(0, 0, sz, sz);

    // Composition specifications:
    // Variant A: badge ~52%, N scaled 92% (8% reduction) anchored top-left
    // Variant B [SELECTED]: badge ~56%, N scaled 88% (12% reduction) anchored top-left
    const isVarA = variant === "A";
    const nScale = isVarA ? 0.92 : 0.88;
    const badgeScale = isVarA ? 0.52 : 0.56;

    // 1. Draw base "N"
    const baseImg = sz === 16 ? baseNImgs[16] : (sz <= 32 ? baseNImgs[32] : baseNImgs[48]);
    const nW = Math.round(sz * nScale);
    const nH = Math.round(sz * nScale);
    mainCtx.drawImage(baseImg, 0, 0, nW, nH);

    // 2. Patch dimensions: anchored bottom-right with 1px margin
    const badgeSize = Math.round(sz * badgeScale);
    const margin = 1;
    const badgeX = sz - badgeSize - margin;
    const badgeY = sz - badgeSize - margin;

    const rCfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;

    // 3. Static soft rarity aura: cast inward towards the 'N'
    // so no aura pixels bleed or clip against canvas edges
    const auraBlur = (sz === 16 ? 1.0 : (sz === 24 ? 1.5 : (sz === 32 ? 2.0 : 2.5))) * (rCfg.blurFactor || 1.0);
    const auraOffset = -Math.round(auraBlur * 1.5);

    mainCtx.save();
    mainCtx.shadowColor = rCfg.aura;
    mainCtx.shadowBlur = auraBlur;
    mainCtx.shadowOffsetX = auraOffset;
    mainCtx.shadowOffsetY = auraOffset;
    mainCtx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
    if (rCfg.passes > 1) {
      mainCtx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
    }
    mainCtx.restore();

    // 4. Dark border ("parche cosido"): 1px semitransparent at 16px, 2px at 32px+
    silCanvas.width = badgeSize;
    silCanvas.height = badgeSize;
    silCtx.clearRect(0, 0, badgeSize, badgeSize);
    silCtx.drawImage(badgeImg, 0, 0, badgeSize, badgeSize);
    silCtx.globalCompositeOperation = "source-in";
    silCtx.fillStyle = "rgba(10, 15, 30, 0.85)";
    silCtx.fillRect(0, 0, badgeSize, badgeSize);
    silCtx.globalCompositeOperation = "source-over";

    const bDist = sz < 32 ? 1 : 2;
    for (let dx = -bDist; dx <= 0; dx++) {
      for (let dy = -bDist; dy <= 0; dy++) {
        if (dx === 0 && dy === 0) continue;
        mainCtx.drawImage(silCanvas, badgeX + dx, badgeY + dy, badgeSize, badgeSize);
      }
    }

    // 5. Authentic Illustrated SVG Badge on top
    mainCtx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);

    // 6. Guarantee zero clipped edge pixels at the outer canvas edge (1px margin)
    mainCtx.clearRect(sz - 1, 0, 1, sz);
    mainCtx.clearRect(0, sz - 1, sz, 1);

    return mainCanvas.toDataURL("image/png");
  }

  function emitData(key, dataUrl) {
    const CHUNK_SIZE = 2000;
    const total = Math.ceil(dataUrl.length / CHUNK_SIZE);
    for (let i = 0; i < total; i++) {
      const part = dataUrl.substr(i * CHUNK_SIZE, CHUNK_SIZE);
      console.log("__CHUNK__:" + key + ":" + i + ":" + total + ":" + part);
    }
  }

  async function run() {
    try {
      const baseNImgs = {
        16: await loadImage(BASE_N_URIS[16]),
        32: await loadImage(BASE_N_URIS[32]),
        48: await loadImage(BASE_N_URIS[48])
      };

      for (let i = 0; i < QUEUE.length; i++) {
        const item = QUEUE[i];
        const badgeImg = await loadImage(item.dataUri);
        // Primary production composite icon: Variant B (56% badge, 88% N)
        const urlB = renderComposite(item, badgeImg, baseNImgs, "B");
        emitData(item.key, urlB);

        // If comparison sample, also render Variant A for the contact sheet
        if (item.isComparisonSample) {
          const urlA = renderComposite(item, badgeImg, baseNImgs, "A");
          emitData(item.key + "_VAR_A", urlA);
          emitData(item.key + "_VAR_B", urlB);
        }

        badgeImg.src = "";
        if (i % 4 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      console.log("__ALL_DONE__");
    } catch (e) {
      console.log("__ERROR__:" + e.message);
    }
  }

  run();
</script>
</body>
</html>`;
}

// ----------------------------------------------------------------------------
// RUN A SINGLE BATCH OF BADGES
// ----------------------------------------------------------------------------
async function runBatch(batchItems, batchIdx, browserBin) {
  const runnerFile = path.resolve(__dirname, `../scratch/toolbar_runner_${batchIdx}.html`);
  fs.mkdirSync(path.dirname(runnerFile), { recursive: true });
  fs.writeFileSync(runnerFile, buildBatchHtml(batchItems), "utf8");

  const scratchTmpDir = path.resolve(__dirname, `../scratch/tmp_edge_batch_${batchIdx}_${Date.now()}`);
  fs.mkdirSync(scratchTmpDir, { recursive: true });

  const completed = {};
  const chunks = {};

  await new Promise((resolve, reject) => {
    let proc = null;

    const cleanup = () => {
      if (proc) {
        try { proc.kill(); } catch {}
        proc = null;
      }
      try { fs.rmSync(scratchTmpDir, { recursive: true, force: true }); } catch {}
      try { fs.unlinkSync(runnerFile); } catch {}
    };

    const args = [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-crash-reporter",
      "--disable-features=RendererCodeIntegrity",
      `--user-data-dir=${scratchTmpDir}`,
      "--enable-logging=stderr",
      `file:///${runnerFile.replace(/\\/g, "/")}`
    ];

    proc = spawn(browserBin, args);

    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.includes("__CHUNK__:")) {
          const match = line.match(/__CHUNK__:([^:]+):(\d+):(\d+):([^\s\r\n]+)/);
          if (match) {
            const [, key, idxStr, totalStr, part] = match;
            const idx = parseInt(idxStr, 10);
            const total = parseInt(totalStr, 10);
            if (!chunks[key]) chunks[key] = { total, parts: {} };
            chunks[key].parts[idx] = part;
            if (Object.keys(chunks[key].parts).length === total) {
              let full = "";
              for (let i = 0; i < total; i++) full += chunks[key].parts[i];
              completed[key] = full;
            }
          }
        } else if (line.includes("__ALL_DONE__")) {
          cleanup();
          resolve();
        } else if (line.includes("__ERROR__:")) {
          cleanup();
          reject(new Error(line));
        }
      }
    });

    proc.on("error", (err) => {
      cleanup();
      reject(new Error(`Failed to spawn browser binary: ${err.message}`));
    });

    proc.on("exit", () => {
      cleanup();
      resolve();
    });

    setTimeout(() => {
      cleanup();
      resolve();
    }, 35000);
  });

  return completed;
}

// ----------------------------------------------------------------------------
// MAIN BUILD EXECUTION
// ----------------------------------------------------------------------------
async function main() {
  console.log("=== BUILDING NOVELTRACK COMPOSITE TOOLBAR ICONS (N + BADGE PATCH) ===\n");
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(VARIANTS_DIR, { recursive: true });

  const badges = collectBadges();
  console.log(`Loaded ${badges.length} badges (34 titles + 4 rarity fallbacks).`);

  const browserBin = findBrowserBinary();
  console.log(`Using rasterizer engine: Microsoft Edge Headless at '${browserBin}'`);

  // Build full generation queue
  const queue = [];
  for (const b of badges) {
    for (const sz of SIZES) {
      const svg = getSvgForSize(b.id, b.rawSvg, sz);
      const b64 = Buffer.from(svg, "utf8").toString("base64");
      const dataUri = `data:image/svg+xml;base64,${b64}`;
      queue.push({
        key: `${b.id}_${sz}`,
        id: b.id,
        size: sz,
        rarity: b.rarity,
        isComparisonSample: COMPARISON_SAMPLE_IDS.includes(b.id),
        dataUri
      });
    }
  }

  console.log(`Total queue: ${queue.length} items. Processing in memory-safe batches...`);

  const BATCH_SIZE = 20;
  const pngResults = {};
  const totalBatches = Math.ceil(queue.length / BATCH_SIZE);

  for (let b = 0; b < totalBatches; b++) {
    const batchItems = queue.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const batchRes = await runBatch(batchItems, b, browserBin);
    Object.assign(pngResults, batchRes);
    console.log(`  - Batch ${b + 1}/${totalBatches}: captured ${Object.keys(batchRes).length}/${batchItems.length} (total so far: ${Object.keys(pngResults).length})`);
  }

  const compositionConfig = {
    selectedVariant: "B",
    description: "NovelTrack 'N' Base + Bottom-Right Illustrated SVG Badge Patch",
    badgeScale: 0.56,
    nScale: 0.88,
    badgeMarginPx: 1,
    darkBorder: {
      color: "rgba(10, 15, 30, 0.85)",
      width16Px: 1,
      width32Px: 2
    },
    aura: {
      inwardOffset: true,
      containedWithinCanvas: true,
      rarityAuraColors: BADGE_RARITY_CONFIG
    }
  };

  const registry = {
    generatedAt: new Date().toISOString(),
    generator: "Headless Microsoft Edge (Chromium Blink/Skia SVG Engine)",
    sizes: SIZES,
    composition: compositionConfig,
    titles: {},
    rarityFallbacks: {},
    baseIcon: {
      16: "assets/icon16.png",
      24: "assets/icon32.png",
      32: "assets/icon32.png",
      48: "assets/icon48.png"
    }
  };

  let productionPngCount = 0;
  let variantAPngCount = 0;

  for (const b of badges) {
    const fileMap = {};
    for (const sz of SIZES) {
      const key = `${b.id}_${sz}`;
      const dataUrl = pngResults[key];
      if (!dataUrl) {
        throw new Error(`Missing PNG data for ${key}`);
      }
      const match = dataUrl.match(/^data:image\/png;base64,(.+)$/);
      if (!match) {
        throw new Error(`Invalid data URL format for ${key}`);
      }
      const buffer = Buffer.from(match[1], "base64");
      const fileName = `${b.id}_${sz}.png`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      fs.writeFileSync(filePath, buffer);
      fileMap[sz] = `assets/toolbar/${fileName}`;
      productionPngCount++;

      // If Variant A was rendered for comparison, save it in preview/variants/
      const varAKey = `${key}_VAR_A`;
      if (pngResults[varAKey]) {
        const matchA = pngResults[varAKey].match(/^data:image\/png;base64,(.+)$/);
        if (matchA) {
          const varAFilePath = path.join(VARIANTS_DIR, `${b.id}_${sz}_VAR_A.png`);
          fs.writeFileSync(varAFilePath, Buffer.from(matchA[1], "base64"));
          variantAPngCount++;
        }
      }
    }

    if (b.isFallback) {
      registry.rarityFallbacks[b.rarity] = fileMap;
    } else {
      registry.titles[b.id] = {
        id: b.id,
        rarity: b.rarity,
        tier: b.tier,
        themeId: b.themeId,
        isSimplified16: TITLES_NEEDING_16PX_SIMPLIFICATION.has(b.id),
        composition: { variant: "B", badgeScale: 0.56, nScale: 0.88 },
        files: fileMap
      };
    }
  }

  const registryPath = path.join(OUTPUT_DIR, "registry.json");
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf8");
  console.log(`Saved registry.json: ${registryPath}`);

  // Summary
  const simplifiedCount = Array.from(TITLES_NEEDING_16PX_SIMPLIFICATION).length;
  console.log(`\n[SUCCESS] Generated:`);
  console.log(`  - 34 Titles x 4 sizes = 136 composite title icons (Variant B)`);
  console.log(`  - 4 Fallbacks x 4 sizes = 16 composite fallback icons (Variant B)`);
  console.log(`  - Total: ${productionPngCount} production PNG icons in assets/toolbar/`);
  console.log(`  - Comparison Variant A icons: ${variantAPngCount} in preview/variants/`);
  console.log(`  - 16px Simplified Badges (${simplifiedCount}): ${Array.from(TITLES_NEEDING_16PX_SIMPLIFICATION).join(", ")}`);
  console.log(`  - Registry written to assets/toolbar/registry.json`);
}


if (require.main === module) {
  main().catch((err) => {
    console.error("FATAL ERROR in build-toolbar-icons:", err);
    process.exit(1);
  });
}

module.exports = {
  main,
  collectBadges,
  getSvgForSize,
  TITLES_NEEDING_16PX_SIMPLIFICATION,
  OUTPUT_DIR,
  SIZES
};
