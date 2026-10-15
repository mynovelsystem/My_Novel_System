// Generator for high-quality SVG illustrated badges
const fs = require("fs");
const path = require("path");

const badgesDir = path.join(__dirname, "../assets/badges");
if (!fs.existsSync(badgesDir)) {
  fs.mkdirSync(badgesDir, { recursive: true });
}

function getDefGradients() {
  return `
    <defs>
      <!-- Bronze / Common -->
      <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#451a03" />
        <stop offset="35%" stop-color="#78350f" />
        <stop offset="70%" stop-color="#b45309" />
        <stop offset="100%" stop-color="#92400e" />
      </linearGradient>
      <linearGradient id="bronzeRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" />
        <stop offset="50%" stop-color="#d97706" />
        <stop offset="100%" stop-color="#78350f" />
      </linearGradient>

      <!-- Jade / Rare -->
      <linearGradient id="jadeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#064e3b" />
        <stop offset="40%" stop-color="#059669" />
        <stop offset="75%" stop-color="#10b981" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
      <linearGradient id="jadeRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#a7f3d0" />
        <stop offset="50%" stop-color="#34d399" />
        <stop offset="100%" stop-color="#047857" />
      </linearGradient>

      <!-- Epic / Amethyst -->
      <linearGradient id="epicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3b0764" />
        <stop offset="35%" stop-color="#6b21a8" />
        <stop offset="70%" stop-color="#9333ea" />
        <stop offset="100%" stop-color="#c026d3" />
      </linearGradient>
      <linearGradient id="epicRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f5d0fe" />
        <stop offset="50%" stop-color="#c084fc" />
        <stop offset="100%" stop-color="#7e22ce" />
      </linearGradient>

      <!-- Legendary / Solar Gold -->
      <linearGradient id="solarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#78350f" />
        <stop offset="25%" stop-color="#b45309" />
        <stop offset="60%" stop-color="#f59e0b" />
        <stop offset="85%" stop-color="#fbbf24" />
        <stop offset="100%" stop-color="#fde047" />
      </linearGradient>
      <linearGradient id="solarRim" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="40%" stop-color="#fef08a" />
        <stop offset="80%" stop-color="#f59e0b" />
        <stop offset="100%" stop-color="#b45309" />
      </linearGradient>

      <!-- Core Inner Radial Glows -->
      <radialGradient id="commonInnerGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#78350f" stop-opacity="0.4" />
        <stop offset="100%" stop-color="#140c06" />
      </radialGradient>
      <radialGradient id="rareInnerGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#047857" stop-opacity="0.45" />
        <stop offset="100%" stop-color="#041814" />
      </radialGradient>
      <radialGradient id="epicInnerGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#7e22ce" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#12061e" />
      </radialGradient>
      <radialGradient id="legendaryInnerGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#d97706" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#180e03" />
      </radialGradient>

      <!-- Drop Shadows & Filters -->
      <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.75" />
      </filter>
      <filter id="goldGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#fbbf24" flood-opacity="0.65" />
      </filter>
    </defs>
  `;
}

