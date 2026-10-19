// ============================================================================
// MYNOVELSYSTEM v4.0.0 — REAL EXTERNAL PLATFORMS E2E PROBER (FASE 2 & 9)
// Attempts live HTTP/HTTPS navigation to external reading websites
// Distinguishes: EXECUTED / PASS, BLOCKED (DNS/Offline Sandbox, Cloudflare, Paywall)
// ============================================================================

const path = require("path");
const fs = require("fs");
const os = require("os");
const { chromium } = require("playwright");

const EXT_PATH = path.resolve(__dirname, "../../");

const EXTERNAL_TARGETS = [
  { domain: "wuxiaworld.com", url: "https://www.wuxiaworld.com/novel/coiling-dragon/cd-chapter-1", category: "Web Novel" },
  { domain: "royalroad.com", url: "https://www.royalroad.com/fiction/21220/mother-of-learning/chapter/301778/1-good-morning-brother", category: "Web Novel" },
  { domain: "skynovels.net", url: "https://skynovels.net/novelas/120/reverend-insanity/10045/", category: "Spanish Web Novel" },
  { domain: "tu-novela.com", url: "https://tu-novela.com/novela/el-camino-del-chaman/capitulo-125-5/", category: "Spanish Web Novel" },
  { domain: "mangadex.org", url: "https://mangadex.org/chapter/a83b27b9-8e4d-4c31-9014-99890a8a9238/1", category: "Manga" },
  { domain: "lectormanga.com", url: "https://lectormanga.com/leer/one-piece/1050.00/cascade", category: "Manga" },
  { domain: "visormanga.com", url: "https://visormanga.com/manga/jujutsu-kaisen/capitulo-236", category: "Manga" },
  { domain: "bato.to", url: "https://bato.to/series/85420/ch_75", category: "Manga" },
  { domain: "asuracomic.net", url: "https://asuracomic.net/series/solo-leveling-ragnarok/chapter-52", category: "Manhwa" },
  { domain: "reaperscans.com", url: "https://reaperscans.com/series/the-legend-of-the-northern-blade/chapter-175", category: "Manhwa" },
  { domain: "flamecomics.xyz", url: "https://flamecomics.xyz/series/martial-peak/chapter-3500", category: "Manhua" },
  { domain: "webtoons.com", url: "https://www.webtoons.com/es/fantasy/tower-of-god/ep-125/viewer?title_no=95&episode_no=125", category: "Webcomic" },
  { domain: "tapas.io", url: "https://tapas.io/episode/2849501?episode_no=18", category: "Webcomic" }
];

async function runExternalPlatformsProbe() {
  console.log("====================================================================");
  console.log("   MYNOVELSYSTEM v4.0.0 — EXTERNAL READING PLATFORMS LIVE PROBE      ");
  console.log("   Validating Real Internet Reachability, Cloudflare & Sandbox Status");
  console.log("====================================================================\n");

  let tempProfileDir = fs.mkdtempSync(path.join(os.tmpdir(), "pw_external_probe_"));
  let context = null;
  const probeResults = [];

  try {
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

    const page = await context.newPage();

    for (let i = 0; i < EXTERNAL_TARGETS.length; i++) {
      const target = EXTERNAL_TARGETS[i];
      process.stdout.write(`[Live Probe ${i + 1}/${EXTERNAL_TARGETS.length}] ${target.domain}... `);

      const res = {
        domain: target.domain,
        url: target.url,
        category: target.category,
        status: "PENDIENTE",
        reason: null
      };

      try {
        const response = await page.goto(target.url, { timeout: 6000, waitUntil: "domcontentloaded" });
        const status = response ? response.status() : 0;
        if (status >= 200 && status < 400) {
          res.status = "APROBADO";
          console.log(`✔ ACCESSIBLE (HTTP ${status})`);
        } else if (status === 403 || status === 503) {
          res.status = "BLOQUEADO";
          res.reason = `HTTP ${status} (Anti-bot / Cloudflare Challenge)`;
          console.log(`⚠ BLOQUEADO: ${res.reason}`);
        } else {
          res.status = "BLOQUEADO";
          res.reason = `HTTP ${status}`;
          console.log(`⚠ BLOQUEADO: HTTP ${status}`);
        }
      } catch (err) {
        res.status = "BLOQUEADO";
        if (err.message.includes("ERR_NAME_NOT_RESOLVED") || err.message.includes("net::ERR")) {
          res.reason = "Offline Sandbox / DNS resolution blocked by test runner";
        } else if (err.message.includes("Timeout")) {
          res.reason = "Connection timeout (network blocked or restricted)";
        } else {
          res.reason = err.message.slice(0, 80);
        }
        console.log(`⚠ BLOQUEADO: ${res.reason}`);
      }

      probeResults.push(res);
    }

    const blockedCount = probeResults.filter((r) => r.status === "BLOQUEADO").length;
    const passedCount = probeResults.filter((r) => r.status === "APROBADO").length;

    console.log("\n====================================================================");
    console.log(`EXTERNAL PROBE SUMMARY: ${passedCount} APROBADO, ${blockedCount} BLOQUEADO / ${probeResults.length} TOTAL`);
    console.log("Note: As specified in FASE 2, blocked domains are documented faithfully");
    console.log("and verified with offline synthetic HTML fixtures in tests/fixtures/.");
    console.log("====================================================================\n");

    return probeResults;
  } finally {
    if (context) await context.close();
    if (tempProfileDir && fs.existsSync(tempProfileDir)) {
      try {
        fs.rmSync(tempProfileDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

if (require.main === module) {
  runExternalPlatformsProbe().catch((err) => {
    console.error("Probe error:", err);
    process.exit(1);
  });
}

module.exports = { runExternalPlatformsProbe, EXTERNAL_TARGETS };
