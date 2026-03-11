(() => {
const data = window.__SITE_DATA__;

if (!data) {
  console.error("Missing site data.");
  return;
}

const chapterPool = data.groups.flatMap((group) =>
  group.shelves.flatMap((shelf) =>
    shelf.chapters.map((chapter) => ({
      group,
      shelf,
      chapter,
    })),
  ),
);

const state = {
  chapterId: chapterPool[0]?.chapter.id || "",
  boardId: "",
  graphMode: "keywords",
  openGroups: new Set([data.groups[0]?.id].filter(Boolean)),
  keyword: "",
  query: "",
};

const refs = {
  siteTitle: document.querySelector("#site-title"),
  libraryNav: document.querySelector("#library-nav"),
  viewTitle: document.querySelector("#view-title"),
  viewSummary: document.querySelector("#view-summary"),
  boardTabs: document.querySelector("#board-tabs"),
  mandalaGrid: document.querySelector("#mandala-grid"),
  articleTitle: document.querySelector("#article-title"),
  articleMeta: document.querySelector("#article-meta"),
  articleContent: document.querySelector("#article-content"),
  keywordSearch: document.querySelector("#keyword-search"),
  graphTitle: document.querySelector("#graph-title"),
  graphModes: document.querySelector("#graph-modes"),
  graphFocus: document.querySelector("#graph-focus"),
  keywordChips: document.querySelector("#keyword-chips"),
  keywordResults: document.querySelector("#keyword-results"),
};

refs.siteTitle.textContent = data.title;

refs.articleContent.addEventListener("click", (event) => {
  const wikilink = event.target.closest(".wikilink");
  if (!wikilink) {
    return;
  }
  const target = findChapterByLink(wikilink.textContent.trim());
  if (target) {
    openChapter(target.chapter.id);
  }
});

refs.keywordSearch.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  if (state.query) {
    state.keyword = "";
  }
  renderRightPanel();
});

function render() {
  const context = getCurrentContext();
  if (!state.boardId) {
    state.boardId = context.boards[0]?.id || "";
  }

  renderNav(context);
  renderBoardArea(context);
  renderRightPanel(context);
}

function renderNav(context) {
  refs.libraryNav.innerHTML = "";

  data.groups.forEach((group) => {
    const groupEl = document.createElement("section");
    groupEl.className = "group-card";

    const groupButton = document.createElement("button");
    groupButton.type = "button";
    groupButton.className = `group-toggle${state.openGroups.has(group.id) ? " is-open" : ""}`;
    groupButton.innerHTML = `<span>${group.title}</span><span class="group-caret">${state.openGroups.has(group.id) ? "−" : "+"}</span>`;
    groupButton.addEventListener("click", () => {
      if (state.openGroups.has(group.id)) {
        state.openGroups.delete(group.id);
      } else {
        state.openGroups.add(group.id);
      }
      renderNav(context);
    });
    groupEl.append(groupButton);

    if (!state.openGroups.has(group.id)) {
      refs.libraryNav.append(groupEl);
      return;
    }

    group.shelves.forEach((shelf) => {
      const shelfWrap = document.createElement("div");
      shelfWrap.className = "shelf-row";

      const shelfButton = document.createElement("button");
      shelfButton.type = "button";
      shelfButton.className = `shelf-button${context.shelf.id === shelf.id ? " is-active" : ""}`;
      shelfButton.textContent = formatShelfTitle(shelf.title);
      shelfButton.addEventListener("click", () => {
        const target = shelf.chapters[0];
        if (target) {
          openChapter(target.id);
        }
      });
      shelfWrap.append(shelfButton);
      groupEl.append(shelfWrap);
    });

    refs.libraryNav.append(groupEl);
  });
}

