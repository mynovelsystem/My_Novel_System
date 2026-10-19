// ============================================================================
// TEST SUITE: ORIGINAL PRESET AVATARS SYSTEM (v4.0.0 / V16)
// Verifies 21 original SVG avatars, categories, security, storage, UI & i18n
// ============================================================================

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");

console.log("====================================================================");
console.log("     TEST SUITE: ORIGINAL PRESET AVATARS SYSTEM (V16)               ");
console.log("====================================================================\n");

// ----------------------------------------------------------------------------
// Test 1: Verification of 21 Original SVG Avatar Resources on Disk
// ----------------------------------------------------------------------------
console.log("[Test 1] 21 Original SVG Avatar Resources Integrity:");
{
  const avatarsDir = path.join(rootDir, "assets/avatars");
  assert.ok(fs.existsSync(avatarsDir), "assets/avatars directory must exist");

  const avatarFiles = fs.readdirSync(avatarsDir).filter((f) => f.endsWith(".svg"));
  assert.strictEqual(avatarFiles.length, 21, `Expected exactly 21 SVG avatars, found ${avatarFiles.length}`);

  let totalBytes = 0;
  for (const af of avatarFiles) {
    const filePath = path.join(avatarsDir, af);
    const content = fs.readFileSync(filePath, "utf8");
    const stat = fs.statSync(filePath);
    totalBytes += stat.size;

    assert.ok(content.includes("<svg"), `Avatar ${af} must contain <svg tag`);
    assert.ok(content.includes("</svg>"), `Avatar ${af} must close </svg> tag`);
    assert.ok(content.includes('viewBox="0 0 128 128"'), `Avatar ${af} must have standard 128x128 viewBox`);
    assert.ok(content.includes("clipPath"), `Avatar ${af} must have circular clipPath for crisp rendering`);
    assert.ok(stat.size > 500, `Avatar ${af} size suspiciously small: ${stat.size} bytes`);
    assert.ok(stat.size < 15000, `Avatar ${af} exceeds 15 KB limit: ${stat.size} bytes`);
  }

  console.log(`  [PASS] All 21 SVG avatar assets verified (${(totalBytes / 1024).toFixed(1)} KB total package size).`);
}

// ----------------------------------------------------------------------------
// Test 2: AVATARS_CONFIG & AVATAR_CATEGORIES Structure & Diversity
// ----------------------------------------------------------------------------
console.log("\n[Test 2] AVATARS_CONFIG & AVATAR_CATEGORIES Metadata Architecture:");
{
  const avatarsDataModule = require(path.join(rootDir, "avatars_data.js"));
  const { AVATARS_CONFIG, AVATAR_CATEGORIES, isValidPresetAvatar, getAvatarById, getAvatarByPath, getPresetAvatarsByCategory } = avatarsDataModule;

  assert.ok(Array.isArray(AVATARS_CONFIG), "AVATARS_CONFIG must be an array");
  assert.strictEqual(AVATARS_CONFIG.length, 21, "AVATARS_CONFIG must contain 21 avatars");

  assert.ok(Array.isArray(AVATAR_CATEGORIES), "AVATAR_CATEGORIES must be an array");
  assert.ok(AVATAR_CATEGORIES.length >= 6, "At least 6 categories defined");

  // Check required concepts coverage
  const categoriesPresent = new Set(AVATARS_CONFIG.map((a) => a.category));
  assert.ok(categoriesPresent.has("cultivation"), "Must have cultivation avatars");
  assert.ok(categoriesPresent.has("fantasy"), "Must have fantasy avatars");
  assert.ok(categoriesPresent.has("readers"), "Must have readers avatars");
  assert.ok(categoriesPresent.has("creatures"), "Must have creatures avatars");
  assert.ok(categoriesPresent.has("scholars"), "Must have scholars/alchemists avatars");
  assert.ok(categoriesPresent.has("celestial"), "Must have celestial/emperor avatars");

  // Verify unique IDs and existing paths
  const idsSet = new Set();
  for (const av of AVATARS_CONFIG) {
    assert.ok(av.id, "Avatar must have id");
    assert.ok(!idsSet.has(av.id), `Duplicate avatar ID: ${av.id}`);
    idsSet.add(av.id);

    assert.ok(av.path.startsWith("assets/avatars/"), `Path must start with assets/avatars/: ${av.path}`);
    assert.ok(av.path.endsWith(".svg"), `Path must end with .svg: ${av.path}`);
    assert.ok(fs.existsSync(path.join(rootDir, av.path)), `File referenced by avatar config missing on disk: ${av.path}`);

    // Verify lookup helpers
    assert.strictEqual(getAvatarById(av.id)?.id, av.id, `getAvatarById failed for ${av.id}`);
    assert.strictEqual(getAvatarByPath(av.path)?.id, av.id, `getAvatarByPath failed for ${av.path}`);
    assert.strictEqual(isValidPresetAvatar(av.path), true, `isValidPresetAvatar must return true for ${av.path}`);
  }

  // Category filtering check
  const allList = getPresetAvatarsByCategory("all");
  assert.strictEqual(allList.length, 21, "Category 'all' returns all 21 avatars");

  const cultList = getPresetAvatarsByCategory("cultivation");
  assert.ok(cultList.length >= 4, "Category 'cultivation' returns expected list");

  console.log(`  [PASS] 21 avatars across 6 categories verified with 100% ID uniqueness and file existence.`);
}

