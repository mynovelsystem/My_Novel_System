const fs = require('fs');
const path = require('path');

const avatarsDir = path.join(__dirname, '..', 'assets', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// 21 Detailed, High-Quality, Original SVG Avatar Designs for MyNovelSystem
const AVATARS = {
  // --------------------------------------------------------------------------
  // 1. Cultivadores de Qi, maestros del cultivo y guerreros espirituales
  // --------------------------------------------------------------------------
  cultivator_qi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipQi">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgQi" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#0e3a5a"/>
      <stop offset="55%" stop-color="#061c2e"/>
      <stop offset="100%" stop-color="#020912"/>
    </radialGradient>
    <linearGradient id="robeQi" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="45%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="innerRobeQi" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#bae6fd"/>
    </linearGradient>
    <radialGradient id="faceQi" cx="48%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#ffedd5"/>
      <stop offset="70%" stop-color="#fed7aa"/>
      <stop offset="100%" stop-color="#fba86a"/>
    </radialGradient>
    <linearGradient id="hairQi" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <radialGradient id="qiGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#0284c7" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background in Circle -->
  <g clip-path="url(#circleClipQi)">
    <rect width="128" height="128" fill="url(#bgQi)"/>
    
    <!-- Bagua Daoist Ring Halo -->
    <circle cx="64" cy="52" r="46" fill="none" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.3" stroke-dasharray="4 4"/>
    <circle cx="64" cy="52" r="42" fill="none" stroke="#7dd3fc" stroke-width="0.8" stroke-opacity="0.2"/>
    <circle cx="64" cy="52" r="30" fill="url(#qiGlow)"/>

    <!-- Hair Back -->
    <path d="M 40 48 Q 36 78 34 94 Q 64 96 94 94 Q 92 78 88 48 Z" fill="url(#hairQi)"/>

    <!-- Disciples Robes (Chest & Shoulders) -->
    <path d="M 22 128 L 26 102 C 28 92 36 86 46 84 L 64 96 L 82 84 C 92 86 100 92 102 102 L 106 128 Z" fill="url(#robeQi)"/>
    <!-- Crossed Inner Lapel -->
    <path d="M 46 84 L 64 110 L 68 128 L 60 128 L 44 94 Z" fill="url(#innerRobeQi)"/>
    <path d="M 82 84 L 56 114 L 54 128 L 64 128 L 84 94 Z" fill="#0284c7" opacity="0.8"/>
    <!-- Robe Jade Trim -->
    <path d="M 46 84 L 64 110 L 82 84" fill="none" stroke="#10b981" stroke-width="2"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 86 Q 64 90 74 86 L 74 70 Z" fill="#fed7aa"/>
    <path d="M 54 75 Q 64 80 74 75 L 74 78 Q 64 83 54 78 Z" fill="#fba86a" opacity="0.6"/>

    <!-- Head & Face -->
    <path d="M 44 46 C 44 32 84 32 84 46 C 84 66 76 76 64 77 C 52 76 44 66 44 46 Z" fill="url(#faceQi)"/>
    <!-- Ears -->
    <ellipse cx="43" cy="52" rx="3.5" ry="6.5" fill="#fba86a"/>
    <ellipse cx="85" cy="52" rx="3.5" ry="6.5" fill="#fba86a"/>

    <!-- Eyes (Glowing Spiritual Cyan) -->
    <ellipse cx="54" cy="50" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="50" r="1.8" fill="#38bdf8"/>
    <circle cx="55" cy="49" r="0.8" fill="#ffffff"/>
    <ellipse cx="74" cy="50" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="74" cy="50" r="1.8" fill="#38bdf8"/>
    <circle cx="75" cy="49" r="0.8" fill="#ffffff"/>
    <!-- Eyebrows (Sword Brows) -->
    <path d="M 48 44 Q 54 42 60 45" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M 80 44 Q 74 42 68 45" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <!-- Nose & Mouth -->
    <path d="M 64 53 L 63 60 L 66 61" stroke="#fba86a" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    <path d="M 59 67 Q 64 69 69 67" stroke="#dc2626" stroke-width="1.2" stroke-linecap="round" fill="none"/>

    <!-- Forehead Spirit Mark (Cyan Flame) -->
    <path d="M 64 36 C 62 40 61 42 64 45 C 67 42 66 40 64 36 Z" fill="#38bdf8"/>

    <!-- Hair Front & Bangs -->
    <path d="M 44 44 C 48 30 80 30 84 44 C 76 34 68 36 64 41 C 60 36 52 34 44 44 Z" fill="url(#hairQi)"/>
    <path d="M 43 45 Q 48 58 46 64 Q 44 54 41 48 Z" fill="url(#hairQi)"/>
    <path d="M 85 45 Q 80 58 82 64 Q 84 54 87 48 Z" fill="url(#hairQi)"/>

    <!-- Disciple Topknot & Jade Pin -->
    <ellipse cx="64" cy="24" rx="9" ry="8" fill="url(#hairQi)"/>
    <line x1="50" y1="23" x2="78" y2="23" stroke="#10b981" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="78" cy="23" r="2.2" fill="#34d399"/>

    <!-- Flowing Translucent Qi Ribbon Ribbon Spiraling Foreground -->
    <path d="M 18 106 Q 36 80 64 88 Q 92 96 110 74 Q 102 96 68 102 Q 38 108 18 106 Z" fill="#7dd3fc" opacity="0.6"/>
    <path d="M 18 106 Q 36 80 64 88 Q 92 96 110 74" fill="none" stroke="#e0f2fe" stroke-width="1.5" opacity="0.9"/>
  </g>

  <!-- Golden Cyan Avatar Border Ring -->
  <circle cx="64" cy="64" r="62" fill="none" stroke="#38bdf8" stroke-width="3" stroke-opacity="0.8"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#bae6fd" stroke-width="1" stroke-opacity="0.4"/>
</svg>`,

  cultivator_master: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipMaster">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgMaster" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="60%" stop-color="#022c22"/>
      <stop offset="100%" stop-color="#01140e"/>
    </radialGradient>
    <linearGradient id="robeMaster" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#047857"/>
      <stop offset="50%" stop-color="#065f46"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </linearGradient>
    <linearGradient id="goldTrimMaster" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <radialGradient id="sunAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#b45309" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipMaster)">
    <rect width="128" height="128" fill="url(#bgMaster)"/>
    
    <!-- Supreme Enlightenment Solar Halo -->
    <circle cx="64" cy="50" r="44" fill="url(#sunAura)"/>
    <circle cx="64" cy="50" r="38" fill="none" stroke="url(#goldTrimMaster)" stroke-width="1.5" stroke-dasharray="10 4 2 4"/>
    <!-- Golden rays -->
    <line x1="64" y1="8" x2="64" y2="16" stroke="#fbbf24" stroke-width="1.8"/>
    <line x1="64" y1="84" x2="64" y2="92" stroke="#fbbf24" stroke-width="1.8"/>
    <line x1="22" y1="50" x2="30" y2="50" stroke="#fbbf24" stroke-width="1.8"/>
    <line x1="98" y1="50" x2="106" y2="50" stroke="#fbbf24" stroke-width="1.8"/>

    <!-- Flowing Long White Hair Back -->
    <path d="M 36 50 Q 28 85 24 116 Q 64 122 104 116 Q 100 85 92 50 Z" fill="#e2e8f0"/>

    <!-- Venerable Master Robes -->
    <path d="M 18 128 L 22 98 C 26 88 38 82 50 80 L 64 92 L 78 80 C 90 82 102 88 106 98 L 110 128 Z" fill="url(#robeMaster)"/>
    <!-- Opulent Gold Trim on Robe -->
    <path d="M 50 80 L 64 102 L 78 80 L 74 128 L 54 128 Z" fill="url(#goldTrimMaster)"/>
    <path d="M 64 96 L 64 128" stroke="#78350f" stroke-width="1.5"/>

    <!-- Neck -->
    <path d="M 54 68 L 54 84 Q 64 88 74 84 L 74 68 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 45 46 C 45 32 83 32 83 46 C 83 66 75 75 64 76 C 53 75 45 66 45 46 Z" fill="#fed7aa"/>
    <!-- Ears -->
    <ellipse cx="44" cy="52" rx="3.5" ry="7" fill="#fed7aa"/>
    <ellipse cx="84" cy="52" rx="3.5" ry="7" fill="#fed7aa"/>

    <!-- Venerable Long White Beard and Mustache -->
    <path d="M 52 64 Q 64 69 76 64 C 74 72 70 80 68 96 Q 64 108 60 96 C 58 80 54 72 52 64 Z" fill="#f8fafc"/>
    <path d="M 52 64 Q 64 68 76 64 Q 64 62 52 64 Z" fill="#e2e8f0"/>
    <path d="M 56 63 Q 64 67 60 74 Q 64 68 68 74 Q 64 67 72 63" fill="#cbd5e1"/>

    <!-- Eyes (Wise, Serene Jade Aura) -->
    <path d="M 50 49 Q 55 46 60 49" stroke="#334155" stroke-width="2" stroke-linecap="round" fill="none"/>
    <ellipse cx="55" cy="50" rx="3" ry="2" fill="#047857"/>
    <circle cx="55" cy="50" r="1.2" fill="#34d399"/>
    <circle cx="56" cy="49" r="0.6" fill="#ffffff"/>
    <path d="M 68 49 Q 73 46 78 49" stroke="#334155" stroke-width="2" stroke-linecap="round" fill="none"/>
    <ellipse cx="73" cy="50" rx="3" ry="2" fill="#047857"/>
    <circle cx="73" cy="50" r="1.2" fill="#34d399"/>
    <circle cx="74" cy="49" r="0.6" fill="#ffffff"/>

    <!-- Long White Eyebrows extending gracefully past temples -->
    <path d="M 44 43 Q 54 39 61 43" stroke="#f8fafc" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <path d="M 84 43 Q 74 39 67 43" stroke="#f8fafc" stroke-width="2.6" stroke-linecap="round" fill="none"/>

    <!-- Ancient Jade Crown / Guan atop hair -->
    <path d="M 54 22 L 74 22 L 72 32 L 56 32 Z" fill="url(#goldTrimMaster)"/>
    <ellipse cx="64" cy="27" rx="4" ry="4" fill="#10b981"/>
    <line x1="46" y1="26" x2="82" y2="26" stroke="#fde047" stroke-width="2" stroke-linecap="round"/>
    <!-- Forehead Third Eye / Daoist Jade Pearl -->
    <circle cx="64" cy="38" r="2.5" fill="#34d399" stroke="#fbbf24" stroke-width="1"/>
  </g>

  <!-- Imperial Jade and Gold Rim -->
  <circle cx="64" cy="64" r="62" fill="none" stroke="url(#goldTrimMaster)" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#34d399" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  spirit_warrior: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipWarrior">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgWarrior" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#450a0a"/>
      <stop offset="60%" stop-color="#260808"/>
      <stop offset="100%" stop-color="#0f0202"/>
    </radialGradient>
    <linearGradient id="armorSteel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#475569"/>
      <stop offset="40%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="rubyGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fda4af"/>
      <stop offset="50%" stop-color="#f43f5e"/>
      <stop offset="100%" stop-color="#9f1239"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipWarrior)">
    <rect width="128" height="128" fill="url(#bgWarrior)"/>
    
    <!-- Martial Aura Ring -->
    <circle cx="64" cy="54" r="46" fill="none" stroke="#f43f5e" stroke-width="1.2" stroke-opacity="0.3" stroke-dasharray="6 3"/>

    <!-- High Braided Ponytail Back -->
    <path d="M 64 20 Q 86 16 98 38 Q 106 60 94 82 Q 88 56 74 34 Z" fill="#18181b"/>
    <!-- Red ribbon tied to ponytail -->
    <path d="M 66 22 Q 80 24 88 42" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" fill="none"/>

    <!-- Battle Plate Armor Shoulders -->
    <path d="M 14 128 L 22 100 C 26 90 38 84 50 82 L 64 96 L 78 82 C 90 84 102 90 106 100 L 114 128 Z" fill="url(#armorSteel)"/>
    <!-- Ruby Dragon Scale Pauldrons -->
    <path d="M 16 108 Q 32 94 48 98 L 44 116 Q 28 116 16 108 Z" fill="url(#rubyGlow)"/>
    <path d="M 112 108 Q 96 94 80 98 L 84 116 Q 100 116 112 108 Z" fill="url(#rubyGlow)"/>
    <!-- Central Chestplate Crest -->
    <polygon points="64,96 74,112 64,124 54,112" fill="url(#rubyGlow)"/>

    <!-- Neck & Gorget -->
    <path d="M 54 70 L 54 86 Q 64 90 74 86 L 74 70 Z" fill="#fed7aa"/>
    <path d="M 52 82 Q 64 86 76 82 L 74 88 Q 64 92 54 88 Z" fill="#334155"/>

    <!-- Face -->
    <path d="M 45 44 C 45 32 83 32 83 44 C 83 64 75 75 64 76 C 53 75 45 64 45 44 Z" fill="#fed7aa"/>

    <!-- Battle scar on cheek -->
    <line x1="72" y1="58" x2="78" y2="64" stroke="#f43f5e" stroke-width="1.2" stroke-linecap="round"/>

    <!-- Eyes (Fierce Crimson-Amber) -->
    <ellipse cx="54" cy="49" rx="4" ry="2.2" fill="#18181b"/>
    <circle cx="54" cy="49" r="1.8" fill="#f43f5e"/>
    <circle cx="55" cy="48" r="0.8" fill="#fef08a"/>
    <ellipse cx="74" cy="49" rx="4" ry="2.2" fill="#18181b"/>
    <circle cx="74" cy="49" r="1.8" fill="#f43f5e"/>
    <circle cx="75" cy="48" r="0.8" fill="#fef08a"/>
    <!-- Sharp Angled Brows -->
    <path d="M 48 43 L 60 45" stroke="#18181b" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M 80 43 L 68 45" stroke="#18181b" stroke-width="2.2" stroke-linecap="round"/>

    <!-- Confident Warrior Smirk -->
    <path d="M 59 66 Q 65 68 70 65" stroke="#b91c1c" stroke-width="1.6" stroke-linecap="round" fill="none"/>

    <!-- Forehead Spiritual Battle Rune -->
    <polygon points="64,34 67,41 64,44 61,41" fill="#f43f5e"/>
    <circle cx="64" cy="38" r="1" fill="#fef08a"/>

    <!-- Hair Front (Braids and Side Strands) -->
    <path d="M 45 42 C 48 30 80 30 83 42 C 76 34 64 36 64 39 C 64 36 52 34 45 42 Z" fill="#18181b"/>
    <path d="M 44 44 Q 46 62 42 70" stroke="#18181b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M 84 44 Q 82 62 86 70" stroke="#18181b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

    <!-- Floating Fiery Qi Sparks -->
    <circle cx="28" cy="46" r="1.5" fill="#f43f5e"/>
    <circle cx="34" cy="32" r="1.2" fill="#fbbf24"/>
    <circle cx="96" cy="48" r="1.5" fill="#f43f5e"/>
    <circle cx="92" cy="36" r="1.2" fill="#fbbf24"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#f43f5e" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#fbbf24" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  sword_immortal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipSword">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgSword" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="55%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <linearGradient id="swordBlade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#7dd3fc"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
    <linearGradient id="silkRobe" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipSword)">
    <rect width="128" height="128" fill="url(#bgSword)"/>

    <!-- Concentric Sword-Qi Blade Rays -->
    <circle cx="64" cy="52" r="46" fill="none" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.4"/>
    
    <!-- Floating Twin Flying Swords Behind Shoulders -->
    <!-- Left Flying Sword -->
    <g transform="translate(24, 20) rotate(-15)">
      <polygon points="6,0 10,24 8,48 4,48 2,24" fill="url(#swordBlade)"/>
      <rect x="1" y="48" width="10" height="3" fill="#fbbf24" rx="1"/>
      <rect x="4.5" y="51" width="3" height="12" fill="#0f172a"/>
      <circle cx="6" cy="65" r="2" fill="#38bdf8"/>
    </g>
    <!-- Right Flying Sword -->
    <g transform="translate(94, 20) rotate(15)">
      <polygon points="6,0 10,24 8,48 4,48 2,24" fill="url(#swordBlade)"/>
      <rect x="1" y="48" width="10" height="3" fill="#fbbf24" rx="1"/>
      <rect x="4.5" y="51" width="3" height="12" fill="#0f172a"/>
      <circle cx="6" cy="65" r="2" fill="#38bdf8"/>
    </g>

    <!-- Hair Back -->
    <path d="M 38 48 Q 28 80 24 105 Q 64 112 104 105 Q 100 80 90 48 Z" fill="#090d16"/>

    <!-- Indigo Silk Robe with Silver Embroidery -->
    <path d="M 20 128 L 24 100 C 28 90 38 84 50 82 L 64 96 L 78 82 C 90 84 100 90 104 100 L 108 128 Z" fill="url(#silkRobe)"/>
    <path d="M 50 82 L 64 104 L 78 82" fill="none" stroke="#cbd5e1" stroke-width="1.8"/>
    <path d="M 44 100 Q 64 114 84 100" fill="none" stroke="#38bdf8" stroke-width="1.2" opacity="0.7"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 86 Q 64 90 74 86 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 44 44 C 44 30 84 30 84 44 C 84 64 76 75 64 76 C 52 75 44 64 44 44 Z" fill="#fed7aa"/>

    <!-- Eyes (Piercing Silver-Azure) -->
    <ellipse cx="54" cy="49" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="49" r="1.8" fill="#e0f2fe"/>
    <circle cx="54" cy="49" r="0.9" fill="#0284c7"/>
    <ellipse cx="74" cy="49" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="74" cy="49" r="1.8" fill="#e0f2fe"/>
    <circle cx="74" cy="49" r="0.9" fill="#0284c7"/>
    <!-- Sword Eyebrows -->
    <path d="M 48 43 L 60 44" stroke="#090d16" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M 80 43 L 68 44" stroke="#090d16" stroke-width="2.2" stroke-linecap="round"/>

    <!-- Calm Smile -->
    <path d="M 59 66 Q 64 68 69 66" stroke="#991b1b" stroke-width="1.4" stroke-linecap="round" fill="none"/>

    <!-- Hair Front (Wind-swept with silver bangs) -->
    <path d="M 44 42 C 48 30 80 30 84 42 C 76 34 64 36 64 39 C 64 36 52 34 44 42 Z" fill="#090d16"/>
    <path d="M 46 42 Q 54 48 50 62" stroke="#e2e8f0" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M 82 42 Q 74 48 78 62" stroke="#090d16" stroke-width="2" stroke-linecap="round" fill="none"/>

    <!-- Whirling Sword Aura Crescent -->
    <path d="M 22 92 Q 46 72 64 80 Q 82 88 106 72" fill="none" stroke="#7dd3fc" stroke-width="1.8" opacity="0.8"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#6366f1" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  // --------------------------------------------------------------------------
  // 2. Personajes de fantasía oriental y occidental
  // --------------------------------------------------------------------------
  shadow_assassin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipAssassin">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgAssassin" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#2e1065"/>
      <stop offset="55%" stop-color="#17072b"/>
      <stop offset="100%" stop-color="#05010a"/>
    </radialGradient>
    <radialGradient id="amethystEye" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#d8b4fe"/>
      <stop offset="80%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#6b21a8"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipAssassin)">
    <rect width="128" height="128" fill="url(#bgAssassin)"/>

    <!-- Shadow Mist Wisps in Background -->
    <path d="M 10 40 Q 30 20 64 30 Q 98 40 118 20 Q 98 60 64 50 Q 30 60 10 40 Z" fill="#3b0764" opacity="0.5"/>
    <circle cx="64" cy="54" r="44" fill="none" stroke="#c084fc" stroke-width="0.8" stroke-opacity="0.3" stroke-dasharray="4 6"/>

    <!-- Cowl / Cloak Shoulders -->
    <path d="M 16 128 L 22 96 C 26 84 38 78 50 76 L 64 88 L 78 76 C 90 78 102 84 106 96 L 112 128 Z" fill="#090514"/>
    <path d="M 32 94 L 64 120 L 96 94" fill="none" stroke="#581c87" stroke-width="2"/>

    <!-- Deep Hood (Obsidian Fabric) -->
    <path d="M 36 50 C 36 22 92 22 92 50 C 92 78 86 86 64 88 C 42 86 36 78 36 50 Z" fill="#0f0728"/>
    <!-- Hood Inner Shadow -->
    <path d="M 42 52 C 42 30 86 30 86 52 C 86 74 80 80 64 82 C 48 80 42 74 42 52 Z" fill="#05010e"/>

    <!-- Mask Covering Lower Face -->
    <path d="M 46 56 C 48 54 80 54 82 56 L 80 76 C 76 80 64 84 64 84 C 64 84 52 80 48 76 Z" fill="#1e103a"/>
    <path d="M 48 64 Q 64 70 80 64" fill="none" stroke="#7e22ce" stroke-width="1.2"/>

    <!-- Glowing Amethyst Eyes Piercing the Darkness -->
    <ellipse cx="53" cy="50" rx="4.5" ry="2.4" fill="url(#amethystEye)"/>
    <circle cx="54" cy="50" r="1" fill="#ffffff"/>
    <ellipse cx="75" cy="50" rx="4.5" ry="2.4" fill="url(#amethystEye)"/>
    <circle cx="76" cy="50" r="1" fill="#ffffff"/>

    <!-- Violet Eye Vapor Trail -->
    <path d="M 50 50 Q 38 48 30 42" stroke="#c084fc" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.8"/>
    <path d="M 78 50 Q 90 48 98 42" stroke="#c084fc" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.8"/>

    <!-- Amethyst Dagger Hilt on Shoulder -->
    <polygon points="26,88 32,82 36,86 30,92" fill="#c084fc"/>
    <line x1="22" y1="94" x2="28" y2="88" stroke="#f3e8ff" stroke-width="2"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#a855f7" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#e9d5ff" stroke-width="1" stroke-opacity="0.5"/>
</svg>`,

  arcane_mage: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipMage">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgMage" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e103a"/>
      <stop offset="55%" stop-color="#0f0721"/>
      <stop offset="100%" stop-color="#030108"/>
    </radialGradient>
    <linearGradient id="hatFabric" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4338ca"/>
      <stop offset="60%" stop-color="#312e81"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
    <radialGradient id="manaOrb" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#67e8f9"/>
      <stop offset="80%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#0e7490"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipMage)">
    <rect width="128" height="128" fill="url(#bgMage)"/>

    <!-- Arcane Spell Circle in Backdrop -->
    <circle cx="64" cy="58" r="48" fill="none" stroke="#818cf8" stroke-width="1" stroke-opacity="0.3" stroke-dasharray="8 4 2 4"/>
    <circle cx="64" cy="58" r="42" fill="none" stroke="#a78bfa" stroke-width="0.7" stroke-opacity="0.25"/>

    <!-- Flowing Lavender Hair (Back) -->
    <path d="M 34 56 Q 22 90 26 118 Q 64 124 102 118 Q 106 90 94 56 Z" fill="#a78bfa"/>

    <!-- Arcane Robes Shoulders -->
    <path d="M 18 128 L 24 100 C 28 90 38 84 50 82 L 64 96 L 78 82 C 90 84 100 90 104 100 L 110 128 Z" fill="url(#hatFabric)"/>
    <!-- Gold Arcane Runes on Collar -->
    <path d="M 50 82 L 64 102 L 78 82" fill="none" stroke="#facc15" stroke-width="1.8"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 86 Q 64 90 74 86 L 74 70 Z" fill="#ffedd5"/>

    <!-- Face -->
    <path d="M 45 46 C 45 34 83 34 83 46 C 83 66 75 76 64 77 C 53 76 45 66 45 46 Z" fill="#ffedd5"/>

    <!-- Eyes (Mystical Glowing Cyan-Violet) -->
    <ellipse cx="54" cy="51" rx="4" ry="2.4" fill="#0f172a"/>
    <circle cx="54" cy="51" r="1.8" fill="#38bdf8"/>
    <circle cx="55" cy="50" r="0.8" fill="#ffffff"/>
    <ellipse cx="74" cy="51" rx="4" ry="2.4" fill="#0f172a"/>
    <circle cx="74" cy="51" r="1.8" fill="#38bdf8"/>
    <circle cx="75" cy="50" r="0.8" fill="#ffffff"/>
    <!-- Gentle Curved Eyebrows -->
    <path d="M 49 46 Q 54 44 59 47" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M 79 46 Q 74 44 69 47" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <!-- Soft Smile -->
    <path d="M 60 67 Q 64 69 68 67" stroke="#f43f5e" stroke-width="1.4" stroke-linecap="round" fill="none"/>

    <!-- Lavender Bangs -->
    <path d="M 45 44 C 48 34 80 34 83 44 C 74 38 66 40 64 45 C 62 40 54 38 45 44 Z" fill="#c4b5fd"/>
    <path d="M 44 46 Q 48 64 42 74" stroke="#c4b5fd" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <path d="M 84 46 Q 80 64 86 74" stroke="#c4b5fd" stroke-width="2.6" stroke-linecap="round" fill="none"/>

    <!-- Classic Pointed Wizard Hat with Moon Buckle -->
    <!-- Hat Brim -->
    <ellipse cx="64" cy="38" rx="46" ry="12" fill="url(#hatFabric)"/>
    <ellipse cx="64" cy="37" rx="45" ry="11" fill="none" stroke="#facc15" stroke-width="1.4" opacity="0.8"/>
    <!-- Hat Cone -->
    <path d="M 38 36 Q 60 12 74 6 Q 66 18 84 36 Z" fill="url(#hatFabric)"/>
    <!-- Hat Band and Golden Crescent Moon -->
    <path d="M 40 37 Q 64 44 88 37 Q 64 41 40 37 Z" fill="#818cf8"/>
    <path d="M 62 34 A 4 4 0 1 0 66 38 A 3 3 0 1 1 62 34 Z" fill="#facc15"/>

    <!-- Floating Mana Orb beside shoulder -->
    <circle cx="24" cy="68" r="5" fill="url(#manaOrb)"/>
    <circle cx="104" cy="68" r="5" fill="url(#manaOrb)"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#818cf8" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#facc15" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  paladin_dawn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipPaladin">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgPaladin" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#451a03"/>
      <stop offset="60%" stop-color="#1c0a01"/>
      <stop offset="100%" stop-color="#0a0300"/>
    </radialGradient>
    <linearGradient id="paladinSteel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#64748b"/>
    </linearGradient>
    <linearGradient id="paladinGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipPaladin)">
    <rect width="128" height="128" fill="url(#bgPaladin)"/>

    <!-- Radiant Dawn Sunburst Halo -->
    <circle cx="64" cy="48" r="42" fill="none" stroke="url(#paladinGold)" stroke-width="1.5" stroke-dasharray="12 4 4 4"/>
    <circle cx="64" cy="48" r="36" fill="#fef08a" opacity="0.15"/>

    <!-- Blonde Hair Back -->
    <path d="M 38 46 Q 32 76 36 94 Q 64 98 92 94 Q 96 76 90 46 Z" fill="#eab308"/>

    <!-- Polished Silver Cuirass with Gold Trim -->
    <path d="M 16 128 L 22 98 C 26 88 38 82 50 80 L 64 94 L 78 80 C 90 82 102 88 106 98 L 112 128 Z" fill="url(#paladinSteel)"/>
    <!-- Solar Sunburst Emblem on Chestplate -->
    <circle cx="64" cy="110" r="7" fill="url(#paladinGold)"/>
    <polygon points="64,98 67,106 75,103 69,110 76,117 68,116 64,124 60,116 52,117 59,110 53,103 61,106" fill="url(#paladinGold)"/>

    <!-- High Gorget Collar -->
    <path d="M 52 78 L 76 78 L 72 88 L 56 88 Z" fill="url(#paladinSteel)"/>
    <path d="M 54 80 L 74 80" stroke="url(#paladinGold)" stroke-width="1.8"/>

    <!-- Face -->
    <path d="M 45 44 C 45 32 83 32 83 44 C 83 65 75 75 64 76 C 53 75 45 65 45 44 Z" fill="#fed7aa"/>

    <!-- Eyes (Warm Amber-Gold) -->
    <ellipse cx="54" cy="49" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="49" r="1.8" fill="#f59e0b"/>
    <circle cx="55" cy="48" r="0.8" fill="#ffffff"/>
    <ellipse cx="74" cy="49" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="74" cy="49" r="1.8" fill="#f59e0b"/>
    <circle cx="75" cy="48" r="0.8" fill="#ffffff"/>
    <!-- Resolute Eyebrows -->
    <path d="M 48 44 L 60 45" stroke="#a16207" stroke-width="2" stroke-linecap="round"/>
    <path d="M 80 44 L 68 45" stroke="#a16207" stroke-width="2" stroke-linecap="round"/>

    <!-- Noble Smile -->
    <path d="M 59 66 Q 64 68 69 66" stroke="#991b1b" stroke-width="1.4" stroke-linecap="round" fill="none"/>

    <!-- Short Golden Hair Front -->
    <path d="M 45 42 C 48 30 80 30 83 42 C 75 35 65 37 64 40 C 63 37 53 35 45 42 Z" fill="#fde047"/>
    <path d="M 44 44 Q 48 54 44 62" stroke="#fde047" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M 84 44 Q 80 54 84 62" stroke="#fde047" stroke-width="2" stroke-linecap="round" fill="none"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="url(#paladinGold)" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#fef08a" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  // --------------------------------------------------------------------------
  // 3. Lectores y lectoras protagonistas
  // --------------------------------------------------------------------------
  novel_reader_m: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipReaderM">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgReaderM" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#0f2b38"/>
      <stop offset="60%" stop-color="#081820"/>
      <stop offset="100%" stop-color="#02080c"/>
    </radialGradient>
    <linearGradient id="screenGlow" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipReaderM)">
    <rect width="128" height="128" fill="url(#bgReaderM)"/>

    <!-- Subtle Floating Novel Text Matrix Stream in Background -->
    <text x="20" y="28" font-size="6" fill="#38bdf8" opacity="0.3" font-family="monospace">Cap. 1420: Ascensión...</text>
    <text x="36" y="40" font-size="6" fill="#2dd4bf" opacity="0.25" font-family="monospace">Qi +500</text>
    <circle cx="64" cy="54" r="44" fill="none" stroke="#06b6d4" stroke-width="0.8" stroke-opacity="0.3" stroke-dasharray="6 4"/>

    <!-- Dark Casual Hoodie Shoulders -->
    <path d="M 18 128 L 24 100 C 28 88 40 84 50 82 L 64 94 L 78 82 C 88 84 100 88 104 100 L 110 128 Z" fill="#1e293b"/>
    <path d="M 50 82 Q 64 94 78 82" fill="none" stroke="#0ea5e9" stroke-width="1.8"/>

    <!-- Glowing Cyber Wireless Headphones Neckband -->
    <path d="M 40 76 Q 64 88 88 76" stroke="#06b6d4" stroke-width="3" stroke-linecap="round" fill="none"/>
    <rect x="36" y="66" width="7" height="13" rx="3.5" fill="#0891b2"/>
    <rect x="85" y="66" width="7" height="13" rx="3.5" fill="#0891b2"/>

    <!-- Neck with Soft Screen Glow -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face (Illuminated by Cyan Novel Glow from below) -->
    <path d="M 45 44 C 45 32 83 32 83 44 C 83 64 75 74 64 75 C 53 74 45 64 45 44 Z" fill="#fed7aa"/>
    <path d="M 45 58 Q 64 76 83 58 L 83 74 C 75 78 53 78 45 74 Z" fill="#38bdf8" opacity="0.25"/>

    <!-- Eyes (Focused, Curious, Cyan Screen Reflection) -->
    <ellipse cx="54" cy="49" rx="3.8" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="49" r="1.6" fill="#0284c7"/>
    <circle cx="55" cy="48" r="0.8" fill="#38bdf8"/>
    <ellipse cx="74" cy="49" rx="3.8" ry="2.2" fill="#0f172a"/>
    <circle cx="74" cy="49" r="1.6" fill="#0284c7"/>
    <circle cx="75" cy="48" r="0.8" fill="#38bdf8"/>
    <!-- Brows -->
    <path d="M 49 44 Q 54 42 59 45" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M 79 44 Q 74 42 69 45" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round" fill="none"/>

    <!-- Smile of Immersion in Novel -->
    <path d="M 60 65 Q 64 68 68 65" stroke="#be123c" stroke-width="1.4" stroke-linecap="round" fill="none"/>

    <!-- Modern Dark Undercut Hair -->
    <path d="M 44 42 C 46 28 82 28 84 42 C 78 34 66 34 64 38 C 62 34 50 34 44 42 Z" fill="#0f172a"/>
    <path d="M 44 42 Q 47 50 44 58" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" fill="none"/>

    <!-- Holographic Floating Reader Device Screen at Bottom Foreground -->
    <rect x="36" y="94" width="56" height="30" rx="3" fill="#0284c7" opacity="0.6"/>
    <rect x="38" y="96" width="52" height="26" rx="2" fill="#082f49"/>
    <!-- Holographic Novel Pages on Screen -->
    <line x1="42" y1="102" x2="86" y2="102" stroke="#38bdf8" stroke-width="1.5"/>
    <line x1="42" y1="107" x2="80" y2="107" stroke="#7dd3fc" stroke-width="1.2"/>
    <line x1="42" y1="112" x2="74" y2="112" stroke="#7dd3fc" stroke-width="1.2"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#06b6d4" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  novel_reader_f: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipReaderF">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgReaderF" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#3b1220"/>
      <stop offset="60%" stop-color="#1f0710"/>
      <stop offset="100%" stop-color="#0a0205"/>
    </radialGradient>
    <radialGradient id="magicGrimoire" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.9"/>
      <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#b45309" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipReaderF)">
    <rect width="128" height="128" fill="url(#bgReaderF)"/>

    <!-- Magic Firefly Book Sparks in Background -->
    <circle cx="64" cy="54" r="44" fill="none" stroke="#fb7185" stroke-width="0.8" stroke-opacity="0.3" stroke-dasharray="6 4"/>
    <circle cx="28" cy="40" r="1.5" fill="#fde047"/>
    <circle cx="98" cy="36" r="1.5" fill="#fde047"/>
    <circle cx="34" cy="62" r="1.2" fill="#fb7185"/>
    <circle cx="94" cy="64" r="1.2" fill="#fb7185"/>

    <!-- Auburn Hair Back & Loose Bun -->
    <ellipse cx="64" cy="22" rx="14" ry="11" fill="#78350f"/>
    <!-- Golden Quill Hairpin in Bun -->
    <line x1="46" y1="20" x2="82" y2="24" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
    <path d="M 34 50 Q 22 86 26 116 Q 64 122 102 116 Q 106 86 94 50 Z" fill="#78350f"/>

    <!-- Cozy Oversized Knit Sweater -->
    <path d="M 18 128 L 24 100 C 28 88 40 84 50 82 L 64 94 L 78 82 C 88 84 100 88 104 100 L 110 128 Z" fill="#831843"/>
    <path d="M 50 82 Q 64 94 78 82" fill="none" stroke="#f43f5e" stroke-width="2"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 45 45 C 45 33 83 33 83 45 C 83 65 75 75 64 76 C 53 75 45 65 45 45 Z" fill="#fed7aa"/>

    <!-- Stylish Round Gold Glasses -->
    <circle cx="54" cy="50" r="6.5" fill="none" stroke="#f59e0b" stroke-width="1.4"/>
    <circle cx="74" cy="50" r="6.5" fill="none" stroke="#f59e0b" stroke-width="1.4"/>
    <line x1="60.5" y1="50" x2="67.5" y2="50" stroke="#f59e0b" stroke-width="1.4"/>

    <!-- Eyes (Enchanted Amber Behind Lenses) -->
    <ellipse cx="54" cy="50" rx="3.5" ry="2" fill="#0f172a"/>
    <circle cx="54" cy="50" r="1.5" fill="#f59e0b"/>
    <circle cx="55" cy="49" r="0.7" fill="#ffffff"/>
    <ellipse cx="74" cy="50" rx="3.5" ry="2" fill="#0f172a"/>
    <circle cx="74" cy="50" r="1.5" fill="#f59e0b"/>
    <circle cx="75" cy="49" r="0.7" fill="#ffffff"/>
    <!-- Brows -->
    <path d="M 49 43 Q 54 41 59 44" stroke="#78350f" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <path d="M 79 43 Q 74 41 69 44" stroke="#78350f" stroke-width="1.6" stroke-linecap="round" fill="none"/>

    <!-- Pleasant Gentle Smile -->
    <path d="M 60 66 Q 64 69 68 66" stroke="#e11d48" stroke-width="1.4" stroke-linecap="round" fill="none"/>

    <!-- Auburn Bangs Framing Face -->
    <path d="M 45 44 C 48 34 80 34 83 44 C 74 37 66 38 64 42 C 62 38 54 37 45 44 Z" fill="#9a3412"/>
    <path d="M 44 46 Q 48 64 42 74" stroke="#9a3412" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M 84 46 Q 80 64 86 74" stroke="#9a3412" stroke-width="2.4" stroke-linecap="round" fill="none"/>

    <!-- Glowing Open Novel Book in Foreground -->
    <g transform="translate(34, 94)">
      <!-- Book Cover -->
      <polygon points="0,18 30,28 60,18 60,34 30,42 0,34" fill="#450a0a"/>
      <!-- Pages -->
      <polygon points="2,16 30,25 30,38 2,30" fill="#fef08a"/>
      <polygon points="58,16 30,25 30,38 58,30" fill="#fef9c3"/>
      <!-- Book Spine -->
      <line x1="30" y1="25" x2="30" y2="40" stroke="#78350f" stroke-width="1.5"/>
      <!-- Glowing Words Spiraling Upward -->
      <circle cx="30" cy="18" r="6" fill="url(#magicGrimoire)"/>
    </g>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#f43f5e" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#fef08a" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  night_owl_reader: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipNightOwl">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgNightOwl" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#172554"/>
      <stop offset="60%" stop-color="#0c1329"/>
      <stop offset="100%" stop-color="#030712"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipNightOwl)">
    <rect width="128" height="128" fill="url(#bgNightOwl)"/>

    <!-- Crescent Moon and Stars in Background -->
    <path d="M 96 22 A 8 8 0 1 0 102 32 A 6 6 0 1 1 96 22 Z" fill="#facc15"/>
    <circle cx="28" cy="24" r="1.2" fill="#ffffff"/>
    <circle cx="44" cy="18" r="1" fill="#93c5fd"/>
    <circle cx="82" cy="16" r="1.2" fill="#ffffff"/>

    <!-- Cozy Midnight Hoodie Shoulders -->
    <path d="M 18 128 L 24 100 C 28 88 40 84 50 82 L 64 94 L 78 82 C 88 84 100 88 104 100 L 110 128 Z" fill="#1e1b4b"/>
    <!-- Small Crescent Moon Badge on Chest -->
    <path d="M 44 98 A 4 4 0 1 0 47 104 A 3 3 0 1 1 44 98 Z" fill="#38bdf8"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 45 45 C 45 33 83 33 83 45 C 83 65 75 75 64 76 C 53 75 45 65 45 45 Z" fill="#fed7aa"/>

    <!-- Sleepy / Relaxed Midnight Eyes -->
    <ellipse cx="54" cy="50" rx="3.8" ry="2" fill="#0f172a"/>
    <circle cx="54" cy="50" r="1.5" fill="#38bdf8"/>
    <circle cx="55" cy="49" r="0.7" fill="#ffffff"/>
    <ellipse cx="74" cy="50" rx="3.8" ry="2" fill="#0f172a"/>
    <circle cx="74" cy="50" r="1.5" fill="#38bdf8"/>
    <circle cx="75" cy="49" r="0.7" fill="#ffffff"/>
    <!-- Gentle Brows -->
    <path d="M 49 44 Q 54 43 59 45" stroke="#1e1b4b" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M 79 44 Q 74 43 69 45" stroke="#1e1b4b" stroke-width="1.8" stroke-linecap="round" fill="none"/>

    <path d="M 60 66 Q 64 68 68 66" stroke="#dc2626" stroke-width="1.4" stroke-linecap="round" fill="none"/>

    <!-- Messy Dark Blue Midnight Hair -->
    <path d="M 44 42 C 46 28 82 28 84 42 C 78 34 66 34 64 38 C 62 34 50 34 44 42 Z" fill="#172554"/>
    <path d="M 44 42 Q 47 50 43 60" stroke="#172554" stroke-width="2.2" stroke-linecap="round" fill="none"/>

    <!-- Cute Tiny Spirit Owl on Shoulder -->
    <g transform="translate(86, 70)">
      <ellipse cx="10" cy="12" rx="7" ry="9" fill="#38bdf8"/>
      <!-- Owl Eyes -->
      <circle cx="7" cy="10" r="2.8" fill="#ffffff"/>
      <circle cx="7" cy="10" r="1.4" fill="#facc15"/>
      <circle cx="13" cy="10" r="2.8" fill="#ffffff"/>
      <circle cx="13" cy="10" r="1.4" fill="#facc15"/>
      <!-- Beak -->
      <polygon points="10,12 8,14 12,14" fill="#f97316"/>
    </g>

    <!-- Glowing Tablet at Bottom -->
    <rect x="42" y="96" width="44" height="26" rx="3" fill="#0284c7" opacity="0.8"/>
    <rect x="44" y="98" width="40" height="22" rx="2" fill="#0369a1"/>
    <line x1="48" y1="104" x2="80" y2="104" stroke="#e0f2fe" stroke-width="1.5"/>
    <line x1="48" y1="109" x2="74" y2="109" stroke="#bae6fd" stroke-width="1.2"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#3b82f6" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#facc15" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  // --------------------------------------------------------------------------
  // 4. Dragones, fénix y espíritus mágicos
  // --------------------------------------------------------------------------
  dragon_sovereign: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipDragon">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgDragon" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#0c2d48"/>
      <stop offset="60%" stop-color="#051624"/>
      <stop offset="100%" stop-color="#01070c"/>
    </radialGradient>
    <linearGradient id="dragonHorn" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="60%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#7dd3fc"/>
    </linearGradient>
    <linearGradient id="dragonScales" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#082f49"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipDragon)">
    <rect width="128" height="128" fill="url(#bgDragon)"/>

    <!-- Dragon Lightning Arcs in Background -->
    <path d="M 20 30 L 32 44 L 28 56 L 42 68" stroke="#38bdf8" stroke-width="1.2" fill="none" opacity="0.4"/>
    <path d="M 108 30 L 96 44 L 100 56 L 86 68" stroke="#38bdf8" stroke-width="1.2" fill="none" opacity="0.4"/>
    <circle cx="64" cy="54" r="44" fill="none" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.3"/>

    <!-- Majestic Obsidian-Azure Curved Horns -->
    <path d="M 46 36 C 40 24 28 16 18 18 C 22 28 32 38 42 42 Z" fill="url(#dragonHorn)"/>
    <path d="M 82 36 C 88 24 100 16 110 18 C 106 28 96 38 86 42 Z" fill="url(#dragonHorn)"/>
    <!-- Gold Rings on Horns -->
    <line x1="28" y1="20" x2="32" y2="28" stroke="#facc15" stroke-width="2"/>
    <line x1="100" y1="20" x2="96" y2="28" stroke="#facc15" stroke-width="2"/>

    <!-- Scaled Dragon Armor Shoulders -->
    <path d="M 16 128 L 22 98 C 26 88 38 82 50 80 L 64 94 L 78 80 C 90 82 102 88 106 98 L 112 128 Z" fill="url(#dragonScales)"/>
    <path d="M 50 80 L 64 102 L 78 80" fill="none" stroke="#38bdf8" stroke-width="2"/>

    <!-- Neck with Subtle Scales -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 45 44 C 45 32 83 32 83 44 C 83 64 75 75 64 76 C 53 75 45 64 45 44 Z" fill="#fed7aa"/>
    <!-- Iridescent Temple Scales -->
    <circle cx="46" cy="48" r="1.5" fill="#38bdf8"/>
    <circle cx="48" cy="52" r="1.5" fill="#38bdf8"/>
    <circle cx="82" cy="48" r="1.5" fill="#38bdf8"/>
    <circle cx="80" cy="52" r="1.5" fill="#38bdf8"/>

    <!-- Slitted Reptilian Amber-Gold Dragon Eyes -->
    <ellipse cx="54" cy="49" rx="4" ry="2.4" fill="#0f172a"/>
    <circle cx="54" cy="49" r="2.2" fill="#facc15"/>
    <line x1="54" y1="46.8" x2="54" y2="51.2" stroke="#0f172a" stroke-width="1.2"/>
    <ellipse cx="74" cy="49" rx="4" ry="2.4" fill="#0f172a"/>
    <circle cx="74" cy="49" r="2.2" fill="#facc15"/>
    <line x1="74" y1="46.8" x2="74" y2="51.2" stroke="#0f172a" stroke-width="1.2"/>
    <!-- Fierce Dragon Brows -->
    <path d="M 48 43 L 60 45" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M 80 43 L 68 45" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>

    <!-- Sovereign Smirk -->
    <path d="M 59 66 Q 64 68 69 66" stroke="#0284c7" stroke-width="1.5" stroke-linecap="round" fill="none"/>

    <!-- Deep Blue Hair Front -->
    <path d="M 45 42 C 48 30 80 30 83 42 C 75 35 65 37 64 40 C 63 37 53 35 45 42 Z" fill="#0f172a"/>

    <!-- Floating Dragon Pearl Orb at Throat -->
    <circle cx="64" cy="94" r="6" fill="#38bdf8" stroke="#ffffff" stroke-width="1"/>
    <circle cx="64" cy="94" r="3" fill="#ffffff" opacity="0.8"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#0284c7" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#facc15" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  phoenix_maiden: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipPhoenix">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgPhoenix" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#4c0519"/>
      <stop offset="60%" stop-color="#2a020d"/>
      <stop offset="100%" stop-color="#0f0105"/>
    </radialGradient>
    <linearGradient id="phoenixFeather" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipPhoenix)">
    <rect width="128" height="128" fill="url(#bgPhoenix)"/>

    <!-- Flaming Solar Wings Silhouette in Background -->
    <path d="M 20 40 Q 40 24 64 36 Q 88 24 108 40 Q 88 70 64 60 Q 40 70 20 40 Z" fill="#be123c" opacity="0.35"/>
    <circle cx="64" cy="54" r="44" fill="none" stroke="#f43f5e" stroke-width="0.8" stroke-opacity="0.3"/>

    <!-- Dark Hair in High Imperial Phoenix Bun -->
    <ellipse cx="64" cy="22" rx="14" ry="11" fill="#18181b"/>
    <!-- Ornate Golden Phoenix Hairpins Spanning Outward -->
    <path d="M 44 18 Q 28 12 20 16" stroke="#facc15" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M 84 18 Q 100 12 108 16" stroke="#facc15" stroke-width="2" stroke-linecap="round" fill="none"/>
    <!-- Golden Phoenix Tail Plumes Falling Behind -->
    <path d="M 34 50 Q 22 86 24 116 Q 64 122 104 116 Q 106 86 94 50 Z" fill="#18181b"/>

    <!-- Fiery Robes (Crimson to Gold Gradient) -->
    <path d="M 18 128 L 24 100 C 28 88 40 84 50 82 L 64 94 L 78 82 C 88 84 100 88 104 100 L 110 128 Z" fill="url(#phoenixFeather)"/>
    <path d="M 50 82 L 64 104 L 78 82" fill="none" stroke="#facc15" stroke-width="2"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 45 45 C 45 33 83 33 83 45 C 83 65 75 75 64 76 C 53 75 45 65 45 45 Z" fill="#fed7aa"/>

    <!-- Slanted Phoenix Eyes (Flaming Amber-Red) -->
    <ellipse cx="54" cy="49" rx="4" ry="2.2" fill="#18181b"/>
    <circle cx="54" cy="49" r="1.8" fill="#f97316"/>
    <circle cx="55" cy="48" r="0.8" fill="#fef08a"/>
    <ellipse cx="74" cy="49" rx="4" ry="2.2" fill="#18181b"/>
    <circle cx="74" cy="49" r="1.8" fill="#f97316"/>
    <circle cx="75" cy="48" r="0.8" fill="#fef08a"/>
    <!-- Red Eyeliner Wing -->
    <path d="M 57 49 Q 60 48 62 47" stroke="#e11d48" stroke-width="1.2" stroke-linecap="round" fill="none"/>
    <path d="M 71 49 Q 68 48 66 47" stroke="#e11d48" stroke-width="1.2" stroke-linecap="round" fill="none"/>

    <!-- Brows -->
    <path d="M 48 43 Q 54 41 59 44" stroke="#18181b" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M 80 43 Q 74 41 69 44" stroke="#18181b" stroke-width="1.8" stroke-linecap="round" fill="none"/>

    <path d="M 59 66 Q 64 68 69 66" stroke="#be123c" stroke-width="1.5" stroke-linecap="round" fill="none"/>

    <!-- Forehead Vermilion Phoenix Mark -->
    <path d="M 64 36 C 62 40 61 42 64 45 C 67 42 66 40 64 36 Z" fill="#e11d48"/>

    <!-- Hair Bangs -->
    <path d="M 45 44 C 48 34 80 34 83 44 C 74 37 66 38 64 42 C 62 38 54 37 45 44 Z" fill="#18181b"/>

    <!-- Floating Burning Phoenix Feathers in Foreground -->
    <path d="M 24 74 Q 30 68 32 78 Q 28 82 24 74 Z" fill="url(#phoenixFeather)"/>
    <path d="M 104 74 Q 98 68 96 78 Q 100 82 104 74 Z" fill="url(#phoenixFeather)"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#e11d48" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#facc15" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  kitsune_spirit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipKitsune">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgKitsune" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#2d1340"/>
      <stop offset="60%" stop-color="#160821"/>
      <stop offset="100%" stop-color="#06020a"/>
    </radialGradient>
    <radialGradient id="kitsunebi" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#67e8f9"/>
      <stop offset="80%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipKitsune)">
    <rect width="128" height="128" fill="url(#bgKitsune)"/>

    <!-- Floating Sakura Petals in Background -->
    <circle cx="64" cy="54" r="44" fill="none" stroke="#e879f9" stroke-width="0.8" stroke-opacity="0.3"/>
    <ellipse cx="30" cy="36" rx="2" ry="3.5" fill="#f472b6" transform="rotate(30 30 36)"/>
    <ellipse cx="98" cy="38" rx="2" ry="3.5" fill="#f472b6" transform="rotate(-20 98 38)"/>

    <!-- Fluffy Snow-White Fox Ears with Crimson Tips -->
    <polygon points="34,38 46,12 56,36" fill="#f8fafc"/>
    <polygon points="38,36 46,14 52,36" fill="#f43f5e" opacity="0.6"/>
    <polygon points="94,38 82,12 72,36" fill="#f8fafc"/>
    <polygon points="90,36 82,14 76,36" fill="#f43f5e" opacity="0.6"/>

    <!-- White Hair Flowing Back -->
    <path d="M 36 50 Q 24 86 26 116 Q 64 122 102 116 Q 104 86 92 50 Z" fill="#f1f5f9"/>

    <!-- Crimson & White Kimono -->
    <path d="M 18 128 L 24 100 C 28 88 40 84 50 82 L 64 94 L 78 82 C 88 84 100 88 104 100 L 110 128 Z" fill="#e11d48"/>
    <path d="M 50 82 L 64 106 L 56 128 L 72 128 L 78 82" fill="#ffffff"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 45 45 C 45 33 83 33 83 45 C 83 65 75 75 64 76 C 53 75 45 65 45 45 Z" fill="#fed7aa"/>

    <!-- Cunning Golden Eyes with Red Eyeliner -->
    <ellipse cx="54" cy="49" rx="3.8" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="49" r="1.8" fill="#facc15"/>
    <circle cx="55" cy="48" r="0.8" fill="#ffffff"/>
    <ellipse cx="74" cy="49" rx="3.8" ry="2.2" fill="#0f172a"/>
    <circle cx="74" cy="49" r="1.8" fill="#facc15"/>
    <circle cx="75" cy="48" r="0.8" fill="#ffffff"/>
    <path d="M 57 49 Q 60 48 62 47" stroke="#e11d48" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    <path d="M 71 49 Q 68 48 66 47" stroke="#e11d48" stroke-width="1.4" stroke-linecap="round" fill="none"/>

    <!-- Playful Smile -->
    <path d="M 60 66 Q 64 68 68 66" stroke="#be123c" stroke-width="1.4" stroke-linecap="round" fill="none"/>

    <!-- Porcelain Kitsune Fox Mask Worn Tilted on Head -->
    <g transform="translate(80, 26) rotate(18)">
      <ellipse cx="14" cy="18" rx="10" ry="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
      <!-- Mask Ears -->
      <polygon points="6,6 10,0 14,8" fill="#ffffff"/>
      <polygon points="14,8 18,0 22,6" fill="#ffffff"/>
      <!-- Red Swirl Markings on Mask -->
      <path d="M 8 16 Q 14 18 12 24" stroke="#e11d48" stroke-width="1.2" fill="none"/>
      <path d="M 20 16 Q 14 18 16 24" stroke="#e11d48" stroke-width="1.2" fill="none"/>
      <ellipse cx="14" cy="24" rx="2" ry="1.5" fill="#18181b"/>
    </g>

    <!-- Floating Cyan Kitsunebi Spirit Flames -->
    <circle cx="24" cy="62" r="5" fill="url(#kitsunebi)"/>
    <circle cx="104" cy="62" r="5" fill="url(#kitsunebi)"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#e879f9" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#38bdf8" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  // --------------------------------------------------------------------------
  // 5. Alquimistas, bibliotecarios y guardianes
  // --------------------------------------------------------------------------
  grand_alchemist: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipAlchemist">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgAlchemist" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="60%" stop-color="#022c22"/>
      <stop offset="100%" stop-color="#01140e"/>
    </radialGradient>
    <radialGradient id="elixirGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipAlchemist)">
    <rect width="128" height="128" fill="url(#bgAlchemist)"/>

    <!-- Alchemical Geometric Diagram in Background -->
    <circle cx="64" cy="54" r="44" fill="none" stroke="#34d399" stroke-width="0.8" stroke-opacity="0.3"/>
    <polygon points="64,14 98,74 30,74" fill="none" stroke="#34d399" stroke-width="0.8" stroke-opacity="0.25"/>

    <!-- Dark Jade Scholar Robes & Bandolier -->
    <path d="M 18 128 L 24 100 C 28 88 40 84 50 82 L 64 94 L 78 82 C 88 84 100 88 104 100 L 110 128 Z" fill="#065f46"/>
    <!-- Leather Potion Bandolier Strap -->
    <line x1="28" y1="88" x2="84" y2="128" stroke="#78350f" stroke-width="4"/>
    <!-- Small Potion Vials in Strap -->
    <rect x="44" y="96" width="4" height="8" rx="1.5" fill="#38bdf8"/>
    <rect x="54" y="104" width="4" height="8" rx="1.5" fill="#f43f5e"/>
    <rect x="64" y="112" width="4" height="8" rx="1.5" fill="#facc15"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 45 44 C 45 32 83 32 83 44 C 83 64 75 75 64 76 C 53 75 45 64 45 44 Z" fill="#fed7aa"/>
    <!-- Neat Goatee -->
    <polygon points="64,68 62,74 66,74" fill="#18181b"/>

    <!-- Ornate Brass Multi-lens Monocle over Right Eye -->
    <circle cx="74" cy="50" r="7.5" fill="#34d399" fill-opacity="0.4" stroke="#d97706" stroke-width="1.6"/>
    <circle cx="77" cy="47" r="3" fill="none" stroke="#d97706" stroke-width="1"/>
    <line x1="74" y1="42.5" x2="80" y2="34" stroke="#d97706" stroke-width="1.2"/>

    <!-- Left Eye (Focused Amber) -->
    <ellipse cx="54" cy="50" rx="3.8" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="50" r="1.8" fill="#f59e0b"/>
    <circle cx="55" cy="49" r="0.8" fill="#ffffff"/>
    <!-- Right Eye Behind Lens -->
    <circle cx="74" cy="50" r="1.8" fill="#10b981"/>
    <circle cx="75" cy="49" r="0.8" fill="#ffffff"/>

    <!-- Hair (Dark Scholar Topknot) -->
    <ellipse cx="64" cy="24" rx="9" ry="8" fill="#18181b"/>
    <line x1="52" y1="24" x2="76" y2="24" stroke="#d97706" stroke-width="2.2"/>
    <path d="M 45 42 C 48 30 80 30 83 42 C 75 35 65 37 64 40 C 63 37 53 35 45 42 Z" fill="#18181b"/>

    <!-- Bubbling Alchemical Flask at Bottom Foreground -->
    <circle cx="64" cy="104" r="12" fill="#047857" stroke="#34d399" stroke-width="1.5"/>
    <circle cx="64" cy="104" r="10" fill="url(#elixirGlow)"/>
    <rect x="61" y="88" width="6" height="6" fill="#cbd5e1"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#10b981" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#facc15" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  void_librarian: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipLibrarian">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgLibrarian" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="60%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipLibrarian)">
    <rect width="128" height="128" fill="url(#bgLibrarian)"/>

    <!-- Starry Constellation Chart in Background -->
    <circle cx="64" cy="54" r="44" fill="none" stroke="#818cf8" stroke-width="0.8" stroke-opacity="0.3"/>
    <line x1="32" y1="24" x2="48" y2="34" stroke="#c7d2fe" stroke-width="0.8" stroke-opacity="0.4"/>
    <line x1="48" y1="34" x2="64" y2="28" stroke="#c7d2fe" stroke-width="0.8" stroke-opacity="0.4"/>
    <circle cx="32" cy="24" r="1.5" fill="#ffffff"/>
    <circle cx="48" cy="34" r="1.5" fill="#ffffff"/>
    <circle cx="64" cy="28" r="1.5" fill="#ffffff"/>

    <!-- Indigo Archivist Cowl & Mantle -->
    <path d="M 16 128 L 22 96 C 26 84 38 78 50 76 L 64 88 L 78 76 C 90 78 102 84 106 96 L 112 128 Z" fill="#0f172a"/>
    <path d="M 32 94 L 64 120 L 96 94" fill="none" stroke="#6366f1" stroke-width="1.8"/>

    <!-- Mystical Indigo Veil Over Lower Face -->
    <path d="M 46 56 C 48 54 80 54 82 56 L 80 76 C 76 80 64 84 64 84 C 64 84 52 80 48 76 Z" fill="#312e81" opacity="0.9"/>

    <!-- Eyes (Glowing Pure Astral Starlight White) -->
    <ellipse cx="54" cy="50" rx="4.5" ry="2.6" fill="#ffffff"/>
    <circle cx="54" cy="50" r="1.8" fill="#818cf8"/>
    <circle cx="54" cy="50" r="0.8" fill="#ffffff"/>
    <ellipse cx="74" cy="50" rx="4.5" ry="2.6" fill="#ffffff"/>
    <circle cx="74" cy="50" r="1.8" fill="#818cf8"/>
    <circle cx="74" cy="50" r="0.8" fill="#ffffff"/>

    <!-- Dark Hair Embedded with Tiny Stars -->
    <path d="M 44 42 C 48 26 80 26 84 42 C 74 34 66 36 64 40 C 62 36 54 34 44 42 Z" fill="#020617"/>
    <circle cx="52" cy="36" r="1" fill="#ffffff"/>
    <circle cx="76" cy="36" r="1" fill="#ffffff"/>
    <circle cx="64" cy="32" r="1" fill="#818cf8"/>

    <!-- Giant Levitating Ancient Grimoire at Bottom -->
    <polygon points="38,98 64,106 90,98 90,122 64,128 38,122" fill="#1e1b4b" stroke="#818cf8" stroke-width="1.5"/>
    <line x1="64" y1="106" x2="64" y2="128" stroke="#facc15" stroke-width="1.5"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#6366f1" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#c7d2fe" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  temple_guardian: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipTemple">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgTemple" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#2d1c03"/>
      <stop offset="60%" stop-color="#140b01"/>
      <stop offset="100%" stop-color="#050300"/>
    </radialGradient>
    <linearGradient id="bronzeHelm" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="45%" stop-color="#b45309"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipTemple)">
    <rect width="128" height="128" fill="url(#bgTemple)"/>

    <!-- Guardian Seal Ring in Background -->
    <circle cx="64" cy="54" r="44" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-opacity="0.3" stroke-dasharray="6 4"/>

    <!-- Crimson Ceremonial Tassel Crest on Top of Helmet -->
    <path d="M 64 8 Q 80 14 88 32 Q 76 26 64 22 Z" fill="#dc2626"/>

    <!-- Bronze Armored Shoulders with Turquoise Patina -->
    <path d="M 16 128 L 22 98 C 26 88 38 82 50 80 L 64 94 L 78 80 C 90 82 102 88 106 98 L 112 128 Z" fill="url(#bronzeHelm)"/>
    <path d="M 50 80 L 64 102 L 78 80" fill="none" stroke="#0d9488" stroke-width="2"/>

    <!-- Imposing Ceremonial Bronze Spirit Mask Face -->
    <polygon points="40,36 88,36 84,74 64,84 44,74" fill="url(#bronzeHelm)"/>
    <!-- Turquoise Brow Ridge -->
    <path d="M 44 44 L 64 48 L 84 44" fill="none" stroke="#14b8a6" stroke-width="3"/>

    <!-- Glowing Jade Slit Eye Openings -->
    <polygon points="48,50 60,52 48,54" fill="#34d399"/>
    <polygon points="80,50 68,52 80,54" fill="#34d399"/>

    <!-- Guardian Fangs / Relief -->
    <polygon points="56,70 60,70 58,76" fill="#fde047"/>
    <polygon points="72,70 68,70 70,76" fill="#fde047"/>
    <path d="M 52 66 Q 64 70 76 66" stroke="#78350f" stroke-width="2" fill="none"/>

    <!-- Hanging Sacred Talisman (Ofuda) Papers -->
    <rect x="24" y="58" width="6" height="18" fill="#fef08a" stroke="#dc2626" stroke-width="0.8"/>
    <rect x="98" y="58" width="6" height="18" fill="#fef08a" stroke="#dc2626" stroke-width="0.8"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#b45309" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#34d399" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  // --------------------------------------------------------------------------
  // 6. Viajeros, aventureros y exploradores
  // --------------------------------------------------------------------------
  realm_traveler: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipTraveler">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgTraveler" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e103a"/>
      <stop offset="60%" stop-color="#090514"/>
      <stop offset="100%" stop-color="#020108"/>
    </radialGradient>
    <linearGradient id="leatherCoat" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#78350f"/>
      <stop offset="50%" stop-color="#451a03"/>
      <stop offset="100%" stop-color="#1c0a01"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipTraveler)">
    <rect width="128" height="128" fill="url(#bgTraveler)"/>

    <!-- Dimensional Vortex Rings in Background -->
    <circle cx="64" cy="54" r="44" fill="none" stroke="#ec4899" stroke-width="0.8" stroke-opacity="0.3" stroke-dasharray="8 4"/>
    <circle cx="64" cy="54" r="38" fill="none" stroke="#38bdf8" stroke-width="0.8" stroke-opacity="0.3"/>

    <!-- High-Collared Leather Duster Coat Shoulders -->
    <path d="M 16 128 L 22 98 C 26 86 38 80 50 78 L 64 92 L 78 78 C 90 80 102 86 106 98 L 112 128 Z" fill="url(#leatherCoat)"/>
    <!-- Brass Buckles and Lapels -->
    <path d="M 44 80 L 64 104 L 84 80" fill="none" stroke="#f59e0b" stroke-width="2"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 45 44 C 45 32 83 32 83 44 C 83 64 75 75 64 76 C 53 75 45 64 45 44 Z" fill="#fed7aa"/>

    <!-- Daring Adventurer Smirk and Chin Scar -->
    <path d="M 59 66 Q 65 69 70 65" stroke="#b91c1c" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    <line x1="72" y1="68" x2="76" y2="72" stroke="#dc2626" stroke-width="1" stroke-linecap="round"/>

    <!-- Eyes (Keen, Cosmopolitan Cyan-Amber) -->
    <ellipse cx="54" cy="49" rx="3.8" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="49" r="1.8" fill="#0284c7"/>
    <circle cx="55" cy="48" r="0.8" fill="#ffffff"/>
    <ellipse cx="74" cy="49" rx="3.8" ry="2.2" fill="#0f172a"/>
    <circle cx="74" cy="49" r="1.8" fill="#0284c7"/>
    <circle cx="75" cy="48" r="0.8" fill="#ffffff"/>
    <path d="M 48 43 L 60 45" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>
    <path d="M 80 43 L 68 45" stroke="#0f172a" stroke-width="2" stroke-linecap="round"/>

    <!-- Steampunk Brass Navigational Goggles on Forehead -->
    <rect x="42" y="32" width="18" height="12" rx="6" fill="#d97706" stroke="#78350f" stroke-width="1.5"/>
    <circle cx="51" cy="38" r="4.5" fill="#38bdf8"/>
    <rect x="68" y="32" width="18" height="12" rx="6" fill="#d97706" stroke="#78350f" stroke-width="1.5"/>
    <circle cx="77" cy="38" r="4.5" fill="#38bdf8"/>
    <line x1="60" y1="38" x2="68" y2="38" stroke="#78350f" stroke-width="2"/>

    <!-- Wind-Blown Brown Hair -->
    <path d="M 44 42 C 46 28 82 28 84 42 C 78 34 66 34 64 38 C 62 34 50 34 44 42 Z" fill="#451a03"/>

    <!-- Swirling Miniature Astrolabe Galaxy in Foreground -->
    <circle cx="64" cy="108" r="8" fill="#ec4899" opacity="0.8"/>
    <circle cx="64" cy="108" r="6" fill="#38bdf8"/>
    <ellipse cx="64" cy="108" rx="14" ry="4" fill="none" stroke="#facc15" stroke-width="1.2" transform="rotate(-20 64 108)"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#f59e0b" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#ec4899" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  dungeon_delver: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipDelver">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgDelver" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="60%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    <radialGradient id="torchGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipDelver)">
    <rect width="128" height="128" fill="url(#bgDelver)"/>

    <!-- Dungeon Stone Walls and Blue Mana Crystals in Background -->
    <circle cx="64" cy="54" r="44" fill="none" stroke="#64748b" stroke-width="0.8" stroke-opacity="0.3"/>
    <polygon points="20,20 28,16 26,30" fill="#38bdf8"/>
    <polygon points="106,24 114,20 110,34" fill="#38bdf8"/>

    <!-- Explorer Leather Harness Shoulders -->
    <path d="M 16 128 L 22 98 C 26 88 38 82 50 80 L 64 94 L 78 80 C 90 82 102 88 106 98 L 112 128 Z" fill="#334155"/>
    <line x1="36" y1="84" x2="36" y2="128" stroke="#d97706" stroke-width="3"/>
    <line x1="92" y1="84" x2="92" y2="128" stroke="#d97706" stroke-width="3"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Face -->
    <path d="M 45 45 C 45 33 83 33 83 45 C 83 65 75 75 64 76 C 53 75 45 65 45 45 Z" fill="#fed7aa"/>

    <!-- Amber Bandana on Forehead -->
    <rect x="42" y="34" width="44" height="10" fill="#d97706"/>
    <circle cx="64" cy="39" r="2.5" fill="#fde047"/>

    <!-- Eyes (Sharp, Alert Amber) -->
    <ellipse cx="54" cy="49" rx="3.8" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="49" r="1.8" fill="#f59e0b"/>
    <circle cx="55" cy="48" r="0.8" fill="#ffffff"/>
    <ellipse cx="74" cy="49" rx="3.8" ry="2.2" fill="#0f172a"/>
    <circle cx="74" cy="49" r="1.8" fill="#f59e0b"/>
    <circle cx="75" cy="48" r="0.8" fill="#ffffff"/>
    <path d="M 48 44 Q 54 42 60 45" stroke="#0f172a" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M 80 44 Q 74 42 68 45" stroke="#0f172a" stroke-width="2" stroke-linecap="round" fill="none"/>

    <!-- Confident Smirk -->
    <path d="M 60 66 Q 64 68 68 66" stroke="#b91c1c" stroke-width="1.5" stroke-linecap="round" fill="none"/>

    <!-- Dark Hair Spilling from Bandana -->
    <path d="M 44 44 Q 48 62 42 70" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>
    <path d="M 84 44 Q 80 62 86 70" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" fill="none"/>

    <!-- Burning Crystal Torch in Foreground -->
    <g transform="translate(18, 76)">
      <rect x="6" y="16" width="6" height="24" fill="#78350f"/>
      <polygon points="4,16 14,16 12,8 6,8" fill="#d97706"/>
      <circle cx="9" cy="8" r="8" fill="url(#torchGlow)"/>
      <polygon points="9,0 13,8 5,8" fill="#fef08a"/>
    </g>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#d97706" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#fde047" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  // --------------------------------------------------------------------------
  // 7. Personajes celestiales, reyes y reinas de mundos fantásticos
  // --------------------------------------------------------------------------
  celestial_emperor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipEmperor">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgEmperor" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#451a03"/>
      <stop offset="60%" stop-color="#1f0a00"/>
      <stop offset="100%" stop-color="#0a0300"/>
    </radialGradient>
    <linearGradient id="imperialGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipEmperor)">
    <rect width="128" height="128" fill="url(#bgEmperor)"/>

    <!-- Radiant Imperial Solar Mandala Halo -->
    <circle cx="64" cy="50" r="46" fill="none" stroke="url(#imperialGold)" stroke-width="1.8" stroke-dasharray="14 4 4 4"/>
    <circle cx="64" cy="50" r="40" fill="#fef08a" opacity="0.15"/>

    <!-- Majestic Emperor Robes (Imperial Yellow) -->
    <path d="M 16 128 L 22 98 C 26 86 38 80 50 78 L 64 92 L 78 78 C 90 80 102 86 106 98 L 112 128 Z" fill="url(#imperialGold)"/>
    <!-- Embroidered Dragon Motif on Robe Center -->
    <circle cx="64" cy="112" r="8" fill="#a16207"/>
    <circle cx="64" cy="112" r="6" fill="#fde047"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#fed7aa"/>

    <!-- Dignified Imperial Face -->
    <path d="M 45 44 C 45 32 83 32 83 44 C 83 64 75 75 64 76 C 53 75 45 64 45 44 Z" fill="#fed7aa"/>
    <!-- Neat Imperial Goatee -->
    <polygon points="64,68 62,76 66,76" fill="#18181b"/>

    <!-- Piercing Imperial Golden-Amber Eyes -->
    <ellipse cx="54" cy="49" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="49" r="1.8" fill="#facc15"/>
    <circle cx="55" cy="48" r="0.8" fill="#ffffff"/>
    <ellipse cx="74" cy="49" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="74" cy="49" r="1.8" fill="#facc15"/>
    <circle cx="75" cy="48" r="0.8" fill="#ffffff"/>
    <path d="M 48 43 L 60 45" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M 80 43 L 68 45" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round"/>

    <!-- Supreme Imperial Mianguan Crown with Beaded Strings -->
    <polygon points="42,22 86,22 92,28 36,28" fill="url(#imperialGold)"/>
    <!-- Dangling Jade and Pearl Strings -->
    <line x1="42" y1="28" x2="42" y2="40" stroke="#34d399" stroke-width="1.2" stroke-dasharray="2 2"/>
    <line x1="50" y1="28" x2="50" y2="40" stroke="#f8fafc" stroke-width="1.2" stroke-dasharray="2 2"/>
    <line x1="78" y1="28" x2="78" y2="40" stroke="#f8fafc" stroke-width="1.2" stroke-dasharray="2 2"/>
    <line x1="86" y1="28" x2="86" y2="40" stroke="#34d399" stroke-width="1.2" stroke-dasharray="2 2"/>

    <!-- Floating Imperial Jade Seal (Yuxi) -->
    <rect x="94" y="68" width="14" height="14" rx="2" fill="#10b981" stroke="#facc15" stroke-width="1.2"/>
    <polygon points="98,68 104,64 104,68" fill="#facc15"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="url(#imperialGold)" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#34d399" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  astral_empress: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipEmpress">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgEmpress" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#2e1065"/>
      <stop offset="60%" stop-color="#17072b"/>
      <stop offset="100%" stop-color="#05010a"/>
    </radialGradient>
    <linearGradient id="silverGown" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="50%" stop-color="#c4b5fd"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>

  <g clip-path="url(#circleClipEmpress)">
    <rect width="128" height="128" fill="url(#bgEmpress)"/>

    <!-- Nebulae and Planetary Orbit in Background -->
    <circle cx="64" cy="52" r="46" fill="none" stroke="#c084fc" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="8 4"/>
    <circle cx="28" cy="30" r="3" fill="#a855f7"/>
    <ellipse cx="28" cy="30" rx="5" ry="1.5" fill="none" stroke="#e9d5ff" stroke-width="0.8"/>

    <!-- Cascading Silver-White Starlight Hair (Back) -->
    <path d="M 34 50 Q 20 86 24 116 Q 64 122 104 116 Q 108 86 94 50 Z" fill="#f8fafc"/>

    <!-- Regal Midnight-Purple Gown with Silver Embroidery -->
    <path d="M 18 128 L 24 100 C 28 88 40 84 50 82 L 64 94 L 78 82 C 88 84 100 88 104 100 L 110 128 Z" fill="url(#silverGown)"/>
    <path d="M 50 82 L 64 104 L 78 82" fill="none" stroke="#f8fafc" stroke-width="2"/>

    <!-- Neck -->
    <path d="M 54 70 L 54 84 Q 64 88 74 84 L 74 70 Z" fill="#ffedd5"/>

    <!-- Face -->
    <path d="M 45 45 C 45 33 83 33 83 45 C 83 65 75 75 64 76 C 53 75 45 65 45 45 Z" fill="#ffedd5"/>

    <!-- Silver Eyes Reflecting Nebulae -->
    <ellipse cx="54" cy="49" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="54" cy="49" r="1.8" fill="#e9d5ff"/>
    <circle cx="54" cy="49" r="0.8" fill="#ffffff"/>
    <ellipse cx="74" cy="49" rx="4" ry="2.2" fill="#0f172a"/>
    <circle cx="74" cy="49" r="1.8" fill="#e9d5ff"/>
    <circle cx="74" cy="49" r="0.8" fill="#ffffff"/>
    <!-- Elegant Brows -->
    <path d="M 49 43 Q 54 41 59 44" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" fill="none"/>
    <path d="M 79 43 Q 74 41 69 44" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" fill="none"/>

    <!-- Sovereign Smile -->
    <path d="M 60 66 Q 64 68 68 66" stroke="#c026d3" stroke-width="1.4" stroke-linecap="round" fill="none"/>

    <!-- Starlight Diadema of Woven Silver Moonbeams -->
    <polygon points="44,30 54,20 64,28 74,20 84,30 64,34" fill="#ffffff" stroke="#c084fc" stroke-width="1"/>
    <circle cx="64" cy="24" r="2.5" fill="#a855f7"/>

    <!-- Silver Bangs -->
    <path d="M 45 44 C 48 34 80 34 83 44 C 74 37 66 38 64 42 C 62 38 54 37 45 44 Z" fill="#f8fafc"/>

    <!-- Orbiting Crescent Moon beside Shoulder -->
    <path d="M 98 70 A 5 5 0 1 0 102 78 A 4 4 0 1 1 98 70 Z" fill="#f8fafc"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#c084fc" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#f8fafc" stroke-width="1" stroke-opacity="0.6"/>
