const state = {
  data: null,
  filteredQuery: "",
  currentPath: null,
  graphFrame: null,
  graphDrag: null,
};

const fileTreeEl = document.querySelector("#file-tree");
const noteTitleEl = document.querySelector("#note-title");
const noteMetaEl = document.querySelector("#note-meta");
const noteBodyEl = document.querySelector("#note-body");
const mandalaShellEl = document.querySelector("#mandala-shell");
const backlinksEl = document.querySelector("#backlinks");
const graphRootEl = document.querySelector("#graph-root");
const graphLegendEl = document.querySelector("#graph-legend");
const searchInputEl = document.querySelector("#search-input");

async function loadData() {
  const response = await fetch("./data/site-data.json");
  if (!response.ok) {
    throw new Error("Unable to load site data. Run node scripts/build-site.mjs first.");
  }
  state.data = await response.json();
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

function renderMandala(note) {
  if (!note.mandala) {
    mandalaShellEl.hidden = true;
    mandalaShellEl.innerHTML = "";
    return;
  }

  const sectionRegex = /<!--section:\s*([^>]+)-->/g;
  const matches = [...note.content.matchAll(sectionRegex)];
  if (!matches.length) {
    mandalaShellEl.hidden = true;
    mandalaShellEl.innerHTML = "";
    return;
  }

  const cards = matches.slice(0, 9).map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? note.content.length;
    const raw = note.content.slice(start, end).trim();
    const cleaned = raw
      .replace(/^#+\s*/gm, "")
      .replace(/\[\[([^\]]+)\]\]/g, "$1")
      .replace(/\n+/g, " ")
      .trim();
    const lines = cleaned.split(/(?<=[.!?。])/).map((line) => line.trim()).filter(Boolean);
    return {
      slot: match[1].trim(),
      title: lines[0] || "Mandala slot",
      excerpt: lines.slice(1).join(" ").slice(0, 140) || "Empty section",
      center: index === 4,
    };
  });

  mandalaShellEl.hidden = false;
  mandalaShellEl.innerHTML = cards
    .map((card) => `
      <section class="mandala-card ${card.center ? "center" : ""}">
        <div class="slot">${escapeHtml(card.slot)}</div>
        <h4>${escapeHtml(card.title)}</h4>
        <p>${escapeHtml(card.excerpt)}</p>
      </section>
    `)
    .join("");
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
  state.currentPath = path;
  location.hash = encodeURIComponent(path);
  noteTitleEl.textContent = note.title;
  renderMeta(note);
  renderMandala(note);
  noteBodyEl.innerHTML = renderMarkdown(note);
  attachNoteLinkHandlers();
  renderBacklinks(note);
  renderGraph(note);
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
  renderTree();
  renderGraphLegend();
  setupSearch();

  const requestedPath = decodeURIComponent(location.hash.slice(1));
  const featuredMandala =
    state.data.notes.find((note) => note.path === "01 Project/魯曼的卡片（8張）.md") ||
    state.data.notes.find((note) => note.mandala);
  const firstPath = requestedPath || featuredMandala?.path || state.data.notes[0]?.path;
  navigateTo(firstPath);
}

init().catch((error) => {
  noteTitleEl.textContent = "Prototype not ready";
  noteBodyEl.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  console.error(error);
});
