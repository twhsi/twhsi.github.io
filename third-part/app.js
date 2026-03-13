const state = {
  data: null,
  filteredQuery: "",
  currentPath: null,
  graphFrame: null,
  graphDrag: null,
  graphFocusFn: null,
  contentViewByNote: new Map(),
  sessionRootByNote: new Map(),
};

const fileTreeEl = document.querySelector("#file-tree");
const noteTitleEl = document.querySelector("#note-title");
const noteMetaEl = document.querySelector("#note-meta");
const noteBodyEl = document.querySelector("#note-body");
const landingPanelEl = document.querySelector("#landing-panel");
const mandalaShellEl = document.querySelector("#mandala-shell");
const backlinksEl = document.querySelector("#backlinks");
const graphRootEl = document.querySelector("#graph-root");
const graphLegendEl = document.querySelector("#graph-legend");
const keywordNavEl = document.querySelector("#keyword-nav");
const searchInputEl = document.querySelector("#search-input");
const siteTitleEl = document.querySelector("#site-title");
const siteEyebrowEl = document.querySelector("#site-eyebrow");
const readerEyebrowEl = document.querySelector("#reader-eyebrow");
const sidebarToggleEl = document.querySelector("#sidebar-toggle");
const sidebarCloseEl = document.querySelector("#sidebar-close");
const sidebarBackdropEl = document.querySelector("#sidebar-backdrop");
const mobileMarkdownToggleEl = document.querySelector("#mobile-markdown-toggle");
const mobileMandalaToggleEl = document.querySelector("#mobile-mandala-toggle");

function isMobileViewport() {
  return window.matchMedia("(max-width: 820px)").matches;
}

function setSidebarOpen(isOpen) {
  document.body.classList.toggle("sidebar-open", isOpen);
}

function setupSidebarControls() {
  sidebarToggleEl?.addEventListener("click", () => setSidebarOpen(true));
  sidebarCloseEl?.addEventListener("click", () => setSidebarOpen(false));
  sidebarBackdropEl?.addEventListener("click", () => setSidebarOpen(false));
}

function setMobileViewButtons(note) {
  const currentView = state.contentViewByNote.get(note.path) || "9";
  mobileMarkdownToggleEl?.classList.toggle("active", currentView === "markdown");
  mobileMandalaToggleEl?.classList.toggle("active", currentView === "9");
}

function setupMobileViewControls() {
  mobileMarkdownToggleEl?.addEventListener("click", () => {
    if (!state.currentPath) return;
    state.contentViewByNote.set(state.currentPath, "markdown");
    navigateTo(state.currentPath);
  });

  mobileMandalaToggleEl?.addEventListener("click", () => {
    if (!state.currentPath) return;
    state.contentViewByNote.set(state.currentPath, "9");
    navigateTo(state.currentPath);
  });
}

async function loadData() {
  const response = await fetch(`./data/site-data.json?v=20260313d`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load site data. Run node scripts/build-site.mjs first.");
  }
  state.data = await response.json();
  const siteTitle = state.data.site?.title || state.data.sourceVault || "Vault";
  document.title = siteTitle;
  if (siteTitleEl) siteTitleEl.textContent = siteTitle;
  if (siteEyebrowEl) siteEyebrowEl.textContent = state.data.site?.eyebrow || "Vault";
  if (readerEyebrowEl) readerEyebrowEl.textContent = state.data.site?.description || "Publish-style Reader";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderInline(text) {
  let html = escapeHtml(text);

  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/(!)?\[\[([^\]]+)\]\]/g, (_, embed, rawTarget) => {
    const [targetPart, alias] = rawTarget.split("|");
    const note = resolveNote(targetPart.trim());
    if (embed) {
      if (!note) return "";
      return `<a href="#${encodeURIComponent(note.path)}" data-note-link="${escapeHtml(note.path)}">${escapeHtml(alias || note.title)}</a>`;
    }
    if (!note) {
      return `<span>${escapeHtml(alias || targetPart)}</span>`;
    }
    return `<a href="#${encodeURIComponent(note.path)}" data-note-link="${escapeHtml(note.path)}">${escapeHtml(alias || note.title)}</a>`;
  });

  return html;
}

function resolveNote(targetPath) {
  const normalized = targetPath.replace(/\\/g, "/").replace(/\.md$/i, "");
  return (
    state.data.notes.find((note) => note.path.replace(/\.md$/i, "") === normalized) ||
    state.data.notes.find((note) => note.basename.replace(/\.md$/i, "") === normalized) ||
    null
  );
}

