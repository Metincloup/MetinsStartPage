/* =========================================================
   Browser Home Page — full build
   See SPEC.md for the full spec.
   ========================================================= */

"use strict";

/* ---- Persisted state ----------------------------------- */
// Tiny localStorage wrapper, all keys namespaced under "hp.".
const store = {
  get(key, fallback) {
    const raw = localStorage.getItem("hp." + key);
    return raw === null ? fallback : JSON.parse(raw);
  },
  set(key, value) {
    localStorage.setItem("hp." + key, JSON.stringify(value));
  },
};

/* ---- File store (IndexedDB) ---------------------------- */
// localStorage can't hold a video, so uploaded backgrounds live here.
const FileStore = {
  _db: null,
  _open() {
    return new Promise((resolve, reject) => {
      if (this._db) return resolve(this._db);
      const req = indexedDB.open("hp-files", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onsuccess = () => resolve((this._db = req.result));
      req.onerror = () => reject(req.error);
    });
  },
  async set(key, blob) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async get(key) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const req = db
        .transaction("files", "readonly")
        .objectStore("files")
        .get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },
  async del(key) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

/* ---- Central settings store ---------------------------- */
// Single source of truth. Components read with get(), write with set(),
// and react to changes via onChange() — so the settings menu and the
// inline controls (clock click, engine icons, theme button) stay in sync.
const Settings = {
  defaults: {
    theme: "dark",
    clockFormat: "12",
    clockStyle: "minimal",
    clockColorMode: "theme",
    clockColor: "#7aa2f7",
    clockOpacity: 100,
    clockGlassTint: "neutral",
    clockBlur: 0,
    engine: "google",
    fontClock: "system",
    fontSearch: "system",
    fontCards: "system",
    bgType: "waves",
    bgColor: "#14161a",
    bgImageUrl: "",
    bgImageMode: "url",
    bgVideoUrl: "",
    bgVideoMode: "url",
    bgBlur: 0,
    // `categories` default is attached below, after DEFAULT_CATEGORIES exists.
  },
  values: {},

  load() {
    for (const key of Object.keys(this.defaults)) {
      this.values[key] = store.get(key, this.defaults[key]);
    }
  },

  get(key) {
    return this.values[key];
  },

  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    store.set(key, value);
    document.dispatchEvent(
      new CustomEvent("settingchange", { detail: { key, value } })
    );
  },

  reset() {
    for (const key of Object.keys(this.defaults)) {
      this.set(key, this.defaults[key]);
    }
  },

  onChange(key, handler) {
    document.addEventListener("settingchange", (e) => {
      if (e.detail.key === key) handler(e.detail.value);
    });
  },
};

/* ---- Data ---------------------------------------------- */
// Search engines. Web engines use `query` (%s -> input); the category
// entry uses `mode: "category"` to search within the category cards.
const ENGINES = [
  { id: "google", label: "G", color: "#4285f4", name: "Google",
    query: "https://www.google.com/search?q=%s" },
  { id: "ddg", label: "D", color: "#de5833", name: "DuckDuckGo",
    query: "https://duckduckgo.com/?q=%s" },
  { id: "bing", label: "b", color: "#008373", name: "Bing",
    query: "https://www.bing.com/search?q=%s" },
  { id: "categories", label: "▦", color: "#9d7cd8", name: "Categories",
    mode: "category" },
];

// Custom site "!bangs" — most-used ones (DuckDuckGo style). Typed in a
// web-engine mode: "!yt cats" -> YouTube search for "cats".
const BANGS = {
  g:    { name: "Google",        url: "https://www.google.com/search?q=%s" },
  ddg:  { name: "DuckDuckGo",    url: "https://duckduckgo.com/?q=%s" },
  b:    { name: "Bing",          url: "https://www.bing.com/search?q=%s" },
  yt:   { name: "YouTube",       url: "https://www.youtube.com/results?search_query=%s" },
  w:    { name: "Wikipedia",     url: "https://en.wikipedia.org/w/index.php?search=%s" },
  gh:   { name: "GitHub",        url: "https://github.com/search?q=%s" },
  so:   { name: "Stack Overflow",url: "https://stackoverflow.com/search?q=%s" },
  r:    { name: "Reddit",        url: "https://www.reddit.com/search/?q=%s" },
  a:    { name: "Amazon",        url: "https://www.amazon.com/s?k=%s" },
  tw:   { name: "X / Twitter",   url: "https://twitter.com/search?q=%s" },
  maps: { name: "Google Maps",   url: "https://www.google.com/maps/search/%s" },
  img:  { name: "Google Images", url: "https://www.google.com/search?tbm=isch&q=%s" },
  npm:  { name: "npm",           url: "https://www.npmjs.com/search?q=%s" },
  mdn:  { name: "MDN",           url: "https://developer.mozilla.org/en-US/search?q=%s" },
  tr:   { name: "Translate",     url: "https://translate.google.com/?op=translate&text=%s" },
};

// Font stacks for the per-component Fonts settings (no web fonts needed).
const FONTS = {
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "Cascadia Code", Consolas, monospace',
  rounded: 'ui-rounded, "Trebuchet MS", "Segoe UI", sans-serif',
};