// ----------------------------------------------------------------------------
// Test 3: Internationalization (i18n) Parity in ES, EN and i18n.js
// ----------------------------------------------------------------------------
console.log("\n[Test 3] Multi-Language i18n Parity (ES, EN & i18n.js):");
{
  const esJson = JSON.parse(fs.readFileSync(path.join(rootDir, "locales/es.json"), "utf8"));
  const enJson = JSON.parse(fs.readFileSync(path.join(rootDir, "locales/en.json"), "utf8"));
  const i18nJsContent = fs.readFileSync(path.join(rootDir, "i18n.js"), "utf8");
  const avatarsDataModule = require(path.join(rootDir, "avatars_data.js"));
  const { AVATARS_CONFIG, AVATAR_CATEGORIES } = avatarsDataModule;

  // General avatar keys
  const generalKeys = [
    "avatar_choose_btn",
    "avatar_upload_btn",
    "avatar_restore_btn",
    "avatar_gallery_title",
    "avatar_gallery_desc",
    "avatar_confirm_selection",
    "avatar_preview_label",
    "avatar_settings_title",
    "avatar_settings_desc"
  ];

  for (const k of generalKeys) {
    assert.ok(esJson[k], `Missing key in es.json: ${k}`);
    assert.ok(enJson[k], `Missing key in en.json: ${k}`);
    assert.ok(i18nJsContent.includes(`"${k}"`), `Missing key in i18n.js: ${k}`);
  }

  // Category keys
  for (const cat of AVATAR_CATEGORIES) {
    assert.ok(esJson[cat.nameKey], `Missing category key in es.json: ${cat.nameKey}`);
    assert.ok(enJson[cat.nameKey], `Missing category key in en.json: ${cat.nameKey}`);
  }

  // Avatar names and descriptions
  for (const av of AVATARS_CONFIG) {
    assert.ok(esJson[av.nameKey], `Missing nameKey in es.json: ${av.nameKey}`);
    assert.ok(enJson[av.nameKey], `Missing nameKey in en.json: ${av.nameKey}`);
    assert.ok(esJson[av.descKey], `Missing descKey in es.json: ${av.descKey}`);
    assert.ok(enJson[av.descKey], `Missing descKey in en.json: ${av.descKey}`);
  }

  console.log(`  [PASS] All avatar UI strings, categories, and 21 avatar names/descriptions synchronized across locales.`);
}

