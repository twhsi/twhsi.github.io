(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const GRID_UNIT_PERCENT = 100 / 6;

  const RULE_KEYS = {
    parent: ["parent", "Parent"],
    child: ["child", "Child"],
    previous: ["previous", "prev", "Previous", "Prev"],
    next: ["next", "Next"],
    evidence: ["證據", "evidence", "Evidence"],
    support: ["支持意見", "support", "Support"],
    oppose: ["反對意見", "oppose", "Oppose", "opposition"],
  };

  const relationNameByKey = new Map(
    Object.entries(RULE_KEYS).flatMap(([normalized, aliases]) =>
      aliases.map((alias) => [alias.toLowerCase(), normalized]),
    ),
  );

  function gridCenterPercent(row, col) {
    return {
      x: (2 * Number(col) + 1) * GRID_UNIT_PERCENT,
      y: (2 * Number(row) + 1) * GRID_UNIT_PERCENT,
    };
  }

  function uniqueArray(items) {
    return [...new Set(items.filter(Boolean).map((item) => String(item)))];
  }

  function toCoreNode(node, nodeMap) {
    if (!node) return null;
    if (node.kind === "core") return node;
    return nodeMap.get(node.parentId) || null;
  }

  function normalizeToken(value) {
    return String(value || "")
      .trim()
      .replace(/\.md$/i, "")
      .replace(/^\[\[/, "")
      .replace(/\]\]$/, "")
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  function resolveCoreToken(token, nodeMap) {
    const normalized = normalizeToken(token);
    if (!normalized) return null;

    const coreNodes = [...nodeMap.values()].filter((node) => node.kind === "core");
    for (const node of coreNodes) {
      const candidates = [
        node.id,
        String(node.number || ""),
        node.title,
        node.trigram || "",
        `${node.number || ""}${node.trigram || ""}`,
      ];
      if (candidates.some((candidate) => normalizeToken(candidate) === normalized)) {
        return node;
      }
    }
    return null;
  }

  function splitTargets(rawValue) {
    const source = String(rawValue || "").trim();
    if (!source) return [];

    const wikiTargets = [...source.matchAll(/\[\[([^\]]+)\]\]/g)]
      .map((match) => match[1].split("|")[0].split("#")[0].trim())
      .filter(Boolean);
    if (wikiTargets.length) return wikiTargets;

    return source
      .split(/[，,、；;\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseExcalRules(text, nodeMap, currentCoreId) {
    const result = {
      parent: [],
      child: [],
      previous: [],
      next: [],
      evidence: [],
      support: [],
      oppose: [],
      hasExplicitRelation: false,
    };

    const lines = String(text || "").split("\n");
    lines.forEach((line) => {
      const pair = line.match(/^\s*([^:\n]+)::\s*(.*)$/);
      if (!pair) return;

      const key = relationNameByKey.get(String(pair[1] || "").trim().toLowerCase());
      if (!key) return;

      const resolved = splitTargets(pair[2])
        .map((token) => resolveCoreToken(token, nodeMap))
        .filter(Boolean)
        .map((node) => node.id)
        .filter((id) => id !== currentCoreId);

      result[key] = uniqueArray([...result[key], ...resolved]);
    });

    result.hasExplicitRelation =
      result.parent.length > 0 ||
      result.child.length > 0 ||
      result.previous.length > 0 ||
      result.next.length > 0;

    return result;
  }

  function relationCoreTargets(coreNode, relationType, nodeMap) {
    return uniqueArray(
      (coreNode?.relations?.[relationType] || [])
        .map((id) => nodeMap.get(id))
        .map((node) => toCoreNode(node, nodeMap))
        .filter((node) => node && node.id !== coreNode.id)
        .map((node) => node.id),
    );
  }

  function createRenderer({ rootEl, onNodeClick }) {
    function render({ currentNodeId, nodeMap, activeRelationTypes, activeRuleTypes, activeFlowEdge, flowSteps }) {
      if (!rootEl || !nodeMap?.size) return;

      const currentRaw = nodeMap.get(currentNodeId) || null;
      const currentCore = toCoreNode(currentRaw, nodeMap);
      if (!currentCore) {
        rootEl.innerHTML = "";
        return;
      }

      const coreNodes = [...nodeMap.values()]
        .filter((node) => node.kind === "core")
        .sort((left, right) => Number(left.id) - Number(right.id));

      const width = rootEl.clientWidth || 420;
      const height = rootEl.clientHeight || 520;

      const rulesText = [currentCore.content, currentRaw?.content || ""].join("\n");
      const parsedRules = parseExcalRules(rulesText, nodeMap, currentCore.id);

      const fallbackBuckets = {
        parent: relationCoreTargets(currentCore, "opposite", nodeMap),
        child: relationCoreTargets(currentCore, "adjacent", nodeMap),
        previous: relationCoreTargets(currentCore, "previous", nodeMap),
        next: relationCoreTargets(currentCore, "next", nodeMap),
      };

      const buckets = parsedRules.hasExplicitRelation
        ? {
            parent: parsedRules.parent,
            child: parsedRules.child,
            previous: parsedRules.previous,
            next: parsedRules.next,
          }
        : fallbackBuckets;

      const enabledRules = new Set(
        ((activeRuleTypes && activeRuleTypes.length
          ? activeRuleTypes
          : ["parent", "evidence", "child", "previous", "next", "support", "oppose"]) || []
        ).map((item) => String(item)),
      );

      const placements = new Map();
      const placed = new Set();
      const markPlaced = (id, x, y) => {
        placements.set(id, { x, y });
        placed.add(id);
      };

      const centerPercent = gridCenterPercent(1, 1);
      markPlaced(currentCore.id, (centerPercent.x / 100) * width, (centerPercent.y / 100) * height);

      const spreadHorizontal = (ids, yPercent) => {
        if (!ids.length) return;
        const start = 20;
        const end = 80;
        const span = ids.length === 1 ? 0 : (end - start) / (ids.length - 1);
        ids.forEach((id, index) => {
          if (placed.has(id)) return;
          const xPercent = ids.length === 1 ? 50 : start + span * index;
          markPlaced(id, (xPercent / 100) * width, (yPercent / 100) * height);
        });
      };

      const spreadVertical = (ids, xPercent) => {
        if (!ids.length) return;
        const start = 22;
        const end = 78;
        const span = ids.length === 1 ? 0 : (end - start) / (ids.length - 1);
        ids.forEach((id, index) => {
          if (placed.has(id)) return;
          const yPercent = ids.length === 1 ? 50 : start + span * index;
          markPlaced(id, (xPercent / 100) * width, (yPercent / 100) * height);
        });
      };

      spreadHorizontal(buckets.parent, gridCenterPercent(0, 1).y);
      spreadHorizontal(buckets.child, gridCenterPercent(2, 1).y);
      spreadVertical(buckets.previous, gridCenterPercent(1, 0).x);
      spreadVertical(buckets.next, gridCenterPercent(1, 2).x);

      coreNodes.forEach((node) => {
        if (placed.has(node.id)) return;
        const row = Number.isFinite(node.row) ? node.row : 1;
        const col = Number.isFinite(node.col) ? node.col : 1;
        const point = gridCenterPercent(row, col);
        markPlaced(node.id, (point.x / 100) * width, (point.y / 100) * height);
      });

      const edges = [];
      const edgeKeys = new Set();
      const addEdge = (source, target, kind, active = false) => {
        const key = `${kind}:${source}->${target}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push({ source, target, kind, active });
      };

      Object.entries(buckets).forEach(([kind, ids]) => {
        if (!enabledRules.has(kind)) return;
        ids.forEach((targetId) => addEdge(currentCore.id, targetId, kind, false));
      });

      if (enabledRules.has("evidence")) {
        parsedRules.evidence.forEach((targetId) => addEdge(currentCore.id, targetId, "evidence", false));
      }
      if (enabledRules.has("support")) {
        parsedRules.support.forEach((targetId) => addEdge(currentCore.id, targetId, "support", false));
      }
      if (enabledRules.has("oppose")) {
        parsedRules.oppose.forEach((targetId) => addEdge(currentCore.id, targetId, "oppose", false));
      }

      (flowSteps || []).forEach((step) => {
        const isActive =
          String(step.from) === String(activeFlowEdge?.from || "") &&
          String(step.to) === String(activeFlowEdge?.to || "");
        addEdge(String(step.from), String(step.to), "flow", isActive);
      });

      rootEl.innerHTML = `
        <svg class="excal-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Excalibrain nine-node graph">
          <defs>
            <marker id="excal-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(47, 127, 141, 0.8)"></path>
            </marker>
            <marker id="excal-arrow-active" markerWidth="10" markerHeight="10" refX="7.5" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,8 L8,4 z" fill="rgba(171, 79, 42, 0.98)"></path>
            </marker>
          </defs>
          <g data-links></g>
          <g data-nodes></g>
        </svg>
      `;

      const svg = rootEl.querySelector("svg");
      const linksLayer = svg.querySelector("[data-links]");
      const nodesLayer = svg.querySelector("[data-nodes]");

      const neighborMap = new Map(coreNodes.map((node) => [node.id, new Set([node.id])]));
      const linkElements = [];
      edges.forEach((edge) => {
        const source = placements.get(edge.source);
        const target = placements.get(edge.target);
        if (!source || !target) return;

        const line = document.createElementNS(SVG_NS, "line");
        const activeClass = edge.active ? " active" : "";
        line.setAttribute("class", `excal-link kind-${edge.kind}${activeClass}`);
        line.setAttribute("x1", String(source.x));
        line.setAttribute("y1", String(source.y));
        line.setAttribute("x2", String(target.x));
        line.setAttribute("y2", String(target.y));
        line.setAttribute("marker-end", edge.active ? "url(#excal-arrow-active)" : "url(#excal-arrow)");
        linksLayer.appendChild(line);

        neighborMap.get(edge.source)?.add(edge.target);
        neighborMap.get(edge.target)?.add(edge.source);
        linkElements.push({ edge, line });
      });

      const nodeElements = [];
      coreNodes.forEach((node) => {
        const place = placements.get(node.id);
        if (!place) return;

        const isCurrent = node.id === currentCore.id;
        const isFlowFrom = node.id === String(activeFlowEdge?.from || "");
        const isFlowTo = node.id === String(activeFlowEdge?.to || "");
        const widthRect = isCurrent ? 92 : 78;
        const heightRect = isCurrent ? 52 : 44;

        const group = document.createElementNS(SVG_NS, "g");
        const classes = [
          "excal-node",
          isCurrent ? "kind-current" : "kind-core",
          isFlowFrom ? "flow-from" : "",
          isFlowTo ? "flow-to" : "",
        ]
          .filter(Boolean)
          .join(" ");
        group.setAttribute("class", classes);
        group.setAttribute("transform", `translate(${place.x - widthRect / 2},${place.y - heightRect / 2})`);
        group.dataset.id = node.id;

        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("width", String(widthRect));
        rect.setAttribute("height", String(heightRect));
        rect.setAttribute("rx", "9");
        rect.setAttribute("ry", "9");

        const text = document.createElementNS(SVG_NS, "text");
        const t1 = document.createElementNS(SVG_NS, "tspan");
        t1.setAttribute("x", "9");
        t1.setAttribute("y", "18");
        t1.textContent = `${node.number} ${node.trigram || ""}`.trim();

        const t2 = document.createElementNS(SVG_NS, "tspan");
        t2.setAttribute("x", "9");
        t2.setAttribute("y", "34");
        t2.textContent = node.directionLabel || node.direction || "";

        text.append(t1, t2);
        group.append(rect, text);

        group.addEventListener("click", () => {
          if (typeof onNodeClick === "function") {
            onNodeClick(node.id);
          }
        });
        group.addEventListener("mouseenter", () => focusNode(node.id));
        group.addEventListener("mouseleave", () => focusNode(null));

        nodesLayer.appendChild(group);
        nodeElements.push({ id: node.id, group });
      });

      function focusNode(focusId) {
        const neighborhood = focusId ? neighborMap.get(focusId) || new Set([focusId]) : null;
        nodeElements.forEach(({ id, group }) => {
          group.classList.toggle("dim", Boolean(neighborhood && !neighborhood.has(id)));
        });
        linkElements.forEach(({ edge, line }) => {
          const dim = Boolean(focusId && edge.source !== focusId && edge.target !== focusId);
          line.setAttribute("stroke-opacity", dim ? "0.1" : edge.active ? "1" : "0.7");
        });
      }

      svg.addEventListener("mouseleave", () => focusNode(null));
    }

    return { render };
  }

  window.ExcalibrainRenderer = { createRenderer };
})();