// Tint palette for the "glass" clock style. `tint` (low alpha) colours the
// glass; `swatch` (solid) is the visible colour in the settings palette.
const CLOCK_TINTS = [
  { id: "neutral", tint: "rgba(255, 255, 255, 0.07)", swatch: "#cfd3da" },
  { id: "blue",    tint: "rgba(122, 162, 247, 0.18)", swatch: "#7aa2f7" },
  { id: "purple",  tint: "rgba(157, 124, 216, 0.18)", swatch: "#9d7cd8" },
  { id: "teal",    tint: "rgba(86, 196, 188, 0.18)",  swatch: "#56c4bc" },
  { id: "pink",    tint: "rgba(230, 140, 180, 0.18)", swatch: "#e68cb4" },
  { id: "amber",   tint: "rgba(240, 190, 110, 0.18)", swatch: "#f0be6e" },
];

// Initial category seed. Users can add/remove/edit categories and items
// via the settings editor; the live list is `Settings.get("categories")`.
// `hidden: true` cards are not shown on the page but ARE searchable in
// category mode (spec: "show visible or hidden categories").
const DEFAULT_CATEGORIES = [
  {
    title: "Work",
    items: [
      { icon: "🌐", name: "Google", url: "https://google.com" },
      { icon: "✉️", name: "Mail", url: "https://mail.google.com" },
      { icon: "☑️", name: "XY", url: "https://example.com" },
    ],
  },
  {
    title: "Social",
    items: [
      { icon: "▶️", name: "YouTube", url: "https://youtube.com" },
      { icon: "🐦", name: "Twitter", url: "https://twitter.com" },
      { icon: "👤", name: "Facebook", url: "https://facebook.com" },
    ],
  },
  {
    title: "Tech",
    items: [
      { icon: "🐙", name: "GitHub", url: "https://github.com" },
      { icon: "✨", name: "Gemini", url: "https://gemini.google.com" },
      { icon: "🤖", name: "ChatGPT", url: "https://chat.openai.com" },
      { icon: "📚", name: "Stack Overflow", url: "https://stackoverflow.com" },
      { icon: "📖", name: "MDN", url: "https://developer.mozilla.org" },
      { icon: "📦", name: "npm", url: "https://npmjs.com" },
    ],
  },
  {
    title: "Hidden",
    hidden: true,
    items: [
      { icon: "🔒", name: "Secret Notes", url: "https://keep.google.com" },
      { icon: "🗄️", name: "Archive", url: "https://web.archive.org" },
    ],
  },
];

// Attach the categories default now that DEFAULT_CATEGORIES exists
// (the `Settings` object literal above is evaluated before this line,
// so it can't reference DEFAULT_CATEGORIES inline — TDZ).
Settings.defaults.categories = DEFAULT_CATEGORIES;

const engineById = (id) => ENGINES.find((e) => e.id === id) || ENGINES[0];

// Flatten every category item into a searchable list (hidden ones too),
// each tagged with its category title.
function flattenItems() {
  const out = [];
  Settings.get("categories").forEach((cat) => {
    cat.items.forEach((item) => out.push({ ...item, category: cat.title }));
  });
  return out;
}

// Hostname of a URL (for favicons), or "" if it can't be parsed.
function domainOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// Hex colour (#rrggbb from <input type="color">) + alpha (0-1) -> rgba().
function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Fill an element with a category item's icon: the site's real favicon
// (via DuckDuckGo's service), falling back to the emoji if it fails.
function applyItemIcon(el, item) {
  el.textContent = "";
  const domain = domainOf(item.url);
  if (!domain) {
    el.textContent = item.icon || "•";
    return;
  }
  const img = document.createElement("img");
  img.className = "item-favicon";
  img.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
  img.alt = "";
  img.loading = "lazy";
  img.addEventListener("error", () => {
    el.textContent = item.icon || "•";
  });
  el.appendChild(img);
}

// Split a "!token rest" string. `committed` is true once a space follows
// the token (meaning the token is locked in).
function splitBang(q) {
  const m = q.slice(1).match(/^(\S*)(\s+)?(.*)$/);
  return { token: m[1] || "", committed: Boolean(m[2]), rest: m[3] || "" };
}

/* ---- Theme (dark / light) ------------------------------ */
function initTheme() {
  const root = document.documentElement;
  const apply = (theme) => root.setAttribute("data-theme", theme);

  apply(Settings.get("theme"));
  Settings.onChange("theme", apply);

  document.getElementById("themeBtn").addEventListener("click", () => {
    Settings.set("theme", Settings.get("theme") === "dark" ? "light" : "dark");
  });
}

