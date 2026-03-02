const siteRoot = document.documentElement.dataset.siteRoot || ".";

function joinFromRoot(path = "") {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  const normalized = path.replace(/^\.?\//, "");
  return `${siteRoot}/${normalized}`.replace(/([^:]\/)\/+/g, "$1");
}

export async function loadJson(path) {
  const response = await fetch(joinFromRoot(path));
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

export function resolveMediaPath(file) {
  return joinFromRoot(file);
}

export function setActiveNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const target = link.getAttribute("href")?.split("/").pop();
    if (target === current) link.classList.add("active");
  });
}

export function createTag(label, variant = "") {
  const span = document.createElement("span");
  span.className = variant ? `tag ${variant}` : "tag";
  span.textContent = label;
  return span;
}

export function createStatus(label, variant = "") {
  const span = document.createElement("span");
  span.className = variant ? `status-pill ${variant}` : "status-pill";
  span.textContent = label;
  return span;
}

export function createNav() {
  return `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">This is a lesson 14 book</span>
        <div class="brand-title">大家的日本語 第十四課複習系統</div>
      </div>
      <nav class="nav">
        <a data-nav href="${siteRoot}/index.html">首頁</a>
        <a data-nav href="${siteRoot}/pages/vocab.html">單字</a>
        <a data-nav href="${siteRoot}/pages/practice-a.html">練習A</a>
        <a data-nav href="${siteRoot}/pages/content.html">內容</a>
        <a data-nav href="${siteRoot}/pages/index-map.html">索引</a>
      </nav>
    </header>
  `;
}

export function createHero({ eyebrow, title, lead, metrics = [], aside = "" }) {
  return `
    <section class="hero">
      <div class="eyebrow">${eyebrow}</div>
      <div class="hero-grid">
        <div class="section-heading">
          <h1>${title}</h1>
          <p class="lead">${lead}</p>
          <div class="hero-metrics">
            ${metrics.map((item) => `<span class="pill">${item}</span>`).join("")}
          </div>
        </div>
        <div class="card">
          ${aside}
        </div>
      </div>
    </section>
  `;
}

export function formatTime(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "--:--";
  const total = Math.max(0, Math.floor(Number(seconds)));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function byId(items, id) {
  return items.find((item) => item.id === id);
}

export function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}
