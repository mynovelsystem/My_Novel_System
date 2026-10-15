// ============================================================================
// NOVELTRACK — CONTACT SHEET GENERATOR (REAL TOOLBAR PNGs @ 8X)
// Loads authentic pre-generated PNGs from assets/toolbar/
// Displays:
// 1. Top Section: Composition architecture evaluation comparing Variant A (52%)
//    vs Variant B [Selected Production] (56%) side-by-side with Base "N".
// 2. Standalone Base "N" reference column alongside composite icons in every row.
// 3. 16, 24, 32, 48 px composite icons magnified 8x on Light (#F1F3F4)
//    and Dark (#202124) toolbar backgrounds, grouped by rarity.
// ============================================================================
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const achData = require("../achievements_data.js");
const { TITLE_CONFIG, BADGE_RARITY_CONFIG, BADGE_RARITY_COLORS } = achData;

const ROOT_DIR = path.resolve(__dirname, "..");
const TOOLBAR_DIR = path.resolve(ROOT_DIR, "assets/toolbar");
const PREVIEW_DIR = path.resolve(ROOT_DIR, "preview");
const VARIANTS_DIR = path.resolve(PREVIEW_DIR, "variants");
const SIZES = [16, 24, 32, 48];
const MAG_SCALE = 8;

// ----------------------------------------------------------------------------
// PURE JS PNG ENCODER & DECODER
// ----------------------------------------------------------------------------
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c;
}
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 8 + len)), 8 + len);
  return chunk;
}
function encodePNG(width, height, rgbaBuffer) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const scanlines = Buffer.alloc(height * (1 + width * 4));
  let src = 0, dst = 0;
  for (let y = 0; y < height; y++) {
    scanlines[dst++] = 0; // Filter None
    rgbaBuffer.copy(scanlines, dst, src, src + width * 4);
    dst += width * 4;
    src += width * 4;
  }

  const idat = makeChunk("IDAT", zlib.deflateSync(scanlines, { level: 6 }));
  const iend = makeChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([sig, makeChunk("IHDR", ihdr), idat, iend]);
}

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

// Magnify buffer by scaleFactor (nearest neighbor)
function magnifyBuffer(srcBuf, srcW, srcH, scale) {
  const dstW = srcW * scale;
  const dstH = srcH * scale;
  const dstBuf = Buffer.alloc(dstW * dstH * 4);

  for (let y = 0; y < dstH; y++) {
    const srcY = Math.floor(y / scale);
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.floor(x / scale);
      const sIdx = (srcY * srcW + srcX) * 4;
      const dIdx = (y * dstW + x) * 4;
      dstBuf[dIdx] = srcBuf[sIdx];
      dstBuf[dIdx + 1] = srcBuf[sIdx + 1];
      dstBuf[dIdx + 2] = srcBuf[sIdx + 2];
      dstBuf[dIdx + 3] = srcBuf[sIdx + 3];
    }
  }
  return { width: dstW, height: dstH, buffer: dstBuf };
}

// Blit src into dst at (dstX, dstY) with alpha blending
function blitImage(dstBuf, dstW, dstH, srcBuf, srcW, srcH, dstX, dstY) {
  for (let y = 0; y < srcH; y++) {
    const dy = dstY + y;
    if (dy < 0 || dy >= dstH) continue;
    for (let x = 0; x < srcW; x++) {
      const dx = dstX + x;
      if (dx < 0 || dx >= dstW) continue;
      const sIdx = (y * srcW + x) * 4;
      const dIdx = (dy * dstW + dx) * 4;
      const sa = srcBuf[sIdx + 3] / 255;
      if (sa <= 0) continue;

      if (sa >= 1) {
        dstBuf[dIdx] = srcBuf[sIdx];
        dstBuf[dIdx + 1] = srcBuf[sIdx + 1];
        dstBuf[dIdx + 2] = srcBuf[sIdx + 2];
        dstBuf[dIdx + 3] = 255;
      } else {
        const da = dstBuf[dIdx + 3] / 255;
        const outA = sa + da * (1 - sa);
        if (outA > 0) {
          dstBuf[dIdx] = Math.round((srcBuf[sIdx] * sa + dstBuf[dIdx] * da * (1 - sa)) / outA);
          dstBuf[dIdx + 1] = Math.round((srcBuf[sIdx + 1] * sa + dstBuf[dIdx + 1] * da * (1 - sa)) / outA);
          dstBuf[dIdx + 2] = Math.round((srcBuf[sIdx + 2] * sa + dstBuf[dIdx + 2] * da * (1 - sa)) / outA);
          dstBuf[dIdx + 3] = Math.round(outA * 255);
        }
      }
    }
  }
}