/* ---- Clock (format / style / colour / blur) ------------ */
function initClock() {
  const el = document.getElementById("clockTime");
  const panel = document.getElementById("settingsPanel");

  function render() {
    const now = new Date();
    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, "0");

    if (Settings.get("clockFormat") === "24") {
      el.textContent = `${String(h).padStart(2, "0")}:${m}`;
    } else {
      const period = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      el.textContent = `${h}:${m} ${period}`;
    }
  }

  const applyStyle = (style) => {
    el.className = "clock-time clock-time--" + style;
  };

  // Custom colour feeds the --clock-color var, which every clock style uses.
  // Colour (hex) + opacity slider are combined into an rgba() value.
  const applyColor = () => {
    if (Settings.get("clockColorMode") === "custom") {
      const rgba = hexToRgba(
        Settings.get("clockColor"),
        Number(Settings.get("clockOpacity")) / 100
      );
      el.style.setProperty("--clock-color", rgba);
    } else {
      el.style.removeProperty("--clock-color"); // fall back to the theme colour
    }
  };

  // Blur: 0-100% -> 0-20px.
  const applyBlur = () => {
    const px = (Number(Settings.get("clockBlur")) / 100) * 20;
    el.style.filter = px > 0 ? `blur(${px}px)` : "";
  };

  // Conditional rows: data-clock-opt="settingKey:value" shows the row
  // only while that setting holds that value.
  function syncOptVisibility() {
    panel.querySelectorAll(".clock-opt").forEach((row) => {
      const [key, value] = row.dataset.clockOpt.split(":");
      row.style.display = Settings.get(key) === value ? "flex" : "none";
    });
  }

  document.getElementById("clock").addEventListener("click", () => {
    Settings.set(
      "clockFormat",
      Settings.get("clockFormat") === "24" ? "12" : "24"
    );
  });

  /* custom colour picker */
  const colorInput = panel.querySelector('[data-clock-input="color"]');
  colorInput.value = Settings.get("clockColor");
  colorInput.addEventListener("input", () =>
    Settings.set("clockColor", colorInput.value)
  );
  Settings.onChange("clockColor", (v) => {
    if (colorInput.value !== v) colorInput.value = v;
  });

  /* colour opacity slider */
  const opacityInput = panel.querySelector('[data-clock-input="opacity"]');
  const opacityValue = panel.querySelector('[data-clock-range-value="opacity"]');
  const syncOpacityUI = (v) => {
    if (Number(opacityInput.value) !== v) opacityInput.value = v;
    opacityValue.textContent = v + "%";
  };
  opacityInput.addEventListener("input", () =>
    Settings.set("clockOpacity", Number(opacityInput.value))
  );
  Settings.onChange("clockOpacity", syncOpacityUI);
  syncOpacityUI(Settings.get("clockOpacity"));

  /* blur slider */
  const blurInput = panel.querySelector('[data-clock-input="blur"]');
  const blurValue = panel.querySelector('[data-clock-range-value="blur"]');
  const syncBlurUI = (v) => {
    if (Number(blurInput.value) !== v) blurInput.value = v;
    blurValue.textContent = v + "%";
  };
  blurInput.addEventListener("input", () =>
    Settings.set("clockBlur", Number(blurInput.value))
  );
  Settings.onChange("clockBlur", syncBlurUI);
  syncBlurUI(Settings.get("clockBlur"));

  /* glass tint palette */
  const palette = panel.querySelector("#clockTintPalette");
  CLOCK_TINTS.forEach((tint) => {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "swatch";
    sw.dataset.tint = tint.id;
    sw.style.background = tint.swatch;
    sw.title = tint.id;
    sw.setAttribute("aria-label", "Glass tint: " + tint.id);
    sw.addEventListener("click", () => Settings.set("clockGlassTint", tint.id));
    palette.appendChild(sw);
  });
  const applyGlassTint = () => {
    const tint =
      CLOCK_TINTS.find((t) => t.id === Settings.get("clockGlassTint")) ||
      CLOCK_TINTS[0];
    el.style.setProperty("--clock-glass-tint", tint.tint);
    palette.querySelectorAll(".swatch").forEach((sw) => {
      sw.classList.toggle("active", sw.dataset.tint === tint.id);
    });
  };

  Settings.onChange("clockFormat", render);
  Settings.onChange("clockStyle", applyStyle);
  Settings.onChange("clockStyle", syncOptVisibility);
  Settings.onChange("clockColorMode", applyColor);
  Settings.onChange("clockColorMode", syncOptVisibility);
  Settings.onChange("clockColor", applyColor);
  Settings.onChange("clockOpacity", applyColor);
  Settings.onChange("clockGlassTint", applyGlassTint);
  Settings.onChange("clockBlur", applyBlur);

  applyStyle(Settings.get("clockStyle"));
  applyColor();
  applyGlassTint();
  applyBlur();
  syncOptVisibility();
  render();
  setInterval(render, 1000);
}

