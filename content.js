(() => {
  // SEC-PRIVACY: Detener ejecución inmediata en contextos de navegación privada / incógnito
  if (typeof chrome !== "undefined" && chrome.extension && chrome.extension.inIncognitoContext) {
    return;
  }

  const BLACKLIST_DOMAINS = [
    // Buscadores
    "google.", "bing.com", "duckduckgo.com", "yahoo.com", "baidu.com", "yandex.",
    // IA y Chatbots
    "gemini.google.com", "chatgpt.com", "chat.openai.com", "claude.ai", "deepseek.com", "perplexity.ai", "copilot.microsoft.com", "character.ai",
    // Streaming, Video y Música
    "youtube.com", "youtu.be", "twitch.tv", "netflix.com", "spotify.com", "vimeo.com", "dailymotion.com", "primevideo.com", "disneyplus.com", "soundcloud.com", "music.youtube.com", "tiktok.com",
    // Redes Sociales y Mensajería
    "facebook.com", "fb.com", "twitter.com", "x.com", "instagram.com", "reddit.com", "linkedin.com", "pinterest.com", "threads.net", "discord.com", "whatsapp.com", "telegram.org", "t.me",
    // Desarrollo y Programación
    "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com", "stackexchange.com", "npmjs.com", "pypi.org", "codepen.io", "replit.com", "vercel.app",
    // Comercio Electrónico
    "amazon.", "ebay.", "mercadolibre.", "aliexpress.com", "walmart.com", "shein.com", "temu.com",
    // Correo, Almacenamiento y Productividad
    "mail.google.com", "drive.google.com", "docs.google.com", "onedrive.live.com", "dropbox.com", "icloud.com", "notion.so", "trello.com",
    // Wikis y Enciclopedias
    "wikipedia.org", "wikimedia.org", "fandom.com", "imdb.com"
  ];

  function isBlacklistedDomain(hostname) {
    if (!hostname) return false;
    const host = String(hostname).toLowerCase().replace(/^www\./, "");
    for (const b of BLACKLIST_DOMAINS) {
      if (b.endsWith(".")) {
        if (host === b.slice(0, -1) || host.startsWith(b) || host.includes(`.${b}`)) return true;
      } else {
        if (host === b || host.endsWith(`.${b}`)) return true;
      }
    }
    return false;
  }

  let cachedUserBlacklist = [];
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["domainBlacklist"], (res) => {
        if (Array.isArray(res?.domainBlacklist)) {
          cachedUserBlacklist = res.domainBlacklist;
          if (isCurrentDomainBlacklisted()) {
            dismissInPagePrompt();
            stopBodyObserver();
          }
        }
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.domainBlacklist) {
          cachedUserBlacklist = Array.isArray(changes.domainBlacklist.newValue)
            ? changes.domainBlacklist.newValue
            : [];
          if (isCurrentDomainBlacklisted()) {
            dismissInPagePrompt();
            stopBodyObserver();
          }
        }
      });
    }
  } catch {}

  function isCurrentDomainBlacklisted() {
    if (isBlacklistedDomain(location.hostname)) return true;
    const cleanHost = String(location.hostname || "").toLowerCase().replace(/^www\./, "").trim();
    if (!cleanHost) return false;
    for (const item of cachedUserBlacklist) {
      const pattern = typeof item === "string" ? item : item?.domain;
      if (!pattern) continue;
      const cleanPattern = String(pattern).toLowerCase().replace(/^www\./, "").replace(/^\*+\.?/, "").trim();
      if (!cleanPattern) continue;
      if (cleanHost === cleanPattern || cleanHost.endsWith("." + cleanPattern)) {
        return true;
      }
    }
    return false;
  }

  // Si estamos en un dominio excluido, no ejecutar ningún observador ni lógica (0 consumo y 0 falsos positivos)
  if (isBlacklistedDomain(location.hostname)) {
    return;
  }

  // Patrón 1: Con palabra clave explícita (Capítulo 12, Cap. 12, Chapter 12, Episode 12, Ep. 12, Seccion 12, Parte 12, c12, #12, Bab 1)
  const CHAPTER_EXPLICIT_REGEX = /\b(?:chapter|cap[ií]tulo|capitulo|episode|episodio|secci[oó]n|seccion|section|parte|part|ch\.?|cap\.?|ep\.?|pt\.?|sec\.?|c\.?|bab)\s*#?\s*(\d{1,7}(?:[.,-]\d{1,2}|[a-z])?)\b|(?:^|\s)#(\d{1,7}(?:[.,-]\d{1,2})?)(?:\s|:|-|$)/i;
  const VOLUME_FALLBACK_REGEX = /\b(?:tomo|volumen|volume|vol\.?|v\.?)\s*#?\s*(\d{1,5}(?:[.,-]\d{1,2}|[a-z])?)\b/i;

  // Patrón para capítulos especiales (Prólogo, Epílogo, One-shot, Extra, etc.)
  const SPECIAL_CHAPTER_REGEX = /\b(pr[oó]logo|prologue|ep[ií]logo|epilogue|oneshot|one-shot|extra|special|especial|side\s*story)\b/i;

  // Patrón 2: Número al inicio de un título de capítulo ("12. El comienzo", "12 - Título", "[12] Título")
  const CHAPTER_LEADING_NUM_REGEX = /^\s*(?:\[\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*\]|(\d{1,5}(?:[.,]\d{1,2})?)\s*[-–—.:)\]]\s+\S)/;

  const CHAPTER_URL_REGEX = /(?:\/|-|_|\b)(?:chapter|capitulo|cap[ií]tulo|episode|episodio|secci[oó]n|seccion|section|parte|ch|cap|ep|sec|c|bab)[-_\/.]?(\d{1,7}(?:[.-]\d{1,2})?)(?:\/|$|\?|#|-|_)/i;
  const CHAPTER_STRIP_PATH_REGEX = /^(.*?)(?:\/|-|_)(?:chapter|capitulo|cap[ií]tulo|episode|episodio|secci[oó]n|seccion|section|parte|ch|cap|ep|sec|c|bab)[-_\/.]?\d+(?:[._-]\d+)?(?:\.html?|\/.*)?$/i;
  const INLINE_CHAPTER_CUT_REGEX = /\s*[-–—|:«»]*\s*(?:chapters?|cap[ií]tulos?|capitulos?|episodes?|episodios?|partes?|secci[oó]n|secciones|sections?|ch(?:[\s._-]|\\.)|cap(?:[\s._-]|\\.)|ep(?:[\s._-]|\\.)|sec(?:[\s._-]|\\.)|c(?:[\s._-]|\\.)|bab|#)\s*#?\s*\d+.*$/i;
  const TRAILING_MEDIA_SUFFIX_REGEX = /\s+\b(?:manhwa|manhua|manga|webtoon|novela\s*ligera|light\s*novel|web\s*novel|novela|novel|comic|raw|sub\s*espa[ñn]ol|en\s*espa[ñn]ol|online|gratis|free|skynovels)\b\s*$/i;

  const CATALOG_SEGMENTS = new Set([
    "novelas", "novela", "novels", "novel", "series", "serie",
    "manga", "mangas", "manhwa", "manhwas", "manhua", "manhuas",
    "webtoon", "webtoons", "comic", "comics", "webcomic", "webcomics",
    "book", "books", "obras", "obra", "lectura", "leer", "ver", "read",
    "ficcion", "title", "titles"
  ]);

  const READER_SEGMENTS = new Set(["leer", "ver", "read", "lectura", "viewer"]);

  const GENERIC_WORDS = new Set([
    "home", "inicio", "portada", "index", "indice", "novelas", "novela",
    "novels", "novel", "series", "serie", "catalogo", "library", "biblioteca",
    "all", "todas", "manga", "mangas", "manhwa", "manhwas", "manhua", "webtoon",
    "webnovels", "light_novels", "novela_web", "homeinicio", "menu_book", "menu",
    "volver", "atras", "anterior", "siguiente", "prev", "previous", "next",
    "capitulos", "capitulo", "episodios", "episodio", "chapters", "chapter",
    "lista", "lista_de_capitulos", "lista_de_episodios", "tabla_de_contenido",
    "detalles", "ficha", "info", "informacion", "directorio", "sumario", "contenido",
    "comentarios", "sinopsis", "login", "registro", "mi_perfil", "ajustes",
    "configuracion", "leer", "ver", "obra", "obras", "skynovels",
    "comic_episode", "comic_episodes", "webcomic_episode", "webcomic_episodes",
    "comic_chapter", "comic_chapters", "webcomic", "webcomics"
  ]);

  const ICON_LIGATURES_REGEX = /^(?:home|menu_book|auto_stories|book|import_contacts|arrow_back|arrow_forward|chevron_left|chevron_right|navigate_before|navigate_next|list|toc|dehaze|menu)\s*/i;

  const SERIES_LINK_SELECTORS = [
    '.breadcrumb a[href]',
    '.breadcrumbs a[href]',
    'nav[aria-label*="breadcrumb" i] a[href]',
    'ol.breadcrumb a[href]',
    '.yoast-breadcrumbs a[href]',
    '.rank-math-breadcrumb a[href]',
    '.novel-title a[href]',
    'a.novel-title[href]',
    '.booktitle a[href]',
    'a.booktitle[href]',
    '.series-title a[href]',
    '.chr-title a[href]',
    '.cat-series a[href]',
    '.wp-manga-nav a[href]',
    '.manga-title a[href]',
    'a.manga-title[href]',
    'a.modfarm-webcomic-series-link[href]',
    '.modfarm-webcomic-series-link[href]',
    '.modfarm-webcomic-reader-footer-series[href]',
    'a[class*="series-link"][href]',
    'a[class*="series-logo"][href]',
    'a[href*="/title/"]',
    'a[href*="/novelas/"]',
    'a[href*="/novela/"]',
    'a[href*="/novel/"]',
    'a[href*="/novels/"]',
    'a[href*="/manhwa/"]',
    'a[href*="/manhwas/"]',
    'a[href*="/manga/"]',
    'a[href*="/mangas/"]',
    'a[href*="/manhua/"]',
    'a[href*="/webtoon/"]',
    'a[href*="/webcomic/"]',
    'a[href*="/webcomics/"]',
    'a[href*="/comic/"]',
    'a[href*="/series/"]',
    'a[href*="/serie/"]',
    'a[href*="/book/"]'
  ];

  const NOVEL_NAME_SELECTORS = [
    '.novel-title',
    '.booktitle',
    '.series-title',
    'a.novel-title',
    '.cat-series',
    '.manga-title',
    '.entry-title-series',
    '.modfarm-webcomic-reader-side-heading h2',
    '[class*="series-heading"] h2',
    '[class*="series-title"]',
    'aside[aria-label*="Series" i] h2'
  ];

  const CHAPTER_HEADING_SELECTORS = [
    'h1', 'h2', 'h3', 'h4', 'h5',
    '.chr-title', '.chapter-title', '.chap-title', '.reading-title',
    '.entry-title', '.cat-chap', 'mat-card-title', 'mat-card-subtitle',
    '[class*="chapter-title"]', '[class*="cap-title"]', '[class*="chapter-header"]',
    '[class*="chapter_title"]', '[class*="titulo-capitulo"]',
    '.mat-select-value-text', '.mat-mdc-select-value-text', '[class*="selected-chapter"]'
  ];

  const READER_CONTENT_CONTAINERS = [
    'article', 'main', '.chapter-content', '.reading-content', '.entry-content',
    '#chapter-content', '.text-left', 'mat-card-content', '[class*="chapter-body"]',
    '[class*="chapter-content"]', '[class*="reading-content"]', '[class*="novel-content"]'
  ];

  let debounceTimer = null;
  let retryTimer = null;
  let bodyObserver = null;
  let bodyObserverTimeout = null;
  let titleObserver = null;

  let retryCount = 0;
  let lastCheckedHref = location.href;
  let lastCapturedUrl = "";
  let lastCapturedChapterForPrevUrl = "";
  let lastCapturedSeriesIdForPrevUrl = "";
  let lastSentKey = "";
  let lastLoggedMissUrl = "";

  let activeSeriesId = "";
  let activeChapter = "";
  let lastScrollSentAt = 0;
  let lastScrollPctSent = -1;
  let scrollThrottleTimer = null;
  let restoredForSignature = "";

  function fnv1aHex(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function normalizeText(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function cleanHost(urlStr) {
    try {
      return new URL(urlStr).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      return location.hostname.toLowerCase().replace(/^www\./, "");
    }
  }

  // Solo elimina verdaderos iconos sin tocar etiquetas <i> de cursiva ni contenedores con texto
  function getCleanElementText(el) {
    if (!el) return "";
    const clone = el.cloneNode(true);
    const junk = clone.querySelectorAll(
      'mat-icon, svg, img, script, style, noscript, .material-icons, .material-symbols-outlined, i.fa, i[class*="fa-"], .sr-only'
    );
    junk.forEach((node) => node.remove());
    return (clone.textContent || "")
      .replace(ICON_LIGATURES_REGEX, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripChapterAndSuffixes(rawTitle, chapterHint = "") {
    if (!rawTitle) return "";
    let cleaned = String(rawTitle)
      .replace(ICON_LIGATURES_REGEX, "")
      .replace(/\s+/g, " ")
      .trim();

    cleaned = cleaned.replace(INLINE_CHAPTER_CUT_REGEX, "").trim();
    if (chapterHint && /^\d+(?:\.\d+)?$/.test(String(chapterHint).trim())) {
      const chapEsc = String(chapterHint).trim().replace(".", "\\.");
      const chapPattern = new RegExp(`(?:\\s*[-–—|:«»#]+\\s*|\\s+)(?:cap[ií]tulo|capitulo|chapter|episode|episodio|parte|ch|cap|ep|c|part|seccion|section|#)?\\s*0*${chapEsc}\\b.*$`, "i");
      cleaned = cleaned.replace(chapPattern, "").trim();
    }
    cleaned = cleaned
      .replace(/^(?:read|leer|ver)\s+/i, "")
      .replace(TRAILING_MEDIA_SUFFIX_REGEX, "")
      .replace(TRAILING_MEDIA_SUFFIX_REGEX, "")
      .replace(/[-|–—:«»•›]+\s*$/, "")
      .replace(/^[-|–—:«»•›]+\s*/, "")
      .trim();

    return cleaned;
  }

  function isGenericText(text) {
    const cleaned = String(text || "").replace(ICON_LIGATURES_REGEX, "").trim();
    const norm = normalizeText(cleaned);
    if (!norm || norm.length < 2) return true;
    if (GENERIC_WORDS.has(norm)) return true;
    if (/^(?:home|inicio|menu|volver|anterior|siguiente|capitulos|capitulo|episodios|episodio|chapters|chapter|lista|detalles|ficha|info|novelas|manhwa|manga|index|portada|leer|skynovels)+$/.test(norm.replace(/_/g, ""))) {
      return true;
    }
    // Reject UUID or long hex hashes as novel names
    if (
      /^[0-9a-f]{8}[-_\s][0-9a-f]{4}[-_\s][0-9a-f]{4}[-_\s][0-9a-f]{4}[-_\s][0-9a-f]{12}$/i.test(cleaned) ||
      /^[0-9a-f]{24,}$/i.test(cleaned) ||
      /^[0-9a-f]{32}$/i.test(norm.replace(/_/g, ""))
    ) {
      return true;
    }
    const domainBase = normalizeText(cleanHost(location.href).split(".")[0]);
    const normRaw = norm.replace(/_/g, "");
    if (norm === domainBase || normRaw === domainBase) return true;
    if (domainBase.startsWith(normRaw) && (domainBase.endsWith("webcomics") || domainBase.endsWith("comics") || domainBase.endsWith("novels") || domainBase.endsWith("manga") || domainBase.endsWith("scans"))) {
      return true;
    }
    return false;
  }

  function isUnrelatedButtonLabel(candidateText, novelUrl) {
    if (!candidateText) return true;
    if (isGenericText(candidateText)) return true;
    const norm = normalizeText(candidateText);
    if (/^(?:leer_ahora|read_now|continue_reading|continuar_leyendo|ver_capitulos|view_chapters|start_reading|comenzar_lectura|read_first|read_last|bookmark|favorito|compartir|share|series_page|pagina_serie|pagina_de_la_serie|comic_page|novel_page|follow|subscribe|suscribirse|seguir|follow_this_series)$/.test(norm)) {
      return true;
    }
    return false;
  }

  function hasChapterPattern(text) {
    const s = String(text || "");
    return CHAPTER_EXPLICIT_REGEX.test(s) || VOLUME_FALLBACK_REGEX.test(s);
  }

  function canonicalizeSeriesPathForId(pathname) {
    const segments = decodeURIComponent(pathname)
      .toLowerCase()
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean);
    // Para rutas con prefijo de idioma como /es/book/... o /en/book/..., normalizar quitando el prefijo de idioma
    if (segments.length >= 2 && /^[a-z]{2}$/.test(segments[0]) && CATALOG_SEGMENTS.has(segments[1])) {
      segments.shift();
    }
    // Quitar subsegmentos finales de catálogo comunes como /list, /detail, /overview, /indice
    if (segments.length >= 2 && ["list", "detail", "overview", "indice", "index"].includes(segments[segments.length - 1])) {
      segments.pop();
    }
    if (segments.length >= 2 && CATALOG_SEGMENTS.has(segments[0])) {
      segments[0] = "series";
    }
    return "/" + segments.join("/");
  }

  function buildSeriesIdFromUrl(novelUrl) {
    try {
      const u = new URL(novelUrl);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      const canonicalPath = canonicalizeSeriesPathForId(u.pathname);
      const canonical = `${host}${canonicalPath}`;
      const hostSlug = normalizeText(host).slice(0, 24);
      const pathSlug = normalizeText(canonicalPath).slice(0, 48);
      return `${hostSlug}__${pathSlug}_${fnv1aHex(canonical)}`;
    } catch {
      return "";
    }
  }

  function buildSeriesIdFromName(name, domain) {
    const hostSlug = normalizeText(domain || cleanHost(location.href)).slice(0, 24);
    const cleanedName = stripChapterAndSuffixes(name);
    const nameSlug = normalizeText(cleanedName).slice(0, 48);
    if (!nameSlug) return "";
    const canonical = `${hostSlug}::${nameSlug}`;
    return `${hostSlug}__${nameSlug}_${fnv1aHex(canonical)}`;
  }

  function isValidSeriesPath(pathname) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return false;
    const first = normalizeText(segments[0]);
    if (["chapter", "chapters", "capitulo", "capitulos", "episode", "episodio", "ch", "cap", "ep", "sec", "seccion", "section", "comic_episode", "comic_episodes", "webcomic_episode", "webcomic_episodes"].includes(first)) {
      return false;
    }
    if (segments.length === 1 && (GENERIC_WORDS.has(first) || CATALOG_SEGMENTS.has(first))) {
      return false;
    }
    const last = normalizeText(segments[segments.length - 1]);
    if (GENERIC_WORDS.has(last) && segments.length <= 2) {
      return false;
    }
    return true;
  }

  function deriveNovelUrlFromRawUrl(rawUrl) {
    if (!rawUrl) return null;
    try {
      const u = new URL(rawUrl, location.origin);
      if (u.origin !== location.origin) return null;
      const pathname = u.pathname.replace(/\/+$/, "");
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length === 0) return null;

      // Caso Webnovel: /(?:[a-z]{2}\/)?book/{novelSlug}_{novelId}(?:/{chapterSlug}_{chapterId})?
      if (u.hostname.includes("webnovel.com")) {
        const bookMatch = pathname.match(/^((?:\/[a-z]{2})?\/book\/[a-z0-9_-]+_\d+)(?:\/.*)?$/i);
        if (bookMatch && bookMatch[1]) {
          return `${u.origin}${bookMatch[1]}`;
        }
      }

      // Caso A: patrón explícito /chapter-X o /capitulo-X en cualquier nivel (incluyendo /{slug}/capitulo-X)
      const explicitMatch = pathname.match(CHAPTER_STRIP_PATH_REGEX);
      if (explicitMatch && explicitMatch[1]) {
        const stripped = explicitMatch[1].replace(/\/+$/, "");
        if (isValidSeriesPath(stripped)) {
          return `${u.origin}${stripped}`;
        }
      }

      const firstLower = segments[0].toLowerCase();

      // Caso B (ManhwaWeb): /leer/{slug}-{cap}[_{parte}]
      if (READER_SEGMENTS.has(firstLower) && segments.length === 2) {
        const slugWithChap = segments[1];
        const matchTrailingChap = slugWithChap.match(/^([a-z0-9_-]*[a-z][a-z0-9_-]*?)-(\d+(?:[._-]\d+)?)$/i);
        if (matchTrailingChap && matchTrailingChap[1]) {
          const baseSlug = matchTrailingChap[1];
          const seriesPrefix = u.hostname.includes("manhwa") ? "manhwa" : segments[0];
          return `${u.origin}/${seriesPrefix}/${baseSlug}`;
        }
      }

      // Caso C (SkyNovels): /novelas/{novelId}/{novelSlug}/{chapterId} o /novelas/{novelId}/{novelSlug}
      if (
        CATALOG_SEGMENTS.has(firstLower) &&
        segments.length >= 3 &&
        /^\d+$/.test(segments[1]) &&
        /[a-z]/i.test(segments[2])
      ) {
        return `${u.origin}/${segments[0]}/${segments[1]}/${segments[2]}`;
      }

      // Caso D: /{catalogo}/{novelSlug}/{chapterId}
      if (
        CATALOG_SEGMENTS.has(firstLower) &&
        segments.length >= 3 &&
        /[a-z]/i.test(segments[1]) &&
        (/^\d+(?:[._-]\d+)?$/.test(segments[2]) || CHAPTER_URL_REGEX.test("/" + segments[2]))
      ) {
        return `${u.origin}/${segments[0]}/${segments[1]}`;
      }

      // Caso E: Ruta terminada en ID numérico precedida por un slug con letras
      if (
        segments.length >= 2 &&
        /^\d+(?:[._-]\d+)?$/.test(segments[segments.length - 1]) &&
        /[a-z]/i.test(segments[segments.length - 2])
      ) {
        const stripped = "/" + segments.slice(0, -1).join("/");
        if (isValidSeriesPath(stripped)) {
          return `${u.origin}${stripped}`;
        }
      }

      // Caso F: CATALOG_SEGMENTS y 2 segmentos con slug que termina en número de capítulo
      if (CATALOG_SEGMENTS.has(firstLower) && segments.length === 2 && /[a-z]/i.test(segments[1])) {
        const slug = segments[1];
        const matchTrailingChap = slug.match(/^([a-z0-9_-]*[a-z][a-z0-9_-]*?)-(?:(?:chapters?|cap[ií]tulos?|ch|cap|ep|c)-)?(\d+(?:[._-]\d+)?)$/i);
        if (matchTrailingChap && matchTrailingChap[1]) {
          return `${u.origin}/${segments[0]}/${matchTrailingChap[1]}`;
        }
        return `${u.origin}/${segments[0]}/${segments[1]}`;
      }
    } catch {}
    return null;
  }

  function deriveNovelUrlFromCanonicalOrLocation() {
    const canonicalHref = document.querySelector('link[rel="canonical"][href]')?.getAttribute("href");
    if (canonicalHref) {
      const fromCanonical = deriveNovelUrlFromRawUrl(canonicalHref);
      if (fromCanonical) return fromCanonical;
    }
    return deriveNovelUrlFromRawUrl(location.href);
  }

  function humanizeSlugFromNovelUrl(novelUrl) {
    if (!novelUrl) return "";
    try {
      const u = new URL(novelUrl);
      const segments = u.pathname.split("/").filter(Boolean);
      for (let i = segments.length - 1; i >= 0; i--) {
        let seg = decodeURIComponent(segments[i]);
        if (/^\d+$/.test(seg)) continue;
        if (CATALOG_SEGMENTS.has(seg.toLowerCase()) || GENERIC_WORDS.has(normalizeText(seg))) continue;
        seg = seg.replace(/_\d{8,}$/, "");
        if ((seg.includes("-") || seg.length >= 3) && !GENERIC_WORDS.has(normalizeText(seg)) && !CATALOG_SEGMENTS.has(seg.toLowerCase())) {
          const words = seg.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
          return words.replace(/\b[a-z]/g, (char) => char.toUpperCase());
        }
      }
    } catch {}
    return "";
  }

  function parseValidChapterNumber(rawNumStr) {
    if (rawNumStr === undefined || rawNumStr === null || rawNumStr === "") return null;
    let clean = String(rawNumStr).trim();
    // Reemplazar coma por punto: 12,5 -> 12.5
    clean = clean.replace(",", ".");
    // Si tiene formato 12-1 o 12_1 convertir a 12.1
    if (/^\d+[-_]\d+$/.test(clean)) {
      clean = clean.replace(/[-_]/, ".");
    }
    const num = parseFloat(clean);
    if (isNaN(num) || num < 0 || num > 15000) return null;
    // Si es un entero con ceros a la izquierda (ej. "005"), devolver "5"
    if (/^0+\d+$/.test(clean)) {
      return String(parseInt(clean, 10));
    }
    // Si tiene ceros decimales innecesarios (ej. "1050.00" o "12.0"), normalizar a entero "1050" / "12"
    if (/^\d+\.0+$/.test(clean)) {
      return String(parseInt(clean, 10));
    }
    return clean;
  }

  function parseSpecialChapter(text) {
    if (!text) return null;
    const m = String(text).match(SPECIAL_CHAPTER_REGEX);
    if (!m) return null;
    const term = m[1].toLowerCase();
    if (term.includes("prolog") || term.includes("prólog")) return "0";
    return term;
  }

  function matchExplicitChapter(text) {
    if (!text) return null;
    const str = String(text);
    const m = str.match(CHAPTER_EXPLICIT_REGEX);
    if (m) return parseValidChapterNumber(m[1] || m[2]);
    const mSpecial = parseSpecialChapter(str);
    if (mSpecial !== null) return mSpecial;
    const mVol = str.match(VOLUME_FALLBACK_REGEX);
    if (mVol) return parseValidChapterNumber(mVol[1]);
    return null;
  }

  function matchLeadingNumberChapter(text, novelNameHint = "") {
    if (!text) return null;
    const clean = String(text).trim();
    if (clean.length > 140) return null;
    if (novelNameHint && normalizeText(clean) === normalizeText(novelNameHint)) return null;

    const m = clean.match(CHAPTER_LEADING_NUM_REGEX);
    if (!m) return null;
    const rawNum = m[1] || m[2];
    const num = parseFloat(String(rawNum).replace(",", "."));
    // Evitar confundir un año (ej. 2025, 2026) con un capítulo si no lleva palabra clave
    if (isNaN(num) || num < 0 || num > 4000 || (num >= 1990 && num <= 2035)) return null;

    // Si el nombre de la novela empieza con ese mismo número (ej. "86 - Eighty Six", "100 Mans"), no es un número de capítulo
    if (novelNameHint) {
      const hintLeading = String(novelNameHint).trim().match(/^(\d{1,5})/);
      if (hintLeading && parseFloat(hintLeading[1]) === num) {
        return null;
      }
    }

    return String(num);
  }

  // Extracción prioritaria desde elementos <select> o dropdowns del lector (99% de fiabilidad en lectores)
  function extractChapterFromReaderDropdown(novelNameHint = "") {
    try {
      const select = document.querySelector(
        'select[id*="chap" i], select[name*="chap" i], select[class*="chap" i], ' +
        'select[id*="cap" i], select[name*="cap" i], select[class*="cap" i], ' +
        'select[id*="episode" i], select[name*="episode" i], select.chapter-select'
      );
      if (select && select.options && select.selectedIndex >= 0) {
        const selectedOpt = select.options[select.selectedIndex];
        const text = (selectedOpt.textContent || "").trim();
        const matched = matchExplicitChapter(text) || parseSpecialChapter(text) || matchLeadingNumberChapter(text, novelNameHint);
        if (matched !== null) return matched;
        if (/^\d{1,5}(?:[.,]\d{1,2})?$/.test(text)) {
          const parsed = parseValidChapterNumber(text);
          if (parsed !== null) return parsed;
        }
      }

      // Dropdowns custom o de Angular Material (como SkyNovels)
      const customSelectEl = document.querySelector(
        '.mat-select-value-text, .mat-mdc-select-value-text, [class*="selected-chapter"], [class*="current-chapter"]'
      );
      if (customSelectEl) {
        const text = getCleanElementText(customSelectEl);
        const matched = matchExplicitChapter(text) || parseSpecialChapter(text) || matchLeadingNumberChapter(text, novelNameHint);
        if (matched !== null) return matched;
        if (/^\d{1,5}(?:[.,]\d{1,2})?$/.test(text)) {
          const parsed = parseValidChapterNumber(text);
          if (parsed !== null) return parsed;
        }
      }
    } catch {}
    return null;
  }

  // Extracción avanzada desde la URL y sus parámetros de consulta
  function extractChapterFromUrl(rawUrl) {
    try {
      const u = new URL(rawUrl || location.href);

      // 1. Query Params (Webtoons con episode_no, sitios con chapter_no, cap, ch, etc.)
      const queryParams = ["episode_no", "chapter_no", "chapter", "capitulo", "chap", "cap", "ep", "ch", "c"];
      for (const param of queryParams) {
        const val = u.searchParams.get(param);
        if (val && /^\d+(?:[.,-]\d+)?$/i.test(val)) {
          const parsed = parseValidChapterNumber(val);
          if (parsed !== null) return parsed;
        }
      }

      // 2. Patrón explícito en la ruta (/capitulo-12, /chapter-12, /c12)
      const urlMatch = u.pathname.match(CHAPTER_URL_REGEX);
      if (urlMatch && urlMatch[1]) {
        const parsed = parseValidChapterNumber(urlMatch[1]);
        if (parsed !== null) return parsed;
      }

      // 3. Lector estilo /leer/slug-2_01
      const segments = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
      if (segments.length >= 2 && READER_SEGMENTS.has(segments[0].toLowerCase())) {
        const trailing = segments[segments.length - 1].match(/-(\d+)(?:_0*\d+|\.(\d+))?$/);
        if (trailing && trailing[1]) {
          return trailing[2] ? `${trailing[1]}.${trailing[2]}` : trailing[1];
        }
      }

      // 4. Ruta puramente numérica al final: /manga/slug/120 o /series/slug/120/
      // Excluyendo paginación de imágenes (/page/3 o /p/3) y rutas de catálogo con ID numérico (ej. SkyNovels /novelas/{id}/{slug}/{id})
      if (segments.length >= 2) {
        const last = segments[segments.length - 1];
        const prev = segments[segments.length - 2].toLowerCase();
        const isCatalogIdPath = segments.length >= 3 && CATALOG_SEGMENTS.has(segments[0].toLowerCase()) && /^\d+$/.test(segments[1]);
        const isUuidOrHash = /^[0-9a-f-]{32,36}$/i.test(prev);
        if (!isCatalogIdPath && !isUuidOrHash && /^\d{1,5}(?:[.-]\d{1,2})?$/.test(last) && !["page", "pagina", "p", "pag"].includes(prev)) {
          const parsed = parseValidChapterNumber(last);
          if (parsed !== null) return parsed;
        }
      }
    } catch {}
    return null;
  }

  // Extracción de datos estructurados JSON-LD (BreadcrumbList / Article) si la web los incluye
  function extractFromJsonLd() {
    let novelName = "";
    let novelUrl = "";
    let chapter = null;

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const s of scripts) {
      try {
        const parsed = JSON.parse(s.textContent || "");
        const nodes = Array.isArray(parsed) ? parsed : (parsed["@graph"] ? parsed["@graph"] : [parsed]);
        for (const node of nodes) {
          if (!node || typeof node !== "object") continue;
          if (node["@type"] === "BreadcrumbList" && Array.isArray(node.itemListElement)) {
            for (const item of node.itemListElement) {
              const name = item?.name || item?.item?.name || "";
              const url = item?.item?.["@id"] || (typeof item?.item === "string" ? item.item : "");
              if (name && (hasChapterPattern(name) || SPECIAL_CHAPTER_REGEX.test(name)) && !chapter) {
                chapter = matchExplicitChapter(name) || parseSpecialChapter(name);
              } else if (name && url && !hasChapterPattern(name) && !isGenericText(name)) {
                novelName = stripChapterAndSuffixes(name);
                novelUrl = url;
              }
            }
          } else if (node.headline && !chapter) {
            chapter = matchExplicitChapter(node.headline) || parseSpecialChapter(node.headline);
          }
        }
      } catch {}
    }
    return { novelName, novelUrl, chapter };
  }

  // Detección de capítulo visible en el viewport para lectores continuos (Webnovel, etc.)
  function getVisibleChapterFromViewport(novelNameHint = "") {
    if (typeof window === "undefined" || !document) return null;
    try {
      const viewportHeight = window.innerHeight || 800;
      // La línea/zona focal de lectura: aproximadamente el 35% de la altura de la ventana
      const focalY = viewportHeight * 0.35;

      // ESTRATEGIA 1: Contenedores de capítulo (Webnovel, lectores SPA continuos)
      const containerSelectors = [
        '[data-chapter-no]',
        '[data-chapterno]',
        '[data-chapter]',
        '[data-episode-number]',
        '[data-episode-no]',
        '[data-episode]',
        '[data-webcomic-reader]',
        '.chapter-entity',
        '.j_chapterBox',
        '.cha-content',
        '.chapter-section',
        '.chapter-wrapper',
        '[class*="chapter-entity"]',
        '[class*="j_chapterBox"]',
        '[class*="cha-content-wrap"]',
        '[class*="chapter-section"]',
        'article'
      ];

      const foundContainers = [];
      const seenContainers = new Set();
      for (const sel of containerSelectors) {
        let elements = [];
        try {
          elements = document.querySelectorAll(sel);
        } catch {
          continue;
        }
        for (const el of elements) {
          if (seenContainers.has(el)) continue;
          seenContainers.add(el);

          let chapNum = null;
          const attrVal = el.getAttribute("data-chapter-no") ||
                          el.getAttribute("data-chapterno") ||
                          el.getAttribute("data-chapter") ||
                          el.getAttribute("data-episode-number") ||
                          el.getAttribute("data-episode-no") ||
                          el.getAttribute("data-episode");
          if (attrVal) {
            chapNum = parseValidChapterNumber(attrVal);
          }

          if (chapNum === null) {
            const heading = el.querySelector('h1, h2, h3, h4, h5, [class*="cha-tit"], [class*="chapter-title"], .chr-title');
            if (heading) {
              const hText = getCleanElementText(heading);
              chapNum = matchExplicitChapter(hText) || parseSpecialChapter(hText) || matchLeadingNumberChapter(hText, novelNameHint);
            }
          }

          if (chapNum === null) {
            const idStr = el.id || "";
            const idMatch = idStr.match(/(?:chapter|chap|capitulo|cap|bab)[-_]?(\d+(?:[.-]\d+)?)/i);
            if (idMatch && idMatch[1]) {
              chapNum = parseValidChapterNumber(idMatch[1]);
            }
          }

          if (chapNum !== null && typeof el.getBoundingClientRect === "function") {
            try {
              const rect = el.getBoundingClientRect();
              foundContainers.push({ el, chapter: chapNum, top: rect.top, bottom: rect.bottom, height: rect.height });
            } catch {}
          }
        }
      }

      if (foundContainers.length > 0) {
        foundContainers.sort((a, b) => a.top - b.top);

        // 1. Contenedor que envuelve la línea focal activa
        for (const c of foundContainers) {
          if (c.top <= focalY && c.bottom >= focalY) {
            return c.chapter;
          }
        }

        // 2. Mayor intersección con el viewport visible
        let bestContainer = null;
        let maxOverlap = 0;
        for (const c of foundContainers) {
          const visibleTop = Math.max(0, c.top);
          const visibleBottom = Math.min(viewportHeight, c.bottom);
          const overlap = visibleBottom - visibleTop;
          if (overlap > maxOverlap) {
            maxOverlap = overlap;
            bestContainer = c;
          }
        }
        if (bestContainer && maxOverlap > 50) {
          return bestContainer.chapter;
        }
      }

      // ESTRATEGIA 2: Secuencia de cabeceras de capítulo en el DOM
      const headingSelectors = [
        'h1', 'h2', 'h3', 'h4', 'h5',
        '[class*="cha-tit"]',
        '[class*="chapter-title"]',
        '.chr-title',
        '.chap-title',
        '.reading-title',
        '.entry-title',
        '.cha-hd-mn',
        '[class*="chapter-header"]',
        '[class*="titulo-capitulo"]'
      ];

      const foundHeadings = [];
      const seenHeadings = new Set();
      for (const sel of headingSelectors) {
        let elements = [];
        try {
          elements = document.querySelectorAll(sel);
        } catch {
          continue;
        }
        for (const el of elements) {
          if (seenHeadings.has(el)) continue;
          seenHeadings.add(el);
          const text = getCleanElementText(el);
          const matched = matchExplicitChapter(text) || parseSpecialChapter(text) || matchLeadingNumberChapter(text, novelNameHint);
          if (matched !== null && typeof el.getBoundingClientRect === "function") {
            try {
              const rect = el.getBoundingClientRect();
              foundHeadings.push({ el, chapter: matched, top: rect.top, bottom: rect.bottom });
            } catch {}
          }
        }
      }

      if (foundHeadings.length > 0) {
        foundHeadings.sort((a, b) => a.top - b.top);

        if (foundHeadings.length === 1) {
          const h = foundHeadings[0];
          if (h.top <= viewportHeight * 0.9) {
            return h.chapter;
          }
          return null;
        }

        let activeChap = null;
        for (let i = 0; i < foundHeadings.length; i++) {
          if (foundHeadings[i].top <= focalY) {
            activeChap = foundHeadings[i].chapter;
          } else {
            break;
          }
        }

        if (activeChap !== null) {
          return activeChap;
        }

        if (foundHeadings[0].top <= viewportHeight * 0.85) {
          return foundHeadings[0].chapter;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  // Motor de extracción de capítulo en niveles protegidos
  function extractChapterNumber(novelNameHint = "") {
    // Nivel 1: Viewport continuo (P2-2: prioritario para evitar que un <select> estático en cabecera secuestre la lectura con desplazamiento continuo)
    const fromViewport = getVisibleChapterFromViewport(novelNameHint);
    if (fromViewport !== null) return fromViewport;

    // Nivel 1.5: Dropdown / <select> del lector (Fuente más fiable en webs de manga/novelas con paginación tradicional)
    const fromDropdown = extractChapterFromReaderDropdown(novelNameHint);
    if (fromDropdown !== null) return fromDropdown;

    // Nivel 2: URL y parámetros (?episode_no=, /chapter-12, /slug/120)
    const fromUrl = extractChapterFromUrl(location.href);
    if (fromUrl !== null) return fromUrl;

    // Nivel 3: <title> y meta og:title con palabra clave explícita o capítulo especial
    const title = document.title || "";
    const fromTitle = matchExplicitChapter(title) || parseSpecialChapter(title);
    if (fromTitle !== null) return fromTitle;

    const ogTitle = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]')?.getAttribute("content");
    const fromOg = matchExplicitChapter(ogTitle) || parseSpecialChapter(ogTitle);
    if (fromOg !== null) return fromOg;

    // Nivel 4: Cabeceras y selectores de capítulo en el DOM (protegido con try/catch)
    for (const selector of CHAPTER_HEADING_SELECTORS) {
      let elements = [];
      try {
        elements = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      for (const el of elements) {
        const text = getCleanElementText(el);
        const matched = matchExplicitChapter(text) || parseSpecialChapter(text);
        if (matched !== null) return matched;
      }
    }

    // Nivel 5: Primeros párrafos/líneas del contenedor de lectura
    for (const containerSel of READER_CONTENT_CONTAINERS) {
      let container = null;
      try {
        container = document.querySelector(containerSel);
      } catch {
        continue;
      }
      if (!container) continue;
      const blocks = container.querySelectorAll("h1, h2, h3, h4, h5, strong, b, p, div");
      const maxCheck = Math.min(blocks.length, 8);
      for (let i = 0; i < maxCheck; i++) {
        const txt = getCleanElementText(blocks[i]);
        if (!txt || txt.length > 180) continue;
        const matched = matchExplicitChapter(txt) || parseSpecialChapter(txt);
        if (matched !== null) return matched;
      }
    }

    // Nivel 6: Numeración directa al inicio del encabezado ("12. El comienzo", "12 - Título", "[12] Título")
    for (const selector of CHAPTER_HEADING_SELECTORS) {
      let elements = [];
      try {
        elements = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      for (const el of elements) {
        const text = getCleanElementText(el);
        const leadingMatch = matchLeadingNumberChapter(text, novelNameHint);
        if (leadingMatch !== null) return leadingMatch;
      }
    }

    // También comprobar los primeros 3 bloques cortos del contenedor de lectura
    for (const containerSel of READER_CONTENT_CONTAINERS) {
      let container = null;
      try {
        container = document.querySelector(containerSel);
      } catch {
        continue;
      }
      if (!container) continue;
      const blocks = container.querySelectorAll("h1, h2, h3, h4, strong, b, p");
      const maxCheck = Math.min(blocks.length, 4);
      for (let i = 0; i < maxCheck; i++) {
        const txt = getCleanElementText(blocks[i]);
        if (!txt || txt.length > 120) continue;
        const leadingMatch = matchLeadingNumberChapter(txt, novelNameHint);
        if (leadingMatch !== null) return leadingMatch;
      }
    }

    // Nivel 7: JSON-LD
    const jsonLd = extractFromJsonLd();
    if (jsonLd.chapter !== null) return jsonLd.chapter;

    return null;
  }

  function findBreadcrumbOrSeriesLink(derivedNovelUrl) {
    const currentOrigin = location.origin;
    const currentCleanHref = location.href.split("#")[0].split("?")[0].replace(/\/+$/, "");
    const targetCanonicalPath = derivedNovelUrl ? canonicalizeSeriesPathForId(new URL(derivedNovelUrl).pathname) : "";
    const candidates = [];

    for (const selector of SERIES_LINK_SELECTORS) {
      const elements = document.querySelectorAll(selector);
      for (const a of elements) {
        if (!a.href) continue;
        let parsed;
        try {
          parsed = new URL(a.href, currentOrigin);
        } catch {
          continue;
        }
        if (parsed.origin !== currentOrigin) continue;

        const cleanCandPath = parsed.pathname.replace(/\/+$/, "");
        const cleanCandHref = `${parsed.origin}${cleanCandPath}`;
        if (cleanCandHref === currentCleanHref) continue;
        if (CHAPTER_URL_REGEX.test(cleanCandPath)) continue;
        if (!isValidSeriesPath(cleanCandPath)) continue;

        const candDerivedBase = deriveNovelUrlFromRawUrl(cleanCandHref);
        if (candDerivedBase && candDerivedBase !== cleanCandHref) continue;

        let rawText = getCleanElementText(a);
        if (!rawText || isGenericText(rawText) || isUnrelatedButtonLabel(rawText, cleanCandHref)) {
          const aria = a.getAttribute("aria-label") || a.getAttribute("title") || a.querySelector("img")?.getAttribute("alt");
          if (aria && !hasChapterPattern(aria) && !isGenericText(aria) && !isUnrelatedButtonLabel(aria, cleanCandHref)) {
            rawText = aria;
          }
        }
        if (!rawText || isGenericText(rawText) || isUnrelatedButtonLabel(rawText, cleanCandHref)) {
          const heading = a.closest(".modfarm-webcomic-reader-side-heading, [class*='series-heading'], [class*='series-card'], aside, nav, header")?.querySelector("h1, h2, h3, [class*='series-title']");
          if (heading) {
            const hText = getCleanElementText(heading);
            if (hText && !hasChapterPattern(hText) && !isGenericText(hText) && !isUnrelatedButtonLabel(hText, cleanCandHref)) {
              rawText = hText;
            }
          }
        }
        if (!rawText || isGenericText(rawText) || isUnrelatedButtonLabel(rawText, cleanCandHref)) {
          const slug = humanizeSlugFromNovelUrl(cleanCandHref);
          if (slug && !isGenericText(slug)) {
            rawText = slug;
          }
        }
        const strippedText = stripChapterAndSuffixes(rawText);
        const isValidTitleText =
          !hasChapterPattern(strippedText) &&
          !isGenericText(strippedText) &&
          !isUnrelatedButtonLabel(strippedText, cleanCandHref);

        const validText = isValidTitleText ? strippedText : "";

        const candCanonicalPath = canonicalizeSeriesPathForId(cleanCandPath);
        const matchesDerived = Boolean(targetCanonicalPath && candCanonicalPath === targetCanonicalPath);
        const isPrefixOfCurrent =
          cleanCandPath.length > 1 &&
          location.pathname.toLowerCase().startsWith(cleanCandPath.toLowerCase() + "/");

        if (!matchesDerived && !isPrefixOfCurrent && !validText) continue;

        candidates.push({
          href: cleanCandHref,
          text: validText,
          matchesDerived,
          isPrefixOfCurrent,
          pathDepth: cleanCandPath.split("/").filter(Boolean).length
        });
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (a.matchesDerived !== b.matchesDerived) return a.matchesDerived ? -1 : 1;
      if (Boolean(a.text) !== Boolean(b.text)) return a.text ? -1 : 1;
      if (a.isPrefixOfCurrent !== b.isPrefixOfCurrent) return a.isPrefixOfCurrent ? -1 : 1;
      return b.pathDepth - a.pathDepth;
    });

    const bestHref = candidates[0].href;
    const bestTextCandidate = candidates.find((c) => c.href === bestHref && c.text) || candidates.find((c) => c.text);

    return {
      href: derivedNovelUrl || bestHref,
      text: bestTextCandidate ? bestTextCandidate.text : ""
    };
  }

  function cleanCandidateTitle(raw) {
    if (!raw) return "";
    const normalized = String(raw).replace(/\s+/g, " ").trim();

    const directCut = stripChapterAndSuffixes(normalized.split(/\s*(?:\||–|—| - | : |»|›|•|«)\s*/)[0]);
    if (directCut && directCut.length >= 2 && !hasChapterPattern(directCut) && !isGenericText(directCut)) {
      return directCut;
    }

    const parts = normalized.split(/\s*(?:\||–|—| - | : |»|›|•|«)\s*/);
    const domainBase = cleanHost(location.href).split(".")[0].toLowerCase();

    for (const part of parts) {
      const cleaned = stripChapterAndSuffixes(part);
      if (!cleaned || cleaned.length < 2) continue;
      if (hasChapterPattern(cleaned)) continue;
      if (isGenericText(cleaned)) continue;
      if ((cleaned.toLowerCase().includes(domainBase) || domainBase.includes(cleaned.toLowerCase())) && cleaned.split(" ").length <= 2) continue;
      return cleaned;
    }

    return "";
  }

  function extractBestNovelName(seriesLinkObj, novelUrl) {
    const jsonLd = extractFromJsonLd();
    if (jsonLd.novelName && !isGenericText(jsonLd.novelName) && !isUnrelatedButtonLabel(jsonLd.novelName, novelUrl)) {
      return jsonLd.novelName;
    }

    if (
      seriesLinkObj &&
      seriesLinkObj.text &&
      !hasChapterPattern(seriesLinkObj.text) &&
      !isGenericText(seriesLinkObj.text) &&
      !isUnrelatedButtonLabel(seriesLinkObj.text, novelUrl)
    ) {
      return seriesLinkObj.text;
    }

    if (novelUrl) {
      const targetCanonical = canonicalizeSeriesPathForId(new URL(novelUrl).pathname);
      for (const a of document.querySelectorAll("a[href]")) {
        try {
          const u = new URL(a.href, location.origin);
          if (canonicalizeSeriesPathForId(u.pathname) === targetCanonical) {
            const txt = stripChapterAndSuffixes(getCleanElementText(a));
            if (
              txt.length >= 2 &&
              !hasChapterPattern(txt) &&
              !isGenericText(txt) &&
              !isUnrelatedButtonLabel(txt, novelUrl)
            ) {
              return txt;
            }
          }
        } catch {}
      }
    }

    for (const selector of NOVEL_NAME_SELECTORS) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const text = stripChapterAndSuffixes(getCleanElementText(el));
      if (
        text.length >= 2 &&
        !hasChapterPattern(text) &&
        !isGenericText(text) &&
        !isUnrelatedButtonLabel(text, novelUrl)
      ) {
        return text;
      }
    }

    const ogTitle = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]')?.getAttribute("content");
    const cleanedOg = cleanCandidateTitle(ogTitle);
    if (cleanedOg && !isUnrelatedButtonLabel(cleanedOg, novelUrl)) return cleanedOg;

    const cleanedDocTitle = cleanCandidateTitle(document.title);
    if (cleanedDocTitle && !isUnrelatedButtonLabel(cleanedDocTitle, novelUrl)) return cleanedDocTitle;

    const slugTitle = humanizeSlugFromNovelUrl(novelUrl);
    if (slugTitle && !isGenericText(slugTitle)) return slugTitle;

    return "";
  }

  function restoreScrollPosition(targetPct, signature) {
    if (!targetPct || targetPct <= 0 || targetPct > 100) return;
    if (restoredForSignature === signature) return;
    if (window.scrollY > 180) {
      restoredForSignature = signature;
      return;
    }

    let attempts = 0;
    const tryScroll = () => {
      attempts++;
      const docEl = document.documentElement;
      const maxScroll = Math.max(docEl.scrollHeight, document.body?.scrollHeight || 0) - window.innerHeight;
      if (maxScroll > 200) {
        restoredForSignature = signature;
        const targetY = Math.round((targetPct / 100) * maxScroll);
        window.scrollTo({ top: targetY, behavior: "smooth" });
      } else if (attempts < 8) {
        setTimeout(tryScroll, 450);
      }
    };
    setTimeout(tryScroll, 250);
  }

  function computeCurrentScrollPct() {
    const docEl = document.documentElement;
    const maxScroll = Math.max(docEl.scrollHeight, document.body?.scrollHeight || 0) - window.innerHeight;
    if (maxScroll <= 50) return 0;
    return Math.min(100, Math.max(0, Math.round((window.scrollY / maxScroll) * 100)));
  }

  function sendScrollUpdate() {
    if (document.visibilityState !== "visible") return;
    if (!activeSeriesId || !activeChapter) return;

    const pct = computeCurrentScrollPct();
    if (pct === lastScrollPctSent) return;

    lastScrollPctSent = pct;
    lastScrollSentAt = Date.now();

    chrome.runtime.sendMessage({
      type: "SCROLL_UPDATED",
      data: {
        seriesId: activeSeriesId,
        chapter: activeChapter,
        scrollPct: pct,
        url: location.href
      }
    }).catch(() => {});
  }

  let lastCheckedScrollChapter = null;
  function checkVisibleChapterOnScroll() {
    if (document.visibilityState !== "visible") return;

    // Detectar si el lector SPA cambió la URL mediante History API en el mundo principal
    if (location.href !== lastCheckedHref) {
      lastCheckedHref = location.href;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(evaluatePage, 250);
      return;
    }

    const currentVisChapter = getVisibleChapterFromViewport();
    if (currentVisChapter && currentVisChapter !== activeChapter && currentVisChapter !== lastCheckedScrollChapter) {
      lastCheckedScrollChapter = currentVisChapter;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(evaluatePage, 300);
    }
  }

  window.addEventListener(
    "scroll",
    () => {
      if (document.visibilityState !== "visible") return;
      checkVisibleChapterOnScroll();
      if (!activeSeriesId) return;
      const now = Date.now();
      const elapsed = now - lastScrollSentAt;
      if (elapsed >= 2000) {
        sendScrollUpdate();
      } else if (!scrollThrottleTimer) {
        scrollThrottleTimer = setTimeout(() => {
          scrollThrottleTimer = null;
          sendScrollUpdate();
        }, 2000 - elapsed);
      }
    },
    { passive: true }
  );

  function stopBodyObserver() {
    if (bodyObserver) {
      bodyObserver.disconnect();
      bodyObserver = null;
    }
    if (bodyObserverTimeout) {
      clearTimeout(bodyObserverTimeout);
      bodyObserverTimeout = null;
    }
  }

  // Observador temporal para SPAs (como SkyNovels) que tardan varios segundos en renderizar el capítulo nuevo
  function startTemporaryBodyObserver() {
    stopBodyObserver();
    if (!document.body) return;

    bodyObserver = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(evaluatePage, 350);
    });

    bodyObserver.observe(document.body, { childList: true, subtree: true });

    // Desconectar automáticamente tras 15 s como máximo para garantizar 0 consumo en reposo
    bodyObserverTimeout = setTimeout(() => {
      stopBodyObserver();
    }, 15000);
  }

  function looksLikeReadingSiteUrl() {
    const pathLower = location.pathname.toLowerCase();
    for (const seg of CATALOG_SEGMENTS) {
      if (pathLower.includes(`/${seg}/`)) return true;
    }
    return false;
  }

  const NON_READER_SUBPAGE_REGEX = /\/(?:reviews?|comments?|threads?|forum|community|characters?|author|stats|statistics|gallery|recommendations|about|info|details|glossary|fan-?art|edit|settings|tos|privacy|contact)(?:\.(?:html?|php|asp[x]?))?(?:[\/?#]|$)/i;
  const CHAPTER_LISTING_SUBPAGE_REGEX = /\/(?:toc|table-of-contents|chapters|capitulos|indice|index)(?:\.(?:html?|php|asp[x]?))?(?:[\/?#]|$)/i;

  function isInformationalOrNonReaderUrl(urlStr = location.href) {
    if (!urlStr) return false;
    try {
      const u = new URL(urlStr, location.origin);
      const path = u.pathname.toLowerCase();
      if (NON_READER_SUBPAGE_REGEX.test(path)) return true;
      if (CHAPTER_LISTING_SUBPAGE_REGEX.test(path) && !extractChapterFromUrl(path)) {
        return true;
      }
    } catch {}
    return false;
  }

  function hasRealReaderContent() {
    if (typeof document === "undefined" || !document.body) return false;
    if (isInformationalOrNonReaderUrl(location.href)) return false;

    // 1. Contenedores de lectura con texto sustancial
    for (const sel of READER_CONTENT_CONTAINERS) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const txt = (el.innerText || el.textContent || "").trim();
          if (txt.length >= 20) return true;
        }
      } catch {}
    }

    // 2. Múltiples párrafos con volumen de lectura (novelas web)
    const paragraphs = document.querySelectorAll("p");
    let longPCount = 0;
    let totalTextLen = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const pText = (paragraphs[i].textContent || "").trim();
      if (pText.length > 25) {
        longPCount++;
        totalTextLen += pText.length;
        if (longPCount >= 2 || totalTextLen >= 150) return true;
      }
    }

    // 3. Imágenes de lectura para manga/webtoon o canvas
    const comicImages = document.querySelectorAll('.viewer-cnt img, #viewer img, .reading-content img, .chapter-images img, .comic-page, [class*="reading-image"], canvas.comic-page, #viewer canvas, ._comicImage, [class*="_comicImage"], [class*="viewer"] img, .viewer_lst img, #_viewerBox img, [data-webcomic-reader] img, .modfarm-webcomic-panel img, [data-webcomic-panel] img, [class*="webcomic-panel"] img, [class*="webcomic-reader"] img');
    if (comicImages.length >= 1) return true;

    // 4. Botones de navegación entre capítulos con algo de texto
    const navButtons = document.querySelectorAll('a[href*="chapter"], a[href*="capitulo"], [class*="next-chap" i], [class*="prev-chap" i], a[rel="next"], a[rel="prev"]');
    if (navButtons.length >= 1 && (totalTextLen >= 60 || (document.body.innerText || "").length >= 100)) return true;

    // 5. Volumen sustancial de texto en el cuerpo
    const bodyTxt = (document.body.innerText || document.body.textContent || "").trim();
    if (bodyTxt.length >= 350) return true;

    return false;
  }

  function isAuthenticReadingContext() {
    if (isCurrentDomainBlacklisted()) return false;

    // P1-1: Subpáginas informativas, reseñas, foros, autores o personajes
    if (isInformationalOrNonReaderUrl(location.href)) return false;

    // Si es la raíz de la web (home) sin ruta de lectura, no evaluar
    const pathOnly = location.pathname.replace(/\/+$/, "");
    if (!pathOnly || pathOnly === "" || pathOnly === "/index.html" || pathOnly === "/home") {
      return false;
    }

    // 1. Dominio con palabras clave de lectura
    const host = location.hostname.toLowerCase();
    if (/(?:manga|novel|scan|webtoon|manhwa|manhua|comic|read|leer|wuxia|tu-novela|skynovel|olympus|yugen|lector|visormanga|bato|tapas|webnovel)/i.test(host)) {
      return true;
    }

    // 2. Ruta de URL que apunta claramente a un catálogo o visor de lectura
    if (looksLikeReadingSiteUrl()) return true;
    const path = location.pathname.toLowerCase();
    if (/(?:\/|-|_)(?:chapter|capitulo|cap[ií]tulo|episodio|episode|secci[oó]n|seccion|section|ch|cap|ep)[-_\/.]?\d+/i.test(path)) {
      return true;
    }
    const search = location.search.toLowerCase();
    if (/(?:episode_no|chapter_no|chapter=|capitulo=|cap=)/i.test(search)) {
      return true;
    }

    // 3. El DOM contiene controles específicos de un lector
    if (extractChapterFromReaderDropdown() !== null) {
      return true;
    }

    // Contenedores específicos de lectura de manga / webtoon / novelas / webcomics
    const hasReaderContainer = document.querySelector(
      '.reading-content, #readerarea, .reader-area, .v-reader, #chapter-content, ' +
      '.chapter-content, [class*="reading-content"], [class*="novel-content"], ' +
      '[data-webcomic-reader], .modfarm-webcomic-reader, [class*="webcomic-reader"], ' +
      'img[class*="wp-manga"], img[class*="ts-main-image"], img[src*="chapter"]'
    );
    if (hasReaderContainer) return true;

    // Botones de navegación entre capítulos (Prev / Next Chapter)
    const hasChapterNav = document.querySelector(
      'a[class*="next-chap" i], a[class*="prev-chap" i], a[class*="next_chap" i], a[class*="prev_chap" i], ' +
      'a[id*="next-chap" i], a[id*="prev-chap" i], .nav-next, .nav-previous, .btn-next-chap'
    );
    if (hasChapterNav) return true;

    // Breadcrumbs que apunten a series / manga / novelas
    const hasReadingBreadcrumb = document.querySelector(
      '.breadcrumb a[href*="manga" i], .breadcrumb a[href*="novel" i], .breadcrumb a[href*="series" i], ' +
      '.breadcrumbs a[href*="manga" i], .breadcrumbs a[href*="novel" i]'
    );
    if (hasReadingBreadcrumb) return true;

    return false;
  }

  function evaluatePage() {
    if (!isAuthenticReadingContext()) {
      return;
    }

    const derivedNovelUrl = deriveNovelUrlFromCanonicalOrLocation();
    const seriesLink = findBreadcrumbOrSeriesLink(derivedNovelUrl);
    const novelUrl = derivedNovelUrl || (seriesLink && seriesLink.href) || "";
    const novelName = extractBestNovelName(seriesLink, novelUrl);
    const chapter = extractChapterNumber(novelName);

    let seriesId = "";
    let reliableSeriesId = false;

    if (novelUrl) {
      seriesId = buildSeriesIdFromUrl(novelUrl);
      reliableSeriesId = Boolean(seriesId);
    } else if (novelName) {
      seriesId = buildSeriesIdFromName(novelName, cleanHost(location.href));
      reliableSeriesId = false;
    }

    if (seriesId) {
      if (activeSeriesId && activeSeriesId !== seriesId) {
        activeChapter = "";
        lastCapturedChapterForPrevUrl = "";
        lastCapturedSeriesIdForPrevUrl = "";
        lastSentKey = "";
      }
    }

    // Si estamos en una URL nueva de capítulo pero el SPA aún no ha renderizado el capítulo nuevo (o sigue mostrando el viejo)
    const isStaleSpaChapter =
      lastCapturedUrl &&
      lastCapturedUrl !== location.href &&
      chapter !== null &&
      chapter === lastCapturedChapterForPrevUrl &&
      (!lastCapturedSeriesIdForPrevUrl || lastCapturedSeriesIdForPrevUrl === seriesId) &&
      retryCount < 6;

    const isPotentialReaderPage = Boolean(
      derivedNovelUrl ||
      looksLikeReadingSiteUrl() ||
      extractChapterFromUrl(location.href) ||
      document.querySelector('select[class*="chap" i], select[name*="chap" i], [class*="chapter" i], [class*="reading" i]')
    );

    const hasContent = hasRealReaderContent();
    if ((!chapter || isStaleSpaChapter || (!novelName && isPotentialReaderPage) || (!hasContent && isPotentialReaderPage)) && retryCount < 8) {
      if (isPotentialReaderPage || isStaleSpaChapter) {
        retryCount++;
        clearTimeout(retryTimer);
        retryTimer = setTimeout(evaluatePage, 500);
        return;
      }
    }

    // Si tras todos los reintentos en una URL que claramente es un capítulo de una serie conocida (ej. /novelas/319/slug/100166/)
    // el capítulo es un prólogo/epílogo sin número en el texto, enviamos chapter: "AUTO_NEXT" sólo si hay evidencia de lectura real
    if (!chapter) {
      const isExplicitUnnumberedChapterUrl = /(?:\/prolog[uo]|\/epilog[uo]|\/interludi?o|\/read\/|\/chapter\/|\/capitulo\/|\/c\/|\/novelas\/\d+\/[^\/]+\/\d+)/i.test(location.pathname);
      if (
        reliableSeriesId &&
        novelName &&
        derivedNovelUrl &&
        derivedNovelUrl !== location.href.replace(/\/+$/, "") &&
        !NON_READER_SUBPAGE_REGEX.test(location.pathname) &&
        isExplicitUnnumberedChapterUrl &&
        hasContent
      ) {
        sendDetectedPayload(seriesId, novelName, novelUrl, "AUTO_NEXT", true);
        return;
      }

      if ((derivedNovelUrl || looksLikeReadingSiteUrl()) && lastLoggedMissUrl !== location.href) {
        lastLoggedMissUrl = location.href;
        let safeDerivedHost = "";
        try {
          if (derivedNovelUrl) safeDerivedHost = new URL(derivedNovelUrl).hostname;
        } catch {}
        chrome.runtime.sendMessage({
          type: "DIAGNOSTIC_LOG",
          entry: {
            event: "NO_CHAPTER_DETECTED",
            url: location.hostname || "",
            pageTitle: document.title || "",
            derivedNovelUrl: safeDerivedHost,
            detectedName: novelName || ""
          }
        }).catch(() => {});
      }
      retryCount = 0;
      return;
    }

    const confident = Boolean(reliableSeriesId && novelName && chapter && !isGenericText(novelName));
    // Si no es confiable y no se pudo derivar ni encontrar la URL de la novela/manga, no enviar basura
    if (!confident && !novelUrl) {
      return;
    }

    // P1-1: Exigir evidencia suficiente de lectura para no registrar páginas vacías o sin contenido real
    if (!hasContent) {
      return;
    }
    sendDetectedPayload(seriesId, novelName, novelUrl, chapter, confident);
  }
  function sendDetectedPayload(seriesId, novelName, novelUrl, chapter, confident) {
    const finalSeriesId = seriesId || buildSeriesIdFromName(novelName || cleanHost(location.href), cleanHost(location.href));
    const dedupeSignature = `${finalSeriesId}::${novelName || ""}::${chapter}::${location.href}::${confident ? "1" : "0"}`;
    if (dedupeSignature === lastSentKey) return;

    lastSentKey = dedupeSignature;
    lastCapturedUrl = location.href;
    if (chapter !== "AUTO_NEXT") {
      lastCapturedChapterForPrevUrl = String(chapter);
      lastCapturedSeriesIdForPrevUrl = finalSeriesId;
      stopBodyObserver();
    }
    retryCount = 0;

    chrome.runtime.sendMessage({
      type: "NOVEL_DETECTED",
      confident,
      data: {
        seriesId: finalSeriesId,
        novelName: isGenericText(novelName) ? "" : novelName,
        novelUrl: novelUrl || "",
        url: location.href,
        pageTitle: document.title || "",
        chapter: String(chapter),
        genres: [],
        updatedAt: Date.now()
      }
    })
      .then((res) => {
        if (res && res.saved && res.seriesId) {
          const resolvedChapter = String(res.chapter || chapter);
          if (activeSeriesId !== res.seriesId || activeChapter !== resolvedChapter) {
            lastScrollPctSent = -1;
          }
          activeSeriesId = res.seriesId;
          activeChapter = resolvedChapter;
          if (chapter === "AUTO_NEXT") {
            lastCapturedChapterForPrevUrl = resolvedChapter;
          }

          if (typeof res.restoreScrollPct === "number" && res.restoreScrollPct > 0) {
            restoreScrollPosition(res.restoreScrollPct, `${res.seriesId}::${resolvedChapter}`);
          }
        } else if (res && res.blacklisted) {
          dismissInPagePrompt();
          stopBodyObserver();
          return;
        } else if (res && res.unconfirmed) {
          showInPagePrompt(res);
        }
      })
      .catch(() => {});
  }

  function triggerNavigationDetection() {
    retryCount = 0;
    clearTimeout(debounceTimer);
    clearTimeout(retryTimer);
    if (!isAuthenticReadingContext() || isCurrentDomainBlacklisted()) return;
    startTemporaryBodyObserver();
    debounceTimer = setTimeout(evaluatePage, 400);
  }

  function attachTitleObserver() {
    const titleEl = document.querySelector("head > title");
    if (titleEl) {
      if (titleObserver) titleObserver.disconnect();
      titleObserver = new MutationObserver(() => {
        triggerNavigationDetection();
      });
      titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
      return true;
    }
    return false;
  }

  if (!attachTitleObserver() && document.head) {
    const headObserver = new MutationObserver(() => {
      if (attachTitleObserver()) headObserver.disconnect();
    });
    headObserver.observe(document.head, { childList: true });
  }

  const origPushState = history.pushState;
  history.pushState = function (...args) {
    const result = origPushState.apply(this, args);
    triggerNavigationDetection();
    return result;
  };

  const origReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    const result = origReplaceState.apply(this, args);
    triggerNavigationDetection();
    return result;
  };

  window.addEventListener("popstate", () => {
    triggerNavigationDetection();
  });

  if (window.navigation && typeof window.navigation.addEventListener === "function") {
    window.navigation.addEventListener("navigate", () => {
      triggerNavigationDetection();
    });
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  let inPagePromptHost = null;
  let inPagePromptShadow = null;

  function dismissInPagePrompt() {
    if (inPagePromptHost) {
      inPagePromptHost.remove();
      inPagePromptHost = null;
      inPagePromptShadow = null;
    }
  }

  function showInPagePrompt(payload) {
    if (isCurrentDomainBlacklisted()) return;
    if (document.querySelector("mynovelsystem-prompt, noveltrack-prompt")) return;

    const host = document.createElement("mynovelsystem-prompt");
    inPagePromptHost = host;
    const shadow = host.attachShadow({ mode: "closed" });
    inPagePromptShadow = shadow;

    const rawDomain = location.hostname.toLowerCase().replace(/^www\./, "");
    const displayTitle = payload?.novelName || document.title || "Novela detectada";
    const chapVal = payload?.chapter;
    const displayChapter = chapVal && chapVal !== "AUTO_NEXT" ? `Cap. ${chapVal}` : "Cap. 1";

    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        animation: ntFadeUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none !important;
          transition: none !important;
        }
      }
      @keyframes ntFadeUp {
        from {
          opacity: 0;
          transform: translateY(18px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      .nt-card {
        background: rgba(15, 15, 20, 0.94);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 14px;
        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65), 0 0 20px rgba(99, 102, 241, 0.35);
        color: #f8fafc;
        width: 320px;
        max-width: calc(100vw - 32px);
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-sizing: border-box;
      }
      .nt-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .nt-brand {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .nt-crest {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        background: linear-gradient(135deg, #0ea5e9, #6366f1, #ec4899);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 13px;
        font-weight: 900;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
      }
      .nt-title-lbl {
        font-size: 12px;
        font-weight: 700;
        background: linear-gradient(90deg, #fff, #c7d2fe);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .nt-btn-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        line-height: 1;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: color 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .nt-btn-close:hover, .nt-btn-close:focus-visible {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
        outline: none;
      }
      .nt-body {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .nt-novel-title {
        font-size: 13px;
        font-weight: 700;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .nt-meta-row {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .nt-chip-chap {
        font-size: 11px;
        font-weight: 700;
        background: rgba(99, 102, 241, 0.2);
        color: #a5b4fc;
        border: 1px solid rgba(99, 102, 241, 0.4);
        padding: 2px 7px;
        border-radius: 99px;
      }
      .nt-chip-domain {
        font-size: 10.5px;
        color: #94a3b8;
        background: rgba(255, 255, 255, 0.06);
        padding: 2px 6px;
        border-radius: 5px;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .nt-actions {
        display: flex;
        gap: 6px;
        margin-top: 4px;
      }
      .nt-btn {
        flex: 1;
        padding: 8px 10px;
        border-radius: 8px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .nt-btn-primary {
        background: linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #d946ef 100%);
        color: #fff;
        box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
      }
      .nt-btn-primary:hover, .nt-btn-primary:focus-visible {
        filter: brightness(1.1);
        transform: translateY(-1px);
        outline: 2px solid #818cf8;
      }
      .nt-btn-secondary {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #cbd5e1;
      }
      .nt-btn-secondary:hover, .nt-btn-secondary:focus-visible {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        outline: none;
      }
      .nt-btn-blacklist {
        background: rgba(244, 63, 94, 0.12);
        border: 1px solid rgba(244, 63, 94, 0.3);
        color: #fda4af;
        flex: 0 0 auto;
        padding: 8px 10px;
      }
      .nt-btn-blacklist:hover, .nt-btn-blacklist:focus-visible {
        background: rgba(244, 63, 94, 0.25);
        color: #fff;
        outline: none;
      }
      .nt-feedback {
        font-size: 11.5px;
        font-weight: 600;
        text-align: center;
        padding: 4px;
        color: #34d399;
      }
    `;

    const card = document.createElement("div");
    card.className = "nt-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "false");
    card.setAttribute("aria-label", "Aviso de MyNovelSystem");

    card.innerHTML = `
      <div class="nt-header">
        <div class="nt-brand">
          <div class="nt-crest">N</div>
          <span class="nt-title-lbl">MyNovelSystem</span>
        </div>
        <button type="button" class="nt-btn-close" aria-label="Cerrar aviso" title="Cerrar (Esc)">&times;</button>
      </div>
      <div class="nt-body">
        <div class="nt-novel-title" id="ntNovelTitle"></div>
        <div class="nt-meta-row">
          <span class="nt-chip-chap" id="ntChipChap"></span>
          <span class="nt-chip-domain" id="ntChipDomain"></span>
        </div>
      </div>
      <div class="nt-actions" id="ntActionsRow">
        <button type="button" class="nt-btn nt-btn-primary" id="ntBtnAdd">+ Añadir</button>
        <button type="button" class="nt-btn nt-btn-secondary" id="ntBtnDismiss">✕</button>
        <button type="button" class="nt-btn nt-btn-blacklist" id="ntBtnBlacklist" title="Excluir este sitio en MyNovelSystem">🚫 BlackList</button>
      </div>
      <div class="nt-feedback" id="ntFeedback" style="display:none;"></div>
    `;

    const titleEl = card.querySelector("#ntNovelTitle");
    if (titleEl) {
      titleEl.textContent = displayTitle;
      titleEl.setAttribute("title", displayTitle);
    }
    const chapEl = card.querySelector("#ntChipChap");
    if (chapEl) {
      chapEl.textContent = displayChapter;
    }
    const domainEl = card.querySelector("#ntChipDomain");
    if (domainEl) {
      domainEl.textContent = rawDomain;
      domainEl.setAttribute("title", rawDomain);
    }

    shadow.appendChild(style);
    shadow.appendChild(card);
    document.body.appendChild(host);

    const btnAdd = shadow.getElementById("ntBtnAdd");
    const btnDismiss = shadow.getElementById("ntBtnDismiss");
    const btnBlacklist = shadow.getElementById("ntBtnBlacklist");
    const btnClose = shadow.querySelector(".nt-btn-close");
    const actionsRow = shadow.getElementById("ntActionsRow");
    const feedbackEl = shadow.getElementById("ntFeedback");

    setTimeout(() => {
      btnAdd?.focus();
    }, 50);

    const closeHandler = (e) => {
      if (e && e.type === "click" && !e.isTrusted) return;
      chrome.runtime.sendMessage({ type: "DISCARD_UNCONFIRMED_TAB" }).catch(() => {});
      dismissInPagePrompt();
    };

    btnClose?.addEventListener("click", closeHandler);
    btnDismiss?.addEventListener("click", closeHandler);

    btnAdd?.addEventListener("click", async (e) => {
      if (e && !e.isTrusted) return;
      btnAdd.disabled = true;
      try {
        await chrome.runtime.sendMessage({
          type: "CONFIRM_UNCONFIRMED_TAB",
          novelName: displayTitle,
          chapter: chapVal || "1",
          url: payload?.url || location.href,
          seriesId: payload?.seriesId,
          novelUrl: payload?.novelUrl
        });
        actionsRow.style.display = "none";
        feedbackEl.textContent = "✓ ¡Obra añadida a la biblioteca!";
        feedbackEl.style.display = "block";
        setTimeout(() => {
          dismissInPagePrompt();
        }, 800);
      } catch {
        dismissInPagePrompt();
      }
    });

    btnBlacklist?.addEventListener("click", async (e) => {
      if (e && !e.isTrusted) return;
      btnBlacklist.disabled = true;
      try {
        await chrome.runtime.sendMessage({
          type: "ADD_DOMAIN_BLACKLIST",
          domain: rawDomain
        });
        actionsRow.style.display = "none";
        while (feedbackEl.firstChild) {
          feedbackEl.removeChild(feedbackEl.firstChild);
        }
        const spanBlocked = document.createElement("span");
        spanBlocked.textContent = "🚫 Dominio bloqueado";
        const undoBtn = document.createElement("button");
        undoBtn.type = "button";
        undoBtn.id = "ntBtnUndo";
        undoBtn.textContent = "Deshacer";
        undoBtn.style.cssText = "background:transparent; border:1px solid #fda4af; color:#fda4af; border-radius:4px; padding:2px 8px; font-size:11px; margin-left:8px; cursor:pointer;";
        feedbackEl.appendChild(spanBlocked);
        feedbackEl.appendChild(undoBtn);
        feedbackEl.style.color = "#fda4af";
        feedbackEl.style.display = "flex";
        feedbackEl.style.alignItems = "center";
        feedbackEl.style.justifyContent = "center";

        let undoTimer = setTimeout(() => {
          dismissInPagePrompt();
        }, 5000);

        undoBtn.addEventListener("click", async (ev) => {
          if (ev && !ev.isTrusted) return;
          clearTimeout(undoTimer);
          try {
            await chrome.runtime.sendMessage({
              type: "REMOVE_DOMAIN_BLACKLIST",
              domain: rawDomain
            });
            feedbackEl.style.display = "none";
            feedbackEl.textContent = "";
            actionsRow.style.display = "flex";
            btnBlacklist.disabled = false;
          } catch {
            dismissInPagePrompt();
          }
        });
      } catch {
        dismissInPagePrompt();
      }
    });

    const keyListener = (e) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", keyListener);
        closeHandler();
      }
    };
    document.addEventListener("keydown", keyListener);
  }

  function matchesDomainPattern(host, pattern) {
    if (!host || !pattern) return false;
    const cleanHost = String(host).trim().toLowerCase().replace(/^www\./i, "");
    const cleanPattern = String(pattern).trim().toLowerCase().replace(/^www\./i, "").replace(/^\*+\.?/i, "");
    if (!cleanHost || !cleanPattern) return false;
    if (cleanHost === cleanPattern || cleanHost.endsWith("." + cleanPattern)) return true;
    return false;
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === "SHOW_UNCONFIRMED_PROMPT") {
      showInPagePrompt(msg.data);
    }
    if (msg && msg.type === "DISMISS_UNCONFIRMED_PROMPT") {
      dismissInPagePrompt();
    }
    if (msg && msg.type === "CHECK_BLACKLIST_AND_DISMISS") {
      if (msg.blockedDomain && matchesDomainPattern(window.location.hostname, msg.blockedDomain)) {
        dismissInPagePrompt();
        chrome.runtime.sendMessage({ type: "DISMISS_TAB_PROMPT" }).catch(() => {});
      }
    }
    if (msg && msg.type === "SPA_URL_CHANGED") {
      lastCheckedHref = location.href;
      triggerNavigationDetection();
    }
  });

  if (window.navigation && typeof window.navigation.addEventListener === "function") {
    window.navigation.addEventListener("navigatesuccess", () => {
      triggerNavigationDetection();
    });
  }

  setInterval(() => {
    if (location.href !== lastCheckedHref) {
      lastCheckedHref = location.href;
      triggerNavigationDetection();
    }
  }, 900);

  if (typeof window !== "undefined" && window.__EXPOSE_DETECTOR_FOR_TESTS__) {
    window.__DETECTOR_INTERNALS__ = {
      extractChapterNumber,
      extractChapterFromUrl,
      extractChapterFromReaderDropdown,
      parseSpecialChapter,
      parseValidChapterNumber,
      matchLeadingNumberChapter,
      extractFromJsonLd,
      isBlacklistedDomain,
      hasRealReaderContent,
      isAuthenticReadingContext,
      isInformationalOrNonReaderUrl,
      NON_READER_SUBPAGE_REGEX,
      CHAPTER_LISTING_SUBPAGE_REGEX
    };
  }

  triggerNavigationDetection();
})();