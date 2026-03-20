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
    selectedNodeId: "",
    contentMode: "grid",
    query: "",
  };

  const refs = {
    siteTitle: document.querySelector("#site-title"),
    libraryNav: document.querySelector("#library-nav"),
    viewTitle: document.querySelector("#view-title"),
    viewSummary: document.querySelector("#view-summary"),
    viewModes: document.querySelector("#view-modes"),
    boardTabs: document.querySelector("#board-tabs"),
    mandalaGrid: document.querySelector("#mandala-grid"),
    articleShell: document.querySelector("#article-shell"),
    articleTitle: document.querySelector("#article-title"),
    articleMeta: document.querySelector("#article-meta"),
    articleContent: document.querySelector("#article-content"),
    keywordSearch: document.querySelector("#keyword-search"),
    graphTitle: document.querySelector("#graph-title"),
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
    const node = findNodeByTitle(wikilink.textContent.trim(), getCurrentContext());
    if (node) {
      openNode(node.boardId, node.id);
      state.contentMode = "markdown";
      render();
    }
  });

  refs.keywordSearch.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderRightPanel();
  });

  function render() {
    const context = getCurrentContext();
    const activeBoard = getActiveBoard(context);
    const currentNode = getSelectedNode(context, activeBoard);

    renderNav(context, currentNode);
    renderHeader(context, currentNode);
    renderBoardTabs(context, activeBoard);
    renderContentModes();
    renderCenter(context, activeBoard, currentNode);
    renderRightPanel(context, activeBoard, currentNode);
  }

  function renderNav(context, currentNode) {
    refs.libraryNav.innerHTML = "";

    const sectionList = buildSectionList(context);
    const groupEl = document.createElement("section");
    groupEl.className = "group-card";
    groupEl.innerHTML = `<div class="group-name">${escapeHtml(context.group.title)}</div><div class="shelf-title">${escapeHtml(context.shelf.title)}</div>`;

    sectionList.forEach((node) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `note-link${node.id === currentNode.id ? " is-active" : ""}${node.type === "root" ? " is-root" : ""}`;
      button.textContent = node.navLabel;
      button.addEventListener("click", () => {
        openNode(node.boardId, node.id);
        state.contentMode = node.type === "root" ? "grid" : "markdown";
        render();
      });
      groupEl.append(button);
    });

    refs.libraryNav.append(groupEl);
  }

  function renderHeader(context, currentNode) {
    refs.viewTitle.textContent = context.chapter.title;
    refs.viewSummary.textContent = currentNode.summary || context.chapter.summary;
    refs.articleTitle.textContent = currentNode.title;
    refs.articleMeta.innerHTML = [
      context.group.title,
      context.shelf.title,
      currentNode.type === "root" ? "主分支" : "子分支",
    ]
      .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
      .join("");
  }

  function renderBoardTabs(context, activeBoard) {
    refs.boardTabs.innerHTML = "";
    context.boards.forEach((board) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tab${board.id === activeBoard.id ? " is-active" : ""}`;
      button.textContent = board.title;
      button.addEventListener("click", () => {
        openNode(board.id, board.id);
        state.contentMode = "grid";
        render();
      });
      refs.boardTabs.append(button);
    });
  }

  function renderContentModes() {
    refs.viewModes.innerHTML = "";
    [
      { id: "grid", label: "九宮" },
      { id: "markdown", label: "Markdown" },
    ].forEach((mode) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `view-mode${state.contentMode === mode.id ? " is-active" : ""}`;
      button.textContent = mode.label;
      button.addEventListener("click", () => {
        state.contentMode = mode.id;
        render();
      });
      refs.viewModes.append(button);
    });
  }

  function renderCenter(context, activeBoard, currentNode) {
    refs.mandalaGrid.innerHTML = "";
    refs.articleContent.innerHTML = "";
    refs.articleShell.hidden = state.contentMode !== "markdown";
    refs.mandalaGrid.hidden = state.contentMode !== "grid";

    if (state.contentMode === "grid") {
      const layout = buildBoardLayout(activeBoard);
      layout.forEach((node) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = node.type === "root" ? "mandala-center" : "mandala-cell";
        if (node.id === currentNode.id) {
          button.classList.add("is-active");
        }
        button.innerHTML = `
          <span class="cell-index">${escapeHtml(node.displayIndex)}</span>
          <strong>${escapeHtml(node.title)}</strong>
          <span>${escapeHtml(node.summary || "點擊切到這個分支")}</span>
        `;
        button.addEventListener("click", () => {
          openNode(activeBoard.id, node.id);
          render();
        });
        refs.mandalaGrid.append(button);
      });
      return;
    }

    refs.articleContent.innerHTML = currentNode.html;
  }

  function renderRightPanel(context, activeBoard, currentNode) {
    refs.graphTitle.textContent = `Local Graph · ${currentNode.title}`;
    renderGraph(activeBoard, currentNode);

    const neighbors = getGraphNeighbors(activeBoard, currentNode);
    refs.keywordChips.innerHTML = "";
    neighbors.slice(0, 10).forEach((node) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "keyword-button";
      button.textContent = node.title;
      button.addEventListener("click", () => {
        openNode(node.boardId, node.id);
        render();
      });
      refs.keywordChips.append(button);
    });

    const query = state.query;
    const results = buildSectionList(context).filter((node) => {
      if (!query) {
        return node.id !== currentNode.id && node.boardId === activeBoard.id;
      }
      return `${node.title} ${node.summary}`.toLowerCase().includes(query);
    });

    refs.keywordResults.innerHTML = "";
    results.slice(0, 12).forEach((node) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-button";
      button.innerHTML = `<strong>${escapeHtml(node.title)}</strong><span>${escapeHtml(node.type === "root" ? "主分支" : "子分支")} / ${escapeHtml(node.boardTitle)}</span>`;
      button.addEventListener("click", () => {
        openNode(node.boardId, node.id);
        state.contentMode = node.type === "root" ? "grid" : "markdown";
        render();
      });
      refs.keywordResults.append(button);
    });
  }

  function renderGraph(activeBoard, currentNode) {
    const neighbors = getGraphNeighbors(activeBoard, currentNode).slice(0, 8);
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

    refs.graphFocus.innerHTML = `
      <div class="graph-canvas">
        <div class="graph-center-node">${escapeHtml(currentNode.title)}</div>
        ${neighbors.map((node, index) => `
          <button type="button" class="graph-node graph-node--${positions[index]}" data-node-id="${escapeHtml(node.id)}" data-board-id="${escapeHtml(node.boardId)}">
            ${escapeHtml(node.title)}
          </button>
        `).join("")}
      </div>
    `;

    refs.graphFocus.querySelectorAll("[data-node-id]").forEach((button) => {
      button.addEventListener("click", () => {
        openNode(button.dataset.boardId, button.dataset.nodeId);
        render();
      });
    });
  }

  function buildSectionList(context) {
    return context.boards.flatMap((board) => {
      const rootNode = {
        id: board.id,
        boardId: board.id,
        boardTitle: board.title,
        navLabel: board.title,
        title: board.center.title,
        summary: board.center.summary,
        html: board.center.html,
        type: "root",
      };

      const childNodes = board.cells
        .filter((cell) => cell.summary || !/^第 \d+ 格$/.test(cell.title))
        .map((cell) => ({
          id: cell.id,
          boardId: board.id,
          boardTitle: board.title,
          navLabel: cell.title,
          title: cell.title,
          summary: cell.summary,
          html: cell.html,
          type: "cell",
        }));

      return [rootNode, ...childNodes];
    });
  }

  function getCurrentContext() {
    const found = chapterPool.find(({ chapter }) => chapter.id === state.chapterId) || chapterPool[0];
    return {
      group: found.group,
      shelf: found.shelf,
      chapter: found.chapter,
      boards: found.chapter.boards,
    };
  }

  function getActiveBoard(context) {
    if (!state.boardId) {
      state.boardId = context.boards[0]?.id || "";
    }
    return context.boards.find((board) => board.id === state.boardId) || context.boards[0];
  }

  function getSelectedNode(context, activeBoard) {
    const nodes = buildSectionList(context);
    if (!state.selectedNodeId) {
      state.selectedNodeId = activeBoard.id;
    }
    return nodes.find((node) => node.id === state.selectedNodeId) || nodes[0];
  }

  function buildBoardLayout(board) {
    const rootNode = {
      id: board.id,
      boardId: board.id,
      title: board.center.title,
      summary: board.center.summary,
      html: board.center.html,
      type: "root",
      displayIndex: "中",
    };

    return [
      { ...board.cells[0], boardId: board.id, type: "cell", displayIndex: board.cells[0].id },
      { ...board.cells[7], boardId: board.id, type: "cell", displayIndex: board.cells[7].id },
      { ...board.cells[6], boardId: board.id, type: "cell", displayIndex: board.cells[6].id },
      { ...board.cells[1], boardId: board.id, type: "cell", displayIndex: board.cells[1].id },
      rootNode,
      { ...board.cells[5], boardId: board.id, type: "cell", displayIndex: board.cells[5].id },
      { ...board.cells[2], boardId: board.id, type: "cell", displayIndex: board.cells[2].id },
      { ...board.cells[3], boardId: board.id, type: "cell", displayIndex: board.cells[3].id },
      { ...board.cells[4], boardId: board.id, type: "cell", displayIndex: board.cells[4].id },
    ];
  }

  function getGraphNeighbors(activeBoard, currentNode) {
    const nodes = [
      {
        id: activeBoard.id,
        boardId: activeBoard.id,
        title: activeBoard.center.title,
        type: "root",
      },
      ...activeBoard.cells
        .filter((cell) => cell.summary || !/^第 \d+ 格$/.test(cell.title))
        .map((cell) => ({
          id: cell.id,
          boardId: activeBoard.id,
          title: cell.title,
          type: "cell",
        })),
    ];

    if (currentNode.type === "root") {
      return nodes.filter((node) => node.id !== currentNode.id);
    }

    const siblings = nodes.filter((node) => node.id !== currentNode.id);
    const currentIndex = siblings.findIndex((node) => node.id === activeBoard.id);
    if (currentIndex > -1) {
      siblings.splice(currentIndex, 1);
      siblings.unshift(nodes[0]);
    }
    return siblings;
  }

  function findNodeByTitle(title, context) {
    return buildSectionList(context).find((node) => node.title === title || node.navLabel === title);
  }

  function openNode(boardId, nodeId) {
    state.boardId = boardId;
    state.selectedNodeId = nodeId;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  render();
})();