/* ---- Search bar (web engines + bangs + category mode) -- */
function initSearch() {
  const enginesEl = document.getElementById("engines");
  const input = document.getElementById("searchInput");
  const form = document.getElementById("searchForm");
  const sugEl = document.getElementById("suggestions");

  let suggestions = []; // current suggestion objects
  let activeIdx = 0; // highlighted suggestion

  // The *active* engine is session-only: it starts at the saved default
  // and can be switched momentarily (icon click / Alt+number) without
  // touching the persisted default. A reload resets it to the default.
  let activeEngineId = engineById(Settings.get("engine")).id;
  const activeEngine = () => engineById(activeEngineId);
  const isCategoryMode = () => activeEngine().mode === "category";

  function setActiveEngine(id) {
    activeEngineId = engineById(id).id;
    syncEngineUI();
  }

  /* --- engine icon buttons --- */
  ENGINES.forEach((engine, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "engine-btn";
    btn.dataset.id = engine.id;
    btn.textContent = engine.label;
    btn.style.background = engine.color;
    btn.style.setProperty("--ring", engine.color);
    btn.title = `${engine.name}  (Shift+${i + 1})`;
    btn.setAttribute("aria-label", `Search with ${engine.name}`);
    btn.addEventListener("click", () => {
      setActiveEngine(engine.id); // momentary — leaves the default untouched
      input.focus();
    });
    enginesEl.appendChild(btn);
  });

  function syncEngineUI() {
    const active = activeEngine();
    input.placeholder = isCategoryMode()
      ? "Search categories…  (try !tech)"
      : `Search on ${active.name}…  (try !yt, !gh …)`;
    enginesEl.querySelectorAll(".engine-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.id === active.id);
    });
    refresh(); // re-evaluate suggestions for the new mode
  }

  /* --- suggestions: category mode --- */
  function getCategorySuggestions(q) {
    if (q.startsWith("!")) {
      const { token, committed, rest } = splitBang(q);
      // Still typing the category name -> suggest category names.
      if (!committed) {
        const t = token.toLowerCase();
        return Settings.get("categories")
          .filter((c) => c.title.toLowerCase().includes(t))
          .map((c) => ({ type: "scope", category: c.title }));
      }
      // Category chosen -> items in it, filtered by the rest.
      const t = token.toLowerCase();
      let items = flattenItems().filter((it) =>
        it.category.toLowerCase().includes(t)
      );
      const needle = rest.trim().toLowerCase();
      if (needle) {
        items = items.filter((it) => it.name.toLowerCase().includes(needle));
      }
      return items.slice(0, 8).map((it) => ({ type: "item", ...it }));
    }
    // No bang -> match every item by text.
    const needle = q.trim().toLowerCase();
    let items = flattenItems();
    if (needle) {
      items = items.filter((it) => it.name.toLowerCase().includes(needle));
    }
    return items.slice(0, 8).map((it) => ({ type: "item", ...it }));
  }

  /* --- suggestions: web mode (site bangs) --- */
  function getBangSuggestions(q) {
    if (!q.startsWith("!")) return []; // plain queries show no dropdown
    const { token, committed, rest } = splitBang(q);
    const t = token.toLowerCase();

    // Still typing the bang -> list matching bangs.
    if (!committed) {
      return Object.keys(BANGS)
        .filter(
          (key) =>
            key.startsWith(t) || BANGS[key].name.toLowerCase().includes(t)
        )
        .slice(0, 8)
        .map((key) => ({ type: "banglist", key, name: BANGS[key].name }));
    }
    // Bang chosen -> one "execute" row (if it's a known bang).
    if (!BANGS[t]) return [];
    return [{ type: "bang", key: t, name: BANGS[t].name, query: rest }];
  }

  function getSuggestions(raw) {
    const q = raw.trimStart();
    return isCategoryMode()
      ? getCategorySuggestions(q)
      : getBangSuggestions(q);
  }

  /* --- suggestion rendering --- */
  function setActive(idx) {
    if (suggestions.length === 0) return;
    activeIdx = (idx + suggestions.length) % suggestions.length;
    [...sugEl.children].forEach((li, i) => {
      li.classList.toggle("active", i === activeIdx);
    });
    sugEl.children[activeIdx]?.scrollIntoView({ block: "nearest" });
  }

  function renderSuggestions() {
    sugEl.textContent = "";
    if (suggestions.length === 0) {
      sugEl.hidden = true;
      return;
    }

    suggestions.forEach((s, i) => {
      const li = document.createElement("li");
      li.className = "suggestion";
      li.setAttribute("role", "option");

      const icon = document.createElement("span");
      icon.className = "s-icon";
      const name = document.createElement("span");
      name.className = "s-name";
      const cat = document.createElement("span");
      cat.className = "s-cat";

      if (s.type === "scope") {
        icon.textContent = "▦";
        name.textContent = s.category;
        cat.textContent = "filter";
      } else if (s.type === "banglist") {
        icon.textContent = "!";
        name.textContent = "!" + s.key;
        cat.textContent = s.name;
      } else if (s.type === "bang") {
        icon.textContent = "↵";
        name.textContent = s.query.trim()
          ? `Search ${s.name} for “${s.query.trim()}”`
          : `Go to ${s.name}`;
        cat.textContent = "bang";
      } else {
        applyItemIcon(icon, s);
        name.textContent = s.name;
        cat.textContent = s.category;
      }

      li.append(icon, name, cat);
      li.addEventListener("mouseenter", () => setActive(i));
      li.addEventListener("click", () => choose(s));
      sugEl.appendChild(li);
    });

    sugEl.hidden = false;
    setActive(0);
  }

  /* --- act on a suggestion --- */
  function choose(s) {
    if (s.type === "scope") {
      input.value = "!" + s.category + " ";
      input.focus();
      refresh();
    } else if (s.type === "banglist") {
      input.value = "!" + s.key + " ";
      input.focus();
      refresh();
    } else if (s.type === "bang") {
      const bang = BANGS[s.key];
      const q = s.query.trim();
      window.location.href = q
        ? bang.url.replace("%s", encodeURIComponent(q))
        : new URL(bang.url).origin;
    } else {
      window.location.href = s.url;
    }
  }

  // Recompute suggestions from the current input + mode.
  function refresh() {
    if (input.value.trim() === "") {
      suggestions = [];
      renderSuggestions();
      return;
    }
    suggestions = getSuggestions(input.value);
    activeIdx = 0;
    renderSuggestions();
  }

  function closeSuggestions() {
    suggestions = [];
    sugEl.hidden = true;
    sugEl.textContent = "";
  }

  /* --- events --- */
  input.addEventListener("input", refresh);

  input.addEventListener("keydown", (e) => {
    if (sugEl.hidden) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIdx + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(activeIdx - 1);
    } else if (e.key === "Escape") {
      closeSuggestions();
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = input.value.trim();
    if (!raw) return;

    // A highlighted suggestion (category item / scope / bang) wins.
    if (suggestions.length > 0) {
      choose(suggestions[activeIdx]);
      return;
    }
    // Category mode with nothing matched: do nothing.
    if (isCategoryMode()) return;
    // Plain web search with the active engine.
    const url = activeEngine().query;
    window.location.href = url.replace("%s", encodeURIComponent(raw));
  });

  // Close the dropdown when clicking outside the search area.
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search")) closeSuggestions();
  });

  // Changing the *default* (settings radio) also switches the active engine.
  Settings.onChange("engine", setActiveEngine);

  // Shift + 1-4 momentarily switches the search engine (does not persist).
  // Ignored while the search box is focused, so Shift+1 can still type "!"
  // for bangs and the user can type @, #, $ normally.
  document.addEventListener("keydown", (e) => {
    if (!e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target === input) return;
    const m = e.code.match(/^Digit([1-9])$/);
    if (!m) return;
    const idx = Number(m[1]) - 1;
    if (idx >= ENGINES.length) return;
    e.preventDefault();
    setActiveEngine(ENGINES[idx].id);
    input.focus();
  });

  syncEngineUI();
}

