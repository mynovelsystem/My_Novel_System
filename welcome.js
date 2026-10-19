// ============================================================================
// MYNOVELSYSTEM — ONBOARDING & WELCOME CONTROLLER (welcome.js)
// Manifest V3 Compliant • Strict CSP • Offline & Multi-Language Support
// ============================================================================

function initWelcomePage() {
  // 1. Resolve DOM Elements
  const btnLangEs = document.getElementById("btnLangEs");
  const btnLangEn = document.getElementById("btnLangEn");
  const shortcutPill = document.getElementById("shortcutCopyPill");
  const transferNavPill = document.getElementById("transferNavPill");
  const btnStartReading = document.getElementById("btnStartReading");

  // 2. Resolve initial language from synchronous state/fallback
  let currentLanguage = "es";
  try {
    if (typeof getCurrentLang === "function") {
      currentLanguage = getCurrentLang() || "es";
    }
  } catch {
    currentLanguage = "es";
  }

  // 3. Language switcher logic
  function updateLanguageButtons(lang) {
    if (btnLangEs && btnLangEn) {
      if (lang === "es") {
        btnLangEs.classList.add("active");
        btnLangEn.classList.remove("active");
      } else {
        btnLangEn.classList.add("active");
        btnLangEs.classList.remove("active");
      }
    }
  }

  function applyTranslations() {
    if (typeof applyI18nToDom === "function") {
      applyI18nToDom(document);
    }
    if (typeof t === "function") {
      document.title = t("welcome_page_title");
    }
    // Synchronize HTML document lang attribute
    document.documentElement.lang = currentLanguage;
    updateLanguageButtons(currentLanguage);
  }

  async function switchLanguage(lang) {
    if (lang !== "es" && lang !== "en") return;
    currentLanguage = lang;

    if (typeof setCurrentLang === "function") {
      setCurrentLang(lang);
    }

    applyTranslations();

    // Persist choice in chrome.storage.local if available
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        const { settings } = await chrome.storage.local.get(["settings"]);
        await chrome.storage.local.set({
          settings: {
            ...(settings || {}),
            language: lang
          }
        });
      }
    } catch (err) {
      console.warn("[MyNovelSystem Welcome] Could not save language preference:", err);
    }
  }

  // 4. Bind UI event listeners synchronously
  if (btnLangEs) {
    btnLangEs.addEventListener("click", () => switchLanguage("es"));
  }
  if (btnLangEn) {
    btnLangEn.addEventListener("click", () => switchLanguage("en"));
  }

  // 5. Setup Shortcut Copy Interaction (Click & Keyboard Enter/Space)
  async function copyShortcut() {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText("Alt+Shift+N");
      }
      const msg = typeof t === "function" ? t("welcome_copied_toast") : "¡Atajo Alt+Shift+N copiado!";
      showToast(msg);
    } catch {
      showToast("Alt + Shift + N");
    }
  }

  if (shortcutPill) {
    shortcutPill.addEventListener("click", copyShortcut);
    shortcutPill.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        copyShortcut();
      }
    });
  }

  // 5b. Setup Transfer Nav Pill Interaction (Smooth Scroll to Transfer Section)
  if (transferNavPill) {
    const scrollToTransfer = () => {
      const section = document.getElementById("transferSection");
      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        section.classList.remove("highlight-pulse");
        void section.offsetWidth;
        section.classList.add("highlight-pulse");
        setTimeout(() => {
          section.classList.remove("highlight-pulse");
        }, 2500);
      }
    };
    transferNavPill.addEventListener("click", scrollToTransfer);
    transferNavPill.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        scrollToTransfer();
      }
    });
  }

  // 6. Setup CTA Start Reading Action
  if (btnStartReading) {
    btnStartReading.addEventListener("click", () => {
      // Guide user to Step 1 (Pin extension)
      const guideSection = document.getElementById("guideSection");
      const step1Card = document.getElementById("step1Card");

      if (guideSection) {
        guideSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (step1Card) {
        step1Card.classList.remove("highlight-pulse");
        // Force reflow
        void step1Card.offsetWidth;
        step1Card.classList.add("highlight-pulse");
        setTimeout(() => {
          step1Card.classList.remove("highlight-pulse");
        }, 2500);
      }

      const pinHint = typeof t === "function"
        ? t("welcome_toast_pinned_hint")
        : "¡Fija el icono en la barra de Chrome 🧩📌 para comenzar!";
      showToast(pinHint);

      // Try opening extension popup if supported by the browser API
      try {
        if (typeof chrome !== "undefined" && chrome.action && typeof chrome.action.openPopup === "function") {
          chrome.action.openPopup().catch(() => {});
        }
      } catch {
        // Ignored
      }
    });
  }

  // 7. Toast Notification Utility
  function showToast(message) {
    let toast = document.getElementById("welcomeToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "welcomeToast";
      toast.className = "welcome-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");

    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove("show");
      toast._timer = null;
    }, 2500);
  }

  // 8. Reactive listener for language changes from storage (e.g. Popup settings)
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.settings?.newValue?.language) {
          const newLang = changes.settings.newValue.language;
          if (newLang !== currentLanguage && (newLang === "es" || newLang === "en")) {
            currentLanguage = newLang;
            if (typeof setCurrentLang === "function") setCurrentLang(newLang);
            applyTranslations();
          }
        }
      });
    }
  } catch (err) {
    console.warn("[MyNovelSystem Welcome] Storage onChanged listener error:", err);
  }

  // 9. Initial synchronous translation application (zero flicker)
  applyTranslations();

  // 10. Async init i18n to fetch locales and detect browser language
  (async () => {
    try {
      if (typeof initI18n === "function") {
        await initI18n();
        if (typeof getCurrentLang === "function") {
          currentLanguage = getCurrentLang() || "es";
        }
        applyTranslations();
      }
    } catch (err) {
      console.warn("[MyNovelSystem Welcome] Error initializing i18n:", err);
    }
  })();
}

// Ensure execution whether DOM is loading or already interactive/complete
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWelcomePage);
} else {
  initWelcomePage();
}