function renderMarkdown(note) {
  const lines = note.content.split("\n");
  let html = "";
  let inList = false;
  let listType = null;
  let inTable = false;
  let tableHeaderDone = false;

  const closeList = () => {
    if (inList) {
      html += `</${listType}>`;
      inList = false;
      listType = null;
    }
  };

  const closeTable = () => {
    if (inTable) {
      html += "</tbody></table>";
      inTable = false;
      tableHeaderDone = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      closeList();
      closeTable();
      continue;
    }

    if (/^#{1,6}\s/.test(line)) {
      closeList();
      closeTable();
      const level = line.match(/^#+/)[0].length;
      html += `<h${level}>${renderInline(line.slice(level + 1).trim())}</h${level}>`;
      continue;
    }

    if (/^\|(.+)\|$/.test(line)) {
      closeList();
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      if (!inTable) {
        inTable = true;
        html += "<table>";
      }
      if (!tableHeaderDone) {
        html += "<thead><tr>";
        cells.forEach((cell) => {
          html += `<th>${renderInline(cell)}</th>`;
        });
        html += "</tr></thead><tbody>";
        tableHeaderDone = true;
      } else if (!cells.every((cell) => /^-+$/.test(cell.replace(/\s/g, "")))) {
        html += "<tr>";
        cells.forEach((cell) => {
          html += `<td>${renderInline(cell)}</td>`;
        });
        html += "</tr>";
      }
      continue;
    }

    closeTable();

    if (/^>\s?/.test(line)) {
      closeList();
      html += `<blockquote>${renderInline(line.replace(/^>\s?/, ""))}</blockquote>`;
      continue;
    }

    if (/^!\[\[.+\]\]$/.test(line)) {
      closeList();
      const rawTarget = line.match(/^!\[\[(.+)\]\]$/)[1];
      const [targetPart] = rawTarget.split("|");
      const asset = state.data.assets[targetPart] || state.data.assets[targetPart.split("/").pop()];
      if (asset) {
        html += `<p><img src="${asset}" alt="${escapeHtml(targetPart)}" loading="lazy" /></p>`;
      }
      continue;
    }

    const bulletMatch = line.match(/^(\d+\.\s+|[-*+]\s+)(.+)$/);
    if (bulletMatch) {
      const nextType = /^\d+\./.test(bulletMatch[1]) ? "ol" : "ul";
      if (!inList || listType !== nextType) {
        closeList();
        html += `<${nextType}>`;
        inList = true;
        listType = nextType;
      }
      const itemText = bulletMatch[2].replace(/^\[ \]\s*/, '<span class="check">[ ]</span>');
      html += `<li>${renderInline(itemText)}</li>`;
      continue;
    }

    closeList();
    html += `<p>${renderInline(line)}</p>`;
  }

  closeList();
  closeTable();
  return html;
}

function setActiveTreeButton() {
  document.querySelectorAll(".tree-note").forEach((button) => {
    button.classList.toggle("active", button.dataset.path === state.currentPath);
  });
}

function createTreeNode(node) {
  if (node.type === "note") {
    if (
      state.filteredQuery &&
      !node.name.toLowerCase().includes(state.filteredQuery) &&
      !node.path.toLowerCase().includes(state.filteredQuery)
    ) {
      return null;
    }
    const button = document.createElement("button");
    button.className = "tree-note";
    button.textContent = node.name;
    button.dataset.path = node.path;
    button.addEventListener("click", () => navigateTo(node.path));
    return button;
  }

  const group = document.createElement("div");
  group.className = "tree-group open";
  const folderButton = document.createElement("button");
  folderButton.className = "tree-folder";
  folderButton.innerHTML = `<span>${node.name}</span><span>${node.children.length}</span>`;
  folderButton.addEventListener("click", () => group.classList.toggle("open"));
  group.appendChild(folderButton);

  const childrenWrap = document.createElement("div");
  childrenWrap.className = "tree-children";
  let count = 0;
  node.children.forEach((child) => {
    const childNode = createTreeNode(child);
    if (childNode) {
      childrenWrap.appendChild(childNode);
      count += 1;
    }
  });

  if (!count && state.filteredQuery) {
    return null;
  }

  group.appendChild(childrenWrap);
  return group;
}

function renderTree() {
  fileTreeEl.innerHTML = "";
  state.data.tree.children.forEach((child) => {
    const node = createTreeNode(child);
    if (node) fileTreeEl.appendChild(node);
  });
  setActiveTreeButton();
}

function renderMeta(note) {
  const outgoing = note.links.length;
  const incoming = note.backlinks.length;
  const mode = note.mandala ? "mandala" : "note";
  noteMetaEl.innerHTML = `
    <span class="tag">${mode}</span>
    <span class="tag">${escapeHtml(note.folder || "root")}</span>
    <span class="tag">${outgoing} outgoing</span>
    <span class="tag">${incoming} backlinks</span>
  `;
}

function renderLandingPanel(note) {
  const featuredPath = state.data.site?.featuredPath || null;
  if (!landingPanelEl) return;
  if (note.path !== featuredPath) {
    landingPanelEl.hidden = true;
    landingPanelEl.innerHTML = "";
    return;
  }

  const primaryLinks = note.links
    .map((link) => state.data.notes.find((item) => item.path === link.target))
    .filter(Boolean)
    .slice(0, 4);

  landingPanelEl.hidden = false;
  landingPanelEl.innerHTML = `
    <div class="landing-eyebrow">${escapeHtml(state.data.site?.eyebrow || "Book")}</div>
    <h3 class="landing-title">${escapeHtml(state.data.site?.title || note.title)}</h3>
    <p class="landing-copy">
      左邊是入口與檔案樹，中間先看到第三部九宮，右邊則把關鍵字與 Local Graph 放在一起。這一頁現在就是你的 Obsidian Publish 風格首頁。
    </p>
    <div class="landing-grid">
      <div class="landing-card">
        <strong>閱讀方式</strong>
        <p>先看中心九宮，再點主線卡片進正文；如果想跨章節跳躍，就用右側關鍵字或 Graph。九宮是目錄，Markdown 是內文，Graph View 是索引。</p>
      </div>
      <div class="landing-links">
        ${primaryLinks
          .map(
            (linked) => `
              <button class="landing-link" type="button" data-note-jump="${escapeHtml(linked.path)}">
                <strong>${escapeHtml(linked.title)}</strong>
                <span>${escapeHtml(linked.preview)}</span>
              </button>`,
          )
          .join("")}
      </div>
    </div>
  `;

  landingPanelEl.querySelectorAll("[data-note-jump]").forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.noteJump));
  });
}