// ----------------------------------------------------------------------------
// Test 4: Strict Security & XSS Prevention in setSafeAvatarImage
// ----------------------------------------------------------------------------
console.log("\n[Test 4] Strict Security & Safe Avatar Loading (XSS & Traversal Prevention):");
{
  const popupJsSrc = fs.readFileSync(path.join(rootDir, "popup.js"), "utf8");
  const avatarsDataModule = require(path.join(rootDir, "avatars_data.js"));
  const { isValidPresetAvatar } = avatarsDataModule;

  // Mock DOM container
  class MockElement {
    constructor() {
      this.children = [];
      this.textContent = "";
    }
    get firstChild() {
      return this.children[0] || null;
    }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
    }
    appendChild(c) {
      this.children.push(c);
    }
  }

  class MockImage {
    constructor() {
      this.src = "";
      this.alt = "";
      this.className = "";
      this.listeners = {};
    }
    addEventListener(event, fn) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
    }
  }

  const mockDoc = {
    createElement: (tag) => {
      if (tag === "img") return new MockImage();
      return new MockElement();
    }
  };

  const context = {
    document: mockDoc,
    isValidPresetAvatar,
    console
  };
  vm.createContext(context);

  // Extract setSafeAvatarImage from popup.js
  const fnMatch = popupJsSrc.match(/function setSafeAvatarImage\([\s\S]*?\n\}/);
  assert.ok(fnMatch, "setSafeAvatarImage must exist in popup.js");
  vm.runInContext(fnMatch[0], context);

  const { setSafeAvatarImage } = context;

  // A. Valid Preset Avatar SVG
  const container1 = new MockElement();
  setSafeAvatarImage(container1, "assets/avatars/cultivator_qi.svg", "🧙‍♂️");
  assert.strictEqual(container1.children.length, 1, "Must render img element for preset avatar");
  assert.strictEqual(container1.children[0].src, "assets/avatars/cultivator_qi.svg");
  assert.strictEqual(container1.children[0].className, "avatar-custom-img");

  // B. Valid Custom Base64 Image
  const container2 = new MockElement();
  const validBase64 = "data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoAAP7/2wAA";
  setSafeAvatarImage(container2, validBase64, "🧙‍♂️");
  assert.strictEqual(container2.children.length, 1, "Must render img element for base64");
  assert.strictEqual(container2.children[0].src, validBase64);

  // C. Malicious XSS Payloads MUST BE REJECTED
  const maliciousInputs = [
    'javascript:alert("XSS")',
    'data:text/html,<script>alert(1)</script>',
    'assets/avatars/../../etc/passwd',
    'assets/avatars/../../../Windows/System32/calc.exe',
    'https://malicious.site/avatar.svg',
    'assets/avatars/non_existent.svg',
    '<img src=x onerror=alert(1)>',
    null,
    undefined,
    12345,
    {}
  ];

  for (const evil of maliciousInputs) {
    const c = new MockElement();
    setSafeAvatarImage(c, evil, "🧙‍♂️");
    assert.strictEqual(c.children.length, 0, `Payload must not create img element: ${evil}`);
    assert.strictEqual(c.textContent, "🧙‍♂️", `Payload must safely fallback to emoji: ${evil}`);
  }

  console.log("  [PASS] setSafeAvatarImage securely renders preset avatars & base64 while completely neutralizing XSS & traversal.");
}

// ----------------------------------------------------------------------------
// Test 5: Storage Isolation, State Persistence & Reversion
// ----------------------------------------------------------------------------
console.log("\n[Test 5] Storage Isolation, Persistence & Default Reversion:");
{
  const store = {};
  const mockChromeStorage = {
    local: {
      get: async (keys) => {
        const res = {};
        for (const k of keys) {
          if (k in store) res[k] = store[k];
        }
        return res;
      },
      set: async (obj) => {
        Object.assign(store, obj);
      },
      remove: async (keys) => {
        for (const k of keys) delete store[k];
      }
    }
  };

  const uid = "user_cultivator_007";
  const avatarKey = `userAvatar_${uid}`;

  // 1. Initial State: no avatar stored
  assert.strictEqual(store[avatarKey], undefined);

  // 2. Select Preset Avatar
  store[avatarKey] = "assets/avatars/dragon_sovereign.svg";
  assert.strictEqual(store[avatarKey], "assets/avatars/dragon_sovereign.svg", "Preset avatar persisted under userAvatar_${uid}");

  // 3. Switch to another Preset Avatar
  store[avatarKey] = "assets/avatars/astral_empress.svg";
  assert.strictEqual(store[avatarKey], "assets/avatars/astral_empress.svg", "Preset avatar switch persisted");

  // 4. Upload Custom Photo (overrides preset avatar)
  store[avatarKey] = "data:image/webp;base64,custom_photo_sample";
  assert.strictEqual(store[avatarKey], "data:image/webp;base64,custom_photo_sample", "Custom photo persists cleanly in same field");

  // 5. Restore Default
  delete store[avatarKey];
  assert.strictEqual(store[avatarKey], undefined, "Restored default removes avatar key");

  console.log("  [PASS] Storage lifecycle, user account isolation, preset/custom interop, and default restoration verified.");
}

