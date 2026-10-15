const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ -1;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  chunk.writeInt32BE(crc32(chunk.subarray(4, 8 + len)), 8 + len);
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
  let src = 0;
  let dst = 0;
  for (let y = 0; y < height; y++) {
    scanlines[dst++] = 0;
    rgbaBuffer.copy(scanlines, dst, src, src + width * 4);
    dst += width * 4;
    src += width * 4;
  }

  const idat = makeChunk("IDAT", zlib.deflateSync(scanlines));
  const iend = makeChunk("IEND", Buffer.alloc(0));
  return Buffer.concat([sig, makeChunk("IHDR", ihdr), idat, iend]);
}

// Signed distance functions for pixel rendering
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

function sdRoundedBox(px, py, bx, by, r) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax, pay = py - ay;
  const bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h);
}

function renderBaseIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const cornerR = size * 0.23;
  const halfBox = size / 2 - 0.5;

  // Colors: Cultivation default [sky-500, indigo-500, pink-500]
  const c0 = [14, 165, 233];
  const c1 = [99, 102, 241];
  const c2 = [236, 72, 153];

  const leftX = size * 0.29;
  const rightX = size * 0.71;
  const topY = size * 0.27;
  const botY = size * 0.73;
  const nLineWidth = Math.max(2, size * 0.13);
  const nRadius = nLineWidth / 2;

  // Super-sampling 2x2
  const subSamples = 2;
  const invSub = 1 / subSamples;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let rAcc = 0, gAcc = 0, bAcc = 0, aAcc = 0;

      for (let sy = 0; sy < subSamples; sy++) {
        for (let sx = 0; sx < subSamples; sx++) {
          const px = x + (sx + 0.5) * invSub;
          const py = y + (sy + 0.5) * invSub;

          // Box distance
          const dBox = sdRoundedBox(px - cx, py - cy, halfBox, halfBox, cornerR);
          const boxAlpha = smoothstep(0.5, -0.5, dBox);

          if (boxAlpha <= 0) continue;

          // Gradient across diagonal
          const tDiag = clamp((px + py) / (size * 2), 0, 1);
          let bgR, bgG, bgB;
          if (tDiag < 0.55) {
            const f = tDiag / 0.55;
            bgR = lerp(c0[0], c1[0], f);
            bgG = lerp(c0[1], c1[1], f);
            bgB = lerp(c0[2], c1[2], f);
          } else {
            const f = (tDiag - 0.55) / 0.45;
            bgR = lerp(c1[0], c2[0], f);
            bgG = lerp(c1[1], c2[1], f);
            bgB = lerp(c1[2], c2[2], f);
          }

          // Subtle inner border
          const inset = Math.max(1, size * 0.055);
          const dBorder = Math.abs(sdRoundedBox(px - cx, py - cy, halfBox - inset, halfBox - inset, cornerR * 0.82));
          if (dBorder < 0.8) {
            const borderAlpha = smoothstep(0.8, 0, dBorder) * 0.35;
            bgR = lerp(bgR, 255, borderAlpha);
            bgG = lerp(bgG, 255, borderAlpha);
            bgB = lerp(bgB, 255, borderAlpha);
          }

          // Letter 'N' geometry (3 segments: left, diag, right)
          const dS1 = sdSegment(px, py, leftX, botY, leftX, topY) - nRadius;
          const dS2 = sdSegment(px, py, leftX, topY, rightX, botY) - nRadius;
          const dS3 = sdSegment(px, py, rightX, botY, rightX, topY) - nRadius;
          const dN = Math.min(dS1, dS2, dS3);
          const nAlpha = smoothstep(0.5, -0.5, dN);

          let finalR = bgR;
          let finalG = bgG;
          let finalB = bgB;
          if (nAlpha > 0) {
            // White to light-indigo gradient on N
            const tN = clamp((py - topY) / (botY - topY), 0, 1);
            const nR = lerp(255, 224, tN);
            const nG = lerp(255, 231, tN);
            const nB = lerp(255, 255, tN);
            finalR = lerp(finalR, nR, nAlpha);
            finalG = lerp(finalG, nG, nAlpha);
            finalB = lerp(finalB, nB, nAlpha);
          }

          rAcc += finalR * boxAlpha;
          gAcc += finalG * boxAlpha;
          bAcc += finalB * boxAlpha;
          aAcc += boxAlpha * 255;
        }
      }

      const count = subSamples * subSamples;
      const idx = (y * size + x) * 4;
      const alpha = aAcc / count;
      buf[idx] = clamp(Math.round(rAcc / count), 0, 255);
      buf[idx + 1] = clamp(Math.round(gAcc / count), 0, 255);
      buf[idx + 2] = clamp(Math.round(bAcc / count), 0, 255);
      buf[idx + 3] = clamp(Math.round(alpha), 0, 255);
    }
  }

  return buf;
}

const assetsDir = path.join(__dirname, "../assets");
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

for (const sz of [16, 32, 48, 128]) {
  const rgba = renderBaseIcon(sz);
  const png = encodePNG(sz, sz, rgba);
  const outPath = path.join(assetsDir, `icon${sz}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${outPath} (${png.length} bytes)`);
}