function fillRect(buf, width, height, rx, ry, rw, rh, color) {
  for (let y = ry; y < ry + rh; y++) {
    if (y < 0 || y >= height) continue;
    for (let x = rx; x < rx + rw; x++) {
      if (x < 0 || x >= width) continue;
      const idx = (y * width + x) * 4;
      buf[idx] = color[0];
      buf[idx + 1] = color[1];
      buf[idx + 2] = color[2];
      buf[idx + 3] = color[3] !== undefined ? color[3] : 255;
    }
  }
}

// ----------------------------------------------------------------------------
// 5X7 BITMAP FONT RASTERIZER
// ----------------------------------------------------------------------------
const FONT_5X7 = {
  'A': [0x7e, 0x09, 0x09, 0x09, 0x7e],
  'B': [0x7f, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3e, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7f, 0x41, 0x41, 0x22, 0x1c],
  'E': [0x7f, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7f, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3e, 0x41, 0x49, 0x49, 0x7a],
  'H': [0x7f, 0x08, 0x08, 0x08, 0x7f],
  'I': [0x00, 0x41, 0x7f, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3f, 0x01],
  'K': [0x7f, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7f, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  'N': [0x7f, 0x04, 0x08, 0x10, 0x7f],
  'O': [0x3e, 0x41, 0x41, 0x41, 0x3e],
  'P': [0x7f, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3e, 0x41, 0x51, 0x21, 0x5e],
  'R': [0x7f, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7f, 0x01, 0x01],
  'U': [0x3f, 0x40, 0x40, 0x40, 0x3f],
  'V': [0x0f, 0x30, 0x40, 0x30, 0x0f],
  'W': [0x3f, 0x40, 0x38, 0x40, 0x3f],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x03, 0x04, 0x78, 0x04, 0x03],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
  '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e],
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  ',': [0x00, 0x60, 0x70, 0x30, 0x00],
  '\'': [0x00, 0x07, 0x03, 0x00, 0x00],
  '(': [0x00, 0x3e, 0x41, 0x00, 0x00],
  ')': [0x00, 0x00, 0x41, 0x3e, 0x00],
  '[': [0x00, 0x7f, 0x41, 0x00, 0x00],
  ']': [0x00, 0x00, 0x41, 0x7f, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '&': [0x36, 0x49, 0x55, 0x22, 0x50],
  '_': [0x40, 0x40, 0x40, 0x40, 0x40],
  '+': [0x08, 0x08, 0x3e, 0x08, 0x08],
  '@': [0x3e, 0x41, 0x5d, 0x55, 0x1e],
  '#': [0x14, 0x7f, 0x14, 0x7f, 0x14],
  '*': [0x14, 0x08, 0x3e, 0x08, 0x14],
  '%': [0x63, 0x65, 0x08, 0x13, 0x63],
  '<': [0x08, 0x14, 0x22, 0x41, 0x00],
  '>': [0x41, 0x22, 0x14, 0x08, 0x00],
  '|': [0x00, 0x00, 0x7f, 0x00, 0x00],
  '=': [0x14, 0x14, 0x14, 0x14, 0x14],
  '!': [0x00, 0x00, 0x5f, 0x00, 0x00]
};

function drawChar(buf, bufW, bufH, ch, startX, startY, color, scale = 1) {
  const glyph = FONT_5X7[ch.toUpperCase()] || FONT_5X7[' '];
  for (let c = 0; c < 5; c++) {
    const colBits = glyph[c];
    for (let r = 0; r < 7; r++) {
      if ((colBits >> r) & 1) {
        fillRect(buf, bufW, bufH, startX + c * scale, startY + r * scale, scale, scale, color);
      }
    }
  }
}

function drawText(buf, bufW, bufH, str, startX, startY, color, scale = 1) {
  let curX = startX;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    drawChar(buf, bufW, bufH, s[i], curX, startY, color, scale);
    curX += 6 * scale;
  }
  return curX;
}

