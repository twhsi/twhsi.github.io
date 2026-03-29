(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SLOT_SEQUENCE = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const SLOT_VECTOR = {
    N: [0, -1],
    NE: [0.74, -0.74],
    E: [1, 0],
    SE: [0.74, 0.74],
    S: [0, 1],
    SW: [-0.74, 0.74],
    W: [-1, 0],
    NW: [-0.74, -0.74],
  };

  function uniqueById(nodes) {
    return [...new Map(nodes.filter(Boolean).map((node) => [node.id, node])).values()];
  }

  function toCoreNode(node, nodeMap) {
    if (!node) return null;
    if (node.kind === "core") return node;
    return nodeMap.get(node.parentId) || null;
  }

  function relationCoreTargets(coreNode, relationType, nodeMap) {
    return uniqueById(
      (coreNode?.relations?.[relationType] || [])
        .map((id) => nodeMap.get(id))
        .map((node) => toCoreNode(node, nodeMap))
        .filter((node) => node && node.id !== coreNode.id),
    );
  }

  function createRenderer({ rootEl, onNodeClick }) {
    function render({ currentNodeId, nodeMap, activeRelationTypes, activeFlowEdge, flowSteps }) {
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
      const height = rootEl.clientHeight || 540;
      const padX = Math.max(62, width * 0.14);
      const padY = Math.max(58, height * 0.14);
      const stepX = (width - padX * 2) / 2;
      const stepY = (height - padY * 2) / 2;

      const placements = new Map();
      coreNodes.forEach((node) => {
        const row = Number.isFinite(node.row) ? node.row : 1;
        const col = Number.isFinite(node.col) ? node.col : 1;
        placements.set(node.id, {
          x: padX + col * stepX,
          y: padY + row * stepY,
        });
      });

      const edges = [];
      const edgeKeys = new Set();
      const addEdge = (source, target, kind, active = false) => {
        const key = `${kind}:${source}->${target}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push({ source, target, kind, active });
      };

      (activeRelationTypes || []).forEach((type) => {
        relationCoreTargets(currentCore, type, nodeMap).forEach((targetNode) => {
          addEdge(currentCore.id, targetNode.id, type, false);
        });
      });

      (flowSteps || []).forEach((step) => {
        const isActive = String(step.from) === String(activeFlowEdge?.from || "") && String(step.to) === String(activeFlowEdge?.to || "");
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
        const widthRect = isCurrent ? 88 : 74;
        const heightRect = isCurrent ? 48 : 42;

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
        t2.setAttribute("y", "33");
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
