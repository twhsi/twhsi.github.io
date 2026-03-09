function ringPosition(index, total, radius, center) {
  if (total === 0) return center;
  const angle = (-Math.PI / 2) + ((Math.PI * 2) * index) / total;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

function buildVisibleNodes(graph, focusId) {
  const focus = graph.nodes.get(focusId) || graph.nodes.get(graph.meta.lesson.id);
  const neighborIds = [...(graph.adj.get(focus.id) || [])];
  return {
    focus,
    neighbors: neighborIds.map((id) => graph.nodes.get(id)).filter(Boolean)
  };
}

function nodeClass(type, isFocus) {
  return `graph-node graph-${type}${isFocus ? " is-focus" : ""}`;
}

export function mountLocalGraph(container, graph, { focusId, title = "Local Graph View", description = "" } = {}) {
  if (!container) return;

  const visible = buildVisibleNodes(graph, focusId);
  const width = 320;
  const height = 220;
  const center = { x: width / 2, y: height / 2 };
  const radius = Math.min(82, 28 + visible.neighbors.length * 8);

  const nodes = [{ ...visible.focus, position: center, focus: true }];
  visible.neighbors.forEach((node, index) => {
    nodes.push({
      ...node,
      position: ringPosition(index, visible.neighbors.length, radius, center),
      focus: false
    });
  });

  const lines = visible.neighbors.map((node, index) => {
    const point = nodes[index + 1].position;
    return `<line x1="${center.x}" y1="${center.y}" x2="${point.x}" y2="${point.y}" />`;
  }).join("");

  const labels = nodes.map((node) => `
    <a class="${nodeClass(node.type, node.focus)}" href="${node.url}" style="left:${node.position.x}px;top:${node.position.y}px">
      <span>${node.label}</span>
    </a>
  `).join("");

  container.innerHTML = `
    <section class="graph-panel">
      <div class="section-heading">
        <h3>${title}</h3>
        <p>${description || "右側會跟著目前頁面節點，顯示相鄰的單語、句子、文法與導引內容。"}</p>
      </div>
      <div class="graph-stage">
        <svg class="graph-lines" viewBox="0 0 ${width} ${height}" aria-hidden="true">
          ${lines}
        </svg>
        ${labels}
      </div>
      <div class="tag-row graph-legend">
        <span class="tag">單語</span>
        <span class="tag warn">句子 / 文法</span>
        <span class="status-pill">導引</span>
      </div>
    </section>
  `;
}