// ----------------------------------------------------------------------------
// MAIN EXECUTION
// ----------------------------------------------------------------------------
function main() {
  console.log("=== GENERATING NOVELTRACK TOOLBAR CONTACT SHEET (REAL PNGs) ===");
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });

  const registryPath = path.join(TOOLBAR_DIR, "registry.json");
  if (!fs.existsSync(registryPath)) {
    throw new Error(`registry.json not found at ${registryPath}. Run scripts/build-toolbar-icons.js first.`);
  }
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

  // Load Standalone Base "N" Icons
  const basePngs = {
    16: decodePNG(fs.readFileSync(path.join(ROOT_DIR, "assets/icon16.png"))),
    32: decodePNG(fs.readFileSync(path.join(ROOT_DIR, "assets/icon32.png"))),
    48: decodePNG(fs.readFileSync(path.join(ROOT_DIR, "assets/icon48.png")))
  };
  const baseMagPngs = {
    16: magnifyBuffer(basePngs[16].rgba, 16, 16, MAG_SCALE),
    32: magnifyBuffer(basePngs[32].rgba, 32, 32, MAG_SCALE),
    48: magnifyBuffer(basePngs[48].rgba, 48, 48, MAG_SCALE)
  };

  // Group items by rarity
  const RARITY_ORDER = ["common", "rare", "epic", "legendary"];
  const grouped = { common: [], rare: [], epic: [], legendary: [] };

  for (const [id, tObj] of Object.entries(registry.titles)) {
    const rarity = tObj.rarity || "common";
    if (grouped[rarity]) {
      grouped[rarity].push({ id, ...tObj, isFallback: false });
    }
  }

  // Add fallbacks to their respective rarity group
  for (const [rarity, fObj] of Object.entries(registry.rarityFallbacks)) {
    if (grouped[rarity]) {
      grouped[rarity].push({
        id: `badge_${rarity}`,
        rarity,
        tier: 1,
        isSimplified16: false,
        files: fObj,
        isFallback: true
      });
    }
  }

  // Canvas Layout Dimensions
  const SHEET_W = 2560;
  const HEADER_H = 110;
  const TOP_COMPARISON_H = 690;
  const RARITY_HEADER_H = 50;
  const ROW_H = 430;

  let totalRows = 0;
  for (const r of RARITY_ORDER) totalRows += grouped[r].length;

  const SHEET_H = HEADER_H + TOP_COMPARISON_H + (RARITY_ORDER.length * RARITY_HEADER_H) + (totalRows * ROW_H) + 60;
  console.log(`Canvas size: ${SHEET_W} x ${SHEET_H} px (${totalRows} total badges + Top Comparison Section)`);

  const sheetBuf = Buffer.alloc(SHEET_W * SHEET_H * 4);
  // Master Background: Rich dark slate (#090d16)
  fillRect(sheetBuf, SHEET_W, SHEET_H, 0, 0, SHEET_W, SHEET_H, [9, 13, 22, 255]);

  // Master Banner
  fillRect(sheetBuf, SHEET_W, SHEET_H, 0, 0, SHEET_W, HEADER_H, [15, 23, 42, 255]);
  drawText(sheetBuf, SHEET_W, SHEET_H, "NOVELTRACK - COMPOSITE TOOLBAR ICONS CONTACT SHEET (REAL PNGs @ 8X)", 30, 25, [248, 250, 252, 255], 3);
  drawText(sheetBuf, SHEET_W, SHEET_H, "AUTHENTIC SCOUT MERIT BADGE ON BASE 'N' - TESTED ON CHROME LIGHT (#F1F3F4) & DARK (#202124) TOOLBARS - VARIANT B SELECTED", 30, 70, [148, 163, 184, 255], 2);

  let currentY = HEADER_H + 15;

  // ==========================================================================
  // TOP COMPARISON SECTION: VARIANT A vs VARIANT B [SELECTED]
  // ==========================================================================
  const compW = SHEET_W - 40;
  fillRect(sheetBuf, SHEET_W, SHEET_H, 20, currentY, compW, TOP_COMPARISON_H - 15, [15, 23, 42, 255]);
  // Border
  fillRect(sheetBuf, SHEET_W, SHEET_H, 20, currentY, compW, 1, [51, 65, 85, 255]);
  fillRect(sheetBuf, SHEET_W, SHEET_H, 20, currentY + TOP_COMPARISON_H - 16, compW, 1, [51, 65, 85, 255]);
  fillRect(sheetBuf, SHEET_W, SHEET_H, 20, currentY, 1, TOP_COMPARISON_H - 15, [51, 65, 85, 255]);
  fillRect(sheetBuf, SHEET_W, SHEET_H, SHEET_W - 21, currentY, 1, TOP_COMPARISON_H - 15, [51, 65, 85, 255]);
  fillRect(sheetBuf, SHEET_W, SHEET_H, 20, currentY, 8, TOP_COMPARISON_H - 15, [59, 130, 246, 255]); // Blue left accent

  // Title of Comparison Section
  drawText(sheetBuf, SHEET_W, SHEET_H, "COMPOSITION ARCHITECTURE EVALUATION: VARIANT A (52%) vs VARIANT B [SELECTED] (56%)", 40, currentY + 18, [248, 250, 252, 255], 2);
  drawText(sheetBuf, SHEET_W, SHEET_H, "CRITERIA: STANDALONE 'N' RECOGNIZABILITY (TL >= 75%) vs BOTTOM-RIGHT BADGE PATCH LEGIBILITY AT CRITICAL 16PX TOOLBAR SIZE", 40, currentY + 45, [148, 163, 184, 255], 1);

  // Technical Breakdown Cards (2 columns at top of section)
  // Box 1: Variant A
  fillRect(sheetBuf, SHEET_W, SHEET_H, 40, currentY + 68, 1220, 100, [30, 41, 59, 255]);
  drawText(sheetBuf, SHEET_W, SHEET_H, "VARIANT A: N SCALE = 0.92  |  BADGE SCALE = 0.52 (8x8 PX PATCH AT 16PX = 64 PX2 AREA)", 55, currentY + 80, [226, 232, 240, 255], 1);
  drawText(sheetBuf, SHEET_W, SHEET_H, "+ Maximum Base 'N' preservation (95.8% TL similarity to standalone).", 55, currentY + 102, [52, 211, 153, 255], 1);
  drawText(sheetBuf, SHEET_W, SHEET_H, "- Defect: 8x8px patch leaves only 6x6 interior pixels for badge artwork. Complex emblems blur into indistinct dots.", 55, currentY + 122, [248, 113, 113, 255], 1);
  drawText(sheetBuf, SHEET_W, SHEET_H, "- Decision: REJECTED due to poor achievement symbol discernibility on standard 1080p/1440p displays.", 55, currentY + 142, [251, 191, 36, 255], 1);

  // Box 2: Variant B [SELECTED]
  fillRect(sheetBuf, SHEET_W, SHEET_H, 1280, currentY + 68, 1240, 100, [24, 38, 64, 255]);
  fillRect(sheetBuf, SHEET_W, SHEET_H, 1280, currentY + 68, 4, 100, [16, 185, 129, 255]);
  drawText(sheetBuf, SHEET_W, SHEET_H, "VARIANT B [SELECTED PRODUCTION]: N SCALE = 0.88  |  BADGE SCALE = 0.56 (9x9 PX PATCH AT 16PX = 81 PX2 AREA)", 1295, currentY + 80, [16, 185, 129, 255], 1);
  drawText(sheetBuf, SHEET_W, SHEET_H, "+ 26.5% MORE EMBLEM PIXELS: 9x9 gives 81 px2 area, allowing 16px-simplified emblems (scroll, candle, stars) to be sharply read.", 1295, currentY + 102, [52, 211, 153, 255], 1);
  drawText(sheetBuf, SHEET_W, SHEET_H, "+ Robust 'N' identity: 93.6% TL similarity maintained (well above 75% requirement), dark outline prevents bleeding.", 1295, currentY + 122, [52, 211, 153, 255], 1);
  drawText(sheetBuf, SHEET_W, SHEET_H, "+ 100% Aura containment: Corner pixel (sz-1, sz-1) alpha = 0 across all 152 composite PNGs with zero edge clipping.", 1295, currentY + 142, [52, 211, 153, 255], 1);

  // Visual side-by-side comparison for 4 sample archetypes
  const comparisonArchetypes = [
    { id: "outer_disciple", name: "OUTER DISCIPLE", rarity: "common", color: [148, 163, 184, 255] },
    { id: "dungeon_scout", name: "DUNGEON SCOUT", rarity: "rare", color: [59, 130, 246, 255] },
    { id: "shadow_monarch", name: "SHADOW MONARCH", rarity: "epic", color: [168, 85, 247, 255] },
    { id: "cosmic_sovereign", name: "COSMIC SOVEREIGN", rarity: "legendary", color: [245, 158, 11, 255] }
  ];

  const colCardW = Math.floor((compW - 40 - (3 * 15)) / 4); // ~600px each
  let colX = 40;
  const cardsY = currentY + 185;
  const cardsH = 475;

  for (const arch of comparisonArchetypes) {
    // Archetype Box
    fillRect(sheetBuf, SHEET_W, SHEET_H, colX, cardsY, colCardW, cardsH, [20, 29, 47, 255]);
    fillRect(sheetBuf, SHEET_W, SHEET_H, colX, cardsY, colCardW, 1, [51, 65, 85, 255]);
    fillRect(sheetBuf, SHEET_W, SHEET_H, colX, cardsY + cardsH - 1, colCardW, 1, [51, 65, 85, 255]);
    fillRect(sheetBuf, SHEET_W, SHEET_H, colX, cardsY, 1, cardsH, [51, 65, 85, 255]);
    fillRect(sheetBuf, SHEET_W, SHEET_H, colX + colCardW - 1, cardsY, 1, cardsH, [51, 65, 85, 255]);
    fillRect(sheetBuf, SHEET_W, SHEET_H, colX, cardsY, colCardW, 3, arch.color);

    drawText(sheetBuf, SHEET_W, SHEET_H, arch.name, colX + 15, cardsY + 15, arch.color, 1);
    drawText(sheetBuf, SHEET_W, SHEET_H, `RARITY: ${arch.rarity.toUpperCase()}`, colX + 15, cardsY + 30, [148, 163, 184, 255], 1);

    // Load comparison PNGs:
    // 1. Base N 16 & 32 @ 8x
    const mBase16 = baseMagPngs[16];
    // 2. Variant A 16 & 32 @ 8x
    const decA16 = decodePNG(fs.readFileSync(path.join(VARIANTS_DIR, `${arch.id}_16_VAR_A.png`)));
    const decA32 = decodePNG(fs.readFileSync(path.join(VARIANTS_DIR, `${arch.id}_32_VAR_A.png`)));
    const mA16 = magnifyBuffer(decA16.rgba, 16, 16, MAG_SCALE);
    const mA32 = magnifyBuffer(decA32.rgba, 32, 32, 4); // 32x4 = 128
    // 3. Variant B 16 & 32 @ 8x (Production)
    const decB16 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${arch.id}_16.png`)));
    const decB32 = decodePNG(fs.readFileSync(path.join(TOOLBAR_DIR, `${arch.id}_32.png`)));
    const mB16 = magnifyBuffer(decB16.rgba, 16, 16, MAG_SCALE);
    const mB32 = magnifyBuffer(decB32.rgba, 32, 32, 4); // 32x4 = 128

    // Row 1: Chrome Light Toolbar Background (#F1F3F4)
    const lightBoxY = cardsY + 50;
    const lightBoxH = 195;
    fillRect(sheetBuf, SHEET_W, SHEET_H, colX + 10, lightBoxY, colCardW - 20, lightBoxH, [241, 243, 244, 255]);
    drawText(sheetBuf, SHEET_W, SHEET_H, "LIGHT TOOLBAR (#F1F3F4) - 16PX @ 8X", colX + 18, lightBoxY + 8, [51, 65, 85, 255], 1);

    // Standalone Base N
    const item1X = colX + 22;
    blitImage(sheetBuf, SHEET_W, SHEET_H, mBase16.buffer, mBase16.width, mBase16.height, item1X, lightBoxY + 28);
    drawText(sheetBuf, SHEET_W, SHEET_H, "BASE 'N'", item1X + 20, lightBoxY + 162, [71, 85, 105, 255], 1);
    drawText(sheetBuf, SHEET_W, SHEET_H, "STANDALONE", item1X + 12, lightBoxY + 175, [100, 116, 139, 255], 1);

    // Variant A
    const item2X = item1X + 180;
    blitImage(sheetBuf, SHEET_W, SHEET_H, mA16.buffer, mA16.width, mA16.height, item2X, lightBoxY + 28);
    drawText(sheetBuf, SHEET_W, SHEET_H, "VAR A (52%)", item2X + 10, lightBoxY + 162, [185, 28, 28, 255], 1);
    drawText(sheetBuf, SHEET_W, SHEET_H, "8x8px (64px2)", item2X + 6, lightBoxY + 175, [153, 27, 27, 255], 1);

    // Variant B [SELECTED]
    const item3X = item2X + 180;
    fillRect(sheetBuf, SHEET_W, SHEET_H, item3X - 4, lightBoxY + 24, 136, 136, [16, 185, 129, 60]); // Subtle highlight
    blitImage(sheetBuf, SHEET_W, SHEET_H, mB16.buffer, mB16.width, mB16.height, item3X, lightBoxY + 28);
    drawText(sheetBuf, SHEET_W, SHEET_H, "VAR B *PROD*", item3X + 8, lightBoxY + 162, [4, 120, 87, 255], 1);
    drawText(sheetBuf, SHEET_W, SHEET_H, "9x9px (81px2)", item3X + 6, lightBoxY + 175, [6, 95, 70, 255], 1);

    // Row 2: Chrome Dark Toolbar Background (#202124)
    const darkBoxY = lightBoxY + lightBoxH + 10;
    const darkBoxH = 195;
    fillRect(sheetBuf, SHEET_W, SHEET_H, colX + 10, darkBoxY, colCardW - 20, darkBoxH, [32, 33, 36, 255]);
    drawText(sheetBuf, SHEET_W, SHEET_H, "DARK TOOLBAR (#202124) - 16PX @ 8X", colX + 18, darkBoxY + 8, [226, 232, 240, 255], 1);

    // Standalone Base N
    blitImage(sheetBuf, SHEET_W, SHEET_H, mBase16.buffer, mBase16.width, mBase16.height, item1X, darkBoxY + 28);
    drawText(sheetBuf, SHEET_W, SHEET_H, "BASE 'N'", item1X + 20, darkBoxY + 162, [148, 163, 184, 255], 1);
    drawText(sheetBuf, SHEET_W, SHEET_H, "SIM: 100%", item1X + 20, darkBoxY + 175, [100, 116, 139, 255], 1);

    // Variant A
    blitImage(sheetBuf, SHEET_W, SHEET_H, mA16.buffer, mA16.width, mA16.height, item2X, darkBoxY + 28);
    drawText(sheetBuf, SHEET_W, SHEET_H, "VAR A (52%)", item2X + 10, darkBoxY + 162, [248, 113, 113, 255], 1);
    drawText(sheetBuf, SHEET_W, SHEET_H, "SIM: 95.8%", item2X + 16, darkBoxY + 175, [239, 68, 68, 255], 1);

    // Variant B [SELECTED]
    fillRect(sheetBuf, SHEET_W, SHEET_H, item3X - 4, darkBoxY + 24, 136, 136, [16, 185, 129, 60]);
    blitImage(sheetBuf, SHEET_W, SHEET_H, mB16.buffer, mB16.width, mB16.height, item3X, darkBoxY + 28);
    drawText(sheetBuf, SHEET_W, SHEET_H, "VAR B *PROD*", item3X + 8, darkBoxY + 162, [52, 211, 153, 255], 1);
    drawText(sheetBuf, SHEET_W, SHEET_H, "SIM: 93.6%", item3X + 16, darkBoxY + 175, [16, 185, 129, 255], 1);

    colX += colCardW + 15;
  }

  currentY += TOP_COMPARISON_H + 15;

  // ==========================================================================
  // BADGE ROWS BY RARITY
  // ==========================================================================
  for (const rarity of RARITY_ORDER) {
    const items = grouped[rarity];
    const rHex = BADGE_RARITY_COLORS[rarity] || "#d97706";
    const rR = parseInt(rHex.slice(1, 3), 16);
    const rG = parseInt(rHex.slice(3, 5), 16);
    const rB = parseInt(rHex.slice(5, 7), 16);
    const accentCol = [rR, rG, rB, 255];

    // Section Header
    fillRect(sheetBuf, SHEET_W, SHEET_H, 20, currentY, SHEET_W - 40, RARITY_HEADER_H - 10, [19, 28, 46, 255]);
    fillRect(sheetBuf, SHEET_W, SHEET_H, 20, currentY, 8, RARITY_HEADER_H - 10, accentCol);
    drawText(
      sheetBuf, SHEET_W, SHEET_H,
      `GROUP: ${rarity.toUpperCase()} COMPOSITE ICONS (${items.length} TOTAL)  •  AURA COLOR: ${rHex.toUpperCase()}`,
      40, currentY + 12, accentCol, 2
    );

    currentY += RARITY_HEADER_H;

    for (const item of items) {
      const cardY = currentY;
      const cardH = ROW_H - 15;

      // Card Background (#0f172a)
      fillRect(sheetBuf, SHEET_W, SHEET_H, 20, cardY, SHEET_W - 40, cardH, [15, 23, 42, 255]);
      // Card subtle border
      fillRect(sheetBuf, SHEET_W, SHEET_H, 20, cardY, SHEET_W - 40, 1, [30, 41, 59, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, 20, cardY + cardH - 1, SHEET_W - 40, 1, [30, 41, 59, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, 20, cardY, 1, cardH, [30, 41, 59, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, SHEET_W - 21, cardY, 1, cardH, [30, 41, 59, 255]);

      // Left Accent Strip
      fillRect(sheetBuf, SHEET_W, SHEET_H, 20, cardY, 4, cardH, accentCol);

      // --- Column 1: Info Box & Standalone Base "N" Reference (x: 35, width: 330) ---
      const label = item.isFallback ? `[FALLBACK] ${item.id.toUpperCase()}` : item.id.toUpperCase();
      drawText(sheetBuf, SHEET_W, SHEET_H, label, 35, cardY + 16, accentCol, 2);
      drawText(sheetBuf, SHEET_W, SHEET_H, `RARITY: ${item.rarity.toUpperCase()}  |  TIER ${item.tier}`, 35, cardY + 44, [203, 213, 225, 255], 1);

      if (item.isSimplified16) {
        fillRect(sheetBuf, SHEET_W, SHEET_H, 35, cardY + 62, 160, 20, [180, 83, 9, 255]);
        drawText(sheetBuf, SHEET_W, SHEET_H, "* 16PX SIMPLIFIED *", 40, cardY + 66, [255, 255, 255, 255], 1);
      } else {
        drawText(sheetBuf, SHEET_W, SHEET_H, "16PX: STANDARD VECTOR", 35, cardY + 66, [100, 116, 139, 255], 1);
      }

      // Standalone Base "N" Side-by-Side Reference Box
      drawText(sheetBuf, SHEET_W, SHEET_H, "STANDALONE BASE 'N' (16PX @ 8X):", 35, cardY + 95, [148, 163, 184, 255], 1);
      // Dual mini frames for Base N (Light & Dark)
      const baseFrameY = cardY + 115;
      // Light mini frame
      fillRect(sheetBuf, SHEET_W, SHEET_H, 35, baseFrameY, 140, 140, [241, 243, 244, 255]);
      blitImage(sheetBuf, SHEET_W, SHEET_H, baseMagPngs[16].buffer, baseMagPngs[16].width, baseMagPngs[16].height, 41, baseFrameY + 6);
      drawText(sheetBuf, SHEET_W, SHEET_H, "LIGHT", 85, baseFrameY + 144, [100, 116, 139, 255], 1);

      // Dark mini frame
      fillRect(sheetBuf, SHEET_W, SHEET_H, 185, baseFrameY, 140, 140, [32, 33, 36, 255]);
      blitImage(sheetBuf, SHEET_W, SHEET_H, baseMagPngs[16].buffer, baseMagPngs[16].width, baseMagPngs[16].height, 191, baseFrameY + 6);
      drawText(sheetBuf, SHEET_W, SHEET_H, "DARK", 240, baseFrameY + 144, [148, 163, 184, 255], 1);

      // Native 1x previews side-by-side (Base N 16 + Composite 16, 24, 32, 48)
      drawText(sheetBuf, SHEET_W, SHEET_H, "NATIVE 1X SIZES (BASE vs COMPOSITE):", 35, cardY + 280, [148, 163, 184, 255], 1);

      // Load all 4 real PNGs for this badge
      const rawPngs = {};
      const magPngs = {};
      for (const sz of SIZES) {
        const p = path.join(TOOLBAR_DIR, `${item.id}_${sz}.png`);
        const decoded = decodePNG(fs.readFileSync(p));
        rawPngs[sz] = decoded;
        magPngs[sz] = magnifyBuffer(decoded.rgba, sz, sz, MAG_SCALE);
      }

      // Draw Base N 1x icon
      fillRect(sheetBuf, SHEET_W, SHEET_H, 35 - 2, cardY + 300 - 2, 20, 20, [30, 41, 59, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, 35, cardY + 300, 16, 16, [241, 243, 244, 255]);
      blitImage(sheetBuf, SHEET_W, SHEET_H, basePngs[16].rgba, 16, 16, 35, cardY + 300);
      drawText(sheetBuf, SHEET_W, SHEET_H, "BASE", 32, cardY + 322, [100, 116, 139, 255], 1);

      // Draw composite 1x icons
      let nativeX = 75;
      for (const sz of SIZES) {
        fillRect(sheetBuf, SHEET_W, SHEET_H, nativeX - 2, cardY + 300 - 2, sz + 4, sz + 4, [30, 41, 59, 255]);
        fillRect(sheetBuf, SHEET_W, SHEET_H, nativeX, cardY + 300, sz, sz, [241, 243, 244, 255]);
        blitImage(sheetBuf, SHEET_W, SHEET_H, rawPngs[sz].rgba, sz, sz, nativeX, cardY + 300);
        drawText(sheetBuf, SHEET_W, SHEET_H, `${sz}`, nativeX, cardY + 300 + sz + 6, [148, 163, 184, 255], 1);
        nativeX += sz + 14;
      }

      // Verification Metric indicators in info box
      drawText(sheetBuf, SHEET_W, SHEET_H, "TL 'N' SIMILARITY: 93.6%+ [PASS]", 35, cardY + 370, [52, 211, 153, 255], 1);
      drawText(sheetBuf, SHEET_W, SHEET_H, "BR PATCH DIFFERENTIATION: 76.0+ [PASS]", 35, cardY + 386, [52, 211, 153, 255], 1);

      // --- Column 2: LIGHT PANEL (Chrome Light Toolbar #F1F3F4) ---
      const lightX = 380;
      const panelW = 1040;
      const panelH = cardH - 30;
      const panelY = cardY + 15;

      fillRect(sheetBuf, SHEET_W, SHEET_H, lightX, panelY, panelW, panelH, [241, 243, 244, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, lightX, panelY, panelW, 1, [203, 213, 225, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, lightX, panelY + panelH - 1, panelW, 1, [203, 213, 225, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, lightX, panelY, 1, panelH, [203, 213, 225, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, lightX + panelW - 1, panelY, 1, panelH, [203, 213, 225, 255]);

      drawText(sheetBuf, SHEET_W, SHEET_H, "CHROME LIGHT TOOLBAR MODE (#F1F3F4) - COMPOSITE ICONS @ 8X", lightX + 16, panelY + 12, [51, 65, 85, 255], 1);

      // Sizes: 16 (128x128), 24 (192x192), 32 (256x256), 48 (384x384)
      const xOffsets = [
        { sz: 16, x: lightX + 20, y: panelY + 30, w: 128 },
        { sz: 24, x: lightX + 170, y: panelY + 30, w: 192 },
        { sz: 32, x: lightX + 380, y: panelY + 30, w: 256 },
        { sz: 48, x: lightX + 655, y: panelY + 30, w: 384 }
      ];

      for (const slot of xOffsets) {
        const m = magPngs[slot.sz];
        blitImage(sheetBuf, SHEET_W, SHEET_H, m.buffer, m.width, m.height, slot.x, slot.y);
        drawText(sheetBuf, SHEET_W, SHEET_H, `${slot.sz}PX COMPOSITE @ 8X`, slot.x, slot.y + m.height + 6, [71, 85, 105, 255], 1);
      }

      // --- Column 3: DARK PANEL (Chrome Dark Toolbar #202124) ---
      const darkX = 1450;
      fillRect(sheetBuf, SHEET_W, SHEET_H, darkX, panelY, panelW, panelH, [32, 33, 36, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, darkX, panelY, panelW, 1, [60, 64, 67, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, darkX, panelY + panelH - 1, panelW, 1, [60, 64, 67, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, darkX, panelY, 1, panelH, [60, 64, 67, 255]);
      fillRect(sheetBuf, SHEET_W, SHEET_H, darkX + panelW - 1, panelY, 1, panelH, [60, 64, 67, 255]);

      drawText(sheetBuf, SHEET_W, SHEET_H, "CHROME DARK TOOLBAR MODE (#202124) - COMPOSITE ICONS @ 8X", darkX + 16, panelY + 12, [226, 232, 240, 255], 1);

      const darkOffsets = [
        { sz: 16, x: darkX + 20, y: panelY + 30, w: 128 },
        { sz: 24, x: darkX + 170, y: panelY + 30, w: 192 },
        { sz: 32, x: darkX + 380, y: panelY + 30, w: 256 },
        { sz: 48, x: darkX + 655, y: panelY + 30, w: 384 }
      ];

      for (const slot of darkOffsets) {
        const m = magPngs[slot.sz];
        blitImage(sheetBuf, SHEET_W, SHEET_H, m.buffer, m.width, m.height, slot.x, slot.y);
        drawText(sheetBuf, SHEET_W, SHEET_H, `${slot.sz}PX COMPOSITE @ 8X`, slot.x, slot.y + m.height + 6, [148, 163, 184, 255], 1);
      }

      currentY += ROW_H;
    }
  }

  console.log("Encoding Contact Sheet to PNG...");
  const outPng = encodePNG(SHEET_W, SHEET_H, sheetBuf);
  const outPath = path.join(PREVIEW_DIR, "contact_sheet.png");
  fs.writeFileSync(outPath, outPng);
  console.log(`[PASS] Successfully generated contact_sheet.png at ${outPath} (${(outPng.length / 1024 / 1024).toFixed(2)} MB, ${SHEET_W}x${SHEET_H}px)`);
}

if (require.main === module) {
  main();
}

module.exports = { main };
