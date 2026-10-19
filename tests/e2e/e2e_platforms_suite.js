// ============================================================================
// MYNOVELSYSTEM v4.0.0 — E2E PLATFORMS AUDIT SUITE (CHROMIUM REAL MV3)
// Audits Reading Platforms: Novels, Light Novels, Manga, Manhwa, Webcomics
// ============================================================================

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const EXT_PATH = path.resolve(__dirname, "../..");
const FIXTURES_DIR = path.resolve(__dirname, "../fixtures");
const RESULTS_DIR = path.resolve(__dirname, "../../test-results");

if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
const SCREENSHOTS_DIR = path.join(RESULTS_DIR, "screenshots");
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// Load fixtures
const fixtures = {
  wuxiaworld: fs.readFileSync(path.join(FIXTURES_DIR, "wuxiaworld_chapter.html"), "utf8"),
  royalroad: fs.readFileSync(path.join(FIXTURES_DIR, "royalroad_chapter.html"), "utf8"),
  skynovels: fs.readFileSync(path.join(FIXTURES_DIR, "skynovels_spanish_reader.html"), "utf8"),
  tunovela: fs.readFileSync(path.join(FIXTURES_DIR, "tunovela_decimal_reader.html"), "utf8"),
  mangadex: fs.readFileSync(path.join(FIXTURES_DIR, "mangadex_single_page.html"), "utf8"),
  lectormanga: fs.readFileSync(path.join(FIXTURES_DIR, "lectormanga_cascade.html"), "utf8"),
  asuracomic: fs.readFileSync(path.join(FIXTURES_DIR, "asuracomic_manhwa_scroll.html"), "utf8"),
  webtoons: fs.readFileSync(path.join(FIXTURES_DIR, "webtoons_episode_param.html"), "utf8"),
  anime: fs.readFileSync(path.join(FIXTURES_DIR, "anime_info_page.html"), "utf8"),
  toc: fs.readFileSync(path.join(FIXTURES_DIR, "toc_novel_profile.html"), "utf8"),
  search: fs.readFileSync(path.join(FIXTURES_DIR, "search_results_page.html"), "utf8"),
  multilingual: fs.readFileSync(path.join(FIXTURES_DIR, "multilingual_genres_page.html"), "utf8"),
  aethon: fs.readFileSync(path.join(FIXTURES_DIR, "aethon_shadow_slave_episode_1.html"), "utf8")
};