function parseMandalaSections(note) {
  const sectionRegex = /<!--section:\s*([^>]+)-->/g;
  const matches = [...note.content.matchAll(sectionRegex)];
  const sectionMap = new Map();

  matches.forEach((match, index) => {
    const slot = match[1].trim();
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? note.content.length;
    const raw = note.content.slice(start, end).trim();
    const cleaned = raw
      .replace(/^#+\s*/gm, "")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\n+/g, " ")
      .trim();
    const lines = cleaned.split(/(?<=[.!?。])/).map((line) => line.trim()).filter(Boolean);
    const firstLink = raw.match(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/);
    const target = firstLink ? resolveNote(firstLink[1].trim()) : null;
    sectionMap.set(slot, {
      slot,
      title: lines[0] || "Mandala slot",
      excerpt: lines.slice(1).join(" ").slice(0, 140) || "Empty section",
      targetPath: target?.path || null,
    });
  });

  return sectionMap;
}

function buildMandalaCard(slot, section, center = false, drill = "") {
  return `
    <button class="mandala-card ${center ? "center" : ""}" data-mandala-card data-focus="${escapeHtml(section?.targetPath || "")}" data-target="${escapeHtml(section?.targetPath || "")}" data-drill="${escapeHtml(drill)}" type="button">
      <div class="slot">${escapeHtml(slot)}</div>
      <h4>${escapeHtml(section?.title || "Empty slot")}</h4>
      <p>${escapeHtml(section?.excerpt || "Add section content in your Obsidian note to fill this cell.")}</p>
    </button>
  `;
}

function attachMandalaHandlers() {
  mandalaShellEl.querySelectorAll("[data-mandala-card]").forEach((card) => {
    const focusPath = card.dataset.focus || null;
    const targetPath = card.dataset.target || null;

    card.addEventListener("mouseenter", () => {
      if (focusPath && state.graphFocusFn) state.graphFocusFn(focusPath);
    });

    card.addEventListener("mouseleave", () => {
      if (state.graphFocusFn) state.graphFocusFn(null);
    });

    card.addEventListener("click", () => {
      const drillSlot = card.dataset.drill || "";
      if (drillSlot && drillSlot !== state.sessionRootByNote.get(state.currentPath)) {
        state.sessionRootByNote.set(state.currentPath, drillSlot);
        navigateTo(state.currentPath);
        return;
      }
      if (targetPath && targetPath !== state.currentPath) navigateTo(targetPath);
    });
  });

  mandalaShellEl.querySelectorAll("[data-content-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.contentView;
      if (!view || !state.currentPath) return;
      state.contentViewByNote.set(state.currentPath, view);
      navigateTo(state.currentPath);
    });
  });

}

