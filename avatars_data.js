// ============================================================================
// NOVEL CHAPTER TRACKER — PRESET AVATARS ARCHITECTURE & METADATA (v4.0.0)
// ============================================================================

var AVATAR_CATEGORIES = [
  { id: "all", nameKey: "avatar_filter_all", icon: "✨" },
  { id: "cultivation", nameKey: "avatar_filter_cultivation", icon: "⛩️" },
  { id: "fantasy", nameKey: "avatar_filter_fantasy", icon: "⚔️" },
  { id: "readers", nameKey: "avatar_filter_readers", icon: "📖" },
  { id: "creatures", nameKey: "avatar_filter_creatures", icon: "🐉" },
  { id: "scholars", nameKey: "avatar_filter_scholars", icon: "📜" },
  { id: "celestial", nameKey: "avatar_filter_celestial", icon: "👑" }
];

var AVATARS_CONFIG = [
  // 1. Cultivo y Guerreros Espirituales
  {
    id: "cultivator_qi",
    path: "assets/avatars/cultivator_qi.svg",
    category: "cultivation",
    nameKey: "avatar_cultivator_qi_name",
    descKey: "avatar_cultivator_qi_desc",
    fallbackEmoji: "🧙‍♂️"
  },
  {
    id: "cultivator_master",
    path: "assets/avatars/cultivator_master.svg",
    category: "cultivation",
    nameKey: "avatar_cultivator_master_name",
    descKey: "avatar_cultivator_master_desc",
    fallbackEmoji: "🧙‍♂️"
  },
  {
    id: "spirit_warrior",
    path: "assets/avatars/spirit_warrior.svg",
    category: "cultivation",
    nameKey: "avatar_spirit_warrior_name",
    descKey: "avatar_spirit_warrior_desc",
    fallbackEmoji: "⚔️"
  },
  {
    id: "sword_immortal",
    path: "assets/avatars/sword_immortal.svg",
    category: "cultivation",
    nameKey: "avatar_sword_immortal_name",
    descKey: "avatar_sword_immortal_desc",
    fallbackEmoji: "🗡️"
  },

  // 2. Fantasía Oriental y Occidental
  {
    id: "shadow_assassin",
    path: "assets/avatars/shadow_assassin.svg",
    category: "fantasy",
    nameKey: "avatar_shadow_assassin_name",
    descKey: "avatar_shadow_assassin_desc",
    fallbackEmoji: "🥷"
  },
  {
    id: "arcane_mage",
    path: "assets/avatars/arcane_mage.svg",
    category: "fantasy",
    nameKey: "avatar_arcane_mage_name",
    descKey: "avatar_arcane_mage_desc",
    fallbackEmoji: "🧙‍♀️"
  },
  {
    id: "paladin_dawn",
    path: "assets/avatars/paladin_dawn.svg",
    category: "fantasy",
    nameKey: "avatar_paladin_dawn_name",
    descKey: "avatar_paladin_dawn_desc",
    fallbackEmoji: "🛡️"
  },

  // 3. Lectores y Lectoras Protagonistas
  {
    id: "novel_reader_m",
    path: "assets/avatars/novel_reader_m.svg",
    category: "readers",
    nameKey: "avatar_novel_reader_m_name",
    descKey: "avatar_novel_reader_m_desc",
    fallbackEmoji: "🎧"
  },
  {
    id: "novel_reader_f",
    path: "assets/avatars/novel_reader_f.svg",
    category: "readers",
    nameKey: "avatar_novel_reader_f_name",
    descKey: "avatar_novel_reader_f_desc",
    fallbackEmoji: "📚"
  },
  {
    id: "night_owl_reader",
    path: "assets/avatars/night_owl_reader.svg",
    category: "readers",
    nameKey: "avatar_night_owl_reader_name",
    descKey: "avatar_night_owl_reader_desc",
    fallbackEmoji: "🦉"
  },

  // 4. Dragones, Fénix y Espíritus Mágicos
  {
    id: "dragon_sovereign",
    path: "assets/avatars/dragon_sovereign.svg",
    category: "creatures",
    nameKey: "avatar_dragon_sovereign_name",
    descKey: "avatar_dragon_sovereign_desc",
    fallbackEmoji: "🐉"
  },
  {
    id: "phoenix_maiden",
    path: "assets/avatars/phoenix_maiden.svg",
    category: "creatures",
    nameKey: "avatar_phoenix_maiden_name",
    descKey: "avatar_phoenix_maiden_desc",
    fallbackEmoji: "🔥"
  },
  {
    id: "kitsune_spirit",
    path: "assets/avatars/kitsune_spirit.svg",
    category: "creatures",
    nameKey: "avatar_kitsune_spirit_name",
    descKey: "avatar_kitsune_spirit_desc",
    fallbackEmoji: "🦊"
  },

  // 5. Alquimistas, Bibliotecarios y Guardianes
  {
    id: "grand_alchemist",
    path: "assets/avatars/grand_alchemist.svg",
    category: "scholars",
    nameKey: "avatar_grand_alchemist_name",
    descKey: "avatar_grand_alchemist_desc",
    fallbackEmoji: "🧪"
  },
  {
    id: "void_librarian",
    path: "assets/avatars/void_librarian.svg",
    category: "scholars",
    nameKey: "avatar_void_librarian_name",
    descKey: "avatar_void_librarian_desc",
    fallbackEmoji: "📜"
  },
  {
    id: "temple_guardian",
    path: "assets/avatars/temple_guardian.svg",
    category: "scholars",
    nameKey: "avatar_temple_guardian_name",
    descKey: "avatar_temple_guardian_desc",
    fallbackEmoji: "🗿"
  },

  // 6. Viajeros y Exploradores
  {
    id: "realm_traveler",
    path: "assets/avatars/realm_traveler.svg",
    category: "fantasy",
    nameKey: "avatar_realm_traveler_name",
    descKey: "avatar_realm_traveler_desc",
    fallbackEmoji: "🧭"
  },
  {
    id: "dungeon_delver",
    path: "assets/avatars/dungeon_delver.svg",
    category: "fantasy",
    nameKey: "avatar_dungeon_delver_name",
    descKey: "avatar_dungeon_delver_desc",
    fallbackEmoji: "🔦"
  },

  // 7. Celestiales, Reyes y Reinas
  {
    id: "celestial_emperor",
    path: "assets/avatars/celestial_emperor.svg",
    category: "celestial",
    nameKey: "avatar_celestial_emperor_name",
    descKey: "avatar_celestial_emperor_desc",
    fallbackEmoji: "👑"
  },
  {
    id: "astral_empress",
    path: "assets/avatars/astral_empress.svg",
    category: "celestial",
    nameKey: "avatar_astral_empress_name",
    descKey: "avatar_astral_empress_desc",
    fallbackEmoji: "✨"
  },

  // 8. Magia, Libros y Constelaciones
  {
    id: "tome_archon",
    path: "assets/avatars/tome_archon.svg",
    category: "scholars",
    nameKey: "avatar_tome_archon_name",
    descKey: "avatar_tome_archon_desc",
    fallbackEmoji: "📖"
  }
];