/* ---- Category cards ------------------------------------ */
function initCategories() {
  const root = document.getElementById("categories");

  function render() {
    root.textContent = "";
    // Hidden categories are searchable but not shown as cards.
    Settings.get("categories")
      .filter((c) => !c.hidden)
      .forEach((category) => {
        const card = document.createElement("article");
        card.className = "cat-card";

        const title = document.createElement("h2");
        title.className = "cat-title";
        title.textContent = category.title;
        card.appendChild(title);

        const list = document.createElement("div");
        list.className = "cat-items";
        // Scrollable when a card holds many items (spec: > 4-5).
        if (category.items.length > 5) list.classList.add("cat-items--scroll");

        category.items.forEach((item) => {
          const link = document.createElement("a");
          link.className = "cat-item";
          link.href = item.url || "#";

          const icon = document.createElement("span");
          icon.className = "item-icon";
          applyItemIcon(icon, item);
          link.appendChild(icon);

          const name = document.createElement("span");
          name.className = "item-name";
          name.textContent = item.name;
          link.appendChild(name);

          list.appendChild(link);
        });

        card.appendChild(list);
        root.appendChild(card);
      });
  }

  Settings.onChange("categories", render);
  render();
}

/* ---- Categories editor (add / remove / edit in settings) - */
function initCategoriesEditor() {
  const editor = document.getElementById("categoryEditor");
  const addBtn = document.getElementById("addCategoryBtn");

  // Structural changes rebuild the editor DOM; inline text edits don't
  // (the input already shows what the user just typed, and rebuilding
  // would steal focus from neighbouring fields).
  let suppressRebuild = false;

  // Which categories are expanded (open) in the accordion. Indices into
  // the categories array; default collapsed. Adjusted across reorders.
  let expanded = new Set();

  function update(updater) {
    const next = structuredClone(Settings.get("categories"));
    updater(next);
    Settings.set("categories", next);
  }
  function silentUpdate(updater) {
    suppressRebuild = true;
    update(updater);
    suppressRebuild = false;
  }

  function makeIconBtn(label, title, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn icon-only";
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener("click", onClick);
    return btn;
  }

  // Two stacked move buttons (↑ / ↓). `disabled` is [upDisabled, downDisabled].
  function makeMoveColumn(disabled, onUp, onDown) {
    const col = document.createElement("div");
    col.className = "move-col";
    const up = document.createElement("button");
    up.type = "button";
    up.className = "btn move-btn";
    up.textContent = "▲";
    up.title = "Move up";
    if (disabled[0]) up.disabled = true;
    else up.addEventListener("click", onUp);
    const down = document.createElement("button");
    down.type = "button";
    down.className = "btn move-btn";
    down.textContent = "▼";
    down.title = "Move down";
    if (disabled[1]) down.disabled = true;
    else down.addEventListener("click", onDown);
    col.append(up, down);
    return col;
  }

  function render() {
    editor.textContent = "";

    const list = Settings.get("categories");
    list.forEach((cat, ci) => {
      const block = document.createElement("div");
      block.className = "cat-edit";
      if (!expanded.has(ci)) block.classList.add("collapsed");

      /* header: move, title, count, hidden, toggle, remove */
      const head = document.createElement("div");
      head.className = "cat-edit-head";

      const titleInput = document.createElement("input");
      titleInput.className = "text-input";
      titleInput.type = "text";
      titleInput.value = cat.title;
      titleInput.placeholder = "Title";
      titleInput.addEventListener("change", () =>
        silentUpdate((arr) => {
          arr[ci].title = titleInput.value;
        })
      );

      const hiddenLabel = document.createElement("label");
      hiddenLabel.className = "cat-edit-hidden";
      const hiddenInput = document.createElement("input");
      hiddenInput.type = "checkbox";
      hiddenInput.checked = !!cat.hidden;
      hiddenInput.addEventListener("change", () =>
        silentUpdate((arr) => {
          arr[ci].hidden = hiddenInput.checked;
        })
      );
      hiddenLabel.append(hiddenInput, document.createTextNode("Hidden"));

      const removeCatBtn = makeIconBtn("✕", "Remove category", () => {
        if (!confirm(`Remove category “${cat.title || "untitled"}”?`)) return;
        // Shift the expanded indices to match the new array.
        const next = new Set();
        expanded.forEach((i) => {
          if (i !== ci) next.add(i > ci ? i - 1 : i);
        });
        expanded = next;
        update((arr) => arr.splice(ci, 1));
      });

      const swapExpanded = (a, b) => {
        const wasA = expanded.has(a);
        const wasB = expanded.has(b);
        expanded.delete(a);
        expanded.delete(b);
        if (wasA) expanded.add(b);
        if (wasB) expanded.add(a);
      };

      const catMove = makeMoveColumn(
        [ci === 0, ci === list.length - 1],
        () => {
          swapExpanded(ci, ci - 1);
          update((arr) => {
            [arr[ci - 1], arr[ci]] = [arr[ci], arr[ci - 1]];
          });
        },
        () => {
          swapExpanded(ci, ci + 1);
          update((arr) => {
            [arr[ci], arr[ci + 1]] = [arr[ci + 1], arr[ci]];
          });
        }
      );

      const count = document.createElement("span");
      count.className = "item-count";
      count.textContent = String(cat.items.length);
      count.title = `${cat.items.length} item${cat.items.length === 1 ? "" : "s"}`;

      const toggleBtn = makeIconBtn("▾", "Toggle items", () => {
        if (expanded.has(ci)) expanded.delete(ci);
        else expanded.add(ci);
        block.classList.toggle("collapsed");
      });
      toggleBtn.classList.add("toggle-btn");

      head.append(catMove, titleInput, count, hiddenLabel, toggleBtn, removeCatBtn);
      block.appendChild(head);

      /* items */
      const itemsList = document.createElement("div");
      itemsList.className = "cat-edit-items";

      cat.items.forEach((item, ii) => {
        const row = document.createElement("div");
        row.className = "cat-edit-item";

        const fields = document.createElement("div");
        fields.className = "cat-edit-item-fields";

        const nameInput = document.createElement("input");
        nameInput.className = "text-input";
        nameInput.type = "text";
        nameInput.value = item.name;
        nameInput.placeholder = "Name";
        nameInput.addEventListener("change", () =>
          silentUpdate((arr) => {
            arr[ci].items[ii].name = nameInput.value;
          })
        );

        const urlInput = document.createElement("input");
        urlInput.className = "text-input";
        urlInput.type = "url";
        urlInput.value = item.url;
        urlInput.placeholder = "https://…";
        urlInput.addEventListener("change", () =>
          silentUpdate((arr) => {
            arr[ci].items[ii].url = urlInput.value;
          })
        );

        fields.append(nameInput, urlInput);

        const removeItemBtn = makeIconBtn("✕", "Remove item", () =>
          update((arr) => arr[ci].items.splice(ii, 1))
        );

        const itemMove = makeMoveColumn(
          [ii === 0, ii === cat.items.length - 1],
          () =>
            update((arr) => {
              const items = arr[ci].items;
              [items[ii - 1], items[ii]] = [items[ii], items[ii - 1]];
            }),
          () =>
            update((arr) => {
              const items = arr[ci].items;
              [items[ii], items[ii + 1]] = [items[ii + 1], items[ii]];
            })
        );

        row.append(itemMove, fields, removeItemBtn);
        itemsList.appendChild(row);
      });

      const addItemBtn = document.createElement("button");
      addItemBtn.type = "button";
      addItemBtn.className = "btn ghost";
      addItemBtn.textContent = "+ Add item";
      addItemBtn.addEventListener("click", () =>
        update((arr) =>
          arr[ci].items.push({ name: "New item", url: "" })
        )
      );

      const body = document.createElement("div");
      body.className = "cat-edit-body";
      body.append(itemsList, addItemBtn);
      block.appendChild(body);
      editor.appendChild(block);
    });
  }

  addBtn.addEventListener("click", () => {
    // Auto-expand the freshly added category so the user can fill items.
    const newIdx = Settings.get("categories").length;
    expanded.add(newIdx);
    update((arr) => arr.push({ title: "Untitled", items: [] }));
  });

  // Rebuild on structural changes / resets, not on inline text edits.
  Settings.onChange("categories", () => {
    if (!suppressRebuild) render();
  });

  render();
}