function renderMandala(note) {
  if (!note.mandala) {
    mandalaShellEl.hidden = true;
    mandalaShellEl.innerHTML = "";
    noteBodyEl.hidden = false;
    return;
  }

  const sections = parseMandalaSections(note);
  if (!sections.size) {
    mandalaShellEl.hidden = true;
    mandalaShellEl.innerHTML = "";
    noteBodyEl.hidden = false;
    return;
  }

  const roots = [...sections.keys()].filter((slot) => /^\d+$/.test(slot)).sort((a, b) => Number(a) - Number(b));
  const defaultRoot = roots[0] || "1";
  const currentRoot = state.sessionRootByNote.get(note.path) || defaultRoot;
  const childSlots = [
    `${currentRoot}.1`,
    `${currentRoot}.2`,
    `${currentRoot}.3`,
    `${currentRoot}.4`,
    currentRoot,
    `${currentRoot}.5`,
    `${currentRoot}.6`,
    `${currentRoot}.7`,
    `${currentRoot}.8`,
  ];
  const defaultView = "9";
  const allowedViews = new Set(["markdown", "9"]);
  const selectedContentView = state.contentViewByNote.get(note.path) || defaultView;
  const resolvedContentView = allowedViews.has(selectedContentView) ? selectedContentView : defaultView;
  const parentRoot = currentRoot.includes(".") ? currentRoot.slice(0, currentRoot.lastIndexOf(".")) : "";

  mandalaShellEl.hidden = false;
  noteBodyEl.hidden = resolvedContentView !== "markdown";
  mandalaShellEl.innerHTML = `
    <div class="mandala-toolbar">
      <div class="mandala-switch">
        <button class="mandala-chip ${resolvedContentView === "markdown" ? "active" : ""}" data-content-view="markdown" type="button">Markdown</button>
        <button class="mandala-chip ${resolvedContentView === "9" ? "active" : ""}" data-content-view="9" type="button">九宮</button>
      </div>
      <div class="mandala-switch">
        ${parentRoot ? `<button class="mandala-chip" data-mandala-card data-drill="${escapeHtml(parentRoot)}" data-focus="" data-target="" type="button">← ${escapeHtml(parentRoot)}</button>` : ""}
        <span class="tag">Session ${escapeHtml(currentRoot)}</span>
      </div>
      <div class="mandala-hint">Hover 卡片可同步高亮右側 Graph；點擊卡片可進入連結筆記。</div>
    </div>
    ${
      resolvedContentView === "markdown"
        ? `<div class="mandala-empty">目前使用 Markdown 視圖，九宮卡片已隱藏。</div>`
        : `
    <div class="mandala-grid">
      ${childSlots
        .map((slot, index) => {
          const hasChildren = [...sections.keys()].some((key) => key.startsWith(`${slot}.`));
          const drill = hasChildren && slot !== currentRoot ? slot : "";
          return buildMandalaCard(slot, sections.get(slot), index === 4, drill);
        })
        .join("")}
    </div>
    `
    }
  `;
  attachMandalaHandlers();
}

function renderBacklinks(note) {
  backlinksEl.innerHTML = "";
  if (!note.backlinks.length) {
    backlinksEl.innerHTML = `<div class="backlink-item"><strong>No backlinks</strong><p>This note is currently isolated in the incoming direction.</p></div>`;
    return;
  }

  note.backlinks
    .map((path) => state.data.notes.find((item) => item.path === path))
    .filter(Boolean)
    .forEach((backlinkNote) => {
      const item = document.createElement("button");
      item.className = "backlink-item";
      item.innerHTML = `<strong>${escapeHtml(backlinkNote.title)}</strong><p>${escapeHtml(backlinkNote.preview)}</p>`;
      item.addEventListener("click", () => navigateTo(backlinkNote.path));
      backlinksEl.appendChild(item);
    });
}