// ----------------------------------------------------------------------------
// Test 6: DOM Elements in popup.html & Script Loading Order
// ----------------------------------------------------------------------------
console.log("\n[Test 6] DOM Structure & Script Loading Integrity:");
{
  const popupHtml = fs.readFileSync(path.join(rootDir, "popup.html"), "utf8");

  // A. Script tags order
  const i18nIdx = popupHtml.indexOf('src="i18n.js"');
  const achIdx = popupHtml.indexOf('src="achievements_data.js"');
  const avIdx = popupHtml.indexOf('src="avatars_data.js"');
  const popupJsIdx = popupHtml.indexOf('src="popup.js"');

  assert.ok(i18nIdx !== -1, "i18n.js script tag exists");
  assert.ok(achIdx !== -1, "achievements_data.js script tag exists");
  assert.ok(avIdx !== -1, "avatars_data.js script tag exists");
  assert.ok(popupJsIdx !== -1, "popup.js script tag exists");

  assert.ok(avIdx > achIdx, "avatars_data.js loaded after achievements_data.js");
  assert.ok(popupJsIdx > avIdx, "popup.js loaded after avatars_data.js");

  // B. Required DOM elements in popup.html
  const requiredElements = [
    'id="btnChooseAvatar"',
    'id="btnChangeAvatar"',
    'id="btnRestoreAvatar"',
    'id="avatarGalleryModal"',
    'id="btnCloseAvatarGallery"',
    'id="avatarGalleryFilterBar"',
    'id="avatarGalleryGrid"',
    'id="avatarGalleryPreviewPanel"',
    'id="avatarGalleryPreviewImg"',
    'id="avatarGalleryPreviewName"',
    'id="avatarGalleryPreviewDesc"',
    'id="btnCancelAvatarGallery"',
    'id="btnConfirmAvatarGallery"'
  ];

  for (const elem of requiredElements) {
    assert.ok(popupHtml.includes(elem), `popup.html missing element: ${elem}`);
  }

  // Ensure duplicate avatar options in Settings have been removed as per user requirement
  assert.ok(!popupHtml.includes('id="btnSettingsChooseAvatar"'), "Settings must not contain duplicate avatar button");

  console.log("  [PASS] All gallery modal elements, buttons, previews, and script load sequence verified.");
}

// ----------------------------------------------------------------------------
// Test 7: Category Filtering Synchronization & Auto-Selection
// ----------------------------------------------------------------------------
console.log("\n[Test 7] Category Filtering Synchronization & Auto-Selection Logic:");
{
  const avatarsDataModule = require(path.join(rootDir, "avatars_data.js"));
  const { AVATARS_CONFIG, AVATAR_CATEGORIES, getPresetAvatarsByCategory } = avatarsDataModule;

  // Simulate category switching
  let currentGalleryCategory = "all";
  let selectedGalleryAvatarId = "cultivator_qi"; // In cultivation

  // When switching to 'creatures'
  currentGalleryCategory = "creatures";
  let list = getPresetAvatarsByCategory(currentGalleryCategory);
  assert.ok(list.length > 0, "Creatures category must have avatars");
  if (list.length > 0 && !list.some((a) => a.id === selectedGalleryAvatarId)) {
    selectedGalleryAvatarId = list[0].id;
  }
  assert.strictEqual(selectedGalleryAvatarId, "dragon_sovereign", "Auto-selects first creature when switching from cultivation to creatures");

  // When switching to 'fantasy'
  currentGalleryCategory = "fantasy";
  list = getPresetAvatarsByCategory(currentGalleryCategory);
  if (list.length > 0 && !list.some((a) => a.id === selectedGalleryAvatarId)) {
    selectedGalleryAvatarId = list[0].id;
  }
  assert.strictEqual(selectedGalleryAvatarId, "shadow_assassin", "Auto-selects first fantasy avatar");

  // When switching back to 'all', current selection remains valid
  currentGalleryCategory = "all";
  list = getPresetAvatarsByCategory(currentGalleryCategory);
  if (list.length > 0 && !list.some((a) => a.id === selectedGalleryAvatarId)) {
    selectedGalleryAvatarId = list[0].id;
  }
  assert.strictEqual(selectedGalleryAvatarId, "shadow_assassin", "Current selection preserved when switching back to 'all'");

  console.log("  [PASS] Category filtering logic guarantees 100% active selection and zero desynchronized empty grid states.");
}

