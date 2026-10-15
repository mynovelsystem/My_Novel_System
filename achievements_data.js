// ============================================================================
// NOVEL CHAPTER TRACKER — ACHIEVEMENTS & CULTIVATION CORE DATA ARCHITECTURE
// ============================================================================

var THEMES_CONFIG = {
  cultivation: {
    id: "cultivation",
    nameKey: "theme_cultivation_name",
    icon: "⛩️",
    isPremium: false,
    realms: [
      { id: "qi_condensation", minQi: 0, nextQi: 100, hasStages: true, colors: ["#0ea5e9", "#6366f1", "#10b981"], gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 55%, #10b981 100%)" },
      { id: "foundation_establishment", minQi: 100, nextQi: 400, hasStages: true, colors: ["#10b981", "#059669", "#fbbf24"], gradient: "linear-gradient(135deg, #10b981 0%, #059669 55%, #fbbf24 100%)" },
      { id: "golden_core", minQi: 400, nextQi: 1000, hasStages: true, colors: ["#f59e0b", "#d97706", "#fde047"], gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 55%, #fde047 100%)" },
      { id: "nascent_soul", minQi: 1000, nextQi: 2500, hasStages: true, colors: ["#8b5cf6", "#ec4899", "#38bdf8"], gradient: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 55%, #38bdf8 100%)" },
      { id: "spirit_transformation", minQi: 2500, nextQi: 5000, hasStages: true, colors: ["#f43f5e", "#9333ea", "#fbbf24"], gradient: "linear-gradient(135deg, #f43f5e 0%, #9333ea 55%, #fbbf24 100%)" },
      { id: "void_refinement", minQi: 5000, nextQi: 9000, hasStages: true, colors: ["#3b82f6", "#1d4ed8", "#a855f7"], gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 55%, #a855f7 100%)" },
      { id: "body_integration", minQi: 9000, nextQi: 15000, hasStages: true, colors: ["#ea580c", "#dc2626", "#facc15"], gradient: "linear-gradient(135deg, #ea580c 0%, #dc2626 55%, #facc15 100%)" },
      { id: "mahayana", minQi: 15000, nextQi: 25000, hasStages: true, colors: ["#06b6d4", "#6366f1", "#f472b6"], gradient: "linear-gradient(135deg, #06b6d4 0%, #6366f1 55%, #f472b6 100%)" },
      { id: "heavenly_tribulation", minQi: 25000, nextQi: 40000, hasStages: true, colors: ["#7c3aed", "#db2777", "#fde047"], gradient: "linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #fde047 100%)" },
      { id: "immortal_ascension", minQi: 40000, nextQi: null, hasStages: false, colors: ["#fbbf24", "#ec4899", "#06b6d4"], gradient: "linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #06b6d4 100%)" }
    ],
    titles: [
      // 20 Original titles (100% preserved with difficulty classification 1-6)
      { id: "outer_disciple", tier: 1, difficulty: 1, rarity: "common", symbol: "📜", color: "#0284c7", badge: "assets/badges/outer_disciple.svg", rewardQi: 25, minRealmIndex: 0, minStage: 1, reqChapters: 5 },
      { id: "scroll_initiate", tier: 1, difficulty: 1, rarity: "common", symbol: "📖", color: "#0284c7", badge: "assets/badges/scroll_initiate.svg", rewardQi: 30, minRealmIndex: 0, minStage: 2, reqNovelsStarted: 5 },
      { id: "diligent_reader", tier: 1, difficulty: 1, rarity: "common", symbol: "🕯️", color: "#0284c7", badge: "assets/badges/diligent_reader.svg", rewardQi: 35, minRealmIndex: 0, minStage: 3, reqSingleDay: 15 },
      { id: "body_refiner", tier: 1, difficulty: 2, rarity: "common", symbol: "🥋", color: "#ea580c", badge: "assets/badges/body_refiner.svg", rewardQi: 50, minRealmIndex: 0, minStage: 5, reqChapters: 60, reqStreak: 5 },
      { id: "meridian_opener", tier: 2, difficulty: 2, rarity: "rare", symbol: "💫", color: "#0891b2", badge: "assets/badges/meridian_opener.svg", rewardQi: 75, minRealmIndex: 1, minStage: 1, reqSingleDay: 25 },
      { id: "secluded_cultivator", tier: 2, difficulty: 2, rarity: "rare", symbol: "🪷", color: "#059669", badge: "assets/badges/secluded_cultivator.svg", rewardQi: 80, minRealmIndex: 1, minStage: 2, reqStreak: 14 },
      { id: "thousand_scrolls", tier: 2, difficulty: 3, rarity: "rare", symbol: "📚", color: "#d97706", badge: "assets/badges/thousand_scrolls.svg", rewardQi: 90, minRealmIndex: 1, minStage: 4, reqNovelsStarted: 25 },
      { id: "spirit_temperer", tier: 2, difficulty: 3, rarity: "rare", symbol: "🔮", color: "#6d28d9", badge: "assets/badges/spirit_temperer.svg", rewardQi: 100, minRealmIndex: 1, minStage: 6, req30Days: 150, reqStreak: 20 },
      { id: "pill_refiner", tier: 2, difficulty: 3, rarity: "rare", symbol: "🧪", color: "#10b981", badge: "assets/badges/pill_refiner.svg", rewardQi: 110, minRealmIndex: 1, minStage: 7, reqNovelsCompleted: 3 },
      { id: "chapter_devourer", tier: 3, difficulty: 3, rarity: "rare", symbol: "⚡", color: "#e11d48", badge: "assets/badges/chapter_devourer.svg", rewardQi: 120, minRealmIndex: 2, minStage: 1, req30Days: 250 },
      { id: "tribulation_overcomer", tier: 3, difficulty: 4, rarity: "rare", symbol: "⚔️", color: "#ca8a04", badge: "assets/badges/tribulation_overcomer.svg", rewardQi: 140, minRealmIndex: 2, minStage: 4, reqNovelsCompleted: 7 },
      { id: "domain_ruler", tier: 3, difficulty: 4, rarity: "rare", symbol: "🌌", color: "#9333ea", badge: "assets/badges/domain_ruler.svg", rewardQi: 150, minRealmIndex: 2, minStage: 7, reqStreak: 35 },
      { id: "bottleneck_breaker", tier: 4, difficulty: 4, rarity: "epic", symbol: "💥", color: "#0d9488", badge: "assets/badges/bottleneck_breaker.svg", rewardQi: 200, minRealmIndex: 3, minStage: 1, reqChapters: 400, reqQi: 1000 },
      { id: "ancient_scholar", tier: 4, difficulty: 4, rarity: "epic", symbol: "🏛️", color: "#3b82f6", badge: "assets/badges/ancient_scholar.svg", rewardQi: 220, minRealmIndex: 3, minStage: 5, reqChapters: 750, reqNovelsCompleted: 10 },
      { id: "dao_heart", tier: 5, difficulty: 5, rarity: "epic", symbol: "💖", color: "#7c3aed", badge: "assets/badges/dao_heart.svg", rewardQi: 250, minRealmIndex: 4, minStage: 1, reqStreak: 60 },
      { id: "golden_immortal", tier: 6, difficulty: 5, rarity: "epic", symbol: "👑", color: "#b45309", badge: "assets/badges/golden_immortal.svg", rewardQi: 300, minRealmIndex: 5, minStage: 1, reqChapters: 1500, reqNovelsCompleted: 15 },
      { id: "heaven_defier", tier: 7, difficulty: 5, rarity: "legendary", symbol: "🐉", color: "#be185d", badge: "assets/badges/heaven_defier.svg", rewardQi: 400, minRealmIndex: 6, minStage: 1, reqChapters: 2500, reqStreak: 90 },
      { id: "cosmic_sovereign", tier: 8, difficulty: 6, rarity: "legendary", symbol: "🪐", color: "#f59e0b", badge: "assets/badges/cosmic_sovereign.svg", rewardQi: 500, minRealmIndex: 7, minStage: 1, reqChapters: 3500, reqNovelsCompleted: 25 },
      { id: "tribulation_emperor", tier: 9, difficulty: 6, rarity: "legendary", symbol: "⚡", color: "#db2777", badge: "assets/badges/tribulation_emperor.svg", rewardQi: 750, minRealmIndex: 8, minStage: 1, reqChapters: 4200, reqStreak: 100 },
      { id: "primordial_immortal", tier: 9, difficulty: 6, rarity: "legendary", symbol: "☯️", color: "#ec4899", badge: "assets/badges/primordial_immortal.svg", rewardQi: 1000, minRealmIndex: 9, minStage: 1, reqQi: 40000 },

      // 6 New Emblematic Achievements
      { id: "qi_control", tier: 1, difficulty: 1, rarity: "common", symbol: "🌀", color: "#0ea5e9", badge: "assets/badges/qi_control.svg", rewardQi: 40, minRealmIndex: 0, minStage: 1, reqStreak: 7 },
      { id: "scroll_collector", tier: 1, difficulty: 2, rarity: "common", symbol: "🗂️", color: "#0284c7", badge: "assets/badges/scroll_collector.svg", rewardQi: 45, minRealmIndex: 0, minStage: 1, reqNovelsStarted: 10 },
      { id: "saga_master", tier: 3, difficulty: 3, rarity: "rare", symbol: "📚", color: "#10b981", badge: "assets/badges/saga_master.svg", rewardQi: 130, minRealmIndex: 1, minStage: 1, reqNovelsCompleted: 5 },
      { id: "arc_lord", tier: 3, difficulty: 3, rarity: "rare", symbol: "🏹", color: "#e11d48", badge: "assets/badges/arc_lord.svg", rewardQi: 140, minRealmIndex: 1, minStage: 1, reqSingleDay: 40 },
      { id: "legendary_reader", tier: 5, difficulty: 4, rarity: "epic", symbol: "📜", color: "#9333ea", badge: "assets/badges/legendary_reader.svg", rewardQi: 260, minRealmIndex: 3, minStage: 1, reqChapters: 1000 },
      { id: "reading_immortal", tier: 9, difficulty: 6, rarity: "legendary", symbol: "👑", color: "#f59e0b", badge: "assets/badges/reading_immortal.svg", rewardQi: 1000, minRealmIndex: 9, minStage: 1 }
    ]
  },
  hunter: {
    id: "hunter",
    nameKey: "theme_hunter_name",
    icon: "🗡️",
    isPremium: true,
    realms: [
      { id: "hunter_rank_e", minQi: 0, nextQi: 100, hasStages: true, colors: ["#64748b", "#475569", "#94a3b8"], gradient: "linear-gradient(135deg, #64748b 0%, #475569 100%)" },
      { id: "hunter_rank_d", minQi: 100, nextQi: 400, hasStages: true, colors: ["#10b981", "#059669", "#34d399"], gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)" },
      { id: "hunter_rank_c", minQi: 400, nextQi: 1000, hasStages: true, colors: ["#3b82f6", "#2563eb", "#60a5fa"], gradient: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)" },
      { id: "hunter_rank_b", minQi: 1000, nextQi: 2500, hasStages: true, colors: ["#8b5cf6", "#7c3aed", "#a78bfa"], gradient: "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)" },
      { id: "hunter_rank_a", minQi: 2500, nextQi: 6000, hasStages: true, colors: ["#f59e0b", "#d97706", "#fbbf24"], gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)" },
      { id: "hunter_rank_s", minQi: 6000, nextQi: 15000, hasStages: true, colors: ["#ef4444", "#dc2626", "#f87171"], gradient: "linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)" },
      { id: "hunter_national", minQi: 15000, nextQi: null, hasStages: false, colors: ["#fbbf24", "#7c3aed", "#f43f5e"], gradient: "linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #8b5cf6 100%)" }
    ],
    titles: [
      { id: "hunter_awakening", tier: 1, difficulty: 1, rarity: "common", symbol: "🗡️", color: "#64748b", badge: "assets/badges/hunter_awakening.svg", rewardQi: 30, minRealmIndex: 0, minStage: 1, reqChapters: 5 },
      { id: "dungeon_scout", tier: 2, difficulty: 2, rarity: "rare", symbol: "🚪", color: "#059669", badge: "assets/badges/dungeon_scout.svg", rewardQi: 80, minRealmIndex: 1, minStage: 1, reqChapters: 120, reqStreak: 10 },
      { id: "shadow_monarch", tier: 3, difficulty: 4, rarity: "epic", symbol: "👥", color: "#7c3aed", badge: "assets/badges/shadow_monarch.svg", rewardQi: 200, minRealmIndex: 2, minStage: 1, reqChapters: 500, req30Days: 200 },
      { id: "national_hunter", tier: 6, difficulty: 6, rarity: "legendary", symbol: "🛡️", color: "#f59e0b", badge: "assets/badges/national_hunter.svg", rewardQi: 500, minRealmIndex: 5, minStage: 1, reqChapters: 2000, reqNovelsCompleted: 15 }
    ]
  },
  legendary_novels: {
    id: "legendary_novels",
    nameKey: "theme_novels_name",
    icon: "📖",
    isPremium: true,
    realms: [
      { id: "novice_reader", minQi: 0, nextQi: 200, hasStages: true, colors: ["#0284c7", "#0369a1", "#38bdf8"], gradient: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)" },
      { id: "lore_seeker", minQi: 200, nextQi: 800, hasStages: true, colors: ["#6366f1", "#4f46e5", "#818cf8"], gradient: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" },
      { id: "omniscient_observer", minQi: 800, nextQi: 3000, hasStages: true, colors: ["#9333ea", "#7e22ce", "#c084fc"], gradient: "linear-gradient(135deg, #7e22ce 0%, #9333ea 100%)" },
      { id: "mythic_chronicler", minQi: 3000, nextQi: null, hasStages: false, colors: ["#f59e0b", "#ec4899", "#06b6d4"], gradient: "linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #06b6d4 100%)" }
    ],
    titles: [
      { id: "fool_pathway", tier: 2, difficulty: 2, rarity: "rare", symbol: "🃏", color: "#6366f1", badge: "assets/badges/fool_pathway.svg", rewardQi: 85, minRealmIndex: 1, minStage: 1, reqChapters: 150 },
      { id: "constellation_reader", tier: 3, difficulty: 4, rarity: "rare", symbol: "⭐", color: "#9333ea", badge: "assets/badges/constellation_reader.svg", rewardQi: 150, minRealmIndex: 2, minStage: 1, reqChapters: 600, reqNovelsStarted: 20 },
      { id: "nano_symbiosis", tier: 3, difficulty: 3, rarity: "rare", symbol: "⚙️", color: "#06b6d4", badge: "assets/badges/nano_symbiosis.svg", rewardQi: 120, minRealmIndex: 2, minStage: 1, reqSingleDay: 30 },
      { id: "primordial_author", tier: 4, difficulty: 6, rarity: "epic", symbol: "🖋️", color: "#f59e0b", badge: "assets/badges/primordial_author.svg", rewardQi: 300, minRealmIndex: 3, minStage: 1, reqChapters: 3000, reqNovelsCompleted: 20 }
    ]
  }
};

var CULTIVATION_REALMS = THEMES_CONFIG.cultivation.realms;

var ALL_TITLES = [];
var TITLE_CONFIG = {};
var TITLE_BADGE_COLORS = {};
var TITLE_BADGE_SYMBOLS = {};

Object.values(THEMES_CONFIG).forEach((tCfg) => {
  tCfg.titles.forEach((item) => {
    const fullItem = { ...item, themeId: tCfg.id };
    ALL_TITLES.push(fullItem);
    TITLE_CONFIG[item.id] = fullItem;
    TITLE_BADGE_COLORS[item.id] = item.color;
    TITLE_BADGE_SYMBOLS[item.id] = item.symbol;
  });
});

var CULTIVATION_TITLES = THEMES_CONFIG.cultivation.titles.map((t) => t.id);

// Canonical Rarity Color & Aura Table (shared across background.js, popup, and build scripts)
var BADGE_RARITY_CONFIG = {
  common: {
    color: "#d97706",
    aura: "rgba(217, 119, 6, 0.40)",
    blurFactor: 1.0,
    passes: 1
  },
  rare: {
    color: "#06b6d4",
    aura: "rgba(6, 182, 212, 0.65)",
    blurFactor: 1.15,
    passes: 1
  },
  epic: {
    color: "#c084fc",
    aura: "rgba(192, 132, 252, 0.75)",
    blurFactor: 1.30,
    passes: 1
  },
  legendary: {
    color: "#fbbf24",
    aura: "rgba(251, 191, 36, 0.90)",
    blurFactor: 1.50,
    passes: 2
  },
  negative: {
    color: "#e11d48",
    aura: "rgba(225, 29, 72, 0.80)",
    blurFactor: 1.25,
    passes: 1
  }
};

var BADGE_RARITY_COLORS = {
  common: BADGE_RARITY_CONFIG.common.color,
  rare: BADGE_RARITY_CONFIG.rare.color,
  epic: BADGE_RARITY_CONFIG.epic.color,
  legendary: BADGE_RARITY_CONFIG.legendary.color,
  negative: BADGE_RARITY_CONFIG.negative.color
};

// Canonical Difficulty Configuration (Principiante -> Legendario)
var DIFFICULTY_CONFIG = {
  1: { id: "beginner", level: 1, nameKey: "diff_beginner", color: "#38bdf8" },
  2: { id: "easy", level: 2, nameKey: "diff_easy", color: "#4ade80" },
  3: { id: "intermediate", level: 3, nameKey: "diff_intermediate", color: "#fbbf24" },
  4: { id: "hard", level: 4, nameKey: "diff_hard", color: "#f97316" },
  5: { id: "expert", level: 5, nameKey: "diff_expert", color: "#ec4899" },
  6: { id: "legendary", level: 6, nameKey: "diff_legendary", color: "#a855f7" }
};

// Catalogo de Objetos / Artefactos del Sistema vinculados a las Insignias
var ITEMS_CONFIG = {
  qi_core_1: {
    id: "qi_core_1",
    nameKey: "item_qi_core_1_name",
    descKey: "item_qi_core_1_desc",
    icon: "🔮",
    rarity: "common",
    type: "artifact",
    slot: "artifact",
    qiBonusMultiplier: 0.10, // +10% de ganancia de Qi
    qiMultiplier: 1.10,
    unlockedByAchievement: "outer_disciple"
  },
  amulet_focus_1: {
    id: "amulet_focus_1",
    nameKey: "item_amulet_focus_1_name",
    descKey: "item_amulet_focus_1_desc",
    icon: "🧿",
    rarity: "rare",
    type: "amulet",
    slot: "amulet",
    qiBonusMultiplier: 0.15, // +15% de ganancia de Qi
    qiMultiplier: 1.15,
    unlockedByAchievement: "diligent_reader"
  },
  pill_vitality_1: {
    id: "pill_vitality_1",
    nameKey: "item_pill_vitality_1_name",
    descKey: "item_pill_vitality_1_desc",
    icon: "💊",
    rarity: "rare",
    type: "pill",
    slot: "pill",
    qiBonusMultiplier: 0.15, // +15% de ganancia de Qi
    qiMultiplier: 1.15,
    unlockedByAchievement: "body_refiner"
  },
  cultivator_seal_1: {
    id: "cultivator_seal_1",
    nameKey: "item_cultivator_seal_1_name",
    descKey: "item_cultivator_seal_1_desc",
    icon: "⛩️",
    rarity: "epic",
    type: "seal",
    slot: "seal",
    qiBonusMultiplier: 0.25, // +25% de ganancia de Qi
    qiMultiplier: 1.25,
    unlockedByAchievement: "secluded_cultivator"
  },
  relic_ascension_1: {
    id: "relic_ascension_1",
    nameKey: "item_relic_ascension_1_name",
    descKey: "item_relic_ascension_1_desc",
    icon: "👑",
    rarity: "legendary",
    type: "relic",
    slot: "relic",
    qiBonusMultiplier: 0.50, // +50% de ganancia de Qi
    qiMultiplier: 1.50,
    unlockedByAchievement: "primordial_immortal"
  }
};

function getEquippedQiMultiplier(stats) {
  if (!stats || !Array.isArray(stats.equippedItems) || stats.equippedItems.length === 0) {
    return 1.0;
  }
  let totalBonus = 0;
  for (const itemId of stats.equippedItems) {
    const item = ITEMS_CONFIG[itemId];
    if (item) {
      if (typeof item.qiBonusMultiplier === "number") {
        totalBonus += item.qiBonusMultiplier;
      } else if (typeof item.qiMultiplier === "number") {
        totalBonus += Math.max(0, item.qiMultiplier - 1.0);
      }
    }
  }
  // Límite acotado para prevenir números absurdos (mínimo 1.0, máximo 5.0)
  return Math.min(5.0, Math.max(1.0, 1.0 + totalBonus));
}

// Sincronización idempotente: bonusQi recalculado a partir del conjunto consolidado claimedRewards
function calculateBonusQi(stats) {
  if (!stats || !Array.isArray(stats.claimedRewards)) return 0;
  let bonus = 0;
  for (const achId of stats.claimedRewards) {
    const item = TITLE_CONFIG[achId];
    if (item && typeof item.rewardQi === "number") {
      bonus += item.rewardQi;
    }
  }
  return bonus;
}

function calculateQi(stats) {
  const chapters = Math.max(0, Number(stats?.chaptersRead) || 0);
  const completed = Math.max(0, Number(stats?.novelsCompleted) || 0);
  const baseReadingQi = chapters + 50 * completed;
  const multiplier = getEquippedQiMultiplier(stats);
  const bonus = calculateBonusQi(stats);
  return Math.round(baseReadingQi * multiplier) + bonus;
}

function calculateQiBreakdown(stats) {
  const chapters = Math.max(0, Number(stats?.chaptersRead) || 0);
  const completed = Math.max(0, Number(stats?.novelsCompleted) || 0);
  const baseReadingQi = chapters + 50 * completed;
  const multiplier = getEquippedQiMultiplier(stats);
  const multiplierPct = Math.round((multiplier - 1.0) * 100);
  const bonusQi = calculateBonusQi(stats);
  const finalQi = Math.round(baseReadingQi * multiplier) + bonusQi;
  return {
    chapters,
    completed,
    baseReadingQi,
    multiplier,
    multiplierPct,
    bonusQi,
    finalQi,
    totalQi: finalQi
  };
}

function syncUserInventory(stats) {
  if (!stats) return stats;
  if (!Array.isArray(stats.inventory)) {
    stats.inventory = [];
  }
  if (!Array.isArray(stats.equippedItems)) {
    stats.equippedItems = [];
  }
  const unlocked = new Set(Array.isArray(stats.unlockedTitles) ? stats.unlockedTitles : []);
  const currentInv = new Set(stats.inventory);

  for (const item of Object.values(ITEMS_CONFIG)) {
    if (unlocked.has(item.unlockedByAchievement)) {
      if (!currentInv.has(item.id)) {
        stats.inventory.push(item.id);
        currentInv.add(item.id);
      }
    }
  }

  // Filtrar objetos equipados para asegurar que sigan existiendo en el inventario, sin duplicados y con tope de 3
  const validEquipped = Array.from(new Set(stats.equippedItems)).filter((id) => currentInv.has(id));
  stats.equippedItems = validEquipped.slice(0, 3);
  return stats;
}

function equipItem(stats, itemId) {
  if (!stats) return { ok: false, error: "invalid_stats" };
  syncUserInventory(stats);
  if (!stats.inventory.includes(itemId)) {
    return { ok: false, error: "item_not_in_inventory" };
  }
  if (!Array.isArray(stats.equippedItems)) {
    stats.equippedItems = [];
  }
  if (stats.equippedItems.includes(itemId)) {
    return { ok: true, alreadyEquipped: true, stats };
  }
  const MAX_EQUIPPED_ITEMS = 3;
  if (stats.equippedItems.length >= MAX_EQUIPPED_ITEMS) {
    return { ok: false, error: "slots_full", maxSlots: MAX_EQUIPPED_ITEMS };
  }
  stats.equippedItems.push(itemId);
  stats.updatedAt = Date.now();
  return { ok: true, stats };
}

function unequipItem(stats, itemId) {
  if (!stats) return { ok: false, error: "invalid_stats" };
  if (!Array.isArray(stats.equippedItems)) {
    stats.equippedItems = [];
    return { ok: true, stats };
  }
  stats.equippedItems = stats.equippedItems.filter((id) => id !== itemId);
  stats.updatedAt = Date.now();
  return { ok: true, stats };
}

function getSortedTitlesByDifficulty(titles) {
  if (!Array.isArray(titles)) return [];
  return [...titles].sort((a, b) => {
    const diffA = Number(a.difficulty) || 1;
    const diffB = Number(b.difficulty) || 1;
    if (diffA !== diffB) return diffA - diffB;
    const realmA = Number(a.minRealmIndex) || 0;
    const realmB = Number(b.minRealmIndex) || 0;
    if (realmA !== realmB) return realmA - realmB;
    const stageA = Number(a.minStage) || 1;
    const stageB = Number(b.minStage) || 1;
    if (stageA !== stageB) return stageA - stageB;
    const rewardA = Number(a.rewardQi) || 0;
    const rewardB = Number(b.rewardQi) || 0;
    return rewardA - rewardB;
  });
}

function computeNaturalRealmAndStage(qi, realms = CULTIVATION_REALMS) {
  let realmIndex = 0;
  for (let i = realms.length - 1; i >= 0; i--) {
    if (qi >= realms[i].minQi) {
      realmIndex = i;
      break;
    }
  }
  const realm = realms[realmIndex] || realms[0];
  if (!realm.hasStages || realm.nextQi === null) {
    return { realmIndex, realmId: realm.id, stage: null };
  }
  const span = realm.nextQi - realm.minQi;
  const progress = Math.max(0, qi - realm.minQi);
  const stage = Math.min(9, Math.floor((progress * 9) / span) + 1);
  return { realmIndex, realmId: realm.id, stage };
}

function computeRealmAndStage(qi) {
  return computeNaturalRealmAndStage(qi, CULTIVATION_REALMS);
}

function getCultivationState(stats, themeId = "cultivation") {
  const theme = THEMES_CONFIG[themeId] || THEMES_CONFIG.cultivation;
  const realms = theme.realms;
  const totalQi = calculateQi(stats);

  const themeData = stats?.cultivationThemes?.[themeId];
  let cultivatedRealmIndex = themeData?.realmIndex;
  let cultivatedStage = themeData?.stage;

  // Fallback y sincronización con campos planos raíz si la temática es "cultivation"
  if (themeId === "cultivation") {
    if (cultivatedRealmIndex === undefined && stats?.cultivatedRealmIndex !== undefined) {
      cultivatedRealmIndex = stats.cultivatedRealmIndex;
      cultivatedStage = stats.cultivatedStage;
    } else if (stats?.cultivatedRealmIndex !== undefined) {
      const rootR = Number(stats.cultivatedRealmIndex);
      const themeR = Number(cultivatedRealmIndex);
      if (rootR > themeR) {
        cultivatedRealmIndex = rootR;
        cultivatedStage = stats.cultivatedStage;
      } else if (rootR === themeR) {
        const rootS = stats.cultivatedStage !== null && stats.cultivatedStage !== undefined ? Number(stats.cultivatedStage) : null;
        const themeS = cultivatedStage !== null && cultivatedStage !== undefined ? Number(cultivatedStage) : null;
        if (rootS !== null && themeS !== null) {
          cultivatedStage = Math.max(rootS, themeS);
        } else if (rootS !== null) {
          cultivatedStage = rootS;
        }
      }
    }
  }

  if (cultivatedRealmIndex === undefined) {
    const natural = computeNaturalRealmAndStage(totalQi, realms);
    cultivatedRealmIndex = natural.realmIndex;
    cultivatedStage = natural.stage;
  } else {
    cultivatedRealmIndex = Math.min(realms.length - 1, Math.max(0, Number(cultivatedRealmIndex) || 0));
    const targetRealm = realms[cultivatedRealmIndex] || realms[0];
    if (!targetRealm.hasStages || targetRealm.nextQi === null) {
      cultivatedStage = null;
    } else {
      cultivatedStage = Math.min(9, Math.max(1, Number(cultivatedStage) || 1));
    }
  }

  const currentRealm = realms[cultivatedRealmIndex] || realms[0];
  const isPeakRealm = !currentRealm.hasStages || currentRealm.nextQi === null;

  let currentCapQi = null;
  let currentStageCapQi = null;
  let prevStageCapQi = currentRealm.minQi;
  let stageProgress = 0;
  let stageSpan = 0;
  let isBottleneck = false;
  let isRealmBottleneck = false;
  let overflowQi = 0;
  let pct = 100;

  if (!isPeakRealm && cultivatedStage !== null) {
    const realmSpan = currentRealm.nextQi - currentRealm.minQi;
    stageSpan = realmSpan / 9;
    const stageMin = currentRealm.minQi + stageSpan * (cultivatedStage - 1);
    prevStageCapQi = Math.round(stageMin);
    currentCapQi = Math.round(currentRealm.minQi + stageSpan * cultivatedStage);
    currentStageCapQi = currentCapQi;
    stageProgress = Math.max(0, totalQi - stageMin);

    if (totalQi >= currentCapQi) {
      isBottleneck = true;
      if (cultivatedStage === 9) {
        isRealmBottleneck = true;
      }
      overflowQi = totalQi - currentCapQi;
      pct = 100;
    } else {
      overflowQi = 0;
      const progressInStage = Math.max(0, totalQi - prevStageCapQi);
      const spanInStage = Math.max(1, currentStageCapQi - prevStageCapQi);
      pct = Math.min(99, Math.max(0, Math.round((progressInStage / spanInStage) * 100)));
    }
  } else if (isPeakRealm) {
    currentCapQi = currentRealm.minQi;
    currentStageCapQi = currentRealm.minQi;
  }

  const nextRealm = (!isPeakRealm && cultivatedRealmIndex < realms.length - 1)
    ? realms[cultivatedRealmIndex + 1]
    : null;

  return {
    themeId: theme.id,
    realmIndex: cultivatedRealmIndex,
    realmId: currentRealm.id,
    realmObj: currentRealm,
    realmNameKey: `realm_${currentRealm.id}`,
    stage: cultivatedStage,
    colors: currentRealm.colors,
    gradient: currentRealm.gradient,
    totalQi,
    currentCapQi,
    currentStageCapQi,
    prevStageCapQi,
    isBottleneck,
    isBottleneckReady: isBottleneck,
    isRealmBottleneck,
    isMajorBottleneck: isRealmBottleneck,
    overflowQi,
    pct,
    nextRealmId: nextRealm ? nextRealm.id : null,
    isPeakRealm,
    nextRealm,
    stageProgress,
    stageSpan
  };
}

function pruneAndSumDailyChapters(dailyChapters) {
  const pruned = {};
  let last30DaysSum = 0;
  let maxSingleDay = 0;
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  if (dailyChapters && typeof dailyChapters === "object") {
    for (const [dayStr, count] of Object.entries(dailyChapters)) {
      const dayDate = new Date(dayStr);
      const validCount = Number(count) || 0;
      if (!isNaN(dayDate.getTime()) && now - dayDate.getTime() <= thirtyDaysMs) {
        pruned[dayStr] = validCount;
        last30DaysSum += validCount;
      }
      if (validCount > maxSingleDay) {
        maxSingleDay = validCount;
      }
    }
  }
  return { pruned, last30DaysSum, maxSingleDay };
}

function evaluateUnlockedTitles(stats, currentThemeId = "cultivation") {
  const unlocked = new Set(Array.isArray(stats.unlockedTitles) ? stats.unlockedTitles : []);
  const totalQi = calculateQi(stats);
  const { last30DaysSum, maxSingleDay } = pruneAndSumDailyChapters(stats.dailyChapters);
  const maxStreak = Math.max(Number(stats.streakDays) || 0, Number(stats.bestStreak) || 0);

  for (const tConfig of Object.values(THEMES_CONFIG)) {
    const themeState = getCultivationState(stats, tConfig.id);
    const themeRealmIndex = themeState.realmIndex;
    const themeStage = themeState.stage;

    for (const title of tConfig.titles) {
      if (unlocked.has(title.id)) continue;

      // 1. Level Gating: Check minimum realm and stage within THIS title's theme
      // Corregir caso cumbre: si themeStage === null (como en immortal_ascension), se cumple la etapa
      const minRealm = title.minRealmIndex !== undefined ? title.minRealmIndex : 0;
      let levelSatisfied = false;
      if (themeRealmIndex > minRealm) {
        levelSatisfied = true;
      } else if (themeRealmIndex === minRealm) {
        levelSatisfied = (themeStage === null || (themeStage >= (title.minStage || 1)));
      }

      if (!levelSatisfied) continue;

      // 2. Reading requirements
      let reqSatisfied = true;
      if (title.reqChapters && (Number(stats.chaptersRead) || 0) < title.reqChapters) reqSatisfied = false;
      if (title.reqNovelsStarted && (Number(stats.novelsStarted) || 0) < title.reqNovelsStarted) reqSatisfied = false;
      if (title.reqNovelsCompleted && (Number(stats.novelsCompleted) || 0) < title.reqNovelsCompleted) reqSatisfied = false;
      if (title.reqStreak && maxStreak < title.reqStreak) reqSatisfied = false;
      if (title.reqSingleDay && maxSingleDay < title.reqSingleDay) reqSatisfied = false;
      if (title.req30Days && last30DaysSum < title.req30Days) reqSatisfied = false;
      if (title.reqQi && totalQi < title.reqQi) reqSatisfied = false;

      if (reqSatisfied) {
        unlocked.add(title.id);
      }
    }
  }

  const unlockedArr = Array.from(unlocked);
  stats.unlockedTitles = unlockedArr;
  if (!stats.equippedTitle && unlockedArr.length > 0) {
    stats.equippedTitle = unlockedArr[unlockedArr.length - 1];
  }
  syncUserInventory(stats);
  return stats;
}

function claimAchievementReward(stats, achievementId) {
  if (!stats) return { ok: false, error: "invalid_stats" };
  if (!Array.isArray(stats.unlockedTitles) || !stats.unlockedTitles.includes(achievementId)) {
    return { ok: false, error: "not_unlocked" };
  }
  if (!Array.isArray(stats.claimedRewards)) {
    stats.claimedRewards = [];
  }
  if (stats.claimedRewards.includes(achievementId)) {
    return { ok: false, error: "already_claimed" };
  }

  stats.claimedRewards.push(achievementId);
  stats.bonusQi = calculateBonusQi(stats);
  evaluateUnlockedTitles(stats);
  stats.updatedAt = Date.now();

  const cfg = TITLE_CONFIG[achievementId];
  return {
    ok: true,
    rewardQi: cfg?.rewardQi || 0,
    totalQi: calculateQi(stats),
    bonusQi: stats.bonusQi
  };
}

function getUnclaimedAchievements(stats) {
  if (!stats || !Array.isArray(stats.unlockedTitles)) return [];
  const claimed = new Set(Array.isArray(stats.claimedRewards) ? stats.claimedRewards : []);
  return stats.unlockedTitles
    .filter((id) => !claimed.has(id))
    .map((id) => TITLE_CONFIG[id])
    .filter(Boolean);
}

function advanceCultivationBreakthrough(stats, themeId = "cultivation", options = {}) {
  const state = getCultivationState(stats, themeId);
  if (state.isPeakRealm) {
    return { ok: false, reason: "already_max_level" };
  }

  const isReady = state.isBottleneckReady || state.isBottleneck;
  if (!isReady) return { ok: false, reason: "not_ready" };

  const theme = THEMES_CONFIG[themeId] || THEMES_CONFIG.cultivation;
  const realms = theme.realms;

  let newRealmIndex = state.realmIndex;
  let newStage = state.stage;
  const isMajor = Boolean(state.isMajorBottleneck || state.isRealmBottleneck);
  const applySurplus = Boolean(options && options.applySurplus);

  if (isMajor) {
    if (state.realmIndex >= realms.length - 1) {
      return { ok: false, reason: "already_max_realm" };
    }
    newRealmIndex = state.realmIndex + 1;
    const targetRealm = realms[newRealmIndex] || realms[0];
    if (!targetRealm.hasStages || targetRealm.nextQi === null) {
      newStage = null;
    } else {
      if (applySurplus) {
        const newRealmSpan = targetRealm.nextQi - targetRealm.minQi;
        const progressInNew = Math.max(0, state.totalQi - targetRealm.minQi);
        const earnedStage = Math.min(9, Math.floor((progressInNew * 9) / newRealmSpan) + 1);
        newStage = Math.max(1, Math.min(9, earnedStage));
      } else {
        newStage = 1;
      }
    }
  } else {
    if (applySurplus && state.realmObj && state.realmObj.nextQi !== null) {
      const realmSpan = state.realmObj.nextQi - state.realmObj.minQi;
      const progressInRealm = Math.max(0, state.totalQi - state.realmObj.minQi);
      const earnedStage = Math.min(9, Math.floor((progressInRealm * 9) / realmSpan) + 1);
      newStage = Math.max((state.stage || 1) + 1, earnedStage);
      newStage = Math.min(9, newStage);
    } else {
      newStage = Math.min(9, (state.stage || 1) + 1);
    }
  }

  const breakthroughRecord = {
    themeId,
    realmIndex: newRealmIndex,
    realmId: realms[newRealmIndex].id,
    stage: newStage,
    isMajor,
    timestamp: Date.now()
  };

  if (!stats.cultivationThemes) {
    stats.cultivationThemes = {};
  }
  stats.cultivationThemes[themeId] = {
    realmIndex: newRealmIndex,
    stage: newStage,
    lastBreakthrough: breakthroughRecord
  };

  if (themeId === "cultivation") {
    stats.cultivatedRealmIndex = newRealmIndex;
    stats.cultivatedStage = newStage;
    stats.lastBreakthrough = breakthroughRecord;
  }

  stats.updatedAt = Date.now();
  evaluateUnlockedTitles(stats, themeId);

  return {
    ok: true,
    newRealmIndex,
    newStage,
    realmObj: realms[newRealmIndex],
    isMajor,
    breakthroughRecord,
    stats
  };
}

function getLocalDateStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetweenDateStrings(d1, d2) {
  try {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    const diffTime = date2.getTime() - date1.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function recordCultivationProgress(rawStats, chaptersDelta, isNewNovelStarted, completedDelta = 0) {
  const stats = {
    chaptersRead: 0,
    novelsStarted: 0,
    novelsCompleted: 0,
    streakDays: 0,
    bestStreak: 0,
    lastReadDay: "",
    unlockedTitles: [],
    equippedTitle: "",
    claimedRewards: [],
    bonusQi: 0,
    dailyChapters: {},
    cultivatedRealmIndex: undefined,
    cultivatedStage: undefined,
    lastBreakthrough: null,
    updatedAt: 0,
    ...(rawStats || {})
  };

  if (stats.cultivatedRealmIndex === undefined) {
    const initialQi = calculateQi(stats);
    const natural = computeNaturalRealmAndStage(initialQi);
    stats.cultivatedRealmIndex = natural.realmIndex;
    stats.cultivatedStage = natural.stage;
  } else if (stats.cultivatedStage === undefined) {
    const targetRealm = CULTIVATION_REALMS[stats.cultivatedRealmIndex] || CULTIVATION_REALMS[0];
    stats.cultivatedStage = (!targetRealm.hasStages || targetRealm.nextQi === null) ? null : 1;
  }

  if (!stats.cultivationThemes) {
    stats.cultivationThemes = {};
  }
  if (!stats.cultivationThemes.cultivation) {
    stats.cultivationThemes.cultivation = {
      realmIndex: stats.cultivatedRealmIndex,
      stage: stats.cultivatedStage,
      lastBreakthrough: stats.lastBreakthrough || null
    };
  }

  if (isNewNovelStarted) {
    stats.novelsStarted = Math.max(0, Number(stats.novelsStarted) || 0) + 1;
  }

  if (completedDelta !== 0) {
    stats.novelsCompleted = Math.max(0, (Number(stats.novelsCompleted) || 0) + completedDelta);
  }

  if (chaptersDelta > 0) {
    stats.chaptersRead = Math.max(0, Number(stats.chaptersRead) || 0) + chaptersDelta;

    const todayStr = getLocalDateStr();
    const diffDays = stats.lastReadDay ? daysBetweenDateStrings(stats.lastReadDay, todayStr) : null;

    if (!stats.lastReadDay || diffDays === null || diffDays > 1 || diffDays < 0) {
      stats.streakDays = 1;
    } else if (diffDays === 1) {
      stats.streakDays = (Number(stats.streakDays) || 0) + 1;
    } else if (diffDays === 0) {
      stats.streakDays = Math.max(1, Number(stats.streakDays) || 1);
    }

    stats.lastReadDay = todayStr;
    stats.bestStreak = Math.max(Number(stats.bestStreak) || 0, stats.streakDays);

    const daily = { ...(stats.dailyChapters || {}) };
    daily[todayStr] = (Number(daily[todayStr]) || 0) + chaptersDelta;
    const { pruned } = pruneAndSumDailyChapters(daily);
    stats.dailyChapters = pruned;
  }

  evaluateUnlockedTitles(stats);
  stats.bonusQi = calculateBonusQi(stats);
  stats.updatedAt = Date.now();
  return stats;
}

// Expose on global environment (Window, Worker, Node)
if (typeof globalThis !== "undefined") {
  globalThis.THEMES_CONFIG = THEMES_CONFIG;
  globalThis.CULTIVATION_REALMS = CULTIVATION_REALMS;
  globalThis.ALL_TITLES = ALL_TITLES;
  globalThis.TITLE_CONFIG = TITLE_CONFIG;
  globalThis.TITLE_BADGE_COLORS = TITLE_BADGE_COLORS;
  globalThis.TITLE_BADGE_SYMBOLS = TITLE_BADGE_SYMBOLS;
  globalThis.CULTIVATION_TITLES = CULTIVATION_TITLES;
  globalThis.calculateBonusQi = calculateBonusQi;
  globalThis.calculateQi = calculateQi;
  globalThis.calculateQiBreakdown = calculateQiBreakdown;
  globalThis.getEquippedQiMultiplier = getEquippedQiMultiplier;
  globalThis.computeNaturalRealmAndStage = computeNaturalRealmAndStage;
  globalThis.computeRealmAndStage = computeRealmAndStage;
  globalThis.getCultivationState = getCultivationState;
  globalThis.pruneAndSumDailyChapters = pruneAndSumDailyChapters;
  globalThis.evaluateUnlockedTitles = evaluateUnlockedTitles;
  globalThis.claimAchievementReward = claimAchievementReward;
  globalThis.getUnclaimedAchievements = getUnclaimedAchievements;
  globalThis.advanceCultivationBreakthrough = advanceCultivationBreakthrough;
  globalThis.recordCultivationProgress = recordCultivationProgress;
  globalThis.getLocalDateStr = getLocalDateStr;
  globalThis.daysBetweenDateStrings = daysBetweenDateStrings;
  globalThis.BADGE_RARITY_CONFIG = BADGE_RARITY_CONFIG;
  globalThis.BADGE_RARITY_COLORS = BADGE_RARITY_COLORS;
  globalThis.RARITY_BADGE_COLORS = BADGE_RARITY_COLORS;
  globalThis.DIFFICULTY_CONFIG = DIFFICULTY_CONFIG;
  globalThis.ITEMS_CONFIG = ITEMS_CONFIG;
  globalThis.syncUserInventory = syncUserInventory;
  globalThis.equipItem = equipItem;
  globalThis.unequipItem = unequipItem;
  globalThis.getSortedTitlesByDifficulty = getSortedTitlesByDifficulty;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    THEMES_CONFIG,
    CULTIVATION_REALMS,
    ALL_TITLES,
    TITLE_CONFIG,
    TITLE_BADGE_COLORS,
    TITLE_BADGE_SYMBOLS,
    CULTIVATION_TITLES,
    calculateBonusQi,
    calculateQi,
    calculateQiBreakdown,
    getEquippedQiMultiplier,
    computeNaturalRealmAndStage,
    computeRealmAndStage,
    getCultivationState,
    pruneAndSumDailyChapters,
    evaluateUnlockedTitles,
    claimAchievementReward,
    getUnclaimedAchievements,
    advanceCultivationBreakthrough,
    recordCultivationProgress,
    getLocalDateStr,
    daysBetweenDateStrings,
    BADGE_RARITY_CONFIG,
    BADGE_RARITY_COLORS,
    RARITY_BADGE_COLORS: BADGE_RARITY_COLORS,
    DIFFICULTY_CONFIG,
    ITEMS_CONFIG,
    syncUserInventory,
    equipItem,
    unequipItem,
    getSortedTitlesByDifficulty
  };
}