// 25 Platform Matrix Definition
const PLATFORMS_MATRIX = [
  // A. Novelas web y novelas ligeras
  {
    id: "wuxiaworld-chapter",
    domain: "wuxiaworld.com",
    url: "https://www.wuxiaworld.com/novel/coiling-dragon/cd-chapter-125",
    category: "Web Novel / Wuxia",
    fixtureKey: "wuxiaworld",
    shouldDetect: true,
    expectedName: "Coiling Dragon",
    expectedChapter: "125",
    expectedGenres: ["wuxia", "action", "fantasy"]
  },
  {
    id: "royalroad-chapter",
    domain: "royalroad.com",
    url: "https://www.royalroad.com/fiction/21220/mother-of-learning/chapter/301778/1-good-morning-brother",
    category: "Web Novel / Fantasy",
    fixtureKey: "royalroad",
    shouldDetect: true,
    expectedName: "Mother of Learning",
    expectedChapter: "1",
    expectedGenres: ["fantasy", "mystery", "scifi"]
  },
  {
    id: "skynovels-reader",
    domain: "skynovels.net",
    url: "https://skynovels.net/novelas/120/reverend-insanity/10045/",
    category: "Spanish Web Novel / Cultivation",
    fixtureKey: "skynovels",
    shouldDetect: true,
    expectedName: "Reverend Insanity",
    expectedChapter: "1",
    expectedGenres: ["xianxia", "wuxia"]
  },
  {
    id: "tunovela-decimal",
    domain: "tu-novela.com",
    url: "https://tu-novela.com/novela/el-camino-del-chaman/capitulo-125-5/",
    category: "Spanish Web Novel / LitRPG",
    fixtureKey: "tunovela",
    shouldDetect: true,
    expectedName: "El Camino del Chamán",
    expectedChapter: "125.5",
    expectedGenres: ["fantasy", "action", "adventure"]
  },
  {
    id: "multilingual-genres",
    domain: "tu-novela.com",
    url: "https://tu-novela.com/novela/omniscient-readers-viewpoint/capitulo-10",
    category: "Web Novel / Apocalyptic",
    fixtureKey: "multilingual",
    shouldDetect: true,
    expectedName: "Omniscient Reader's Viewpoint",
    expectedChapter: "10",
    expectedGenres: ["action", "fantasy", "scifi", "mystery", "psychological"]
  },
  {
    id: "novelfull-chapter",
    domain: "novelfull.com",
    url: "https://novelfull.com/overgeared/chapter-125-special-episode.html",
    category: "Light Novel / VRMMO",
    fixtureKey: "wuxiaworld", // Reusing clean reader structure
    overrideHtml: fixtures.wuxiaworld
      .replace(/www\.wuxiaworld\.com/g, "novelfull.com")
      .replace(/novel\/coiling-dragon/g, "overgeared")
      .replace(/Coiling Dragon/g, "Overgeared")
      .replace(/cd-chapter-125/g, "chapter-125-special-episode.html"),
    shouldDetect: true,
    expectedName: "Overgeared",
    expectedChapter: "125",
    expectedGenres: ["wuxia", "action", "fantasy"]
  },

  // B. Manga y cómic
  {
    id: "mangadex-chapter",
    domain: "mangadex.org",
    url: "https://mangadex.org/chapter/a83b27b9-8e4d-4c31-9014-99890a8a9238/1",
    category: "Manga / Single Page Dropdown",
    fixtureKey: "mangadex",
    shouldDetect: true,
    expectedName: "Choujin X",
    expectedChapter: "45.5",
    expectedGenres: ["supernatural", "psychological", "action"]
  },
  {
    id: "lectormanga-cascade",
    domain: "lectormanga.com",
    url: "https://lectormanga.com/leer/one-piece/1050.00/cascade",
    category: "Manga / Cascade Vertical",
    fixtureKey: "lectormanga",
    shouldDetect: true,
    expectedName: "One Piece",
    expectedChapter: "1050",
    expectedGenres: ["adventure", "action", "comedy"]
  },
  {
    id: "visormanga-reader",
    domain: "visormanga.com",
    url: "https://visormanga.com/manga/jujutsu-kaisen/capitulo-236",
    category: "Manga / Spanish Viewer",
    fixtureKey: "lectormanga",
    overrideHtml: fixtures.lectormanga.replace(/One Piece/g, "Jujutsu Kaisen").replace(/1050\.00/g, "236"),
    shouldDetect: true,
    expectedName: "Jujutsu Kaisen",
    expectedChapter: "236",
    expectedGenres: ["adventure", "action", "comedy"]
  },
  {
    id: "batoto-chapter",
    domain: "bato.to",
    url: "https://bato.to/series/85420/ch_75",
    category: "Manga / Webcomic",
    fixtureKey: "mangadex",
    overrideHtml: fixtures.mangadex.replace(/Choujin X/g, "Tower of Shadows").replace(/45\.5/g, "75"),
    shouldDetect: true,
    expectedName: "Tower of Shadows",
    expectedChapter: "75",
    expectedGenres: ["supernatural", "psychological", "action"]
  },

  // C. Manhwa y manhua
  {
    id: "asuracomic-scroll",
    domain: "asuracomic.net",
    url: "https://asuracomic.net/series/solo-leveling-ragnarok/chapter-52",
    category: "Manhwa / Continuous Vertical Scroll",
    fixtureKey: "asuracomic",
    shouldDetect: true,
    expectedName: "Solo Leveling: Ragnarok",
    expectedChapter: "52",
    expectedGenres: ["action", "fantasy", "supernatural"]
  },
  {
    id: "reaperscans-chapter",
    domain: "reaperscans.com",
    url: "https://reaperscans.com/series/the-legend-of-the-northern-blade/chapter-175",
    category: "Manhwa / Murim Martial Arts",
    fixtureKey: "asuracomic",
    overrideHtml: fixtures.asuracomic.replace(/Solo Leveling: Ragnarok/g, "The Legend of the Northern Blade").replace(/52/g, "175"),
    shouldDetect: true,
    expectedName: "The Legend of the Northern Blade",
    expectedChapter: "175",
    expectedGenres: ["action", "fantasy", "supernatural"]
  },
  {
    id: "flamecomics-chapter",
    domain: "flamecomics.xyz",
    url: "https://flamecomics.xyz/series/martial-peak/chapter-3500",
    category: "Manhua / High Cultivation",
    fixtureKey: "asuracomic",
    overrideHtml: fixtures.asuracomic.replace(/Solo Leveling: Ragnarok/g, "Martial Peak").replace(/52/g, "3500"),
    shouldDetect: true,
    expectedName: "Martial Peak",
    expectedChapter: "3500",
    expectedGenres: ["action", "fantasy", "supernatural"]
  },

  // D. Webcómics y cómics digitales
  {
    id: "webtoons-episode-param",
    domain: "webtoons.com",
    url: "https://www.webtoons.com/es/fantasy/tower-of-god/ep-125/viewer?title_no=95&episode_no=125",
    category: "Webcomic / Query Param Reader",
    fixtureKey: "webtoons",
    shouldDetect: true,
    expectedName: "Torre de Dios",
    expectedChapter: "125",
    expectedGenres: ["fantasy", "action", "mystery"]
  },
  {
    id: "tapas-episode",
    domain: "tapas.io",
    url: "https://tapas.io/episode/2849501?episode_no=18",
    category: "Webcomic / Tapas Reader",
    fixtureKey: "webtoons",
    overrideHtml: fixtures.webtoons.replace(/Torre de Dios/g, "The Beginning After The End").replace(/125/g, "18"),
    shouldDetect: true,
    expectedName: "The Beginning After The End",
    expectedChapter: "18",
    expectedGenres: ["fantasy", "action", "mystery"]
  },
  {
    id: "aethon-shadow-slave",
    domain: "aethonwebcomics.com",
    url: "https://aethonwebcomics.com/comic-episode/episode-1/",
    category: "Webcomic / Generic Route Reader",
    fixtureKey: "aethon",
    shouldDetect: true,
    expectedName: "Shadow Slave",
    expectedChapter: "1",
    expectedGenres: []
  },

  // E. Casos Especiales, Prólogos y Cuentos
  {
    id: "tunovela-prologue",
    domain: "tu-novela.com",
    url: "https://tu-novela.com/novela/el-senor-de-los-misterios/prologo",
    category: "Special Chapter / Prólogo (0)",
    fixtureKey: "tunovela",
    overrideHtml: fixtures.tunovela
      .replace(/El Camino del Chamán/g, "El Señor de los Misterios")
      .replace(/Capítulo 125\.5: Interludio en las sombras/g, "Prólogo: El despertar")
      .replace(/capitulo-125-5/g, "prologo"),
    shouldDetect: true,
    expectedName: "El Señor de los Misterios",
    expectedChapter: "0",
    expectedGenres: ["fantasy", "action", "adventure"]
  },
  {
    id: "cuentosymas-seccion",
    domain: "cuentosymas.com",
    url: "https://cuentosymas.com/lectura/el-principito/seccion-4",
    category: "Short Story / Secciones",
    fixtureKey: "skynovels",
    overrideHtml: fixtures.skynovels
      .replace(/skynovels\.net/g, "cuentosymas.com")
      .replace(/novelas\/120\/reverend-insanity/g, "lectura/el-principito")
      .replace(/Reverend Insanity/g, "El Principito")
      .replace(/Capítulo 1: [^\n<]*/g, "Sección 4: El asteroide B-612")
      .replace(/Capítulo 1/g, "Sección 4")
      .replace(/10045/g, "seccion-4"),
    shouldDetect: true,
    expectedName: "El Principito",
    expectedChapter: "4",
    expectedGenres: ["xianxia", "wuxia"]
  },
  {
    id: "decimal-83-5",
    domain: "lectormanga.com",
    url: "https://lectormanga.com/leer/berserk/83.5/cascade",
    category: "Manga / Decimal 83.5",
    fixtureKey: "lectormanga",
    overrideHtml: fixtures.lectormanga
      .replace(/one-piece/gi, "berserk")
      .replace(/One Piece/g, "Berserk")
      .replace(/1050\.00/g, "83.5"),
    shouldDetect: true,
    expectedName: "Berserk",
    expectedChapter: "83.5",
    expectedGenres: ["adventure", "action", "comedy"]
  },

  // F. Negativos / Falsos Positivos / Páginas no lectoras (Deben ser RECHAZADAS)
  {
    id: "wuxiaworld-toc",
    domain: "wuxiaworld.com",
    url: "https://www.wuxiaworld.com/novel/coiling-dragon",
    category: "Negative / Novel TOC / Overview",
    fixtureKey: "toc",
    shouldDetect: false,
    expectedName: null,
    expectedChapter: null
  },
  {
    id: "royalroad-reviews",
    domain: "royalroad.com",
    url: "https://www.royalroad.com/fiction/21220/mother-of-learning/reviews",
    category: "Negative / Fiction Reviews",
    fixtureKey: "royalroad",
    overrideHtml: `<html><body><h1>Reviews for Mother of Learning</h1><p>Great novel with 500 reviews.</p></body></html>`,
    shouldDetect: false,
    expectedName: null,
    expectedChapter: null
  },
  {
    id: "asuracomic-search",
    domain: "asuracomic.net",
    url: "https://asuracomic.net/search?q=solo",
    category: "Negative / Search Results",
    fixtureKey: "search",
    shouldDetect: false,
    expectedName: null,
    expectedChapter: null
  },
  {
    id: "mangadex-title-info",
    domain: "mangadex.org",
    url: "https://mangadex.org/title/3046eb13-1463-4a0d-be95-464a4d691060/choujin-x",
    category: "Negative / Manga Title Overview",
    fixtureKey: "toc",
    overrideHtml: fixtures.toc.replace(/Coiling Dragon/g, "Choujin X"),
    shouldDetect: false,
    expectedName: null,
    expectedChapter: null
  },
  {
    id: "myanimelist-anime",
    domain: "myanimelist.net",
    url: "https://myanimelist.net/anime/5114/Fullmetal_Alchemist__Brotherhood",
    category: "Negative / Anime Info Page",
    fixtureKey: "anime",
    shouldDetect: false,
    expectedName: null,
    expectedChapter: null
  },
  {
    id: "youtube-video",
    domain: "youtube.com",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    category: "Negative / Blacklisted Streaming Video",
    fixtureKey: "anime",
    shouldDetect: false,
    expectedName: null,
    expectedChapter: null
  },
  {
    id: "skynovels-catalog-root",
    domain: "skynovels.net",
    url: "https://skynovels.net/novelas/",
    category: "Negative / Catalog Directory",
    fixtureKey: "toc",
    shouldDetect: false,
    expectedName: null,
    expectedChapter: null
  }
];