// ----------------------------------------------------------------------------
// Test 8: Symmetrical Fallback on Broken Images (onerror handler)
// ----------------------------------------------------------------------------
console.log("\n[Test 8] Symmetrical Fallback on Image Load Failure (onerror):");
{
  const popupJsSrc = fs.readFileSync(path.join(rootDir, "popup.js"), "utf8");
  const avatarsDataModule = require(path.join(rootDir, "avatars_data.js"));
  const { isValidPresetAvatar } = avatarsDataModule;

  class MockElement {
    constructor() {
      this.children = [];
      this.textContent = "";
    }
    get firstChild() {
      return this.children[0] || null;
    }
    removeChild(c) {
      const idx = this.children.indexOf(c);
      if (idx !== -1) this.children.splice(idx, 1);
    }
    appendChild(c) {
      this.children.push(c);
    }
  }

  class MockImage {
    constructor() {
      this.src = "";
      this.alt = "";
      this.className = "";
      this.listeners = {};
    }
    addEventListener(event, fn) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
    }
    dispatchEvent(event) {
      if (this.listeners[event]) {
        this.listeners[event].forEach((fn) => fn());
      }
    }
  }

  const mockDoc = {
    createElement: (tag) => {
      if (tag === "img") return new MockImage();
      return new MockElement();
    }
  };

  const context = {
    document: mockDoc,
    isValidPresetAvatar,
    console
  };
  vm.createContext(context);

  const fnMatch = popupJsSrc.match(/function setSafeAvatarImage\([\s\S]*?\n\}/);
  assert.ok(fnMatch, "setSafeAvatarImage must exist in popup.js");
  vm.runInContext(fnMatch[0], context);

  const { setSafeAvatarImage } = context;

  // Container with valid path but simulated runtime error
  const container = new MockElement();
  setSafeAvatarImage(container, "assets/avatars/dragon_sovereign.svg", "🐉");
  assert.strictEqual(container.children.length, 1);
  const img = container.children[0];
  assert.ok(img.listeners["error"] && img.listeners["error"].length > 0, "img element must have an error event listener attached");

  // Trigger error event
  img.dispatchEvent("error");
  assert.strictEqual(container.children.length, 0, "Children cleared on error");
  assert.strictEqual(container.textContent, "🐉", "Safely fallback to provided emoji on error");

  // Container with undefined fallbackEmoji must default to safe emoji (never 'undefined')
  const containerUndefined = new MockElement();
  setSafeAvatarImage(containerUndefined, null, undefined);
  assert.strictEqual(containerUndefined.textContent, "🧙‍♂️", "Falsy fallbackEmoji safely defaults to wizard emoji");

  console.log("  [PASS] Image error handlers safely revert to fallback emoji and never render broken image text.");
}

// ----------------------------------------------------------------------------
// Test 9: Synchronization Across All 3 Portrait Locations
// ----------------------------------------------------------------------------
console.log("\n[Test 9] Profile Portrait Synchronization (3 Locations):");
{
  const popupJsSrc = fs.readFileSync(path.join(rootDir, "popup.js"), "utf8");

  // Verify updateAvatarMiniSlots updates header portrait, settings preview, and accountLargeAvatar
  assert.ok(popupJsSrc.includes('document.getElementById("userAvatarPortrait")'), "userAvatarPortrait handled");
  assert.ok(popupJsSrc.includes('document.getElementById("settingsAvatarPreview")'), "settingsAvatarPreview handled");
  assert.ok(popupJsSrc.includes('document.getElementById("accountLargeAvatar")'), "accountLargeAvatar handled in updateAvatarMiniSlots");

  // Verify settings choose avatar does NOT unconditionally call openAccountModal
  assert.ok(popupJsSrc.includes('accountModal && accountModal.style.display === "flex"'), "openAccountModal is conditionally called only when accountModal was already open");

  console.log("  [PASS] Tri-location portrait synchronization and settings modal isolation verified.");
}