function renderKeywordNavigator(note) {
  const linkedNotes = note.links
    .map((link) => state.data.notes.find((item) => item.path === link.target))
    .filter(Boolean);

  const groups = new Map();
  linkedNotes.forEach((linkedNote) => {
    const groupKey = linkedNote.folder.split("/")[0] || "其他";
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(linkedNote);
  });

  if (!groups.size) {
    keywordNavEl.innerHTML = `<div class="keyword-group"><h4>目前筆記</h4><div class="keyword-chips"><button class="keyword-chip" type="button" data-keyword-path="${escapeHtml(note.path)}">${escapeHtml(note.title)}</button></div></div>`;
  } else {
    keywordNavEl.innerHTML = [...groups.entries()]
      .map(
        ([groupName, items]) => `
          <div class="keyword-group">
            <h4>${escapeHtml(groupName)}</h4>
            <div class="keyword-chips">
              ${items
                .slice(0, 12)
                .map(
                  (item) =>
                    `<button class="keyword-chip" type="button" data-keyword-path="${escapeHtml(item.path)}">${escapeHtml(item.title)}</button>`,
                )
                .join("")}
            </div>
          </div>`,
      )
      .join("");
  }

  keywordNavEl.querySelectorAll("[data-keyword-path]").forEach((button) => {
    button.addEventListener("click", () => navigateTo(button.dataset.keywordPath));
  });
}

function applyColorGroup(notePath) {
  const groups = state.data.graphConfig.colorGroups || [];
  for (const group of groups) {
    const match = group.query.match(/path:"([^"]+)"/);
    if (match && notePath.startsWith(match[1])) {
      const hex = `#${group.color.rgb.toString(16).padStart(6, "0")}`;
      return hex;
    }
  }
  return null;
}

function buildLocalGraph(note) {
  const options = state.data.localGraphOptions || {};
  const maxDepth = Number.isFinite(options.localJumps) ? options.localJumps : 1;
  const includeBacklinks = options.localBacklinks !== false;
  const includeForelinks = options.localForelinks !== false;
  const visited = new Map([[note.path, 0]]);
  const queue = [note.path];

  while (queue.length) {
    const currentPath = queue.shift();
    const depth = visited.get(currentPath);
    if (depth >= maxDepth) continue;

    const current = state.data.notes.find((item) => item.path === currentPath);
    const nextPaths = [];
    if (includeForelinks) nextPaths.push(...current.links.map((link) => link.target));
    if (includeBacklinks) nextPaths.push(...current.backlinks);

    nextPaths.forEach((nextPath) => {
      if (!visited.has(nextPath)) {
        visited.set(nextPath, depth + 1);
        queue.push(nextPath);
      }
    });
  }

  const nodes = [...visited.entries()].map(([path, depth]) => {
    const graphNote = state.data.notes.find((item) => item.path === path);
    return {
      id: path,
      title: graphNote.title,
      depth,
      radius: path === note.path ? 11 : Math.max(4, 8 - depth * 2),
      color: path === note.path ? "var(--accent)" : applyColorGroup(path) || "var(--node)",
      x: 80 + Math.random() * 220,
      y: 80 + Math.random() * 220,
      vx: 0,
      vy: 0,
    };
  });

  const nodeMap = new Map(nodes.map((nodeItem) => [nodeItem.id, nodeItem]));
  const links = state.data.edges.filter(
    (edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target),
  );

  return { nodes, links };
}

function renderGraphLegend() {
  const groups = state.data.graphConfig.colorGroups || [];
  graphLegendEl.innerHTML = groups
    .map((group) => {
      const color = `#${group.color.rgb.toString(16).padStart(6, "0")}`;
      return `<span class="tag"><span style="display:inline-block;width:10px;height:10px;border-radius:999px;background:${color}"></span>${escapeHtml(group.query)}</span>`;
    })
    .join("");
}

