(() => {
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

  // Si estamos en un dominio excluido, no ejecutar ningún observador ni lógica (0 consumo y 0 falsos positivos)
  if (isBlacklistedDomain(location.hostname)) {
    return;
  }

  // Patrón 1: Con palabra clave explícita (Capítulo 12, Cap. 12, Chapter 12, Episode 12, Ep. 12, Parte 12, c12, #12)
  const CHAPTER_EXPLICIT_REGEX = /\b(?:chapter|cap[ií]tulo|capitulo|episode|episodio|parte|part|tomo|volumen|volume|ch\.?|cap\.?|ep\.?|pt\.?|vol\.?|v\.?|c\.?)\s*#?\s*(\d{1,5}(?:[.,-]\d{1,2}|[a-z])?)\b|(?:^|\s)#(\d{1,5}(?:[.,-]\d{1,2})?)(?:\s|:|-|$)/i;

  // Patrón para capítulos especiales (Prólogo, Epílogo, One-shot, Extra, etc.)
  const SPECIAL_CHAPTER_REGEX = /\b(pr[oó]logo|prologue|ep[ií]logo|epilogue|oneshot|one-shot|extra|special|especial|side\s*story)\b/i;

  // Patrón 2: Número al inicio de un título de capítulo ("12. El comienzo", "12 - Título", "[12] Título")
  const CHAPTER_LEADING_NUM_REGEX = /^\s*(?:\[\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*\]|(\d{1,5}(?:[.,]\d{1,2})?)\s*[-–—.:)\]]\s+\S)/;

  const CHAPTER_URL_REGEX = /(?:\/|-|_|\b)(?:chapter|capitulo|cap[ií]tulo|episode|episodio|parte|ch|cap|ep|c)[-_\/.]?(\d{1,5}(?:[.-]\d{1,2})?)(?:\/|$|\?|#|-|_)/i;
  const CHAPTER_STRIP_PATH_REGEX = /^(.*?)(?:\/|-|_)(?:chapter|capitulo|cap[ií]tulo|episode|episodio|parte|ch|cap|ep|c)[-_\/.]?\d+(?:[._-]\d+)?(?:\/.*)?$/i;
  const INLINE_CHAPTER_CUT_REGEX = /\s*[-–—|:«»]*\s*(?:chapter|cap[ií]tulo|capitulo|episode|episodio|parte|ch\.|cap\.|ep\.|c\.)\s*#?\s*\d+.*$/i;
  const TRAILING_MEDIA_SUFFIX_REGEX = /\s+\b(?:manhwa|manhua|manga|webtoon|novela\s*ligera|light\s*novel|web\s*novel|novela|novel|comic|raw|sub\s*espa[ñn]ol|en\s*espa[ñn]ol|online|gratis|free|skynovels)\b\s*$/i;

  const CATALOG_SEGMENTS = new Set([
    "novelas", "novela", "novels", "novel", "series", "serie",
    "manga", "mangas", "manhwa", "manhwas", "manhua", "manhuas",
    "webtoon", "webtoons", "comic", "comics", "book", "books",
    "obras", "obra", "lectura", "leer", "ver", "read", "ficcion"
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
    "configuracion", "leer", "ver", "obra", "obras", "skynovels"
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
    '.entry-title-series'
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

  function stripChapterAndSuffixes(rawTitle) {
    if (!rawTitle) return "";
    let cleaned = String(rawTitle)
      .replace(ICON_LIGATURES_REGEX, "")
      .replace(/\s+/g, " ")
      .trim();

    cleaned = cleaned.replace(INLINE_CHAPTER_CUT_REGEX, "").trim();
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
    const domainBase = normalizeText(cleanHost(location.href).split(".")[0]);
    if (norm === domainBase) return true;
    return false;
  }

  function isUnrelatedButtonLabel(candidateText, novelUrl) {
    if (!candidateText) return true;
    if (!novelUrl) return false;

    const slugHuman = humanizeSlugFromNovelUrl(novelUrl);
    if (!slugHuman) return false;

    const slugWords = normalizeText(slugHuman)
      .split("_")
      .filter((w) => w.length >= 3 && !/^\d+$/.test(w));
    const candWords = normalizeText(candidateText)
      .split("_")
      .filter((w) => w.length >= 3);

    if (slugWords.length >= 2 && candWords.length <= 2) {
      const hasOverlap = candWords.some((cw) => slugWords.includes(cw));
      if (!hasOverlap) return true;
    }
    return false;
  }

  function hasChapterPattern(text) {
    return CHAPTER_EXPLICIT_REGEX.test(String(text || ""));
  }

  function canonicalizeSeriesPathForId(pathname) {
    const segments = decodeURIComponent(pathname)
      .toLowerCase()
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean);
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

      // Caso C (SkyNovels): /novelas/{novelId}/{novelSlug}/{chapterId}
      if (
        CATALOG_SEGMENTS.has(firstLower) &&
        segments.length >= 4 &&
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

      // Caso E: Ruta terminada en ID numérico precedida por un slug con letras y guiones
      if (
        segments.length >= 2 &&
        /^\d+(?:[._-]\d+)?$/.test(segments[segments.length - 1]) &&
        segments[segments.length - 2].includes("-") &&
        /[a-z]/i.test(segments[segments.length - 2])
      ) {
        const stripped = "/" + segments.slice(0, -1).join("/");
        if (isValidSeriesPath(stripped)) {
          return `${u.origin}${stripped}`;
        }
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
        if (seg.includes("-") && seg.length > 3) {
          const words = seg.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
          return words.charAt(0).toUpperCase() + words.slice(1);
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
    const m = String(text).match(CHAPTER_EXPLICIT_REGEX);
    if (!m) return null;
    return parseValidChapterNumber(m[1] || m[2]);
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
    return String(num);
  }

  // Extracción prioritaria desde elementos <select> o dropdowns del lector (99% de fiabilidad en lectores)
  function extractChapterFromReaderDropdown() {
    try {
      const select = document.querySelector(
        'select[id*="chap" i], select[name*="chap" i], select[class*="chap" i], ' +
        'select[id*="cap" i], select[name*="cap" i], select[class*="cap" i], ' +
        'select[id*="episode" i], select[name*="episode" i], select.chapter-select'
      );
      if (select && select.options && select.selectedIndex >= 0) {
        const selectedOpt = select.options[select.selectedIndex];
        const text = (selectedOpt.textContent || "").trim();
        const matched = matchExplicitChapter(text) || parseSpecialChapter(text);
        if (matched !== null) return matched;
      }

      // Dropdowns custom o de Angular Material (como SkyNovels)
      const customSelectEl = document.querySelector(
        '.mat-select-value-text, .mat-mdc-select-value-text, [class*="selected-chapter"], [class*="current-chapter"]'
      );
      if (customSelectEl) {
        const text = getCleanElementText(customSelectEl);
        const matched = matchExplicitChapter(text) || parseSpecialChapter(text);
        if (matched !== null) return matched;
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
      // Excluyendo paginación de imágenes (/page/3 o /p/3)
      if (segments.length >= 2) {
        const last = segments[segments.length - 1];
        const prev = segments[segments.length - 2].toLowerCase();
        if (/^\d{1,5}(?:[.-]\d{1,2})?$/.test(last) && !["page", "pagina", "p", "pag"].includes(prev)) {
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

  // Motor de extracción de capítulo en 7 niveles protegidos
  function extractChapterNumber(novelNameHint = "") {
    // Nivel 1: Dropdown / <select> del lector (Fuente más fiable en webs de manga/novelas)
    const fromDropdown = extractChapterFromReaderDropdown();
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

        const rawText = getCleanElementText(a);
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
      if (cleaned.toLowerCase().includes(domainBase) && cleaned.split(" ").length <= 2) continue;
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

  window.addEventListener(
    "scroll",
    () => {
      if (document.visibilityState !== "visible" || !activeSeriesId) return;
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
      if (lastCapturedUrl === location.href) {
        stopBodyObserver();
        return;
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(evaluatePage, 500);
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

  function isAuthenticReadingContext() {
    if (isBlacklistedDomain(location.hostname)) return false;

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
    if (/(?:\/|-|_)(?:chapter|capitulo|cap[ií]tulo|episodio|episode|ch|cap|ep)[-_\/.]?\d+/i.test(path)) {
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

    // Contenedores específicos de lectura de manga / webtoon / novelas
    const hasReaderContainer = document.querySelector(
      '.reading-content, #readerarea, .reader-area, .v-reader, #chapter-content, ' +
      '.chapter-content, [class*="reading-content"], [class*="novel-content"], ' +
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

    // Si estamos en una URL nueva de capítulo pero el SPA aún no ha renderizado el capítulo nuevo (o sigue mostrando el viejo)
    const isStaleSpaChapter =
      lastCapturedUrl &&
      lastCapturedUrl !== location.href &&
      chapter !== null &&
      chapter === lastCapturedChapterForPrevUrl &&
      retryCount < 6;

    const isPotentialReaderPage = Boolean(
      derivedNovelUrl ||
      looksLikeReadingSiteUrl() ||
      extractChapterFromUrl(location.href) ||
      document.querySelector('select[class*="chap" i], select[name*="chap" i], [class*="chapter" i], [class*="reading" i]')
    );

    if ((!chapter || isStaleSpaChapter) && retryCount < 8) {
      if (isPotentialReaderPage || isStaleSpaChapter) {
        retryCount++;
        clearTimeout(retryTimer);
        retryTimer = setTimeout(evaluatePage, 700);
        return;
      }
    }

    // Si tras todos los reintentos en una URL que claramente es un capítulo de una serie conocida (ej. /novelas/319/slug/100166/)
    // el capítulo es un prólogo/epílogo sin número en el texto, enviamos chapter: "AUTO_NEXT" para que background lo gestione
    if (!chapter) {
      if (reliableSeriesId && novelName && derivedNovelUrl && derivedNovelUrl !== location.href.replace(/\/+$/, "")) {
        sendDetectedPayload(seriesId, novelName, novelUrl, "AUTO_NEXT", true);
        return;
      }

      if ((derivedNovelUrl || looksLikeReadingSiteUrl()) && lastLoggedMissUrl !== location.href) {
        lastLoggedMissUrl = location.href;
        chrome.runtime.sendMessage({
          type: "DIAGNOSTIC_LOG",
          entry: {
            event: "NO_CHAPTER_DETECTED",
            url: location.href,
            pageTitle: document.title || "",
            derivedNovelUrl: derivedNovelUrl || "",
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
    sendDetectedPayload(seriesId, novelName, novelUrl, chapter, confident);
  }

  function sendDetectedPayload(seriesId, novelName, novelUrl, chapter, confident) {
    const finalSeriesId = seriesId || buildSeriesIdFromName(novelName || cleanHost(location.href), cleanHost(location.href));
    const dedupeSignature = `${finalSeriesId}::${chapter}::${location.href}::${confident ? "1" : "0"}`;
    if (dedupeSignature === lastSentKey) return;

    lastSentKey = dedupeSignature;
    lastCapturedUrl = location.href;
    if (chapter !== "AUTO_NEXT") {
      lastCapturedChapterForPrevUrl = String(chapter);
    }
    retryCount = 0;
    stopBodyObserver();

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
          lastCapturedChapterForPrevUrl = resolvedChapter;

          if (typeof res.restoreScrollPct === "number" && res.restoreScrollPct > 0) {
            restoreScrollPosition(res.restoreScrollPct, `${res.seriesId}::${resolvedChapter}`);
          }
        }
      })
      .catch(() => {});
  }

  function triggerNavigationDetection() {
    retryCount = 0;
    clearTimeout(debounceTimer);
    clearTimeout(retryTimer);
    startTemporaryBodyObserver();
    debounceTimer = setTimeout(evaluatePage, 600);
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

  setInterval(() => {
    if (location.href !== lastCheckedHref) {
      lastCheckedHref = location.href;
      triggerNavigationDetection();
    }
  }, 1500);

  triggerNavigationDetection();
})();