// Set of valid preset avatar paths for ultra-fast and airtight validation
var VALID_PRESET_PATHS = new Set(AVATARS_CONFIG.map(function(a) { return a.path; }));

/**
 * Validates if the given string is a safe, authentic preset avatar path.
 * Strictly prevents path traversal, protocol injections and non-whitelisted assets.
 * @param {string} path - Target path
 * @returns {boolean}
 */
function isValidPresetAvatar(path) {
  if (typeof path !== "string" || !path) return false;
  // Strict regex whitelist: assets/avatars/[a-z0-9_]+.svg
  if (!/^assets\/avatars\/[a-z0-9_]+\.svg$/.test(path)) return false;
  return VALID_PRESET_PATHS.has(path);
}

/**
 * Find avatar object by its ID.
 * @param {string} id - Avatar unique ID
 * @returns {Object|null}
 */
function getAvatarById(id) {
  if (!id || typeof id !== "string") return null;
  for (var i = 0; i < AVATARS_CONFIG.length; i++) {
    if (AVATARS_CONFIG[i].id === id) return AVATARS_CONFIG[i];
  }
  return null;
}

/**
 * Find avatar object by its asset path.
 * @param {string} path - Avatar path
 * @returns {Object|null}
 */
function getAvatarByPath(path) {
  if (!path || typeof path !== "string") return null;
  for (var i = 0; i < AVATARS_CONFIG.length; i++) {
    if (AVATARS_CONFIG[i].path === path) return AVATARS_CONFIG[i];
  }
  return null;
}

/**
 * Filter avatar items by category.
 * @param {string} category - Category ID ('all' returns full collection)
 * @returns {Array<Object>}
 */
function getPresetAvatarsByCategory(category) {
  if (!category || category === "all") return AVATARS_CONFIG.slice();
  return AVATARS_CONFIG.filter(function(a) { return a.category === category; });
}

// Global exports
if (typeof globalThis !== "undefined") {
  globalThis.AVATARS_CONFIG = AVATARS_CONFIG;
  globalThis.AVATAR_CATEGORIES = AVATAR_CATEGORIES;
  globalThis.isValidPresetAvatar = isValidPresetAvatar;
  globalThis.getAvatarById = getAvatarById;
  globalThis.getAvatarByPath = getAvatarByPath;
  globalThis.getPresetAvatarsByCategory = getPresetAvatarsByCategory;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AVATARS_CONFIG: AVATARS_CONFIG,
    AVATAR_CATEGORIES: AVATAR_CATEGORIES,
    isValidPresetAvatar: isValidPresetAvatar,
    getAvatarById: getAvatarById,
    getAvatarByPath: getAvatarByPath,
    getPresetAvatarsByCategory: getPresetAvatarsByCategory
  };
}