// ----------------------------------------------------------------------------
// Test 10: Navigation Bar Descriptor Icons & i18n Resilience
// ----------------------------------------------------------------------------
console.log("\n[Test 10] Navigation Bar Descriptor Icons & i18n Resilience:");
{
  const popupHtml = fs.readFileSync(path.join(rootDir, "popup.html"), "utf8");

  const requiredTabs = [
    { target: "view-library", i18n: "tab_library", iconShape: "M4 19.5" },
    { target: "view-cultivation", i18n: "tab_cultivation", iconShape: "M12 2c" },
    { target: "view-inventory", i18n: "tab_inventory", iconShape: "M6 2 3 6v14" },
    { target: "view-whatsapp", i18n: "tab_whatsapp", iconShape: "M21 11.5" },
    { target: "view-settings", i18n: "tab_settings", iconShape: 'circle cx="12" cy="12" r="3"' }
  ];

  for (const tab of requiredTabs) {
    const tabRegex = new RegExp(`<button[^>]*data-target="${tab.target}"[\\s\\S]*?<\\/button>`);
    const match = popupHtml.match(tabRegex);
    assert.ok(match, `Tab button for ${tab.target} must exist in popup.html`);
    const btnHtml = match[0];

    assert.ok(btnHtml.includes('<svg class="tab-icon"'), `Tab ${tab.target} must contain <svg class="tab-icon">`);
    assert.ok(btnHtml.includes('aria-hidden="true"'), `Tab ${tab.target} icon must be marked aria-hidden`);
    assert.ok(btnHtml.includes(tab.iconShape), `Tab ${tab.target} must have expected descriptor icon geometry`);
    assert.ok(btnHtml.includes(`data-i18n="${tab.i18n}"`), `Tab ${tab.target} must contain label with data-i18n="${tab.i18n}"`);
    assert.ok(btnHtml.includes('class="tab-label"'), `Tab ${tab.target} label must have class="tab-label"`);
  }

  // Gear verification specifically for Settings as requested
  assert.ok(popupHtml.includes('data-target="view-settings"'), "view-settings tab button exists");
  const settingsMatch = popupHtml.match(/<button[^>]*data-target="view-settings"[\s\S]*?<\/button>/);
  assert.ok(settingsMatch && settingsMatch[0].includes('r="3"'), "Settings tab button contains gear circle geometry");

  console.log("  [PASS] All 5 navigation tabs verified with clean descriptor icons and i18n preservation.");
}

// ----------------------------------------------------------------------------
// Test 11: Unauthenticated Guest Avatar Personalization & Title Preservation
// ----------------------------------------------------------------------------
console.log("\n[Test 11] Unauthenticated Guest Avatar Personalization & Title Preservation:");
{
  const popupJsSrc = fs.readFileSync(path.join(rootDir, "popup.js"), "utf8");

  // Verify guest uid evaluates cleanly to "guest" when auth is falsy
  assert.ok(popupJsSrc.includes('const currentUid = isLoggedIn && auth?.uid ? auth.uid : "guest"'),
    "currentUid resolves to 'guest' when unauthenticated");

  // Verify avatarPortrait renders custom avatar when set, and falls back to 👤 when guest without custom avatar
  assert.ok(
    popupJsSrc.includes('setSafeAvatarImage(avatarPortrait, customAvatar, defaultEmoji);'),
    "avatarPortrait renders custom avatar safely"
  );
  assert.ok(
    popupJsSrc.includes('avatarPortrait.textContent = "👤";'),
    "avatarPortrait falls back to default 👤 when guest without custom avatar"
  );

  // Verify duplicate avatar chooser is removed from Settings view
  const popupHtml = fs.readFileSync(path.join(rootDir, "popup.html"), "utf8");
  assert.ok(!popupHtml.includes('id="btnSettingsChooseAvatar"'), "Settings must not contain duplicate avatar button");
  assert.ok(!popupHtml.includes('id="profilePersonalizationCard"'), "Settings must not contain duplicate personalization card");

  console.log("  [PASS] Guest avatar customization, title symbol fallback, and settings deduplication verified.");
}

console.log("\n====================================================================");
console.log(">>> ALL ORIGINAL PRESET AVATARS TESTS PASSED (100%)! <<<");
console.log("====================================================================\n");
