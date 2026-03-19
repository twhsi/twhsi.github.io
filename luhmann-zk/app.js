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
    outlineNav: document.querySelector("#outline-nav"),
    keywordSearch: document.querySelector("#keyword-search"),
    graphTitle: document.querySelector("#graph-title"),
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
    renderHeader(context);
    renderBoardArea(context);
    renderArticle(context);
    renderRightPanel(context);
  }

  function renderNav(context) {
    refs.libraryNav.innerHTML = "";

    data.groups.forEach((group) => {
      const groupEl = document.createElement("section");
      groupEl.className = "group-card";
      groupEl.innerHTML = `<div class="group-name">${escapeHtml(group.title)}</div>`;

      group.shelves.forEach((shelf) => {
        const shelfTitle = document.createElement("div");
        shelfTitle.className = "shelf-title";
        shelfTitle.textContent = shelf.title;
        groupEl.append(shelfTitle);

        shelf.chapters.forEach((chapter) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = `note-link${chapter.id === context.chapter.id ? " is-active" : ""}`;
          button.textContent = chapter.title;
          button.addEventListener("click", () => openChapter(chapter.id));
          groupEl.append(button);
        });
      });

      refs.libraryNav.append(groupEl);
    });
  }

  function renderHeader(context) {
    refs.viewTitle.textContent = context.chapter.title;
    refs.viewSummary.textContent = context.chapter.summary;
    refs.articleTitle.textContent = context.chapter.title;
    refs.articleMeta.innerHTML = [
      context.group.title,
      context.shelf.title,
      context.chapter.hasMandala ? "九宮筆記" : "筆記",
    ]
      .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
      .join("");
  }

  function renderBoardArea(context) {
    const activeBoard = context.boards.find((board) => board.id === state.boardId) || context.boards[0];
    const centerCell = normalizeCenterCell(context, activeBoard);

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
      { ...activeBoard.cells[0], displayIndex: "1" },
      { ...activeBoard.cells[1], displayIndex: "2" },
      { ...activeBoard.cells[2], displayIndex: "3" },
      { ...activeBoard.cells[3], displayIndex: "4" },
      { ...centerCell, displayIndex: "中", center: true },
      { ...activeBoard.cells[4], displayIndex: "5" },
      { ...activeBoard.cells[5], displayIndex: "6" },
      { ...activeBoard.cells[6], displayIndex: "7" },
      { ...activeBoard.cells[7], displayIndex: "8" },
    ];

    layout.forEach((cell) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = cell.center ? "mandala-center" : "mandala-cell";
      button.innerHTML = `
        <span class="cell-index">${cell.displayIndex}</span>
        <strong>${escapeHtml(cell.title)}</strong>
        <span>${escapeHtml(cell.summary || "點擊前往章節")}</span>
      `;
      button.addEventListener("click", () => {
        if (cell.center) {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        const heading = findHeadingByText(cell.title);
        if (heading) {
          heading.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (cell.targetType === "chapter" && cell.targetId) {
          openChapter(cell.targetId);
        }
      });
      refs.mandalaGrid.append(button);
    });
  }

  function renderArticle(context) {
    refs.articleContent.innerHTML = context.chapter.html;
    prepareArticleHeadings();
    renderOutline();
  }

  function renderOutline() {
    const headings = [...refs.articleContent.querySelectorAll("h1, h2, h3")];
    refs.outlineNav.innerHTML = "";

    if (!headings.length) {
      refs.outlineNav.innerHTML = '<p class="empty-state">這篇目前沒有可顯示的大綱。</p>';
      return;
    }

    headings.forEach((heading) => {
      const link = document.createElement("a");
      link.href = `#${heading.id}`;
      link.className = `outline-link outline-${heading.tagName.toLowerCase()}`;
      link.textContent = heading.textContent.trim();
      refs.outlineNav.append(link);
    });
  }

  function renderRightPanel(context = getCurrentContext()) {
    const activeKeyword = state.keyword || "";
    const query = state.query.toLowerCase();
    const chapter = context.chapter;
    const focusKeywords = chapter.keywords.slice(0, 10);

    refs.graphTitle.textContent = activeKeyword ? `關鍵字：${activeKeyword}` : "關鍵字";

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
    keywordSource.slice(0, 18).forEach((keyword) => {
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
      .slice(0, 10);

    refs.keywordResults.innerHTML = "";
    if (!results.length) {
      refs.keywordResults.innerHTML = '<p class="empty-state">目前沒有其他更接近的相關筆記。</p>';
      return;
    }

    results.forEach(({ group, shelf, chapter: item }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "result-button";
      button.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(group.title)} / ${escapeHtml(shelf.title)}</span>`;
      button.addEventListener("click", () => openChapter(item.id));
      refs.keywordResults.append(button);
    });
  }

  function prepareArticleHeadings() {
    const headings = [...refs.articleContent.querySelectorAll("h1, h2, h3")];
    headings.forEach((heading, index) => {
      const slug = slugify(heading.textContent) || `section-${index + 1}`;
      heading.id = slug;
    });
  }

  function findHeadingByText(text) {
    const normalized = text.trim();
    return [...refs.articleContent.querySelectorAll("h1, h2, h3")].find(
      (heading) => heading.textContent.trim() === normalized,
    );
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

    return {
      id: "shelf-overview",
      title: `${shelf.title} 九宮索引`,
      center: {
        title: chapter.title,
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

  function normalizeCenterCell(context, board) {
    return {
      id: "center",
      title: board.center?.title || context.chapter.title,
      summary: board.center?.summary || context.chapter.summary,
      html: board.center?.html || context.chapter.html,
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
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function findChapterByLink(linkText) {
    const normalized = linkText.replace(/^[[\]]+|[[\]]+$/g, "").trim();

    return chapterPool.find(({ chapter }) =>
      chapter.title === normalized ||
      chapter.keywords.includes(normalized),
    );
  }

  function shareKeywords(a, b) {
    return a.some((item) => b.includes(item));
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
      .replace(/^-+|-+$/g, "");
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