function buildFrame(rarity) {
  switch (rarity) {
    case "common":
      return `
        <!-- Bronze Octagonal Outer Frame -->
        <polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="url(#bronzeGrad)" stroke="url(#bronzeRim)" stroke-width="2.5" filter="url(#badgeShadow)" />
        <polygon points="32,10 68,10 90,32 90,68 68,90 32,90 10,68 10,32" fill="url(#commonInnerGlow)" stroke="#d97706" stroke-width="1.2" stroke-opacity="0.7" />
        <!-- Corner Studs -->
        <circle cx="30" cy="7" r="1.8" fill="#fef08a" />
        <circle cx="70" cy="7" r="1.8" fill="#fef08a" />
        <circle cx="93" cy="30" r="1.8" fill="#fef08a" />
        <circle cx="93" cy="70" r="1.8" fill="#fef08a" />
        <circle cx="70" cy="93" r="1.8" fill="#fef08a" />
        <circle cx="30" cy="93" r="1.8" fill="#fef08a" />
        <circle cx="7" cy="70" r="1.8" fill="#fef08a" />
        <circle cx="7" cy="30" r="1.8" fill="#fef08a" />
      `;
    case "rare":
      return `
        <!-- Jade Hexagonal Outer Frame -->
        <polygon points="50,4 94,27 94,73 50,96 6,73 6,27" fill="url(#jadeGrad)" stroke="url(#jadeRim)" stroke-width="2.5" filter="url(#badgeShadow)" />
        <polygon points="50,11 88,31 88,69 50,89 12,69 12,31" fill="url(#rareInnerGlow)" stroke="#34d399" stroke-width="1.2" stroke-opacity="0.75" />
        <!-- Jade Bevel Facets -->
        <line x1="50" y1="4" x2="50" y2="11" stroke="#a7f3d0" stroke-width="1.2" />
        <line x1="94" y1="27" x2="88" y2="31" stroke="#a7f3d0" stroke-width="1.2" />
        <line x1="94" y1="73" x2="88" y2="69" stroke="#a7f3d0" stroke-width="1.2" />
        <line x1="50" y1="96" x2="50" y2="89" stroke="#a7f3d0" stroke-width="1.2" />
        <line x1="6" y1="73" x2="12" y2="69" stroke="#a7f3d0" stroke-width="1.2" />
        <line x1="6" y1="27" x2="12" y2="31" stroke="#a7f3d0" stroke-width="1.2" />
      `;
    case "epic":
      return `
        <!-- Amethyst Rhombus Outer Frame -->
        <polygon points="50,3 97,50 50,97 3,50" fill="url(#epicGrad)" stroke="url(#epicRim)" stroke-width="2.5" filter="url(#badgeShadow)" />
        <polygon points="50,11 89,50 50,89 11,50" fill="url(#epicInnerGlow)" stroke="#c084fc" stroke-width="1.2" stroke-opacity="0.8" />
        <!-- Rhombic Corner Jewels -->
        <polygon points="50,5 54,9 50,13 46,9" fill="#f5d0fe" />
        <polygon points="95,50 91,54 87,50 91,46" fill="#f5d0fe" />
        <polygon points="50,95 54,91 50,87 46,91" fill="#f5d0fe" />
        <polygon points="5,50 9,54 13,50 9,46" fill="#f5d0fe" />
      `;
    case "legendary":
      return `
        <!-- Solar Gold Dragon Sunburst Frame -->
        <polygon points="50,2 59,12 73,7 76,21 90,23 88,38 99,47 91,58 98,70 85,76 87,90 73,90 68,100 53,95 47,100 42,90 28,90 30,76 17,70 24,58 16,47 27,38 25,23 39,21 42,7 56,12" fill="url(#solarGrad)" stroke="url(#solarRim)" stroke-width="2.2" filter="url(#goldGlow)" />
        <circle cx="50" cy="50" r="34" fill="url(#legendaryInnerGlow)" stroke="#fef08a" stroke-width="1.5" />
        <circle cx="50" cy="50" r="31" fill="none" stroke="#f59e0b" stroke-dasharray="2,2" stroke-width="1" />
      `;
    default:
      return "";
  }
}