/* ---- Settings menu (40 / 60 split) --------------------- */
function initSettingsMenu() {
  const panel = document.getElementById("settingsPanel");

  /* open / close */
  const isOpen = () => document.body.classList.contains("settings-open");
  const open = () => {
    document.body.classList.add("settings-open");
    panel.setAttribute("aria-hidden", "false");
  };
  const close = () => {
    document.body.classList.remove("settings-open");
    panel.setAttribute("aria-hidden", "true");
  };

  document.getElementById("settingsBtn")
    .addEventListener("click", () => (isOpen() ? close() : open()));
  document.getElementById("settingsClose").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) close();
  });

  /* segmented controls — generic, driven by data-setting / data-value */
  panel.querySelectorAll(".seg").forEach((seg) => {
    const key = seg.dataset.setting;
    const sync = (value) => {
      seg.querySelectorAll(".seg-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.value === String(value));
      });
    };
    seg.querySelectorAll(".seg-btn").forEach((btn) => {
      btn.addEventListener("click", () => Settings.set(key, btn.dataset.value));
    });
    Settings.onChange(key, sync);
    sync(Settings.get(key));
  });

  /* dropdown selects — generic, driven by data-setting */
  panel.querySelectorAll(".select").forEach((sel) => {
    const key = sel.dataset.setting;
    sel.addEventListener("change", () => Settings.set(key, sel.value));
    Settings.onChange(key, (value) => {
      sel.value = value;
    });
    sel.value = Settings.get(key);
  });

  /* search-engine radio list — generated from ENGINES */
  const radios = document.getElementById("engineRadios");
  ENGINES.forEach((engine) => {
    const row = document.createElement("label");
    row.className = "radio-row";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "engine-setting";
    input.value = engine.id;
    input.addEventListener("change", () => Settings.set("engine", engine.id));

    const span = document.createElement("span");
    span.textContent = engine.name;

    row.append(input, span);
    radios.appendChild(row);
  });

  const syncEngineRadios = (value) => {
    radios.querySelectorAll("input").forEach((input) => {
      input.checked = input.value === value;
    });
  };
  Settings.onChange("engine", syncEngineRadios);
  syncEngineRadios(Settings.get("engine"));

  /* reset */
  document.getElementById("resetBtn").addEventListener("click", () => {
    Settings.reset();
    FileStore.del("bgImageBlob").catch(() => {});
    FileStore.del("bgVideoBlob").catch(() => {});
  });
}

