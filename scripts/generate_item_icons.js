const fs = require('fs');
const path = require('path');

const itemsDir = path.join(__dirname, '..', 'assets', 'items');
if (!fs.existsSync(itemsDir)) {
  fs.mkdirSync(itemsDir, { recursive: true });
}

const ITEMS_SVG = {
  // 1. qi_core_1 (Common): Condensed Spiritual Core Orb with swirling Qi
  qi_core_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <radialGradient id="qiCoreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="1"/>
      <stop offset="45%" stop-color="#0284c7" stop-opacity="0.8"/>
      <stop offset="75%" stop-color="#0369a1" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#082f49" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="coreRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
    <linearGradient id="orbShine" x1="20%" y1="20%" x2="80%" y2="80%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
      <stop offset="30%" stop-color="#7dd3fc" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <!-- Ambient Qi halo -->
  <circle cx="32" cy="32" r="28" fill="url(#qiCoreGlow)"/>
  <!-- Outer Dao Ring -->
  <circle cx="32" cy="32" r="24" fill="none" stroke="url(#coreRing)" stroke-width="2" stroke-dasharray="8 3" opacity="0.85"/>
  <!-- Floating runes -->
  <circle cx="32" cy="8" r="1.5" fill="#fde047"/>
  <circle cx="56" cy="32" r="1.5" fill="#fde047"/>
  <circle cx="32" cy="56" r="1.5" fill="#fde047"/>
  <circle cx="8" cy="32" r="1.5" fill="#fde047"/>
  <!-- Central Crystal Orb -->
  <circle cx="32" cy="32" r="17" fill="#0369a1" stroke="#38bdf8" stroke-width="1.5"/>
  <circle cx="32" cy="32" r="17" fill="url(#orbShine)"/>
  <!-- Internal swirling Qi spiral -->
  <path d="M 32 19 C 39 19, 44 24, 44 31 C 44 38, 38 43, 31 43 C 25 43, 21 38, 22 33 C 23 28, 28 26, 31 27 C 34 28, 35 31, 34 33 C 33 34, 31 34, 31 33" 
        fill="none" stroke="#bae6fd" stroke-width="2.2" stroke-linecap="round"/>
  <!-- Core spark -->
  <circle cx="32" cy="32" r="3" fill="#ffffff"/>
  <circle cx="28" cy="27" r="1.8" fill="#ffffff" opacity="0.8"/>
</svg>`,

  // 2. amulet_focus_1 (Rare): Carved Nephrite Jade Daoist Focus Amulet
  amulet_focus_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <radialGradient id="jadeAmulet" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="50%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </radialGradient>
    <linearGradient id="amuletGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#92400e"/>
    </linearGradient>
  </defs>
  <!-- Top Silk Cord -->
  <path d="M 32 4 L 32 14" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="32" cy="14" r="3" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
  <!-- Jade Bi Disc -->
  <circle cx="32" cy="36" r="22" fill="url(#jadeAmulet)" stroke="url(#amuletGold)" stroke-width="2"/>
  <!-- Outer Engraved Ring -->
  <circle cx="32" cy="36" r="17" fill="none" stroke="#a7f3d0" stroke-width="1" stroke-dasharray="4 2" opacity="0.65"/>
  <!-- Center Open Hole with Gold Rim -->
  <circle cx="32" cy="36" r="8" fill="#070709" stroke="url(#amuletGold)" stroke-width="2"/>
  <!-- Yin Yang / Taiji Spirit Waves inside -->
  <path d="M 32 28 C 36.4 28 36.4 36 32 36 C 27.6 36 27.6 44 32 44" fill="none" stroke="#fde047" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="1.5" fill="#fde047"/>
  <circle cx="32" cy="40" r="1.5" fill="#a7f3d0"/>
  <!-- Hanging Bottom Silk Tassels -->
  <path d="M 30 57 L 27 63 M 32 58 L 32 64 M 34 57 L 37 63" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round"/>
</svg>`,

  // 3. pill_vitality_1 (Rare): Golden Dragon Vitality Dan Pill
  pill_vitality_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <radialGradient id="danPillGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="35%" stop-color="#f59e0b"/>
      <stop offset="75%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#7c2d12"/>
    </radialGradient>
    <radialGradient id="pillAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Aura -->
  <circle cx="32" cy="30" r="26" fill="url(#pillAura)"/>
  <!-- Lotus Petal Pedestal -->
  <path d="M 16 46 Q 32 54 48 46 Q 44 55 32 56 Q 20 55 16 46 Z" fill="#047857" stroke="#10b981" stroke-width="1"/>
  <path d="M 22 47 Q 32 52 42 47" fill="none" stroke="#6ee7b7" stroke-width="1"/>
  <!-- Spherical Pill Body -->
  <circle cx="32" cy="30" r="18" fill="url(#danPillGrad)" stroke="#fde047" stroke-width="1.5"/>
  <!-- 3 Golden Dragon Cloud Dan Veins (丹纹) -->
  <path d="M 20 28 Q 26 22 34 26 Q 40 30 46 25" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.95"/>
  <path d="M 18 34 Q 24 38 32 34 Q 38 30 45 35" fill="none" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>
  <path d="M 24 19 Q 32 17 38 21" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.75"/>
  <!-- Pill Glisten -->
  <circle cx="26" cy="22" r="3.5" fill="#ffffff" opacity="0.85"/>
  <!-- Floating medicinal mist particles -->
  <circle cx="15" cy="18" r="1.5" fill="#fde047" opacity="0.8"/>
  <circle cx="48" cy="19" r="1.8" fill="#fde047" opacity="0.8"/>
  <circle cx="45" cy="40" r="1.2" fill="#fbbf24" opacity="0.7"/>
</svg>`,

  // 4. cultivator_seal_1 (Epic): Solitary Cultivator Seal / Jade Stamp
  cultivator_seal_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <linearGradient id="sealBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#9333ea"/>
      <stop offset="50%" stop-color="#6b21a8"/>
      <stop offset="100%" stop-color="#3b0764"/>
    </linearGradient>
    <linearGradient id="sealTrim" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#fde047"/>
    </linearGradient>
  </defs>
  <!-- Dragon / Kylin Crest Handle -->
  <path d="M 24 22 C 24 12, 40 12, 40 22 C 43 17, 47 19, 44 26 L 20 26 C 17 19, 21 17, 24 22 Z" 
        fill="#a855f7" stroke="url(#sealTrim)" stroke-width="1.5"/>
  <circle cx="32" cy="17" r="2.5" fill="#fde047"/>
  <!-- Seal Mid Collar -->
  <rect x="18" y="26" width="28" height="6" rx="2" fill="url(#sealTrim)" stroke="#78350f" stroke-width="1"/>
  <!-- Square Base Block -->
  <path d="M 16 32 L 48 32 L 46 54 L 18 54 Z" fill="url(#sealBody)" stroke="url(#sealTrim)" stroke-width="1.8"/>
  <!-- Ancient Inscribed Character "Dao" (道) / Seal Rune -->
  <path d="M 24 37 L 40 37 M 32 37 L 32 49 M 26 43 L 38 43 M 24 49 L 40 49" stroke="#fde047" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Seal Base Plate Foot -->
  <rect x="15" y="54" width="34" height="6" rx="1.5" fill="#7e22ce" stroke="url(#sealTrim)" stroke-width="1.5"/>
  <!-- Purple Lightning Arc -->
  <path d="M 12 34 L 16 39 L 14 43" stroke="#e879f9" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M 52 38 L 48 42 L 50 47" stroke="#e879f9" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`,

  // 5. relic_ascension_1 (Legendary): Primordial Ascension Lotus Relic
  relic_ascension_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <radialGradient id="ascendAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fde047" stop-opacity="0.8"/>
      <stop offset="40%" stop-color="#ec4899" stop-opacity="0.4"/>
      <stop offset="80%" stop-color="#06b6d4" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="goldPetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fffbeb"/>
      <stop offset="40%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <!-- Background Sacred Halo -->
  <circle cx="32" cy="32" r="28" fill="url(#ascendAura)"/>
  <!-- Concentric Celestial Rings -->
  <circle cx="32" cy="32" r="24" fill="none" stroke="#fde047" stroke-width="1.2" stroke-dasharray="6 3"/>
  <circle cx="32" cy="32" r="20" fill="none" stroke="#ec4899" stroke-width="1" stroke-dasharray="2 4"/>
  <!-- Outer Lotus Petals -->
  <path d="M 32 8 Q 38 20 32 26 Q 26 20 32 8 Z" fill="url(#goldPetal)" stroke="#fde047" stroke-width="1"/>
  <path d="M 32 56 Q 38 44 32 38 Q 26 44 32 56 Z" fill="url(#goldPetal)" stroke="#fde047" stroke-width="1"/>
  <path d="M 8 32 Q 20 38 26 32 Q 20 26 8 32 Z" fill="url(#goldPetal)" stroke="#fde047" stroke-width="1"/>
  <path d="M 56 32 Q 44 38 38 32 Q 44 26 56 32 Z" fill="url(#goldPetal)" stroke="#fde047" stroke-width="1"/>
  <!-- Diagonal Petals -->
  <path d="M 15 15 Q 26 23 27 27 Q 23 26 15 15 Z" fill="url(#goldPetal)" stroke="#fde047" stroke-width="1"/>
  <path d="M 49 15 Q 41 26 37 27 Q 41 23 49 15 Z" fill="url(#goldPetal)" stroke="#fde047" stroke-width="1"/>
  <path d="M 15 49 Q 23 41 27 37 Q 26 41 15 49 Z" fill="url(#goldPetal)" stroke="#fde047" stroke-width="1"/>
  <path d="M 49 49 Q 37 41 37 37 Q 41 41 49 49 Z" fill="url(#goldPetal)" stroke="#fde047" stroke-width="1"/>
  <!-- Central Diamond Immortality Core -->
  <polygon points="32,18 42,32 32,46 22,32" fill="#ffffff" stroke="#fbbf24" stroke-width="2"/>
  <polygon points="32,23 38,32 32,41 26,32" fill="#ec4899" opacity="0.65"/>
  <circle cx="32" cy="32" r="3.5" fill="#ffffff"/>
</svg>`,

  // 6. sword_dao_1 (Rare): Flying Sword of the Heavenly Dao
  sword_dao_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <linearGradient id="swordBlade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#7dd3fc"/>
      <stop offset="80%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1"/>
    </linearGradient>
    <linearGradient id="swordGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#d97706"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
  </defs>
  <!-- Sword Qi Aura Trail -->
  <path d="M 48 8 L 56 16 L 24 48 L 16 40 Z" fill="#38bdf8" opacity="0.25" filter="blur(2px)"/>
  <!-- Sword Blade (Diagonal from bottom-left to top-right) -->
  <path d="M 54 10 L 52 14 L 28 38 L 26 36 L 50 12 Z" fill="url(#swordBlade)" stroke="#bae6fd" stroke-width="1.2"/>
  <polygon points="54,10 46,14 47,19 55,15" fill="#e0f2fe"/>
  <!-- Central Fuller / Blood Groove with Cyan Runes -->
  <line x1="50" y1="14" x2="30" y2="34" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round"/>
  <!-- Dragon Wing Crossguard -->
  <path d="M 22 36 Q 28 32 32 42 Q 22 46 22 36 Z" fill="url(#swordGold)" stroke="#92400e" stroke-width="1"/>
  <!-- Hilt / Grip -->
  <line x1="24" y1="40" x2="15" y2="49" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="24" y1="40" x2="15" y2="49" stroke="#fde047" stroke-width="1" stroke-dasharray="2 2"/>
  <!-- Pommel -->
  <circle cx="13" cy="51" r="3.5" fill="url(#swordGold)" stroke="#78350f" stroke-width="1"/>
  <circle cx="13" cy="51" r="1.5" fill="#ef4444"/>
  <!-- Red Daoist Tassel -->
  <path d="M 11 53 Q 8 58 6 62 M 13 54 Q 12 59 11 63" stroke="#dc2626" stroke-width="1.6" stroke-linecap="round" fill="none"/>
  <!-- Flashing Sword Qi Spikes -->
  <line x1="56" y1="6" x2="52" y2="12" stroke="#38bdf8" stroke-width="1.5"/>
  <line x1="59" y1="12" x2="53" y2="13" stroke="#38bdf8" stroke-width="1.5"/>
</svg>`,

  // 7. hat_scholar_1 (Epic): Ancient Scholar Immortal Crown / Hairpin
  hat_scholar_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <linearGradient id="crownGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
    <linearGradient id="guanBlack" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="60%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
  </defs>
  <!-- Guan Cap Base (Traditional Scholar Crown) -->
  <path d="M 20 48 Q 32 44 44 48 L 46 30 Q 32 24 18 30 Z" fill="url(#guanBlack)" stroke="url(#crownGold)" stroke-width="2"/>
  <!-- Upper Filigree Arc -->
  <path d="M 22 30 Q 32 16 42 30" fill="none" stroke="url(#crownGold)" stroke-width="2"/>
  <path d="M 26 30 Q 32 20 38 30" fill="none" stroke="url(#crownGold)" stroke-width="1.5"/>
  <circle cx="32" cy="19" r="3.5" fill="#fde047" stroke="#b45309" stroke-width="1"/>
  <!-- Front Jade Emblem Plaque -->
  <rect x="28" y="34" width="8" height="10" rx="1.5" fill="#10b981" stroke="#fde047" stroke-width="1"/>
  <circle cx="32" cy="39" r="2" fill="#fef08a"/>
  <!-- Transverse Jade Hairpin (Zan / 簪) piercing the crown -->
  <line x1="8" y1="36" x2="56" y2="36" stroke="#34d399" stroke-width="3" stroke-linecap="round"/>
  <!-- Left Ornament Tassel on Hairpin -->
  <circle cx="8" cy="36" r="3" fill="#fbbf24" stroke="#92400e" stroke-width="1"/>
  <path d="M 7 39 L 6 48 M 9 39 L 10 49" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
  <!-- Right Sharp Hairpin Tip -->
  <polygon points="56,34 62,36 56,38" fill="#a7f3d0"/>
  <!-- Base Trim -->
  <rect x="16" y="47" width="32" height="5" rx="2" fill="url(#crownGold)" stroke="#78350f" stroke-width="1"/>
</svg>`,

  // 8. cape_monarch_1 (Epic): Shadow Monarch Mantle / Pauldrons
  cape_monarch_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <linearGradient id="monarchSilk" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4c1d95"/>
      <stop offset="50%" stop-color="#2e1065"/>
      <stop offset="100%" stop-color="#0f0728"/>
    </linearGradient>
    <linearGradient id="shadowGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#3b0764" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Flowing Outer Shadow Cape -->
  <path d="M 14 20 Q 32 16 50 20 L 56 56 Q 44 50 32 58 Q 20 50 8 56 Z" 
        fill="url(#monarchSilk)" stroke="#9333ea" stroke-width="1.8"/>
  <!-- Internal Shadow Energy Waves -->
  <path d="M 18 26 Q 32 30 46 26 L 50 50 Q 32 45 14 50 Z" fill="url(#shadowGlow)"/>
  <!-- High Regal Collar -->
  <path d="M 22 20 L 16 10 L 26 16 L 32 18 L 38 16 L 48 10 L 42 20 Z" 
        fill="#581c87" stroke="#c084fc" stroke-width="1.5"/>
  <!-- Dual Beast Pauldrons (Shoulders) -->
  <circle cx="16" cy="22" r="6" fill="#3b0764" stroke="#c084fc" stroke-width="1.5"/>
  <polygon points="16,16 18,22 14,22" fill="#e879f9"/>
  <circle cx="48" cy="22" r="6" fill="#3b0764" stroke="#c084fc" stroke-width="1.5"/>
  <polygon points="48,16 50,22 46,22" fill="#e879f9"/>
  <!-- Central Void Heart Brooch Clasp -->
  <circle cx="32" cy="22" r="4.5" fill="#0f0728" stroke="#fde047" stroke-width="1.5"/>
  <circle cx="32" cy="22" r="2" fill="#c084fc"/>
  <!-- Purple Shadow Wisps emitting from hem -->
  <path d="M 12 56 Q 8 62 14 62" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M 32 58 Q 32 64 36 62" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <path d="M 52 56 Q 56 62 50 62" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round" fill="none"/>
</svg>`,

  // 9. armor_dragon_1 (Legendary): Celestial Dragon Scale Cuirass
  armor_dragon_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <linearGradient id="dragonGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="dragonPlate" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#b91c1c"/>
      <stop offset="60%" stop-color="#7f1d1d"/>
      <stop offset="100%" stop-color="#450a0a"/>
    </linearGradient>
  </defs>
  <!-- Dragon Wing Shoulder Guards -->
  <path d="M 10 18 Q 16 12 24 16 L 22 28 Q 14 26 10 18 Z" fill="url(#dragonGold)" stroke="#78350f" stroke-width="1.5"/>
  <path d="M 54 18 Q 48 12 40 16 L 42 28 Q 50 26 54 18 Z" fill="url(#dragonGold)" stroke="#78350f" stroke-width="1.5"/>
  <!-- Gorget / Neck Guard -->
  <path d="M 24 16 Q 32 20 40 16 L 38 22 Q 32 24 26 22 Z" fill="url(#dragonGold)" stroke="#92400e" stroke-width="1.2"/>
  <!-- Main Chest Breastplate -->
  <path d="M 20 22 Q 32 24 44 22 L 46 44 L 32 56 L 18 44 Z" fill="url(#dragonPlate)" stroke="url(#dragonGold)" stroke-width="2"/>
  <!-- Overlapping Dragon Scales Pattern -->
  <path d="M 22 28 Q 27 33 32 28 Q 37 33 42 28" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
  <path d="M 20 34 Q 26 39 32 34 Q 38 39 44 34" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
  <path d="M 22 40 Q 27 45 32 40 Q 37 45 42 40" fill="none" stroke="#f59e0b" stroke-width="1.5"/>
  <!-- Central Glowing Dragon Heart Gem -->
  <polygon points="32,28 37,35 32,42 27,35" fill="#fef08a" stroke="#ea580c" stroke-width="1.5"/>
  <circle cx="32" cy="35" r="2.5" fill="#ef4444"/>
  <!-- Waist Guard Belt Rim -->
  <path d="M 18 52 L 32 60 L 46 52" fill="none" stroke="url(#dragonGold)" stroke-width="2.5"/>
</svg>`,

  // 10. ring_void_1 (Epic): Void Spatial Storage Ring
  ring_void_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <radialGradient id="voidVortex" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#c084fc"/>
      <stop offset="60%" stop-color="#6b21a8"/>
      <stop offset="100%" stop-color="#090514"/>
    </radialGradient>
    <linearGradient id="ringMetal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f1f5f9"/>
      <stop offset="50%" stop-color="#94a3b8"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <!-- Celestial Ring Band (Oval perspective) -->
  <ellipse cx="32" cy="36" rx="20" ry="14" fill="none" stroke="url(#ringMetal)" stroke-width="6"/>
  <ellipse cx="32" cy="36" rx="20" ry="14" fill="none" stroke="#cbd5e1" stroke-width="1.2"/>
  <!-- Runes carved on ring rim -->
  <circle cx="16" cy="36" r="1.5" fill="#c084fc"/>
  <circle cx="48" cy="36" r="1.5" fill="#c084fc"/>
  <circle cx="32" cy="47" r="1.5" fill="#c084fc"/>
  <!-- Void Gem Mount Bezel -->
  <circle cx="32" cy="24" r="14" fill="url(#ringMetal)" stroke="#e2e8f0" stroke-width="2"/>
  <!-- Inner Swirling Spatial Abyss -->
  <circle cx="32" cy="24" r="11" fill="url(#voidVortex)"/>
  <!-- Mini spiral galaxy inside spatial ring -->
  <path d="M 32 17 C 36 17, 39 20, 39 24 C 39 28, 35 31, 31 31 C 28 31, 26 28, 27 25 C 28 23, 31 22, 32 23" 
        fill="none" stroke="#f5d0fe" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Star sparks inside pocket dimension -->
  <circle cx="34" cy="21" r="1.2" fill="#ffffff"/>
  <circle cx="28" cy="26" r="1" fill="#fde047"/>
  <circle cx="36" cy="26" r="0.8" fill="#38bdf8"/>
</svg>`,

  // 11. glasses_truth_1 (Rare): Divination Monocle of Truth
  glasses_truth_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <radialGradient id="lensGlass" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="40%" stop-color="#67e8f9" stop-opacity="0.45"/>
      <stop offset="80%" stop-color="#0284c7" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#0f172a" stop-opacity="0.5"/>
    </radialGradient>
    <linearGradient id="monocleGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
  </defs>
  <!-- Circular Gold Frame -->
  <circle cx="28" cy="28" r="18" fill="url(#lensGlass)" stroke="url(#monocleGold)" stroke-width="3"/>
  <!-- Inner Calibration Ring -->
  <circle cx="28" cy="28" r="14" fill="none" stroke="#fde047" stroke-width="0.8" stroke-dasharray="3 2" opacity="0.8"/>
  <!-- Divination Crosshair Reticle & Mystic Runes -->
  <line x1="28" y1="14" x2="28" y2="42" stroke="#67e8f9" stroke-width="1" stroke-dasharray="2 2"/>
  <line x1="14" y1="28" x2="42" y2="28" stroke="#67e8f9" stroke-width="1" stroke-dasharray="2 2"/>
  <circle cx="28" cy="28" r="4" fill="none" stroke="#fde047" stroke-width="1.2"/>
  <circle cx="28" cy="28" r="1.5" fill="#ffffff"/>
  <!-- Lens Highlight Glare -->
  <path d="M 20 18 Q 28 14 36 18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
  <!-- Side Hinge Clasp -->
  <rect x="45" y="26" width="5" height="4" rx="1" fill="url(#monocleGold)"/>
  <!-- Golden Hanging Chain (Curving down) -->
  <path d="M 48 30 Q 56 42 46 54 Q 38 62 32 58" fill="none" stroke="url(#monocleGold)" stroke-width="2" stroke-dasharray="3 1.5" stroke-linecap="round"/>
  <!-- Little Jade Weight at chain tip -->
  <circle cx="32" cy="58" r="3" fill="#10b981" stroke="#fde047" stroke-width="1"/>
</svg>`,

  // 12. earrings_spirit_1 (Rare): Emerald Spirit Jade Drop Earrings
  earrings_spirit_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
  <defs>
    <radialGradient id="spiritJade" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#a7f3d0"/>
      <stop offset="45%" stop-color="#10b981"/>
      <stop offset="85%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </radialGradient>
    <linearGradient id="silverEarring" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="60%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
  </defs>
  <!-- Earring 1 (Main Left) -->
  <!-- Top Ear Loop / Hook -->
  <path d="M 24 8 C 24 4, 30 4, 30 9 L 28 14" fill="none" stroke="url(#silverEarring)" stroke-width="2" stroke-linecap="round"/>
  <!-- Lotus Clasp Cap -->
  <path d="M 22 15 Q 28 19 34 15 L 32 20 Q 28 22 24 20 Z" fill="#fde047" stroke="#b45309" stroke-width="1"/>
  <circle cx="28" cy="18" r="2" fill="#ef4444"/>
  <!-- Hanging Teardrop / Crescent Jade Gem -->
  <path d="M 28 20 C 35 30, 36 44, 28 52 C 20 44, 21 30, 28 20 Z" 
        fill="url(#spiritJade)" stroke="#6ee7b7" stroke-width="1.5"/>
  <!-- Jade Inner Luster -->
  <path d="M 28 25 Q 31 34 29 44" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  <circle cx="28" cy="46" r="2.5" fill="#a7f3d0" opacity="0.9"/>
  <!-- Earring 2 (Smaller Right background pair) -->
  <path d="M 44 14 C 44 10, 48 10, 48 14 L 46 18" fill="none" stroke="url(#silverEarring)" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
  <path d="M 46 22 C 51 30, 52 40, 46 46 C 40 40, 41 30, 46 22 Z" 
        fill="url(#spiritJade)" stroke="#6ee7b7" stroke-width="1.2" opacity="0.85"/>
  <circle cx="46" cy="42" r="2" fill="#ffffff" opacity="0.8"/>
</svg>`
};

for (const [id, svg] of Object.entries(ITEMS_SVG)) {
  const filePath = path.join(itemsDir, `${id}.svg`);
  fs.writeFileSync(filePath, svg.trim(), 'utf8');
  console.log(`Generated SVG item: ${id}.svg (${Buffer.byteLength(svg, 'utf8')} bytes)`);
}
console.log('All 12 Xianxia item SVGs generated successfully!');