function renderGraph(note) {
  if (state.graphFrame) cancelAnimationFrame(state.graphFrame);
  state.graphFocusFn = null;

  const { nodes, links } = buildLocalGraph(note);
  const nodeMap = new Map(nodes.map((nodeItem) => [nodeItem.id, nodeItem]));
  const neighborMap = new Map(nodes.map((nodeItem) => [nodeItem.id, new Set([nodeItem.id])]));
  links.forEach((link) => {
    neighborMap.get(link.source)?.add(link.target);
    neighborMap.get(link.target)?.add(link.source);
  });
  const width = graphRootEl.clientWidth || 340;
  const height = 420;
  const repelStrength = state.data.graphConfig.repelStrength || 10;
  const linkDistance = state.data.graphConfig.linkDistance || 250;
  const centerStrength = state.data.graphConfig.centerStrength || 0.4;
  const linkStrength = state.data.graphConfig.linkStrength || 1;
  const showArrow = state.data.graphConfig.showArrow === true;

  graphRootEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Local graph view">
      <defs>
        <marker id="graph-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.42)"></path>
        </marker>
      </defs>
      <g data-links></g>
      <g data-nodes></g>
      <g data-labels></g>
    </svg>
  `;

  const svg = graphRootEl.querySelector("svg");
  const linksLayer = svg.querySelector("[data-links]");
  const nodesLayer = svg.querySelector("[data-nodes]");
  const labelsLayer = svg.querySelector("[data-labels]");

  const linkElements = links.map(() => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "graph-link");
    if (showArrow) {
      line.setAttribute("marker-end", "url(#graph-arrow)");
    }
    linksLayer.appendChild(line);
    return line;
  });

  const nodeElements = nodes.map((nodeItem) => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "graph-node");
    circle.setAttribute("r", String(nodeItem.radius));
    circle.setAttribute("fill", nodeItem.color);
    circle.setAttribute("opacity", nodeItem.depth > 1 ? "0.45" : "0.95");
    circle.addEventListener("click", () => navigateTo(nodeItem.id));
    circle.addEventListener("mouseenter", () => applyGraphFocus(nodeItem.id));
    circle.addEventListener("mouseleave", () => applyGraphFocus(null));
    circle.addEventListener("pointerdown", (event) => {
      state.graphDrag = {
        id: nodeItem.id,
        pointerId: event.pointerId,
      };
      circle.setPointerCapture(event.pointerId);
    });
    circle.addEventListener("pointermove", (event) => {
      if (!state.graphDrag || state.graphDrag.id !== nodeItem.id) return;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const cursor = point.matrixTransform(svg.getScreenCTM().inverse());
      nodeItem.x = cursor.x;
      nodeItem.y = cursor.y;
      nodeItem.vx = 0;
      nodeItem.vy = 0;
      nodeItem.fx = cursor.x;
      nodeItem.fy = cursor.y;
    });
    circle.addEventListener("pointerup", () => {
      if (state.graphDrag?.id !== nodeItem.id) return;
      state.graphDrag = null;
      nodeItem.fx = null;
      nodeItem.fy = null;
    });
    circle.addEventListener("pointercancel", () => {
      if (state.graphDrag?.id !== nodeItem.id) return;
      state.graphDrag = null;
      nodeItem.fx = null;
      nodeItem.fy = null;
    });
    nodesLayer.appendChild(circle);
    return circle;
  });

  const labelElements = nodes.map((nodeItem) => {
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "graph-label");
    text.textContent = nodeItem.depth <= 1 ? nodeItem.title : "";
    labelsLayer.appendChild(text);
    return text;
  });

  const iterations = 180;
  let iteration = 0;

  const applyGraphFocus = (focusedId) => {
    const neighborhood = focusedId ? neighborMap.get(focusedId) ?? new Set([focusedId]) : null;
    nodes.forEach((nodeItem, index) => {
      const visible = !neighborhood || neighborhood.has(nodeItem.id);
      nodeElements[index].setAttribute("opacity", visible ? (nodeItem.depth > 1 ? "0.52" : "0.98") : "0.12");
      labelElements[index].setAttribute("opacity", visible ? (nodeItem.depth > 1 ? "0.4" : "1") : "0.08");
    });
    links.forEach((link, index) => {
      const visible = !focusedId || link.source === focusedId || link.target === focusedId;
      linkElements[index].setAttribute("stroke-opacity", visible ? "1" : "0.08");
    });
  };
  state.graphFocusFn = applyGraphFocus;

  const tick = () => {
    iteration += 1;

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSq = dx * dx + dy * dy + 0.01;
        const force = repelStrength / distanceSq;
        const fx = dx * force;
        const fy = dy * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    links.forEach((link) => {
      const source = nodes.find((nodeItem) => nodeItem.id === link.source);
      const target = nodes.find((nodeItem) => nodeItem.id === link.target);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = ((distance - Math.min(linkDistance, width * 0.5)) / distance) * 0.004 * linkStrength;
      const fx = dx * force;
      const fy = dy * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    nodes.forEach((nodeItem) => {
      if (nodeItem.fx != null && nodeItem.fy != null) {
        nodeItem.x = nodeItem.fx;
        nodeItem.y = nodeItem.fy;
      } else {
        nodeItem.vx += (width / 2 - nodeItem.x) * centerStrength * 0.0008;
        nodeItem.vy += (height / 2 - nodeItem.y) * centerStrength * 0.0008;
        nodeItem.x += nodeItem.vx;
        nodeItem.y += nodeItem.vy;
      }
      nodeItem.vx *= 0.82;
      nodeItem.vy *= 0.82;
      nodeItem.x = Math.max(22, Math.min(width - 22, nodeItem.x));
      nodeItem.y = Math.max(22, Math.min(height - 22, nodeItem.y));
    });

    links.forEach((link, index) => {
      const source = nodes.find((nodeItem) => nodeItem.id === link.source);
      const target = nodes.find((nodeItem) => nodeItem.id === link.target);
      const line = linkElements[index];
      line.setAttribute("x1", String(source.x));
      line.setAttribute("y1", String(source.y));
      line.setAttribute("x2", String(target.x));
      line.setAttribute("y2", String(target.y));
    });

    nodes.forEach((nodeItem, index) => {
      nodeElements[index].setAttribute("cx", String(nodeItem.x));
      nodeElements[index].setAttribute("cy", String(nodeItem.y));
      labelElements[index].setAttribute("x", String(nodeItem.x + 14));
      labelElements[index].setAttribute("y", String(nodeItem.y + 4));
      labelElements[index].setAttribute("fill", nodeItem.id === note.path ? "var(--accent)" : "var(--node)");
      labelElements[index].setAttribute("font-size", nodeItem.id === note.path ? "14" : "12");
      labelElements[index].setAttribute("opacity", nodeItem.depth > 1 ? "0.35" : "1");
    });

    if (iteration < iterations) {
      state.graphFrame = requestAnimationFrame(tick);
    }
  };

  svg.addEventListener("mouseleave", () => applyGraphFocus(null));
  tick();
}

function attachNoteLinkHandlers() {
  noteBodyEl.querySelectorAll("[data-note-link]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      navigateTo(link.dataset.noteLink);
    });
  });
}

function navigateTo(path) {
  const note = state.data.notes.find((item) => item.path === path);
  if (!note) return;
  if (isMobileViewport()) setSidebarOpen(false);
  state.currentPath = path;
  location.hash = encodeURIComponent(path);
  noteTitleEl.textContent = note.title;
  renderMeta(note);
  renderLandingPanel(note);
  renderKeywordNavigator(note);
  renderGraph(note);
  renderMandala(note);
  noteBodyEl.innerHTML = renderMarkdown(note);
  attachNoteLinkHandlers();
  renderBacklinks(note);
  setMobileViewButtons(note);
  setActiveTreeButton();
}

function setupSearch() {
  searchInputEl.addEventListener("input", () => {
    state.filteredQuery = searchInputEl.value.trim().toLowerCase();
    renderTree();
  });
}

async function init() {
  await loadData();
  setupSidebarControls();
  setupMobileViewControls();
  renderTree();
  renderGraphLegend();
  setupSearch();

  const requestedPath = decodeURIComponent(location.hash.slice(1));
  const featuredMandala = state.data.notes
    .filter((note) => note.mandala)
    .sort((a, b) => new Date(b.modifiedAt || 0).getTime() - new Date(a.modifiedAt || 0).getTime())[0];
  const featuredPath = state.data.site?.featuredPath || featuredMandala?.path || state.data.notes[0]?.path;
  const firstPath = requestedPath || featuredPath;
  if (isMobileViewport() && featuredPath) {
    state.contentViewByNote.set(featuredPath, "9");
  }
  navigateTo(firstPath);
}

init().catch((error) => {
  noteTitleEl.textContent = "Prototype not ready";
  const fileHint =
    window.location.protocol === "file:"
      ? `<p>請不要直接用檔案模式打開。請改用 <code>http://localhost:4173/</code> 預覽。</p>`
      : "";
  noteBodyEl.innerHTML = `<p>${escapeHtml(error.message)}</p>${fileHint}`;
  console.error(error);
});