/* ---- Per-component fonts (visual improvement #5) ------- */
function initFonts() {
  const root = document.documentElement;
  const map = {
    fontClock: "--font-clock",
    fontSearch: "--font-search",
    fontCards: "--font-cards",
  };
  for (const [key, cssVar] of Object.entries(map)) {
    const apply = (value) =>
      root.style.setProperty(cssVar, FONTS[value] || FONTS.system);
    apply(Settings.get(key));
    Settings.onChange(key, apply);
  }
}

/* ---- Cursor glow (visual improvement #8) --------------- */
function initCursorGlow() {
  const glow = document.getElementById("cursorGlow");
  let pending = false;
  let x = 0;
  let y = 0;

  window.addEventListener("mousemove", (e) => {
    x = e.clientX;
    y = e.clientY;
    document.body.classList.add("has-cursor");
    if (!pending) {
      pending = true;
      requestAnimationFrame(() => {
        glow.style.transform =
          `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        pending = false;
      });
    }
  });

  document.addEventListener("mouseleave", () => {
    document.body.classList.remove("has-cursor");
  });
}

/* ---- Background (waves / solid / image / video) -------- */
function initBackground() {
  const bg = document.getElementById("bg");
  const video = document.getElementById("bgVideo");
  const panel = document.getElementById("settingsPanel");
  const objectUrls = { image: null, video: null }; // tracked so we can revoke

  // Resolve the source for image/video: a typed URL, or an uploaded blob.
  async function resolveSource(kind) {
    const urlKey = kind === "image" ? "bgImageUrl" : "bgVideoUrl";
    const modeKey = kind === "image" ? "bgImageMode" : "bgVideoMode";
    const blobKey = kind === "image" ? "bgImageBlob" : "bgVideoBlob";

    if (Settings.get(modeKey) === "url") {
      return Settings.get(urlKey) || null;
    }
    let blob = null;
    try {
      blob = await FileStore.get(blobKey);
    } catch (e) {
      console.warn("Could not read uploaded background:", e);
    }
    if (!blob) return null;
    if (objectUrls[kind]) URL.revokeObjectURL(objectUrls[kind]);
    objectUrls[kind] = URL.createObjectURL(blob);
    return objectUrls[kind];
  }

  async function apply() {
    const type = Settings.get("bgType");
    bg.dataset.bg = type;
    bg.style.backgroundColor = "";
    bg.style.backgroundImage = "";

    if (type !== "video" && video.hasAttribute("src")) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    if (type === "solid") {
      bg.style.backgroundColor = Settings.get("bgColor");
    } else if (type === "image") {
      const src = await resolveSource("image");
      if (src) bg.style.backgroundImage = `url("${src}")`;
    } else if (type === "video") {
      const src = await resolveSource("video");
      if (src) {
        video.src = src;
        video.play().catch(() => {});
      }
    }

    // Blur applies to image / video backgrounds only (0-100% -> 0-40px).
    // No scale — that would visibly zoom the content; the blurred edges
    // just fade toward the body bg colour, which reads as a soft vignette.
    const blurPx = (Number(Settings.get("bgBlur")) / 100) * 40;
    bg.style.filter =
      (type === "image" || type === "video") && blurPx > 0
        ? `blur(${blurPx}px)`
        : "";
  }

  // Show only the sub-options relevant to the current type
  // (data-bg-opt may list several types, space-separated).
  function syncOptVisibility(type) {
    panel.querySelectorAll(".bg-opt").forEach((row) => {
      const types = row.dataset.bgOpt.split(" ");
      row.style.display = types.includes(type) ? "flex" : "none";
    });
  }

  /* colour picker */
  const colorInput = panel.querySelector('[data-bg-input="color"]');
  colorInput.value = Settings.get("bgColor");
  colorInput.addEventListener("input", () =>
    Settings.set("bgColor", colorInput.value)
  );
  Settings.onChange("bgColor", (v) => {
    if (colorInput.value !== v) colorInput.value = v;
  });

  /* blur slider (image / video backgrounds) */
  const blurInput = panel.querySelector('[data-bg-input="blur"]');
  const blurValue = panel.querySelector('[data-bg-range-value="blur"]');
  const syncBlurUI = (v) => {
    if (Number(blurInput.value) !== v) blurInput.value = v;
    blurValue.textContent = v + "%";
  };
  blurInput.addEventListener("input", () =>
    Settings.set("bgBlur", Number(blurInput.value))
  );
  Settings.onChange("bgBlur", syncBlurUI);
  syncBlurUI(Settings.get("bgBlur"));

  /* image + video: URL field + file upload */
  [
    { kind: "image", urlKey: "bgImageUrl", modeKey: "bgImageMode",
      blobKey: "bgImageBlob", label: "Upload image…" },
    { kind: "video", urlKey: "bgVideoUrl", modeKey: "bgVideoMode",
      blobKey: "bgVideoBlob", label: "Upload video…" },
  ].forEach(({ kind, urlKey, modeKey, blobKey, label }) => {
    const urlInput = panel.querySelector(`[data-bg-input="${kind}-url"]`);
    const fileBtn = panel.querySelector(`[data-bg-upload="${kind}"]`);
    const fileInput = panel.querySelector(`[data-bg-file="${kind}"]`);

    urlInput.value = Settings.get(urlKey);
    urlInput.addEventListener("change", () => {
      Settings.set(urlKey, urlInput.value.trim());
      Settings.set(modeKey, "url"); // a typed URL takes over as the source
    });
    Settings.onChange(urlKey, (v) => {
      if (urlInput.value !== v) urlInput.value = v;
    });

    fileBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        await FileStore.set(blobKey, file);
        Settings.set(modeKey, "upload");
        fileBtn.textContent = "✓ " + file.name;
        apply(); // mode may already be "upload" — re-apply explicitly
      } catch (e) {
        console.warn("Background upload failed:", e);
        fileBtn.textContent = "Upload failed — try a smaller file";
      }
      fileInput.value = "";
    });

    // Keep the button label in step with the active mode.
    const syncLabel = () => {
      fileBtn.textContent =
        Settings.get(modeKey) === "upload"
          ? "✓ Uploaded file — replace…"
          : label;
    };
    Settings.onChange(modeKey, syncLabel);
    syncLabel();
  });

  ["bgType", "bgColor", "bgImageUrl", "bgImageMode", "bgVideoUrl",
   "bgVideoMode", "bgBlur"]
    .forEach((key) => Settings.onChange(key, apply));
  Settings.onChange("bgType", syncOptVisibility);

  syncOptVisibility(Settings.get("bgType"));
  apply();
}

/* ---- Boot ---------------------------------------------- */
Settings.load();
initTheme();
initClock();
initFonts();
initSearch();
initCategories();
initSettingsMenu();
initCategoriesEditor();
initBackground();
initCursorGlow();
