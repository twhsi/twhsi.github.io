const state = {
  data: null,
  currentNoteId: null,
  currentBoardId: null,
  currentCellId: null,
};

const els = {
  siteTitle: document.querySelector("#site-title"),
  siteSubtitle: document.querySelector("#site-subtitle"),
  noteList: document.querySelector("#note-list"),
  noteTitle: document.querySelector("#note-title"),
  noteSummary: document.querySelector("#note-summary"),
  noteKeywords: document.querySelector("#note-keywords"),
  boardTabs: document.querySelector("#board-tabs"),
  boardTitle: document.querySelector("#board-title"),
  boardKeywords: document.querySelector("#board-keywords"),
  mandalaPanel: document.querySelector("#mandala-panel"),
  mandalaGrid: document.querySelector("#mandala-grid"),
  readerTitle: document.querySelector("#reader-title"),
  readerContent: document.querySelector("#reader-content"),
  graphSvg: document.querySelector("#graph-svg"),
  backlinkList: document.querySelector("#backlink-list"),
  noteButtonTemplate: document.querySelector("#note-button-template"),
};

function getNotes() {
  return state.data?.notes || [];
}

function getCurrentNote() {
  return getNotes().find((note) => note.id === state.currentNoteId) || null;
}

function getCurrentBoard() {
  const note = getCurrentNote();
  return note?.boards.find((board) => board.id === state.currentBoardId) || null;
}

function getCurrentCell() {
  const board = getCurrentBoard();
  return board?.cells.find((cell) => cell.id === state.currentCellId) || null;
}

function setCurrentNote(noteId) {
  const note = getNotes().find((entry) => entry.id === noteId) || getNotes()[0];
  if (!note) return;

  state.currentNoteId = note.id;
  state.currentBoardId = note.boards[0]?.id || null;
  state.currentCellId = note.boards[0]?.cells[4]?.id || null;
  render();
}

function setCurrentBoard(boardId) {
  const note = getCurrentNote();
  if (!note) return;
  const board = note.boards.find((entry) => entry.id === boardId) || note.boards[0];
  if (!board) return;

  state.currentBoardId = board.id;
  state.currentCellId = board.cells[4]?.id || board.cells[0]?.id || null;
  render();
}