// Map of SVG art silhouettes (viewBox 0 0 100 100)
const ART_SILHOUETTES = {
  // Base
  badge_common: `<polygon points="50,25 56,40 72,40 59,50 64,66 50,56 36,66 41,50 28,40 44,40" fill="#fde047" stroke="#78350f" stroke-width="1" />`,
  badge_rare: `<polygon points="50,22 75,37 75,63 50,78 25,63 25,37" fill="#6ee7b7" stroke="#047857" stroke-width="1.5" /><circle cx="50" cy="50" r="9" fill="#10b981" />`,
  badge_epic: `<polygon points="50,20 78,50 50,80 22,50" fill="#e879f9" stroke="#7e22ce" stroke-width="1.5" /><polygon points="50,30 68,50 50,70 32,50" fill="#fdf4ff" opacity="0.6" />`,
  badge_legendary: `<circle cx="50" cy="50" r="16" fill="#fde047" stroke="#b45309" stroke-width="2" /><path d="M50 34 L54 44 L66 44 L56 52 L60 64 L50 57 L40 64 L44 52 L34 44 L46 44 Z" fill="#ffffff" />`,

  // Core titles
  outer_disciple: `
    <rect x="34" y="28" width="32" height="44" rx="3" fill="#fbbf24" stroke="#78350f" stroke-width="1.5" />
    <line x1="39" y1="36" x2="61" y2="36" stroke="#78350f" stroke-width="2" stroke-linecap="round" />
    <line x1="39" y1="44" x2="61" y2="44" stroke="#78350f" stroke-width="2" stroke-linecap="round" />
    <line x1="39" y1="52" x2="55" y2="52" stroke="#78350f" stroke-width="2" stroke-linecap="round" />
    <line x1="39" y1="60" x2="49" y2="60" stroke="#78350f" stroke-width="2" stroke-linecap="round" />
  `,
  scroll_initiate: `
    <path d="M26 34 Q50 30 50 42 Q50 30 74 34 L74 68 Q50 64 50 76 Q50 64 26 68 Z" fill="#fef08a" stroke="#78350f" stroke-width="1.8" />
    <line x1="50" y1="42" x2="50" y2="76" stroke="#78350f" stroke-width="2" />
    <line x1="31" y1="42" x2="45" y2="40" stroke="#b45309" stroke-width="1.5" />
    <line x1="31" y1="50" x2="45" y2="48" stroke="#b45309" stroke-width="1.5" />
    <line x1="55" y1="40" x2="69" y2="42" stroke="#b45309" stroke-width="1.5" />
    <line x1="55" y1="48" x2="69" y2="50" stroke="#b45309" stroke-width="1.5" />
  `,
  diligent_reader: `
    <rect x="42" y="44" width="16" height="30" rx="3" fill="#fef08a" stroke="#78350f" stroke-width="1.5" />
    <path d="M50 25 C45 32 43 36 50 42 C57 36 55 32 50 25 Z" fill="#f97316" stroke="#ea580c" stroke-width="1.2" />
    <circle cx="50" cy="36" r="3.5" fill="#fef08a" />
  `,
  body_refiner: `
    <circle cx="50" cy="50" r="18" fill="#ea580c" opacity="0.3" />
    <path d="M42 34 L58 34 L62 48 L56 64 L44 64 L38 48 Z" fill="#f97316" stroke="#7c2d12" stroke-width="2" />
    <circle cx="50" cy="46" r="6" fill="#fef08a" />
  `,
  meridian_opener: `
    <path d="M50 22 C65 35 65 65 50 78 C35 65 35 35 50 22 Z" fill="#38bdf8" opacity="0.4" stroke="#0284c7" stroke-width="2" />
    <circle cx="50" cy="32" r="3" fill="#f0fdf4" />
    <circle cx="58" cy="44" r="3" fill="#f0fdf4" />
    <circle cx="50" cy="56" r="3.5" fill="#fef08a" />
    <circle cx="42" cy="68" r="3" fill="#f0fdf4" />
    <polyline points="50,32 58,44 50,56 42,68" stroke="#fef08a" stroke-width="2" stroke-dasharray="2,2" />
  `,
  secluded_cultivator: `
    <path d="M50 26 C45 38 42 50 50 68 C58 50 55 38 50 26 Z" fill="#6ee7b7" stroke="#047857" stroke-width="1.5" />
    <path d="M50 68 C35 65 24 55 30 44 C38 48 44 56 50 68 Z" fill="#34d399" stroke="#047857" stroke-width="1.5" />
    <path d="M50 68 C65 65 76 55 70 44 C62 48 56 56 50 68 Z" fill="#34d399" stroke="#047857" stroke-width="1.5" />
    <circle cx="50" cy="56" r="4" fill="#fef08a" />
  `,
  thousand_scrolls: `
    <rect x="30" y="58" width="40" height="12" rx="3" fill="#fde047" stroke="#78350f" stroke-width="1.5" />
    <rect x="33" y="44" width="34" height="12" rx="3" fill="#fed7aa" stroke="#78350f" stroke-width="1.5" />
    <rect x="36" y="30" width="28" height="12" rx="3" fill="#fef08a" stroke="#78350f" stroke-width="1.5" />
    <line x1="38" y1="36" x2="58" y2="36" stroke="#b45309" stroke-width="1.5" />
    <line x1="35" y1="50" x2="62" y2="50" stroke="#b45309" stroke-width="1.5" />
    <line x1="32" y1="64" x2="68" y2="64" stroke="#b45309" stroke-width="1.5" />
  `,
  spirit_temperer: `
    <circle cx="50" cy="50" r="18" fill="#818cf8" opacity="0.3" stroke="#4f46e5" stroke-width="2" />
    <circle cx="50" cy="50" r="11" fill="#c084fc" opacity="0.6" />
    <circle cx="45" cy="45" r="4" fill="#ffffff" opacity="0.8" />
  `,
  pill_refiner: `
    <ellipse cx="50" cy="62" rx="18" ry="12" fill="#10b981" stroke="#065f46" stroke-width="2" />
    <rect x="42" y="44" width="16" height="14" rx="2" fill="#34d399" stroke="#065f46" stroke-width="1.5" />
    <path d="M40 44 L60 44 L56 36 L44 36 Z" fill="#6ee7b7" stroke="#065f46" stroke-width="1.5" />
    <circle cx="46" cy="56" r="3" fill="#fef08a" />
    <circle cx="54" cy="58" r="3" fill="#fef08a" />
  `,
  chapter_devourer: `
    <polygon points="54,22 36,48 50,48 46,76 66,46 52,46" fill="#facc15" stroke="#e11d48" stroke-width="2" />
  `,
  tribulation_overcomer: `
    <line x1="28" y1="72" x2="72" y2="28" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round" />
    <line x1="28" y1="28" x2="72" y2="72" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round" />
    <circle cx="50" cy="50" r="6" fill="#ca8a04" stroke="#fde047" stroke-width="1.5" />
  `,
  domain_ruler: `
    <ellipse cx="50" cy="50" rx="24" ry="9" transform="rotate(-30 50 50)" fill="none" stroke="#a855f7" stroke-width="2.2" />
    <ellipse cx="50" cy="50" rx="24" ry="9" transform="rotate(30 50 50)" fill="none" stroke="#38bdf8" stroke-width="2.2" />
    <circle cx="50" cy="50" r="8" fill="#facc15" stroke="#7e22ce" stroke-width="1.5" />
  `,
  bottleneck_breaker: `
    <polygon points="50,22 66,40 54,42 70,62 52,60 58,78 40,54 50,52 34,36 48,38" fill="#f43f5e" stroke="#ffe4e6" stroke-width="1.8" />
    <line x1="30" y1="30" x2="36" y2="36" stroke="#fef08a" stroke-width="2" stroke-linecap="round" />
    <line x1="70" y1="30" x2="64" y2="36" stroke="#fef08a" stroke-width="2" stroke-linecap="round" />
    <line x1="72" y1="68" x2="64" y2="64" stroke="#fef08a" stroke-width="2" stroke-linecap="round" />
  `,
  ancient_scholar: `
    <path d="M30 68 L70 68 L66 48 L34 48 Z" fill="#60a5fa" stroke="#1e3a8a" stroke-width="2" />
    <polygon points="50,26 76,46 24,46" fill="#fde047" stroke="#1e3a8a" stroke-width="2" />
    <rect x="44" y="52" width="12" height="16" fill="#1e293b" />
  `,
  dao_heart: `
    <path d="M50 34 C44 22 28 24 28 40 C28 56 46 68 50 72 C54 68 72 56 72 40 C72 24 56 22 50 34 Z" fill="#ec4899" stroke="#be185d" stroke-width="2.5" />
    <circle cx="42" cy="38" r="4" fill="#ffffff" opacity="0.6" />
  `,
  golden_immortal: `
    <polygon points="26,62 30,36 42,48 50,30 58,48 70,36 74,62" fill="#fbbf24" stroke="#92400e" stroke-width="2" />
    <rect x="26" y="62" width="48" height="6" fill="#f59e0b" stroke="#92400e" stroke-width="1.5" />
    <circle cx="50" cy="30" r="3" fill="#ef4444" />
    <circle cx="30" cy="36" r="2.5" fill="#3b82f6" />
    <circle cx="70" cy="36" r="2.5" fill="#3b82f6" />
  `,
  heaven_defier: `
    <!-- Majestic Coiling Dragon Silhouette -->
    <path d="M34 68 Q24 50 36 38 Q48 26 62 32 Q74 38 68 52 Q62 66 48 64 Q42 62 46 54 Q52 46 60 50" fill="none" stroke="#fde047" stroke-width="4.5" stroke-linecap="round" />
    <circle cx="64" cy="34" r="5" fill="#f97316" stroke="#ffffff" stroke-width="1.5" />
    <polygon points="68,26 76,32 68,38" fill="#fde047" />
  `,
  cosmic_sovereign: `
    <circle cx="50" cy="50" r="14" fill="#f59e0b" stroke="#78350f" stroke-width="1.5" />
    <ellipse cx="50" cy="50" rx="28" ry="8" transform="rotate(-25 50 50)" fill="none" stroke="#fef08a" stroke-width="3" />
    <circle cx="30" cy="36" r="3" fill="#38bdf8" />
    <circle cx="68" cy="62" r="2.5" fill="#ec4899" />
  `,
  tribulation_emperor: `
    <polygon points="50,20 54,36 68,38 56,48 60,64 50,54 40,64 44,48 32,38 46,36" fill="#fde047" stroke="#db2777" stroke-width="1.5" />
    <polygon points="50,42 42,58 52,58 48,78 64,54 54,54" fill="#38bdf8" stroke="#0284c7" stroke-width="1.2" />
  `,
  primordial_immortal: `
    <!-- Supreme Taiji Yin-Yang with Celestial Halo -->
    <circle cx="50" cy="50" r="19" fill="#ffffff" stroke="#ec4899" stroke-width="2.5" />
    <path d="M50 31 A9.5 9.5 0 0 1 50 50 A9.5 9.5 0 0 0 50 69 A19 19 0 0 1 50 31 Z" fill="#18181b" />
    <circle cx="50" cy="40.5" r="3" fill="#18181b" />
    <circle cx="50" cy="59.5" r="3" fill="#ffffff" />
  `,

  // Hunter
  hunter_awakening: `
    <polygon points="50,24 56,40 53,70 47,70 44,40" fill="#cbd5e1" stroke="#334155" stroke-width="1.5" />
    <rect x="42" y="70" width="16" height="4" fill="#64748b" />
    <rect x="47" y="74" width="6" height="10" fill="#475569" />
  `,
  dungeon_scout: `
    <path d="M34 74 L34 36 Q50 24 66 36 L66 74 Z" fill="#065f46" stroke="#34d399" stroke-width="2.2" />
    <path d="M40 74 L40 44 Q50 36 60 44 L60 74 Z" fill="#022c22" />
    <circle cx="54" cy="56" r="2.5" fill="#fef08a" />
  `,
  shadow_monarch: `
    <line x1="36" y1="74" x2="64" y2="26" stroke="#a855f7" stroke-width="3.5" stroke-linecap="round" />
    <line x1="64" y1="74" x2="36" y2="26" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="50" cy="38" r="8" fill="#7c3aed" stroke="#ffffff" stroke-width="1.5" />
    <circle cx="47" cy="36" r="2" fill="#ffffff" />
    <circle cx="53" cy="36" r="2" fill="#ffffff" />
  `,
  national_hunter: `
    <path d="M50 24 L72 32 L72 54 Q50 76 50 76 Q50 76 28 54 L28 32 Z" fill="#f59e0b" stroke="#fef08a" stroke-width="2.5" />
    <polygon points="50,34 54,44 64,44 56,50 59,60 50,54 41,60 44,50 36,44 46,44" fill="#ffffff" />
  `,

  // Legendary Novels
  fool_pathway: `
    <rect x="34" y="24" width="32" height="52" rx="4" fill="#4338ca" stroke="#c7d2fe" stroke-width="2" />
    <polygon points="50,34 55,46 66,46 58,52 61,64 50,58 39,64 42,52 34,46 45,46" fill="#fde047" />
  `,
  constellation_reader: `
    <polygon points="50,22 56,38 74,38 60,48 65,66 50,56 35,66 40,48 26,38 44,38" fill="#c084fc" stroke="#fdf4ff" stroke-width="1.8" />
    <circle cx="28" cy="28" r="2.5" fill="#fde047" />
    <circle cx="72" cy="28" r="2.5" fill="#fde047" />
    <circle cx="76" cy="68" r="2.5" fill="#fde047" />
    <circle cx="24" cy="68" r="2.5" fill="#fde047" />
  `,
  nano_symbiosis: `
    <circle cx="50" cy="50" r="16" fill="#0891b2" stroke="#67e8f9" stroke-width="2" />
    <circle cx="50" cy="50" r="8" fill="#0e7490" stroke="#fef08a" stroke-width="1.5" />
    <line x1="50" y1="26" x2="50" y2="34" stroke="#67e8f9" stroke-width="2.5" />
    <line x1="50" y1="66" x2="50" y2="74" stroke="#67e8f9" stroke-width="2.5" />
    <line x1="26" y1="50" x2="34" y2="50" stroke="#67e8f9" stroke-width="2.5" />
    <line x1="66" y1="50" x2="74" y2="50" stroke="#67e8f9" stroke-width="2.5" />
  `,
  primordial_author: `
    <!-- Akashic Quill of Destiny -->
    <path d="M68 24 Q50 42 42 54 L36 74 L46 64 Q56 50 68 24 Z" fill="#fbbf24" stroke="#78350f" stroke-width="1.8" />
    <line x1="68" y1="24" x2="42" y2="60" stroke="#92400e" stroke-width="1.5" />
    <circle cx="36" cy="74" r="2" fill="#fde047" />
  `,

  // 6 New Emblematic Achievements
  legendary_reader: `
    <!-- Epic Tome of Infinity with Astral Ribbons -->
    <path d="M26 32 Q50 26 50 40 Q50 26 74 32 L74 66 Q50 60 50 74 Q50 60 26 66 Z" fill="#e879f9" stroke="#581c87" stroke-width="2" />
    <line x1="50" y1="40" x2="50" y2="74" stroke="#7e22ce" stroke-width="2.5" />
    <polygon points="50,44 54,52 62,52 56,58 58,66 50,60 42,66 44,58 38,52 46,52" fill="#fde047" stroke="#7e22ce" stroke-width="1" />
  `,
  saga_master: `
    <!-- Rare Triple Grimoire of Sagas -->
    <rect x="28" y="58" width="44" height="13" rx="3" fill="#10b981" stroke="#064e3b" stroke-width="1.8" />
    <rect x="32" y="44" width="38" height="13" rx="3" fill="#34d399" stroke="#064e3b" stroke-width="1.8" />
    <rect x="36" y="30" width="32" height="13" rx="3" fill="#6ee7b7" stroke="#064e3b" stroke-width="1.8" />
    <circle cx="50" cy="36.5" r="2.5" fill="#fde047" />
    <circle cx="50" cy="50.5" r="2.5" fill="#fde047" />
    <circle cx="50" cy="64.5" r="2.5" fill="#fde047" />
  `,
  qi_control: `
    <!-- Swirling Qi Vortex Spiral -->
    <path d="M50 30 A20 20 0 1 0 70 50 A15 15 0 1 0 55 65 A10 10 0 1 0 45 55 A5 5 0 1 0 50 50" fill="none" stroke="#fde047" stroke-width="3" stroke-linecap="round" />
    <circle cx="50" cy="50" r="4.5" fill="#fbbf24" stroke="#78350f" stroke-width="1" />
  `,
  scroll_collector: `
    <!-- Collector's Chest of Manuscripts -->
    <rect x="30" y="46" width="40" height="26" rx="3" fill="#b45309" stroke="#451a03" stroke-width="2" />
    <path d="M30 46 Q50 32 70 46 Z" fill="#d97706" stroke="#451a03" stroke-width="2" />
    <rect x="46" y="48" width="8" height="10" rx="1.5" fill="#fde047" stroke="#78350f" stroke-width="1.2" />
    <circle cx="50" cy="53" r="1.5" fill="#78350f" />
  `,
  reading_immortal: `
    <!-- Supreme Imperial Dragon Emperor Crown -->
    <polygon points="22,64 26,34 38,48 50,26 62,48 74,34 78,64" fill="#fde047" stroke="#78350f" stroke-width="2" />
    <rect x="22" y="64" width="56" height="8" rx="2" fill="#f59e0b" stroke="#78350f" stroke-width="1.5" />
    <circle cx="50" cy="26" r="4" fill="#ef4444" stroke="#ffffff" stroke-width="1" />
    <circle cx="26" cy="34" r="3" fill="#3b82f6" stroke="#ffffff" stroke-width="1" />
    <circle cx="74" cy="34" r="3" fill="#3b82f6" stroke="#ffffff" stroke-width="1" />
    <circle cx="50" cy="68" r="2.5" fill="#ffffff" />
  `,
  arc_lord: `
    <!-- Energy Bow & Arc Arrow -->
    <path d="M32 26 Q58 50 32 74" fill="none" stroke="#10b981" stroke-width="3.5" stroke-linecap="round" />
    <line x1="32" y1="26" x2="32" y2="74" stroke="#a7f3d0" stroke-width="1.5" stroke-dasharray="2,2" />
    <line x1="28" y1="50" x2="72" y2="50" stroke="#fde047" stroke-width="2.5" stroke-linecap="round" />
    <polygon points="72,46 78,50 72,54" fill="#fde047" />
  `
};

