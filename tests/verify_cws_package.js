// ============================================================================
// VERIFICATION SCRIPT: CWS PUBLICATION ZIP CHECKLIST & PACKAGING
// ============================================================================
const fs = require("fs");
const path = require("path");
const assert = require("assert");

console.log("=== CWS PUBLICATION PACKAGE VERIFICATION ===\n");

const rootDir = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "manifest.json"), "utf8"));

// 1. Check all required production files exist
console.log("[Check 1] Required Production Files:");
const requiredCoreFiles = [
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "i18n.js",
  "achievements_data.js",
  "privacy.html",
  "locales/es.json",
  "locales/en.json",
  "assets/icon16.png",
  "assets/icon32.png",
  "assets/icon48.png",
  "assets/icon128.png"
];

for (const f of requiredCoreFiles) {
  const fp = path.join(rootDir, f);
  assert.ok(fs.existsSync(fp), `Required production file missing: ${f}`);
  const stat = fs.statSync(fp);
  assert.ok(stat.size > 0, `Production file ${f} is empty (0 bytes)`);
}
console.log(`  [PASS] All ${requiredCoreFiles.length} core production files exist and are non-empty.`);

// 2. Check manifest icons exist and match manifest definition
console.log("\n[Check 2] Manifest Icons Integrity:");
assert.ok(manifest.icons, "manifest.icons object must be defined");
for (const [sz, p] of Object.entries(manifest.icons)) {
  const fp = path.join(rootDir, p);
  assert.ok(fs.existsSync(fp), `Manifest icon ${sz} missing at ${p}`);
  const stat = fs.statSync(fp);
  assert.ok(stat.size > 100, `Manifest icon ${p} size suspiciously small: ${stat.size} bytes`);
}
assert.ok(manifest.action && manifest.action.default_icon, "manifest.action.default_icon must be defined");
for (const [sz, p] of Object.entries(manifest.action.default_icon)) {
  const fp = path.join(rootDir, p);
  assert.ok(fs.existsSync(fp), `Action icon ${sz} missing at ${p}`);
}
console.log("  [PASS] All manifest icons (16, 32, 48, 128) verified.");

// 3. Check all 38 SVG Badges exist in assets/badges
console.log("\n[Check 3] Illustrated Badges:");
const badgesDir = path.join(rootDir, "assets/badges");
assert.ok(fs.existsSync(badgesDir), "assets/badges directory must exist");
const badgeFiles = fs.readdirSync(badgesDir).filter((f) => f.endsWith(".svg"));
assert.strictEqual(badgeFiles.length, 38, `Expected exactly 38 badge SVGs, found ${badgeFiles.length}`);
for (const bf of badgeFiles) {
  const content = fs.readFileSync(path.join(badgesDir, bf), "utf8");
  assert.ok(content.includes("<svg"), `Badge ${bf} does not contain valid <svg`);
  assert.ok(content.includes("</svg>"), `Badge ${bf} does not close </svg>`);
}
console.log(`  [PASS] All 38 badge SVGs verified.`);

// 4. Excluded Patterns Check (Ensure dev folders are never bundled)
console.log("\n[Check 4] Excluded Development Artifacts:");
const excludedFolders = [".git", "tests", "preview", "scratch", "node_modules", "scripts", "_backup_"];
for (const ef of excludedFolders) {
  console.log(`  - Excluded from ZIP: ${ef}/`);
}
console.log("  [PASS] Excluded development directories defined and isolated.");

// 5. Zero Dangerous APIs in Production Files
console.log("\n[Check 5] Security Audit for Packaged Production Files:");
const prodCodeFiles = [
  "background.js",
  "content.js",
  "popup.js",
  "i18n.js",
  "achievements_data.js",
  "popup.html",
  "privacy.html"
];
for (const f of prodCodeFiles) {
  const content = fs.readFileSync(path.join(rootDir, f), "utf8");
  assert.strictEqual(/\beval\s*\(/.test(content), false, `eval() detected in ${f}`);
  assert.strictEqual(/new\s+Function\s*\(/.test(content), false, `new Function() detected in ${f}`);
  if (f.endsWith(".html")) {
    const inlineMatches = content.match(/\bon[a-z]+\s*=/gi) || [];
    assert.strictEqual(inlineMatches.length, 0, `Inline event handlers found in ${f}: ${inlineMatches.join(", ")}`);
  }
}
console.log("  [PASS] Zero eval, zero new Function, and zero inline event handlers across all production files.");

// 6. Automated CWS Release Package Builder & Integrity Verification
console.log("\n[Check 6] Release Package Builder & Verification:");
const zlib = require("zlib");

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

function createZipBuffer(files) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(f.path.replace(/\\/g, "/"), "utf8");
    const dataBuf = f.data;
    const deflated = zlib.deflateRawSync(dataBuf);
    const crc = crc32(dataBuf);

    // Local Header (30 bytes)
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4); // version needed
    lh.writeUInt16LE(0, 6);  // bit flag
    lh.writeUInt16LE(8, 8);  // compression (deflate)
    lh.writeUInt16LE(0, 10); // mod time
    lh.writeUInt16LE(0, 12); // mod date
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(deflated.length, 18);
    lh.writeUInt32LE(dataBuf.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28); // extra len

    localChunks.push(lh, nameBuf, deflated);

    // Central Directory Header (46 bytes)
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);  // version made by
    cd.writeUInt16LE(20, 6);  // version needed
    cd.writeUInt16LE(0, 8);   // bit flag
    cd.writeUInt16LE(8, 10);  // compression (deflate)
    cd.writeUInt16LE(0, 12);  // mod time
    cd.writeUInt16LE(0, 14);  // mod date
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(deflated.length, 20);
    cd.writeUInt32LE(dataBuf.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);  // extra len
    cd.writeUInt16LE(0, 32);  // comment len
    cd.writeUInt16LE(0, 34);  // disk start
    cd.writeUInt16LE(0, 36);  // internal attrs
    cd.writeUInt32LE(0, 38);  // external attrs
    cd.writeUInt32LE(offset, 42); // offset of local header

    centralChunks.push(cd, nameBuf);
    offset += lh.length + nameBuf.length + deflated.length;
  }

  const cdBuf = Buffer.concat(centralChunks);
  const cdOffset = offset;
  const cdSize = cdBuf.length;

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);             // disk num
  eocd.writeUInt16LE(0, 6);             // start disk
  eocd.writeUInt16LE(files.length, 8);  // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);            // comment len

  return Buffer.concat([...localChunks, cdBuf, eocd]);
}

