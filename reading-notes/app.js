const library = window.LIBRARY_DATA || { books: [] };

const bookListEl = document.getElementById("book-list");
const boardStripEl = document.getElementById("board-strip");
const mandalaGridEl = document.getElementById("mandala-grid");
const markdownBodyEl = document.getElementById("markdown-body");
const graphKeywordsEl = document.getElementById("graph-keywords");
const graphRelatedEl = document.getElementById("graph-related");
const navigatorMetaEl = document.getElementById("navigator-meta");
const keywordSearchEl = document.getElementById("keyword-search");
const themeToggleEl = document.getElementById("theme-toggle");

const bookFolderEl = document.getElementById("book-folder");
const bookTitleEl = document.getElementById("book-title");
const bookSummaryEl = document.getElementById("book-summary");
const bookKeywordsEl = document.getElementById("book-keywords");
const boardSourceEl = document.getElementById("board-source");
const boardTitleEl = document.getElementById("board-title");
const boardSummaryEl = document.getElementById("board-summary");
const cellIdEl = document.getElementById("cell-id");
const cellTitleEl = document.getElementById("cell-title");
const cellSummaryEl = document.getElementById("cell-summary");
const cellKeywordsEl = document.getElementById("cell-keywords");

let activeBookIndex = 0;
let activeBoardIndex = 0;
let activeCellId = null;
let activeKeyword = null;

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function stripText(text) {
  return String(text || "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/[*_`>#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getActiveBook() {
  return library.books[activeBookIndex] || null;
}

function getActiveBoard() {
  const book = getActiveBook();
  return book ? book.boards[activeBoardIndex] || null : null;
}

function getActiveCell() {
  const board = getActiveBoard();
  if (!board) return null;
  return board.cells.find((cell) => cell.id === activeCellId) || board.cells.find((cell) => cell.isCenter) || board.cells[0];
}

function resolveAssetPath(sourceFile, rawPath) {
  if (!rawPath || /^(https?:)?\/\//.test(rawPath)) return rawPath;
  if (rawPath.startsWith("/")) return rawPath;
  const sourceParts = sourceFile.split("/");
  sourceParts.pop();
  return ["..", ...sourceParts, rawPath].join("/").replace(/\/+/g, "/");
}

function extractKeywordsFromText(text) {
  const linked = [...String(text || "").matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim());
  const plain = stripText(text);
  const tokens = plain
    .split(/[\s、，。:：；;（）()\/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && token.length <= 18)
    .filter((token) => !/^\d+(\.\d+)?$/.test(token))
    .filter((token) => !token.includes("---"));
  return Array.from(new Set([...linked, ...tokens])).slice(0, 8);
}

function renderMarkdown(markdown, sourceFile) {
  const lines = String(markdown || "").split(/\r?\n/);
  let html = "";
  let listType = null;
  let tableRows = [];

  function closeList() {
    if (!listType) return;
    html += listType === "ol" ? "</ol>" : "</ul>";
    listType = null;
  }

  function flushTable() {
    if (!tableRows.length) return;
    const [header, ...rest] = tableRows;
    html += "<table><thead><tr>" + header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("") + "</tr></thead><tbody>";
    rest.forEach((row) => {
      if (row.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) return;
      html += "<tr>" + row.map((cell) => `<td>${renderInline(cell, sourceFile)}</td>`).join("") + "</tr>";
    });
    html += "</tbody></table>";
    tableRows = [];
  }

  function renderInline(text, currentSource) {
    let rendered = escapeHtml(text);
    rendered = rendered.replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink">$1</span>');
    rendered = rendered.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      const resolved = resolveAssetPath(currentSource, src.trim());
      return `<figure><img src="${escapeHtml(resolved)}" alt="${escapeHtml(alt)}" loading="lazy"></figure>`;
    });
    rendered = rendered.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    rendered = rendered.replace(/`([^`]+)`/g, "<code>$1</code>");
    return rendered.replace(/<br\s*\/?>/gi, "<br>");
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      closeList();
      flushTable();
      return;
    }
    if (line.startsWith("|") && line.endsWith("|")) {
      closeList();
      tableRows.push(line.slice(1, -1).split("|").map((cell) => cell.trim()));
      return;
    }
    flushTable();
    const imageOnly = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageOnly) {
      closeList();
      html += renderInline(line, sourceFile);
      return;
    }
    if (line.startsWith("### ")) {
      closeList();
      html += `<h4>${renderInline(line.slice(4), sourceFile)}</h4>`;
      return;
    }
    if (line.startsWith("## ")) {
      closeList();
      html += `<h3>${renderInline(line.slice(3), sourceFile)}</h3>`;
      return;
    }
    if (line.startsWith("# ")) {
      closeList();
      html += `<h2>${renderInline(line.slice(2), sourceFile)}</h2>`;
      return;
    }
    if (line.startsWith("> ")) {
      closeList();
      html += `<blockquote>${renderInline(line.slice(2), sourceFile)}</blockquote>`;
      return;
    }
    const ordered = line.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      if (listType !== "ol") {
        closeList();
        html += "<ol>";
        listType = "ol";
      }
      html += `<li>${renderInline(ordered[1], sourceFile)}</li>`;
      return;
    }
    const unordered = line.match(/^-\s+(.*)$/);
    if (unordered) {
      if (listType !== "ul") {
        closeList();
        html += "<ul>";
        listType = "ul";
      }
      html += `<li>${renderInline(unordered[1], sourceFile)}</li>`;
      return;
    }
    closeList();
    html += `<p>${renderInline(line, sourceFile)}</p>`;
  });

  closeList();
  flushTable();
  return html || '<p class="empty">這一格目前沒有內容。</p>';
}

function renderBookList() {
  bookListEl.innerHTML = "";
  library.books.forEach((book, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "book-button" + (index === activeBookIndex ? " active" : "");
    button.innerHTML = `<p class="eyebrow">${escapeHtml(book.id)}</p><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.summary || "由多個標準化九宮組成。")}</span>`;
    button.addEventListener("click", () => {
      activeBookIndex = index;
      activeBoardIndex = 0;
      const centerCell = library.books[index].boards[0]?.cells.find((cell) => cell.isCenter);
      activeCellId = centerCell ? centerCell.id : library.books[index].boards[0]?.cells[0]?.id || null;
      activeKeyword = library.books[index].keywords[0] || null;
      keywordSearchEl.value = "";
      render();
    });
    bookListEl.appendChild(button);
  });
}

function renderBookHero(book) {
  bookFolderEl.textContent = book.folder;
  bookTitleEl.textContent = book.title;
  bookSummaryEl.textContent = book.summary || "由多個標準化九宮組成。";
  bookKeywordsEl.innerHTML = "";
  book.keywords.slice(0, 8).forEach((keyword) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "keyword-chip" + (keyword === activeKeyword ? " active" : "");
    chip.textContent = keyword;
    chip.addEventListener("click", () => {
      activeKeyword = keyword;
      keywordSearchEl.value = "";
      renderNavigator();
      renderBookHero(book);
    });
    bookKeywordsEl.appendChild(chip);
  });
}

function renderBoardStrip(book) {
  boardStripEl.innerHTML = "";
  book.boards.forEach((board, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "board-tab" + (index === activeBoardIndex ? " active" : "");
    button.innerHTML = `<strong>${escapeHtml(board.title)}</strong><span>${escapeHtml(board.summary || "切換這個九宮")}</span>`;
    button.addEventListener("click", () => {
      activeBoardIndex = index;
      const centerCell = book.boards[index].cells.find((cell) => cell.isCenter);
      activeCellId = centerCell ? centerCell.id : book.boards[index].cells[0]?.id || null;
      render();
    });
    boardStripEl.appendChild(button);
  });
}

function renderBoard(board) {
  boardSourceEl.textContent = board.sourceFile;
  boardTitleEl.textContent = board.title;
  boardSummaryEl.textContent = board.summary || "這個九宮目前還沒有摘要。";
  mandalaGridEl.innerHTML = "";
  board.cells.forEach((cell) => {
    const div = document.createElement("button");
    div.type = "button";
    div.className = "mandala-cell" + (cell.isCenter ? " center" : "") + (cell.id === activeCellId ? " active" : "");
    div.innerHTML = `<span class="cell-id">${escapeHtml(cell.id)}</span><span class="cell-title">${escapeHtml(cell.title)}</span><span class="cell-summary">${escapeHtml(cell.summary || "目前沒有摘要")}</span>`;
    div.addEventListener("click", () => {
      activeCellId = cell.id;
      renderBoard(board);
      renderCell(getActiveCell(), board);
    });
    mandalaGridEl.appendChild(div);
  });
}

function renderCell(cell, board) {
  const cellKeywords = extractKeywordsFromText(`${cell.title}\n${cell.summary}\n${cell.content}`);
  cellIdEl.textContent = cell.id;
  cellTitleEl.textContent = cell.title;
  cellSummaryEl.textContent = cell.summary || stripText(cell.content).slice(0, 90) || "目前沒有摘要。";
  cellKeywordsEl.innerHTML = "";
  cellKeywords.slice(0, 8).forEach((keyword) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "keyword-chip" + (keyword === activeKeyword ? " active" : "");
    chip.textContent = keyword;
    chip.addEventListener("click", () => {
      activeKeyword = keyword;
      keywordSearchEl.value = "";
      renderNavigator();
      renderBookHero(getActiveBook());
    });
    cellKeywordsEl.appendChild(chip);
  });
  markdownBodyEl.innerHTML = renderMarkdown(cell.content, board.sourceFile);
}

function getNavigatorContext() {
  const book = getActiveBook();
  const board = getActiveBoard();
  const search = keywordSearchEl.value.trim();
  const focus = search || activeKeyword || "";

  const allKeywords = Array.from(new Set([
    ...book.keywords,
    ...book.boards.flatMap((item) => item.keywords || [])
  ])).filter(Boolean);

  const visibleKeywords = allKeywords
    .filter((keyword) => !focus || keyword.includes(focus) || focus.includes(keyword))
    .slice(0, 20);

  const matches = [];
  book.boards.forEach((item, boardIndex) => {
    item.cells.forEach((cell) => {
      const haystack = `${item.title} ${item.summary} ${cell.title} ${cell.summary} ${cell.content} ${(item.keywords || []).join(" ")}`;
      if (!focus || haystack.includes(focus)) {
        matches.push({
          boardIndex,
          cellId: cell.id,
          boardTitle: item.title,
          cellTitle: cell.title,
          text: cell.summary || stripText(cell.content).slice(0, 70) || "目前沒有摘要",
          active: boardIndex === activeBoardIndex && cell.id === activeCellId
        });
      }
    });
  });

  return {
    focus,
    boardTitle: board.title,
    visibleKeywords,
    totalBoards: book.boards.length,
    totalMatches: matches.length,
    matches: matches.slice(0, 16)
  };
}

function renderNavigator() {
  const book = getActiveBook();
  const context = getNavigatorContext();

  graphKeywordsEl.innerHTML = "";
  context.visibleKeywords.forEach((keyword) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "keyword-chip" + (keyword === activeKeyword ? " active" : "");
    button.textContent = keyword;
    button.addEventListener("click", () => {
      activeKeyword = keyword;
      keywordSearchEl.value = "";
      renderNavigator();
      renderBookHero(book);
    });
    graphKeywordsEl.appendChild(button);
  });

  navigatorMetaEl.innerHTML = `
    <div class="meta-card">
      <strong>目前書籍</strong>
      <span>${escapeHtml(book.title)}</span>
    </div>
    <div class="meta-card">
      <strong>目前九宮</strong>
      <span>${escapeHtml(context.boardTitle)}</span>
    </div>
    <div class="meta-card">
      <strong>命中結果</strong>
      <span>${context.focus ? `關鍵字「${escapeHtml(context.focus)}」共 ${context.totalMatches} 筆` : `本書共 ${context.totalBoards} 個九宮，顯示 ${context.totalMatches} 格`}</span>
    </div>
  `;

  graphRelatedEl.innerHTML = "";
  if (!context.matches.length) {
    graphRelatedEl.innerHTML = '<p class="empty">目前沒有符合的關鍵字結果。</p>';
    return;
  }

  context.matches.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "match-card" + (item.active ? " active" : "");
    button.innerHTML = `<strong>${escapeHtml(item.boardTitle)} / ${escapeHtml(item.cellId)} ${escapeHtml(item.cellTitle)}</strong><span>${escapeHtml(item.text)}</span>`;
    button.addEventListener("click", () => {
      activeBoardIndex = item.boardIndex;
      activeCellId = item.cellId;
      render();
    });
    graphRelatedEl.appendChild(button);
  });
}

function applyTheme(theme) {
  const dark = theme === "dark";
  document.body.classList.toggle("dark", dark);
  localStorage.setItem("reading-site-theme", dark ? "dark" : "light");
}

function render() {
  if (!library.books.length) {
    bookListEl.innerHTML = '<p class="empty">目前沒有載入任何書籍資料。</p>';
    return;
  }
  const book = getActiveBook();
  const board = getActiveBoard();
  const cell = getActiveCell();
  renderBookList();
  renderBookHero(book);
  renderBoardStrip(book);
  renderBoard(board);
  renderCell(cell, board);
  renderNavigator();
}

themeToggleEl.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

keywordSearchEl.addEventListener("input", () => {
  renderNavigator();
});

applyTheme(localStorage.getItem("reading-site-theme") === "dark" ? "dark" : "light");

if (library.books.length) {
  const firstBoard = library.books[0].boards[0];
  const centerCell = firstBoard?.cells.find((cell) => cell.isCenter);
  activeCellId = centerCell ? centerCell.id : firstBoard?.cells[0]?.id || null;
  activeKeyword = library.books[0].keywords[0] || null;
}

render();
