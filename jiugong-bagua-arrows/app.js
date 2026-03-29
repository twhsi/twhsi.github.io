(() => {
  const RELATION_LABEL = {
    next: "next",
    previous: "previous",
    opposite: "opposite",
    center: "center",
    adjacent: "adjacent",
    jump: "jump",
  };

  const siteTitleEl = document.getElementById("site-title");
  const sourceFileEl = document.getElementById("source-file");
  const fileListEl = document.getElementById("file-list");
  const focusTitleEl = document.getElementById("focus-title");
  const focusTagNumberEl = document.getElementById("focus-tag-number");
  const focusTagTrigramEl = document.getElementById("focus-tag-trigram");
  const focusTagDirectionEl = document.getElementById("focus-tag-direction");
  const flowStripEl = document.getElementById("flow-strip");
  const boardGridEl = document.getElementById("board-grid");
  const arrowLayerEl = document.getElementById("arrow-layer");
  const readerFileEl = document.getElementById("reader-file");
  const readerMetaEl = document.getElementById("reader-meta");
  const readerContentEl = document.getElementById("reader-content");
  const relationFiltersEl = document.getElementById("relation-filters");
  const excalRootEl = document.getElementById("excal-root");
  const excalCaptionEl = document.getElementById("excal-caption");

  const state = {
    data: null,
    nodeMap: new Map(),
    sectionMap: new Map(),
    currentNodeId: null,
    activeRelations: new Set(),
    flowSteps: [],
    activeStepIndex: 0,
    flowTimer: null,
    excalRenderer: null,
  };

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function inlineMarkup(text) {
    return String(text || "")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/!\[\[[^\]]+\]\]/g, "")
      .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
        const shown = alias || target;
        return `<a href="#" data-node-link="${escapeHtml(target.trim())}">${escapeHtml(shown)}</a>`;
      });
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || "").split("\n");
    let html = "";
    let listType = null;

    const closeList = () => {
      if (!listType) return;
      html += `</${listType}>`;
      listType = null;
    };

    lines.forEach((rawLine) => {
      const line = rawLine.trimEnd();
      const text = line.trim();

      if (!text) {
        closeList();
        return;
      }

      if (/^#{1,6}\s+/.test(text)) {
        closeList();
        const level = text.match(/^#+/)[0].length;
        const content = inlineMarkup(text.replace(/^#{1,6}\s+/, ""));
        html += `<h${Math.min(6, level)}>${content}</h${Math.min(6, level)}>`;
        return;
      }

      if (/^>\s?/.test(text)) {
        closeList();
        html += `<blockquote>${inlineMarkup(text.replace(/^>\s?/, ""))}</blockquote>`;
        return;
      }

      if (/^\d+\.\s+/.test(text)) {
        if (listType !== "ol") {
          closeList();
          listType = "ol";
          html += "<ol>";
        }
        html += `<li>${inlineMarkup(text.replace(/^\d+\.\s+/, ""))}</li>`;
        return;
      }

      if (/^[-*+]\s+/.test(text)) {
        if (listType !== "ul") {
          closeList();
          listType = "ul";
          html += "<ul>";
        }
        html += `<li>${inlineMarkup(text.replace(/^[-*+]\s+/, ""))}</li>`;
        return;
      }

      closeList();
      html += `<p>${inlineMarkup(text)}</p>`;
    });

    closeList();
    return html || "<p>（此段目前沒有內容）</p>";
  }

  function getNode(nodeId) {
    return state.nodeMap.get(nodeId) || null;
  }

  function normalizeNodeToken(value) {
    return String(value || "")
      .trim()
      .replace(/\.md$/i, "")
      .replace(/^split\//, "");
  }

  function resolveNodeId(rawToken) {
    const token = normalizeNodeToken(rawToken);
    if (state.nodeMap.has(token)) return token;

    for (const [id, node] of state.nodeMap.entries()) {
      if (normalizeNodeToken(node.title) === token) return id;
      if (normalizeNodeToken(node.id) === token) return id;
    }
    return null;
  }

  function relationTargets(node, relationType) {
    return (node?.relations?.[relationType] || [])
      .map((id) => state.nodeMap.get(id))
      .filter(Boolean);
  }

  function formatNodeName(node) {
    if (!node) return "";
    if (node.kind === "core") {
      return `${node.number}(${node.trigram || ""})`;
    }
    return node.id;
  }

  function getCurrentCoreId() {
    const node = getNode(state.currentNodeId);
    if (!node) return null;
    return node.kind === "child" ? node.parentId : node.id;
  }

  function buildFlowSteps() {
    const sequence = state.data?.arrowSequence || [];
    const steps = [];
    for (let index = 0; index < sequence.length - 1; index += 1) {
      steps.push({
        index,
        from: String(sequence[index]),
        to: String(sequence[index + 1]),
      });
    }
    return steps;
  }

  function syncActiveStepToCore(coreId) {
    const stepIndex = state.flowSteps.findIndex((step) => step.from === coreId);
    if (stepIndex >= 0) {
      state.activeStepIndex = stepIndex;
    }
  }

  function setCurrentNode(nodeId) {
    if (!state.nodeMap.has(nodeId)) return;
    state.currentNodeId = nodeId;
    syncActiveStepToCore(getCurrentCoreId());
    location.hash = encodeURIComponent(nodeId);
    renderAll();
  }

  function renderFilters() {
    relationFiltersEl.innerHTML = "";
    const relationTypes = state.data?.relationTypes || [];

    relationTypes.forEach((type) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `relation-chip${state.activeRelations.has(type) ? " active" : ""}`;
      button.textContent = RELATION_LABEL[type] || type;
      button.addEventListener("click", () => {
        if (state.activeRelations.has(type)) {
          if (state.activeRelations.size === 1) return;
          state.activeRelations.delete(type);
        } else {
          state.activeRelations.add(type);
        }
        renderAll();
      });
      relationFiltersEl.appendChild(button);
    });
  }

  function renderFileList() {
    const current = getNode(state.currentNodeId);
    fileListEl.innerHTML = "";

    const flattenedGrid = (state.data?.coreGrid || []).flat();
    flattenedGrid.forEach((id) => {
      const coreNode = getNode(id);
      if (!coreNode) return;

      const groupEl = document.createElement("section");
      groupEl.className = "file-group";

      const coreButton = document.createElement("button");
      const activeCore = current?.id === coreNode.id || current?.parentId === coreNode.id;
      coreButton.type = "button";
      coreButton.className = `file-item core${activeCore ? " active" : ""}`;
      coreButton.innerHTML = `
        <span>${escapeHtml(coreNode.filePath || `${coreNode.id}.md`)}</span>
        <span class="file-meta">${escapeHtml(coreNode.title)}</span>
      `;
      coreButton.addEventListener("click", () => setCurrentNode(coreNode.id));
      groupEl.appendChild(coreButton);

      (coreNode.children || []).forEach((childId) => {
        const childNode = getNode(childId);
        if (!childNode) return;
        const childButton = document.createElement("button");
        childButton.type = "button";
        childButton.className = `file-item child${current?.id === childNode.id ? " active" : ""}`;
        childButton.innerHTML = `
          <span>${escapeHtml(childNode.filePath || `${childNode.id}.md`)}</span>
          <span class="file-meta">${escapeHtml(childNode.title)}</span>
        `;
        childButton.addEventListener("click", () => setCurrentNode(childNode.id));
        groupEl.appendChild(childButton);
      });

      fileListEl.appendChild(groupEl);
    });
  }

  function renderFlowStrip() {
    if (!flowStripEl) return;
    flowStripEl.innerHTML = "";
    const flatGrid = (state.data?.coreGrid || []).flat();

    state.flowSteps.forEach((step, stepIndex) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `flow-step${stepIndex === state.activeStepIndex ? " active" : ""}`;
      button.innerHTML = `
        <span class="flow-step-title">${stepIndex + 1}. ${escapeHtml(step.from)}→${escapeHtml(step.to)}</span>
        <span class="flow-mini">
          ${flatGrid
            .map((cellId) => {
              const classes = [
                "flow-dot",
                cellId === step.from ? "from" : "",
                cellId === step.to ? "to" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return `<span class="${classes}"></span>`;
            })
            .join("")}
        </span>
      `;
      button.addEventListener("click", () => {
        state.activeStepIndex = stepIndex;
        setCurrentNode(step.from);
      });
      flowStripEl.appendChild(button);
    });
  }

  function renderBoard() {
    const current = getNode(state.currentNodeId);
    const activeCoreId = current?.kind === "child" ? current.parentId : current?.id;
    const flowStep = state.flowSteps[state.activeStepIndex] || null;
    const currentRelationIds = new Set();

    (state.data?.relationTypes || []).forEach((type) => {
      if (!state.activeRelations.has(type)) return;
      (current?.relations?.[type] || []).forEach((id) => {
        const node = getNode(id);
        if (!node) return;
        currentRelationIds.add(node.kind === "child" ? node.parentId : node.id);
      });
    });

    boardGridEl.innerHTML = "";

    (state.data?.coreGrid || []).flat().forEach((id) => {
      const node = getNode(id);
      if (!node) return;
      const button = document.createElement("button");
      button.type = "button";
      const isActive = node.id === activeCoreId;
      const isRelated = currentRelationIds.has(node.id);
      const isFlowFrom = flowStep && flowStep.from === node.id;
      const isFlowTo = flowStep && flowStep.to === node.id;
      button.className = `board-cell${isActive ? " active" : ""}${isRelated && !isActive ? " related" : ""}${isFlowFrom ? " flow-from" : ""}${isFlowTo ? " flow-to" : ""}`;
      button.innerHTML = `
        <span class="board-num">${escapeHtml(String(node.number))}</span>
        <span class="board-trigram">${escapeHtml(node.trigram || "")}</span>
        <span class="board-detail">position: ${escapeHtml(node.positionLabel || node.position || "")}</span>
        <span class="board-detail">direction: ${escapeHtml(node.directionLabel || node.direction || "")}</span>
      `;
      button.addEventListener("click", () => setCurrentNode(node.id));
      boardGridEl.appendChild(button);
    });
  }

  function renderArrowLayer() {
    const steps = state.flowSteps || [];
    const coreNodes = (state.data?.coreGrid || []).flat().map((id) => getNode(id)).filter(Boolean);
    if (!steps.length || !coreNodes.length) {
      arrowLayerEl.innerHTML = "";
      return;
    }

    const defs = `
      <defs>
        <marker id="arrow-tip" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(47, 127, 141, 0.86)"></path>
        </marker>
      </defs>
    `;

    const centerPoint = (id) => {
      const node = getNode(id);
      if (!node || typeof node.row !== "number" || typeof node.col !== "number") return null;
      return {
        x: (node.col + 0.5) * 100,
        y: (node.row + 0.5) * 100,
      };
    };

    const lines = [];
    const labels = [];
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      const source = centerPoint(step.from);
      const target = centerPoint(step.to);
      if (!source || !target) continue;
      const activeClass = index === state.activeStepIndex ? " active" : "";
      lines.push(`<line class="flow-line${activeClass}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" marker-end="url(#arrow-tip)"></line>`);
      labels.push(`<text class="flow-label" x="${(source.x + target.x) / 2}" y="${(source.y + target.y) / 2 - 4}" text-anchor="middle">${index + 1}</text>`);
    }

    const origin = centerPoint(steps[0].from);
    const originDot = origin ? `<circle class="origin" cx="${origin.x}" cy="${origin.y}" r="3"></circle>` : "";
    arrowLayerEl.innerHTML = `${defs}${lines.join("")}${labels.join("")}${originDot}`;
  }

  function renderRelationSummary(node) {
    const rows = (state.data?.relationTypes || []).map((type) => {
      const targets = relationTargets(node, type);
      const text = targets.length
        ? targets.map((item) => formatNodeName(item)).join("、")
        : "（無）";
      return `<p class="relation-line"><strong>${escapeHtml(RELATION_LABEL[type] || type)}</strong>：${escapeHtml(text)}</p>`;
    });

    return `
      <section class="relation-summary">
        <h4>九數關係摘要</h4>
        ${rows.join("")}
      </section>
    `;
  }

  function renderReader() {
    const node = getNode(state.currentNodeId);
    if (!node) {
      readerFileEl.textContent = "split/?.md";
      readerMetaEl.textContent = "找不到焦點節點";
      readerContentEl.innerHTML = "<p>目前沒有可顯示的內容。</p>";
      return;
    }

    const section = state.sectionMap.get(node.id) || null;
    readerFileEl.textContent = section?.filePath || node.filePath || `${node.id}.md`;

    const details = [
      `id ${node.id}`,
      node.kind === "core" ? `number ${node.number}` : `child ${node.number}`,
      node.trigram ? `卦 ${node.trigram}` : null,
      node.positionLabel ? `position ${node.positionLabel}` : null,
      node.directionLabel ? `direction ${node.directionLabel}` : null,
    ].filter(Boolean);
    readerMetaEl.textContent = details.join(" ｜ ");

    const contentSource = section?.content || node.content || `# ${node.title}\n\n（這一節尚未填內容）`;
    readerContentEl.innerHTML = `${markdownToHtml(contentSource)}${renderRelationSummary(node)}`;

    readerContentEl.querySelectorAll("[data-node-link]").forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        const targetId = resolveNodeId(anchor.dataset.nodeLink);
        if (targetId) setCurrentNode(targetId);
      });
    });
  }

  function renderFocusHeader() {
    const node = getNode(state.currentNodeId);
    if (!node) {
      focusTitleEl.textContent = "資料未載入";
      focusTagNumberEl.textContent = "數字";
      focusTagTrigramEl.textContent = "卦";
      focusTagDirectionEl.textContent = "方位";
      return;
    }

    focusTitleEl.textContent = node.title;
    focusTagNumberEl.textContent = `數字 ${node.number}`;
    focusTagTrigramEl.textContent = `卦 ${node.trigram || "-"}`;
    focusTagDirectionEl.textContent = `Idea ${node.directionLabel || node.direction || "-"}`;
  }

  function renderExcalibrain() {
    const node = getNode(state.currentNodeId);
    if (!node || !state.excalRenderer) return;
    const currentCoreId = getCurrentCoreId();
    const flowStep = state.flowSteps[state.activeStepIndex] || null;

    const summary = [];
    ["next", "previous", "opposite"].forEach((type) => {
      if (!state.activeRelations.has(type)) return;
      const first = relationTargets(node, type)[0];
      if (first) {
        summary.push(`${type}→${formatNodeName(first)}`);
      }
    });
    excalCaptionEl.textContent = summary.length
      ? `焦點 ${formatNodeName(getNode(currentCoreId) || node)} ｜ ${summary.join(" ｜ ")} ｜ flow ${flowStep?.from || "-"}→${flowStep?.to || "-"}`
      : `焦點 ${formatNodeName(getNode(currentCoreId) || node)} ｜ flow ${flowStep?.from || "-"}→${flowStep?.to || "-"}`;

    state.excalRenderer.render({
      currentNodeId: currentCoreId || node.id,
      nodeMap: state.nodeMap,
      activeRelationTypes: [...state.activeRelations],
      activeFlowEdge: flowStep,
      flowSteps: state.flowSteps,
    });
  }

  function renderAll() {
    renderFocusHeader();
    renderFileList();
    renderFilters();
    renderFlowStrip();
    renderBoard();
    renderArrowLayer();
    renderReader();
    renderExcalibrain();
  }

  function startFlowMotion() {
    if (state.flowTimer) {
      clearInterval(state.flowTimer);
      state.flowTimer = null;
    }
    if (!state.flowSteps.length) return;

    state.flowTimer = setInterval(() => {
      state.activeStepIndex = (state.activeStepIndex + 1) % state.flowSteps.length;
      renderFlowStrip();
      renderBoard();
      renderArrowLayer();
      renderExcalibrain();
    }, 1800);
  }

  async function loadData() {
    const response = await fetch(`./data/site-data.json?v=${Date.now()}`);
    if (!response.ok) {
      throw new Error("site-data.json 載入失敗，請先執行 node build-site.mjs");
    }
    return response.json();
  }

  async function init() {
    state.data = await loadData();

    state.nodeMap = new Map((state.data.nodes || []).map((node) => [node.id, node]));
    state.sectionMap = new Map((state.data.sections || []).map((section) => [section.id, section]));
    state.flowSteps = buildFlowSteps();

    const allRelations = state.data.relationTypes || ["next", "previous", "opposite", "center", "adjacent", "jump"];
    state.activeRelations = new Set(allRelations);

    if (siteTitleEl) {
      siteTitleEl.textContent = state.data?.meta?.title || "九宮八卦箭頭";
      document.title = `${state.data?.meta?.title || "九宮八卦箭頭"}｜三欄 Excalibrain`;
    }
    if (sourceFileEl) {
      sourceFileEl.textContent = state.data?.sourceFile || "+ 九宮－八卦－箭頭.md";
    }

    if (window.ExcalibrainRenderer?.createRenderer) {
      state.excalRenderer = window.ExcalibrainRenderer.createRenderer({
        rootEl: excalRootEl,
        onNodeClick: (nodeId) => setCurrentNode(nodeId),
      });
    }

    const hashId = decodeURIComponent(location.hash.replace(/^#/, ""));
    const firstNode = state.nodeMap.has(hashId)
      ? hashId
      : state.data.featuredNodeId || state.data?.coreGrid?.[1]?.[1] || "5";
    state.currentNodeId = firstNode;
    syncActiveStepToCore(getCurrentCoreId());

    renderAll();
    startFlowMotion();

    window.addEventListener("resize", () => {
      renderFlowStrip();
      renderBoard();
      renderArrowLayer();
      renderExcalibrain();
    });
  }

  init().catch((error) => {
    focusTitleEl.textContent = "初始化失敗";
    readerMetaEl.textContent = "請檢查資料檔案";
    readerContentEl.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    console.error(error);
  });
})();