</svg>`,

  // --------------------------------------------------------------------------
  // 8. Avatares inspirados en libros, constelaciones, magia y mundos de novelas
  // --------------------------------------------------------------------------
  tome_archon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <defs>
    <clipPath id="circleClipArchon">
      <circle cx="64" cy="64" r="62"/>
    </clipPath>
    <radialGradient id="bgArchon" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#38250c"/>
      <stop offset="60%" stop-color="#1a0f02"/>
      <stop offset="100%" stop-color="#050300"/>
    </radialGradient>
    <radialGradient id="soulGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="40%" stop-color="#fef08a"/>
      <stop offset="70%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#circleClipArchon)">
    <rect width="128" height="128" fill="url(#bgArchon)"/>

    <!-- Circular Magic Geometric Circles -->
    <circle cx="64" cy="54" r="46" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-opacity="0.35" stroke-dasharray="10 4 2 4"/>
    <polygon points="64,10 102,74 26,74" fill="none" stroke="#fbbf24" stroke-width="0.8" stroke-opacity="0.25"/>

    <!-- Fluttering Ancient Novel Book Pages Swirling Like Butterflies -->
    <g transform="translate(20, 30) rotate(-20)">
      <polygon points="0,0 8,2 10,10 2,8" fill="#fef08a" opacity="0.8"/>
    </g>
    <g transform="translate(100, 36) rotate(25)">
      <polygon points="0,0 8,2 10,10 2,8" fill="#fef08a" opacity="0.8"/>
    </g>
    <g transform="translate(24, 76) rotate(15)">
      <polygon points="0,0 10,3 12,12 2,9" fill="#fde68a" opacity="0.85"/>
    </g>
    <g transform="translate(96, 78) rotate(-15)">
      <polygon points="0,0 10,3 12,12 2,9" fill="#fde68a" opacity="0.85"/>
    </g>

    <!-- Living Parchment Robes / Cowl -->
    <path d="M 16 128 L 22 96 C 26 84 38 78 50 76 L 64 88 L 78 76 C 90 78 102 84 106 96 L 112 128 Z" fill="#78350f"/>
    <!-- Gilded Bookmark Ribbons Flowing Down Robe -->
    <path d="M 50 82 L 64 128 L 78 82" fill="#d97706"/>
    <line x1="64" y1="88" x2="64" y2="128" stroke="#fde047" stroke-width="2"/>

    <!-- Hood Formed of Living Manuscript Leaves -->
    <path d="M 36 50 C 36 22 92 22 92 50 C 92 78 86 86 64 88 C 42 86 36 78 36 50 Z" fill="#451a03"/>
    <path d="M 42 52 C 42 30 86 30 86 52 C 86 74 80 80 64 82 C 48 80 42 74 42 52 Z" fill="#1c0a01"/>

    <!-- Pure Golden Mana Light Entity Within Hood -->
    <circle cx="64" cy="54" r="14" fill="url(#soulGold)"/>
    <!-- Floating Feather Quill Seal Within the Light -->
    <path d="M 64 44 Q 68 50 67 60 L 64 64 L 63 60 Q 64 50 64 44 Z" fill="#ffffff"/>
  </g>

  <circle cx="64" cy="64" r="62" fill="none" stroke="#f59e0b" stroke-width="3"/>
  <circle cx="64" cy="64" r="60.5" fill="none" stroke="#fef08a" stroke-width="1" stroke-opacity="0.6"/>
</svg>`
};

console.log('Generating 21 SVG avatars in assets/avatars/ ...');
let count = 0;
for (const [id, svg] of Object.entries(AVATARS)) {
  const filePath = path.join(avatarsDir, `${id}.svg`);
  fs.writeFileSync(filePath, svg.trim() + '\n', 'utf8');
  count++;
  console.log(`  [${count}/21] Generated ${id}.svg (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`);
}

console.log(`\nSuccessfully created ${count} avatars in ${avatarsDir}`);
