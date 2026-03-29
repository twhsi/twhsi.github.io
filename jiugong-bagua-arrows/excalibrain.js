(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const SLOT_SEQUENCE = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const SLOT_VECTOR = {
    N: [0, -1],
    NE: [0.73, -0.73],
    E: [1, 0],
    SE: [0.73, 0.73],
    S: [0, 1],
    SW: [-0.73, 0.73],
    W: [-1, 0],
    NW: [-0.73, -0.73],
  };

  function splitLabelLines(label, maxChars = 13, maxLines = 2) {
    const source = String(label || "").trim();
    if (!source) return ["-"];

    const tokens = /\s/.test(source) ? source.split(/\s+/) : Array.from(source);
    const lines = [""];

    for (const token of tokens) {
      const current = lines[lines.length - 1];
      const separator = /\s/.test(source) && current ? " " : "";
      const candidate = `${current}${separator}${token}`;
      if (candidate.length <= maxChars || !current) {
        lines[lines.length - 1] = candidate;
        continue;
      }
      if (lines.length < maxLines) {
        lines.push(token);
        continue;
      }
      lines[lines.length - 1] = `${current.slice(0, Math.max(0, maxChars - 1))}…`;
      break;
    }

    return lines.slice(0, maxLines);
  }

  function nodeMetric(node, isCurrent = false) {
    const lines = splitLabelLines(node.title || node.id, 13, 2);
    const longest = Math.max(...lines.map((line) => line.length), 6);
    const lineHeight = 13;
    return {
      lines,
      lineHeight,
      width: isCurrent ? Math.max(102, longest * 7.4 + 30) : Math.max(84, longest * 7 + 24),
      height: Math.max(38, lines.length * lineHeight + 18),
    };
  }

  function childPartIndex(nodeId, fallbackIndex = 0) {
    const part = Number(String(nodeId).split(".")[1]);
    if (!Number.isFinite(part) || part <= 0) return fallbackIndex + 1;
    return part;
  }

  function createRenderer({ rootEl, onNodeClick }) {
    function render({ currentNodeId, nodeMap, activeRelationTypes }) {
      if (!rootEl || !nodeMap?.size) return;
      const current = nodeMap.get(currentNodeId);
      if (!current) {
        rootEl.innerHTML = "";
        return;
      }

      const relationTypes = (activeRelationTypes || []).filter(Boolean);
      const neighbors = [];
      const edges = [];
      const edgeKeys = new Set();

      relationTypes.forEach((type) => {
        (current.relations?.[type] || []).forEach((targetId) => {
          const target = nodeMap.get(targetId);
          if (!target) return;
          neighbors.push(target);
          const key = `${type}:${current.id}->${target.id}`;
          if (edgeKeys.has(key)) return;
          edgeKeys.add(key);
          edges.push({ source: current.id, target: target.id, type });
        });
      });

      const uniqueNeighbors = [...new Map(neighbors.map((node) => [node.id, node])).values()];
      const width = rootEl.clientWidth || 360;
      const height = rootEl.clientHeight || 500;
      const centerX = width * 0.5;
      const centerY = height * 0.52;
      const radiusX = Math.max(94, width * 0.33);
      const radiusY = Math.max(82, height * 0.28);

      const placements = new Map();
      const metrics = new Map();
      const occupiedSlots = new Set();
      const centerMetric = nodeMetric(current, true);
      metrics.set(current.id, centerMetric);
      placements.set(current.id, {
        x: centerX,
        y: centerY,
        kind: "current",
        slot: "C",
      });

      const coreNodes = [];
      const childNodes = [];
      const otherNodes = [];
      uniqueNeighbors.forEach((node) => {
        if (node.kind === "core") {
          coreNodes.push(node);
        } else if (node.kind === "child") {
          childNodes.push(node);
        } else {
          otherNodes.push(node);
        }
      });

      const assignCoreSlot = (node, fallbackIndex) => {
        const preferred = SLOT_VECTOR[node.direction] ? node.direction : null;
        const options = preferred
          ? [preferred, ...SLOT_SEQUENCE.filter((slot) => slot !== preferred)]
          : SLOT_SEQUENCE;
        const slot = options.find((candidate) => !occupiedSlots.has(candidate)) || options[fallbackIndex % options.length];
        occupiedSlots.add(slot);
        const [vx, vy] = SLOT_VECTOR[slot];
        return {
          slot,
          x: centerX + vx * radiusX,
          y: centerY + vy * radiusY,
        };
      };

      coreNodes.forEach((node, index) => {
        metrics.set(node.id, nodeMetric(node));
        const assigned = assignCoreSlot(node, index);
        placements.set(node.id, {
          ...assigned,
          kind: node.kind,
        });
      });

      childNodes.forEach((node, index) => {
        metrics.set(node.id, nodeMetric(node));
        const ringIndex = childPartIndex(node.id, index) - 1;
        const angle = ((-90 + ringIndex * 45) * Math.PI) / 180;
        const radius = Math.min(radiusX, radiusY) * 0.62;
        placements.set(node.id, {
          kind: node.kind,
          slot: `child-${ringIndex}`,
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      });

      if (otherNodes.length) {
        const baseY = Math.min(height - 28, centerY + radiusY + 52);
        const unit = width / (otherNodes.length + 1);
        otherNodes.forEach((node, index) => {
          metrics.set(node.id, nodeMetric(node));
          placements.set(node.id, {
            kind: node.kind,
            slot: `other-${index}`,
            x: unit * (index + 1),
            y: baseY,
          });
        });
      }

      rootEl.innerHTML = `<svg class="excal-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Excalibrain compass graph"><g data-links></g><g data-nodes></g></svg>`;
      const svg = rootEl.querySelector("svg");
      const linksLayer = svg.querySelector("[data-links]");
      const nodesLayer = svg.querySelector("[data-nodes]");

      const neighborMap = new Map();
      placements.forEach((_value, key) => {
        neighborMap.set(key, new Set([key]));
      });

      const lineElements = [];
      edges.forEach((edge) => {
        const source = placements.get(edge.source);
        const target = placements.get(edge.target);
        if (!source || !target) return;

        const line = document.createElementNS(SVG_NS, "line");
        line.setAttribute("class", `excal-link kind-${edge.type}`);
        line.setAttribute("x1", String(source.x));
        line.setAttribute("y1", String(source.y));
        line.setAttribute("x2", String(target.x));
        line.setAttribute("y2", String(target.y));
        linksLayer.appendChild(line);

        lineElements.push({ edge, line });
        neighborMap.get(edge.source)?.add(edge.target);
        neighborMap.get(edge.target)?.add(edge.source);
      });

      const nodeElements = [];
      placements.forEach((place, nodeId) => {
        const node = nodeMap.get(nodeId);
        const metric = metrics.get(nodeId) || nodeMetric(node, nodeId === current.id);
        const group = document.createElementNS(SVG_NS, "g");
        const kindClass = nodeId === current.id ? "current" : node.kind;
        group.setAttribute("class", `excal-node kind-${kindClass}`);
        group.setAttribute("transform", `translate(${place.x - metric.width / 2},${place.y - metric.height / 2})`);
        group.dataset.id = nodeId;

        const rect = document.createElementNS(SVG_NS, "rect");
        rect.setAttribute("width", String(metric.width));
        rect.setAttribute("height", String(metric.height));
        rect.setAttribute("rx", "10");
        rect.setAttribute("ry", "10");

        const text = document.createElementNS(SVG_NS, "text");
        const textTop = (metric.height - metric.lines.length * metric.lineHeight) / 2 + metric.lineHeight - 1;
        metric.lines.forEach((lineText, lineIndex) => {
          const tspan = document.createElementNS(SVG_NS, "tspan");
          tspan.setAttribute("x", "10");
          tspan.setAttribute("y", String(textTop + lineIndex * metric.lineHeight));
          tspan.textContent = lineText;
          text.appendChild(tspan);
        });

        group.addEventListener("click", () => {
          if (typeof onNodeClick === "function") {
            onNodeClick(nodeId);
          }
        });

        group.addEventListener("mouseenter", () => focusNode(nodeId));
        group.addEventListener("mouseleave", () => focusNode(null));

        group.append(rect, text);
        nodesLayer.appendChild(group);
        nodeElements.push({ nodeId, group });
      });

      function focusNode(focusId) {
        const allowed = focusId ? neighborMap.get(focusId) || new Set([focusId]) : null;
        nodeElements.forEach(({ nodeId, group }) => {
          group.classList.toggle("dim", Boolean(allowed && !allowed.has(nodeId)));
        });
        lineElements.forEach(({ edge, line }) => {
          const dim = Boolean(focusId && edge.source !== focusId && edge.target !== focusId);
          line.setAttribute("stroke-opacity", dim ? "0.12" : "0.72");
        });
      }

      svg.addEventListener("mouseleave", () => focusNode(null));
    }

    return { render };
  }

  window.ExcalibrainRenderer = { createRenderer };
})();