async function runPlatformsAudit() {
  console.log("====================================================================");
  console.log("   MYNOVELSYSTEM v4.0.0 — PLAYWRIGHT REAL CHROMIUM PLATFORMS E2E    ");
  console.log("====================================================================\n");

  let tempProfileDir = null;
  let context = null;
  const auditResults = [];

  try {
    tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_e2e_platforms_"));
    console.log(`[Setup] Launching Chromium MV3 with Profile: ${tempProfileDir}`);

    context = await chromium.launchPersistentContext(tempProfileDir, {
      headless: false,
      args: [
        "--headless=new",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        `--disable-extensions-except=${EXT_PATH}`,
        `--load-extension=${EXT_PATH}`,
        "--no-first-run",
        "--no-default-browser-check"
      ]
    });

    let [serviceWorker] = context.serviceWorkers();
    if (!serviceWorker) {
      serviceWorker = await context.waitForEvent("serviceworker", { timeout: 15000 });
    }
    assert.ok(serviceWorker, "Extension Service Worker active");
    const swUrl = serviceWorker.url();
    const extensionId = swUrl.split("/")[2];
    console.log(`  ✔ PASS: Service Worker active at ${swUrl} (ID: ${extensionId})\n`);

    // Setup accurate URL-based route dispatcher to prevent multi-case collisions on same domain
    await context.route("**/*", (route) => {
      const reqUrl = route.request().url().replace(/\/+$/, "");
      const matched = PLATFORMS_MATRIX.find((tc) => {
        const cleanTcUrl = tc.url.replace(/\/+$/, "");
        return reqUrl === cleanTcUrl || reqUrl.startsWith(cleanTcUrl + "/") || reqUrl.startsWith(cleanTcUrl + "?");
      });
      if (matched) {
        const htmlContent = matched.overrideHtml || fixtures[matched.fixtureKey];
        return route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: htmlContent
        });
      }
      return route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>Default</body></html>" });
    });

    const page = await context.newPage();

    let passedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < PLATFORMS_MATRIX.length; i++) {
      const tc = PLATFORMS_MATRIX[i];
      const testNum = i + 1;
      process.stdout.write(`[Test ${testNum}/${PLATFORMS_MATRIX.length}] ${tc.domain} (${tc.category})... `);

      const tStart = Date.now();
      let outcome = "APROBADO";
      let errorMsg = null;
      let detectedNovel = null;
      let detectedChapter = null;
      let detectedGenres = [];
      let saved = false;

      try {
        // Clear storage before positive test if needed, or isolate
        await serviceWorker.evaluate(async () => {
          await chrome.storage.local.set({ savedNovels: {}, stats: {} });
        });

        await page.goto(tc.url, { waitUntil: "domcontentloaded", timeout: 8000 });
        // Allow content script evaluation
        await page.waitForTimeout(1400);

        const storage = await serviceWorker.evaluate(async () => {
          return chrome.storage.local.get(["savedNovels", "stats"]);
        });

        const savedNovels = storage.savedNovels || {};
        const entries = Object.values(savedNovels).filter((n) => n && !n.deleted);

        if (tc.shouldDetect) {
          if (entries.length === 0) {
            outcome = "FALLIDO";
            errorMsg = "Expected novel detection, but savedNovels is empty";
          } else {
            const entry = entries[0];
            detectedNovel = entry.novelName;
            detectedChapter = String(entry.chapter);
            detectedGenres = Array.isArray(entry.genres) ? entry.genres : [];
            saved = true;

            // Check novel name match (contains or equal)
            if (!entry.novelName.toLowerCase().includes(tc.expectedName.toLowerCase())) {
              outcome = "FALLIDO";
              errorMsg = `Novel name mismatch: expected '${tc.expectedName}', got '${entry.novelName}'`;
            }

            // Check chapter match
            if (String(entry.chapter) !== String(tc.expectedChapter)) {
              outcome = "FALLIDO";
              errorMsg = `Chapter mismatch: expected '${tc.expectedChapter}', got '${entry.chapter}'`;
            }

            // Check genres (v4.0.0: web scraping of genres eliminated, returns clean array)
            if (!Array.isArray(detectedGenres)) {
              outcome = "FALLIDO";
              errorMsg = `Expected genres to be an Array, got ${typeof detectedGenres}`;
            }

            if (tc.id === "aethon-shadow-slave") {
              if (entry.novelName.toLowerCase().includes("comic") || entry.novelName.toLowerCase() === "aethon") {
                outcome = "FALLIDO";
                errorMsg = `Bogus title deduced from path/branding: '${entry.novelName}'`;
              }
            }
          }
        } else {
          // Negative control test: must NOT save
          if (entries.length > 0) {
            outcome = "FALLIDO";
            errorMsg = `False positive: non-reader page was saved as novel '${entries[0].novelName}' chap '${entries[0].chapter}'`;
            detectedNovel = entries[0].novelName;
            detectedChapter = entries[0].chapter;
          }
        }
      } catch (err) {
        outcome = "FALLIDO";
        errorMsg = err.message;
        try {
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `fail_${tc.id}.png`) });
        } catch {}
      }

      const elapsed = Date.now() - tStart;

      if (outcome === "APROBADO") {
        passedCount++;
        console.log(`\x1b[32m✔ PASS\x1b[0m (${elapsed}ms) [Chap: ${detectedChapter || "N/A"}]`);
      } else {
        failedCount++;
        console.log(`\x1b[31m✖ FAIL\x1b[0m (${elapsed}ms) - ${errorMsg}`);
      }

      auditResults.push({
        id: tc.id,
        domain: tc.domain,
        url: tc.url,
        category: tc.category,
        shouldDetect: tc.shouldDetect,
        expectedName: tc.expectedName,
        detectedName: detectedNovel,
        expectedChapter: tc.expectedChapter,
        detectedChapter,
        expectedGenres: tc.expectedGenres || [],
        detectedGenres,
        saved,
        outcome,
        error: errorMsg,
        elapsedMs: elapsed
      });
    }

    await page.close();

    console.log("\n====================================================================");
    console.log(`PLATFORMS AUDIT COMPLETE: ${passedCount} APROBADO / ${failedCount} FALLIDO (Total: ${PLATFORMS_MATRIX.length})`);
    console.log("====================================================================\n");

    return { total: PLATFORMS_MATRIX.length, passed: passedCount, failed: failedCount, results: auditResults };
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    if (tempProfileDir && fs.existsSync(tempProfileDir)) {
      try {
        fs.rmSync(tempProfileDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

if (require.main === module) {
  runPlatformsAudit()
    .then((res) => {
      fs.writeFileSync(path.join(RESULTS_DIR, "platforms_audit_results.json"), JSON.stringify(res, null, 2));
      process.exit(res.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("FATAL ERROR in Platforms Audit:", err);
      process.exit(1);
    });
}

module.exports = { runPlatformsAudit, PLATFORMS_MATRIX };