const BADGE_RARITIES = {
  // Base
  badge_common: "common",
  badge_rare: "rare",
  badge_epic: "epic",
  badge_legendary: "legendary",

  // Core 20
  outer_disciple: "common",
  scroll_initiate: "common",
  diligent_reader: "common",
  body_refiner: "common",
  meridian_opener: "rare",
  secluded_cultivator: "rare",
  thousand_scrolls: "rare",
  spirit_temperer: "rare",
  pill_refiner: "rare",
  chapter_devourer: "rare",
  tribulation_overcomer: "rare",
  domain_ruler: "rare",
  bottleneck_breaker: "epic",
  ancient_scholar: "epic",
  dao_heart: "epic",
  golden_immortal: "epic",
  heaven_defier: "legendary",
  cosmic_sovereign: "legendary",
  tribulation_emperor: "legendary",
  primordial_immortal: "legendary",

  // Hunter 4
  hunter_awakening: "common",
  dungeon_scout: "rare",
  shadow_monarch: "epic",
  national_hunter: "legendary",

  // Legendary Novels 4
  fool_pathway: "rare",
  constellation_reader: "rare",
  nano_symbiosis: "rare",
  primordial_author: "epic",

  // 6 New
  qi_control: "common",
  scroll_collector: "common",
  saga_master: "rare",
  arc_lord: "rare",
  legendary_reader: "epic",
  reading_immortal: "legendary"
};

let count = 0;
for (const [id, rarity] of Object.entries(BADGE_RARITIES)) {
  const art = ART_SILHOUETTES[id] || ART_SILHOUETTES[`badge_${rarity}`];
  const frame = buildFrame(rarity);

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  ${getDefGradients()}
  <g class="badge-frame">
    ${frame}
  </g>
  <g class="badge-art" filter="url(#badgeShadow)">
    ${art}
  </g>
</svg>`;

  fs.writeFileSync(path.join(badgesDir, `${id}.svg`), svgContent.trim(), "utf8");
  count++;
}

console.log(`Successfully generated ${count} SVG badges in ${badgesDir}`);