function renderBoardArea(context) {
  const activeBoard = context.boards.find((board) => board.id === state.boardId) || context.boards[0];
  const centerCell = normalizeCenterCell(activeBoard);

  refs.viewTitle.textContent = context.chapter.title;
  refs.viewSummary.textContent = context.chapter.summary;
  refs.articleTitle.textContent = context.chapter.title;
  refs.articleContent.innerHTML = context.chapter.html;
  refs.articleMeta.innerHTML = [
    context.group.title,
    context.shelf.title,
    context.chapter.hasMandala ? "九宮章節" : "章節閱讀",
  ]
    .map((item) => `<span class="chip">${item}</span>`)
    .join("");

  refs.boardTabs.innerHTML = "";
  context.boards.forEach((board) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tab${board.id === activeBoard.id ? " is-active" : ""}`;
    button.textContent = board.title;
    button.addEventListener("click", () => {
      state.boardId = board.id;
      render();
    });
    refs.boardTabs.append(button);
  });

  refs.mandalaGrid.innerHTML = "";
  const layout = [
    { ...activeBoard.cells[0], displayIndex: 1 },
    { ...activeBoard.cells[1], displayIndex: 2 },
    { ...activeBoard.cells[2], displayIndex: 3 },
    { ...activeBoard.cells[3], displayIndex: 4 },
    { ...centerCell, displayIndex: "中", center: true },
    { ...activeBoard.cells[4], displayIndex: 5 },
    { ...activeBoard.cells[5], displayIndex: 6 },
    { ...activeBoard.cells[6], displayIndex: 7 },
    { ...activeBoard.cells[7], displayIndex: 8 },
  ];

  layout.forEach((cell) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = cell.center ? "mandala-center" : "mandala-cell";
    button.innerHTML = `
      <span class="cell-index">${cell.displayIndex}</span>
      <h3>${cell.title}</h3>
      <p>${cell.summary || "點擊前往章節"}</p>
    `;
    button.addEventListener("click", () => {
      if (cell.targetType === "chapter" && cell.targetId) {
        openChapter(cell.targetId);
      }
    });
    refs.mandalaGrid.append(button);
  });
}

function renderRightPanel(context = getCurrentContext()) {
  const activeKeyword = state.keyword || "";
  const query = state.query.toLowerCase();
  const chapter = context.chapter;
  const focusKeywords = chapter.keywords.slice(0, 8);

  refs.graphModes.innerHTML = "";
  ["keywords", "boards"].forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `graph-mode${state.graphMode === mode ? " is-active" : ""}`;
    button.textContent = mode === "keywords" ? "關鍵字" : "九宮";
    button.addEventListener("click", () => {
      state.graphMode = mode;
      renderRightPanel(context);
    });
    refs.graphModes.append(button);
  });

  refs.graphTitle.textContent = activeKeyword ? `導航: ${activeKeyword}` : "導航";
  refs.graphFocus.innerHTML = "";

  if (state.graphMode === "boards") {
    renderBoardGraph(context);
    return;
  }

  if (activeKeyword) {
    refs.graphFocus.innerHTML = buildGraphCanvas(activeKeyword, getKeywordGraphNodes(activeKeyword, context));
  } else {
    refs.graphFocus.innerHTML = buildGraphCanvas(chapter.title, getKeywordGraphNodes(null, context));
  }
  refs.graphFocus.querySelectorAll("[data-keyword]").forEach((node) => {
    node.addEventListener("click", () => {
      state.keyword = node.dataset.keyword;
      state.query = "";
      refs.keywordSearch.value = node.dataset.keyword;
      renderRightPanel(context);
    });
  });
  refs.graphFocus.querySelectorAll("[data-chapter-id]").forEach((node) => {
    node.addEventListener("click", () => openChapter(node.dataset.chapterId));
  });
  refs.graphFocus.querySelectorAll("[data-shelf-id]").forEach((node) => {
    const shelf = data.groups.flatMap((group) => group.shelves).find((item) => item.id === node.dataset.shelfId);
    if (shelf?.chapters[0]) {
      node.addEventListener("click", () => openChapter(shelf.chapters[0].id));
    }
  });

  const keywordSource = data.keywords.filter((keyword) => {
    if (activeKeyword) {
      return keyword !== activeKeyword;
    }
    if (!query) {
      return focusKeywords.includes(keyword);
    }
    return keyword.toLowerCase().includes(query);
  });

  refs.keywordChips.innerHTML = "";
  keywordSource.slice(0, 16).forEach((keyword) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `keyword-button${activeKeyword === keyword ? " is-active" : ""}`;
    button.textContent = keyword;
    button.addEventListener("click", () => {
      state.keyword = keyword;
      state.query = "";
      refs.keywordSearch.value = keyword;
      renderRightPanel(context);
    });
    refs.keywordChips.append(button);
  });

  const results = chapterPool
    .filter(({ chapter: item }) => {
      const haystack = `${item.title} ${item.summary} ${item.keywords.join(" ")}`.toLowerCase();
      if (activeKeyword) {
        return item.keywords.includes(activeKeyword);
      }
      if (query) {
        return haystack.includes(query);
      }
      return item.id !== chapter.id && shareKeywords(item.keywords, focusKeywords);
    })
    .slice(0, 14);

  refs.keywordResults.innerHTML = "";
  results.forEach(({ group, shelf, chapter: item }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-button";
    button.innerHTML = `<strong>${item.title}</strong><span>${group.title} / ${shelf.title}</span>`;
    button.addEventListener("click", () => openChapter(item.id));
    refs.keywordResults.append(button);
  });
}

function renderBoardGraph(context) {
  const currentCode = splitChapterTitle(context.chapter.title).code || context.chapter.title;
  const siblings = context.shelf.chapters
    .filter((item) => item.id !== context.chapter.id)
    .slice(0, 6);
  const adjacentShelves = context.group.shelves
    .filter((item) => item.id !== context.shelf.id)
    .slice(0, 2);

  refs.graphTitle.textContent = "Local Graph";
  const nodes = [
    ...siblings.map((item) => ({
      label: splitChapterTitle(item.title).code || item.title,
      attr: `data-chapter-id="${escapeHtml(item.id)}"`,
    })),
    ...adjacentShelves.map((item) => ({
      label: formatShelfTitle(item.title),
      attr: `data-shelf-id="${escapeHtml(item.id)}"`,
    })),
  ].slice(0, 8);
  refs.graphFocus.innerHTML = buildGraphCanvas(currentCode, nodes);

  refs.keywordChips.innerHTML = "";
  context.chapter.keywords.slice(0, 8).forEach((keyword) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "keyword-button";
    button.textContent = keyword;
    button.addEventListener("click", () => {
      state.graphMode = "keywords";
      state.keyword = keyword;
      refs.keywordSearch.value = keyword;
      renderRightPanel(context);
    });
    refs.keywordChips.append(button);
  });

  refs.keywordResults.innerHTML = "";
  siblings.forEach(({ title, id }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-button";
    button.innerHTML = `<strong>${title}</strong><span>${context.group.title} / ${context.shelf.title}</span>`;
    button.addEventListener("click", () => openChapter(id));
    refs.keywordResults.append(button);
  });
}

function getCurrentContext() {
  const found = chapterPool.find(({ chapter }) => chapter.id === state.chapterId) || chapterPool[0];
  const chapter = found.chapter;
  const boards = chapter.boards.length ? chapter.boards : [buildShelfBoard(found.shelf, chapter)];
  return {
    group: found.group,
    shelf: found.shelf,
    chapter,
    boards,
  };
}

function buildShelfBoard(shelf, chapter) {
  const chapters = shelf.chapters.slice(0, 8);
  const currentCode = splitChapterTitle(chapter.title).code;

  return {
    id: "shelf-overview",
    title: `${shelf.title} 九宮索引`,
    center: {
      title: currentCode,
      summary: chapter.summary,
      html: chapter.html,
    },
    cells: Array.from({ length: 8 }, (_, index) => {
      const item = chapters[index];
      if (!item) {
        return {
          id: `empty-${index}`,
          title: "待補",
          summary: "此格目前未使用",
          targetType: "",
          targetId: "",
        };
      }

      return {
        id: item.id,
        title: item.title,
        summary: item.summary,
        targetType: "chapter",
        targetId: item.id,
      };
    }),
  };
}

function normalizeCenterCell(board) {
  const context = getCurrentContext();
  const codeOnly = splitChapterTitle(context.chapter.title).code;
  return {
    id: "center",
    title: codeOnly || context.chapter.title,
    summary: context.chapter.summary,
    html: context.chapter.html,
  };
}

function openChapter(chapterId) {
  const found = chapterPool.find(({ chapter }) => chapter.id === chapterId);
  if (!found) {
    return;
  }
  state.chapterId = chapterId;
  state.boardId = found.chapter.boards[0]?.id || "shelf-overview";
  state.keyword = "";
  state.query = "";
  refs.keywordSearch.value = "";
  render();
}

function splitChapterTitle(title) {
  const match = title.match(/^(\d+(?:\.\d+)+)\s*(.*)$/);
  if (!match) {
    return { code: "", label: title };
  }
  return {
    code: match[1],
    label: match[2] || title,
  };
}

function formatShelfTitle(title) {
  const match = title.match(/^(\d+\.\d+)\s*(.*)$/);
  if (!match) {
    return title;
  }
  return `${match[1]} ${match[2]}`.trim();
}

function getKeywordGraphNodes(activeKeyword, context) {
  const keywords = activeKeyword ? [activeKeyword] : context.chapter.keywords.slice(0, 8);
  return keywords.map((keyword) => ({
    label: keyword,
    attr: `data-keyword="${escapeHtml(keyword)}"`,
  }));
}

function buildGraphCanvas(centerLabel, nodes) {
  const positions = [
    "top",
    "top-right",
    "right",
    "bottom-right",
    "bottom",
    "bottom-left",
    "left",
    "top-left",
  ];
  return `
    <p class="graph-help">點節點即可跳轉或切換焦點。</p>
    <div class="graph-canvas">
      <div class="graph-center">${escapeHtml(centerLabel)}</div>
      ${nodes.map((node, index) => `
        <button type="button" class="graph-node graph-node--${positions[index % positions.length]}" ${node.attr || ""}>
          ${escapeHtml(node.label)}
        </button>
      `).join("")}
      ${nodes.map((_, index) => `<span class="graph-edge graph-edge--${positions[index % positions.length]}"></span>`).join("")}
    </div>
  `;
}

function findChapterByLink(linkText) {
  const normalized = linkText.replace(/^[[\]]+|[[\]]+$/g, "").trim();

  return chapterPool.find(({ chapter }) =>
    chapter.title === normalized ||
    splitChapterTitle(chapter.title).label === normalized ||
    splitChapterTitle(chapter.title).code === normalized ||
    chapter.keywords.includes(normalized),
  );
}

function shareKeywords(a, b) {
  return a.some((item) => b.includes(item));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

render();
})();