function setCurrentCell(cellId) {
  state.currentCellId = cellId;
  render();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderMarkdownish(content) {
  const paragraphs = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (!paragraphs.length) {
    return "<p class=\"muted\">尚未填寫內容。</p>";
  }

  return paragraphs
    .map((block) => {
      if (block.startsWith("- ")) {
        const items = block
          .split("\n")
          .map((line) => line.replace(/^- /, "").trim())
          .filter(Boolean)
          .map((line) => `<li>${renderInline(line)}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      const lines = block.split("\n").map((line) => renderInline(line)).join("<br />");
      return `<p>${lines}</p>`;
    })
    .join("");
}

function renderInline(value) {
  return escapeHtml(value).replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => {
    const safeTarget = encodeURIComponent(target.trim());
    const safeLabel = escapeHtml((label || target).trim());
    return `<a href="#${safeTarget}" data-note-link="${safeTarget}" class="wikilink">${safeLabel}</a>`;
  });
}

function renderNoteList() {
  els.noteList.innerHTML = "";

  for (const note of getNotes()) {
    const node = els.noteButtonTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".note-title").textContent = note.title;
    node.querySelector(".note-meta").textContent = note.boardCount
      ? `${note.boardCount} 個九宮`
      : `${note.outgoing.length} 個連出`;
    node.classList.toggle("active", note.id === state.currentNoteId);
    node.addEventListener("click", () => setCurrentNote(note.id));
    els.noteList.appendChild(node);
  }
}

function renderKeywords(container, items, onClick) {
  container.innerHTML = "";
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = item;
    if (onClick) button.addEventListener("click", () => onClick(item));
    container.appendChild(button);
  }
}

function renderBoardTabs(note) {
  els.boardTabs.innerHTML = "";
  if (!note.boards.length) return;

  for (const board of note.boards) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `board-tab${board.id === state.currentBoardId ? " active" : ""}`;
    button.textContent = board.title;
    button.addEventListener("click", () => setCurrentBoard(board.id));
    els.boardTabs.appendChild(button);
  }
}

function renderMandala(note, board) {
  if (!note.boards.length || !board) {
    els.mandalaPanel.hidden = true;
    return;
  }

  els.mandalaPanel.hidden = false;
  els.boardTitle.textContent = board.title;
  renderKeywords(els.boardKeywords, board.keywords);
  els.mandalaGrid.innerHTML = "";

  for (const cell of board.cells) {
    const button = document.createElement("button");
    button.type = "button";
    const isCenter = cell.sectionId === board.rootId;
    button.className = `cell-card${cell.id === state.currentCellId ? " active" : ""}${isCenter ? " center" : ""}`;
    button.innerHTML = `
      <span class="cell-index">${isCenter ? "核" : cell.sectionId.split(".").pop()}</span>
      <span class="cell-title">${escapeHtml(cell.title)}</span>
      <span class="cell-summary">${escapeHtml(cell.summary)}</span>
    `;
    button.addEventListener("click", () => setCurrentCell(cell.id));
    els.mandalaGrid.appendChild(button);
  }
}

function renderReader(note, board, cell) {
  const activeTitle = cell?.title || board?.title || note.title;
  const activeContent = cell?.content || note.content;
  els.readerTitle.textContent = activeTitle;
  els.readerContent.innerHTML = renderMarkdownish(activeContent);

  for (const link of els.readerContent.querySelectorAll("[data-note-link]")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const noteId = decodeURIComponent(link.dataset.noteLink);
      setCurrentNote(noteId);
    });
  }
}

function renderGraph(note) {
  const graph = state.data.graph.graphs[note.id];
  const centerX = 160;
  const centerY = 136;
  const radius = 90;

  if (!graph || !graph.nodes.length) {
    els.graphSvg.innerHTML = "";
    return;
  }

  const centerNode = graph.nodes.find((entry) => entry.id === note.id) || graph.nodes[0];
  const neighbors = graph.nodes.filter((entry) => entry.id !== centerNode.id);
  const positions = new Map();
  positions.set(centerNode.id, { x: centerX, y: centerY });

  neighbors.forEach((node, index) => {
    const angle = (-Math.PI / 2) + (index / Math.max(neighbors.length, 1)) * Math.PI * 2;
    positions.set(node.id, {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  });

  const edgeMarkup = graph.edges
    .map((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return "";
      return `<line class="graph-edge" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" />`;
    })
    .join("");

  const nodeMarkup = graph.nodes
    .map((node) => {
      const pos = positions.get(node.id);
      const radiusSize = node.id === centerNode.id ? 30 : 22;
      const labelY = pos.y + radiusSize + 14;
      const kindClass = node.kind === "current" ? " current" : node.kind === "backlink" ? " backlink" : "";
      return `
        <g class="graph-node${kindClass}" data-note-id="${escapeHtml(node.id)}">
          <circle cx="${pos.x}" cy="${pos.y}" r="${radiusSize}" />
          <text x="${pos.x}" y="${pos.y + 4}">${escapeHtml(node.label.slice(0, 4))}</text>
          <text x="${pos.x}" y="${labelY}">${escapeHtml(node.label)}</text>
        </g>
      `;
    })
    .join("");

  els.graphSvg.innerHTML = `<g>${edgeMarkup}${nodeMarkup}</g>`;

  for (const nodeEl of els.graphSvg.querySelectorAll("[data-note-id]")) {
    nodeEl.addEventListener("click", () => setCurrentNote(nodeEl.dataset.noteId));
  }
}

function renderBacklinks(note) {
  els.backlinkList.innerHTML = "";
  if (!note.backlinks.length) {
    els.backlinkList.innerHTML = "<p class=\"muted\">目前沒有反向連結。</p>";
    return;
  }

  for (const backlink of note.backlinks) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "backlink-item";
    button.textContent = backlink;
    button.addEventListener("click", () => setCurrentNote(backlink));
    els.backlinkList.appendChild(button);
  }
}

function focusKeyword(keyword) {
  const note = getCurrentNote();
  if (!note?.boards.length) return;
  const matchedBoard = note.boards.find((board) => board.keywords.includes(keyword));
  if (matchedBoard) {
    setCurrentBoard(matchedBoard.id);
  }
}

function render() {
  const note = getCurrentNote();
  if (!note) return;

  const board = getCurrentBoard();
  const cell = getCurrentCell();

  els.noteTitle.textContent = note.title;
  els.noteSummary.textContent = note.summary;
  renderKeywords(els.noteKeywords, note.keywords.slice(0, 10), focusKeyword);
  renderNoteList();
  renderBoardTabs(note);
  renderMandala(note, board);
  renderReader(note, board, cell);
  renderGraph(note);
  renderBacklinks(note);
}

async function init() {
  state.data = window.__SITE_DATA__;
  if (!state.data) {
    const response = await fetch("./data/site-data.json");
    state.data = await response.json();
  }
  els.siteTitle.textContent = state.data.site.title;
  els.siteSubtitle.textContent = state.data.site.subtitle;
  state.currentNoteId = state.data.notes[0]?.id || null;
  state.currentBoardId = state.data.notes[0]?.boards[0]?.id || null;
  state.currentCellId = state.data.notes[0]?.boards[0]?.cells[4]?.id || null;
  render();
}

init().catch((error) => {
  console.error(error);
  els.readerContent.innerHTML = `<p class="muted">資料載入失敗：${escapeHtml(String(error))}</p>`;
});