// Collect all production files
const packageFiles = [];
function addFileToPackage(relPath) {
  const absPath = path.join(rootDir, relPath);
  assert.ok(fs.existsSync(absPath), `Package file missing: ${relPath}`);
  const data = fs.readFileSync(absPath);
  packageFiles.push({ path: relPath.replace(/\\/g, "/"), data });
}

// 1. Core JS, HTML, JSON
for (const f of requiredCoreFiles) {
  addFileToPackage(f);
}

// 2. All 38 Badges
for (const bf of badgeFiles) {
  addFileToPackage(`assets/badges/${bf}`);
}

// 3. Pre-generated Toolbar PNG Icons and Registry (Paso 3)
const toolbarDir = path.join(rootDir, "assets/toolbar");
assert.ok(fs.existsSync(toolbarDir), "assets/toolbar directory must exist");
const toolbarFiles = fs.readdirSync(toolbarDir).filter((f) => f.endsWith(".png") || f === "registry.json");
assert.ok(toolbarFiles.length >= 153, `Expected at least 153 toolbar files (152 PNGs + registry.json), found ${toolbarFiles.length}`);

for (const tf of toolbarFiles) {
  addFileToPackage(`assets/toolbar/${tf}`);
}

// Verify registry.json integrity and that all referenced files exist in package
const registryContent = JSON.parse(fs.readFileSync(path.join(toolbarDir, "registry.json"), "utf8"));
assert.ok(registryContent.titles, "registry.json must contain titles map");
assert.ok(registryContent.rarityFallbacks, "registry.json must contain rarityFallbacks map");
assert.ok(registryContent.baseIcon, "registry.json must contain baseIcon map");

const packagedPathsSet = new Set(packageFiles.map((p) => p.path));

for (const [titleId, tObj] of Object.entries(registryContent.titles)) {
  for (const [sz, p] of Object.entries(tObj.files)) {
    assert.ok(packagedPathsSet.has(p), `Registry referenced title file missing from package: ${p}`);
  }
}
for (const [rarity, fObj] of Object.entries(registryContent.rarityFallbacks)) {
  for (const [sz, p] of Object.entries(fObj)) {
    assert.ok(packagedPathsSet.has(p), `Registry referenced fallback file missing from package: ${p}`);
  }
}

console.log(`  - Packaged toolbar PNGs: ${toolbarFiles.filter((f) => f.endsWith(".png")).length}`);
console.log(`  - Packaged registry.json: verified`);

// 4. Ensure no excluded files or dev artifacts slipped into package
for (const pf of packageFiles) {
  for (const ef of excludedFolders) {
    assert.ok(!pf.path.startsWith(ef + "/"), `Excluded folder ${ef} found in package: ${pf.path}`);
  }
  assert.ok(!pf.path.endsWith(".md"), `Markdown file should not be in release ZIP: ${pf.path}`);
  assert.ok(!pf.path.includes("test"), `Test file should not be in release ZIP: ${pf.path}`);
  assert.ok(!pf.path.startsWith("scripts/"), `Scripts folder should not be in release ZIP: ${pf.path}`);
  assert.ok(!pf.path.startsWith("node_modules/"), `node_modules should not be in release ZIP: ${pf.path}`);
  assert.ok(pf.path !== "package.json", `Dev package.json should not be in release ZIP: ${pf.path}`);
  assert.ok(pf.path !== "package-lock.json", `Dev package-lock.json should not be in release ZIP: ${pf.path}`);
}

const zipBuffer = createZipBuffer(packageFiles);
const zipOutPath = path.join(rootDir, "novel-chapter-tracker-v4.0.0.zip");
fs.writeFileSync(zipOutPath, zipBuffer);

const uncompressedTotal = packageFiles.reduce((acc, f) => acc + f.data.length, 0);
console.log(`  - Packaged files: ${packageFiles.length}`);
console.log(`  - Uncompressed size: ${(uncompressedTotal / 1024).toFixed(1)} KB`);
console.log(`  - Compressed ZIP size: ${(zipBuffer.length / 1024).toFixed(1)} KB`);
console.log(`  - Output: ${zipOutPath}`);
assert.ok(zipBuffer.length > 50000, "ZIP buffer suspiciously small");
assert.ok(zipBuffer.length < 5000000, "ZIP buffer exceeds reasonable limit");
console.log("  [PASS] Release package built and validated successfully.");

console.log("\n>>> CWS PUBLICATION CHECKLIST VERIFIED 100%! <<<");
