import { loadJson } from "./common.js";

function sentenceLabel(sentence) {
  return sentence.jp.length > 16 ? `${sentence.jp.slice(0, 16)}...` : sentence.jp;
}

function buildNodeUrl(node) {
  if (node.type === "vocab") return `./vocab.html#${node.id}`;
  if (node.type === "sentence" || node.type === "grammar") return `./practice-a.html#${node.id}`;
  if (node.type === "content") return `./content.html#${node.id}`;
  return "./index-map.html";
}

function addNode(graph, node) {
  graph.nodes.set(node.id, { ...node, url: buildNodeUrl(node) });
}

function addEdge(graph, from, to) {
  if (!graph.nodes.has(from) || !graph.nodes.has(to) || from === to) return;
  const key = [from, to].sort().join("::");
  graph.edges.add(key);
  if (!graph.adj.has(from)) graph.adj.set(from, new Set());
  if (!graph.adj.has(to)) graph.adj.set(to, new Set());
  graph.adj.get(from).add(to);
  graph.adj.get(to).add(from);
}

export async function loadSiteGraph() {
  const [meta, vocab, practice, content] = await Promise.all([
    loadJson("data/lesson14-meta.json"),
    loadJson("data/lesson14-vocab.json"),
    loadJson("data/lesson14-practice-a.json"),
    loadJson("data/lesson14-content.json")
  ]);

  const graph = {
    meta,
    nodes: new Map(),
    edges: new Set(),
    adj: new Map()
  };

  addNode(graph, {
    id: meta.lesson.id,
    type: "lesson",
    label: "第14課",
    title: meta.lesson.title
  });

  vocab.items.forEach((item) => {
    addNode(graph, {
      id: item.id,
      type: "vocab",
      label: item.kanji || item.kana,
      title: item.kana
    });
    addEdge(graph, meta.lesson.id, item.id);
  });

  practice.sentences.forEach((sentence) => {
    addNode(graph, {
      id: sentence.id,
      type: "sentence",
      label: sentenceLabel(sentence),
      title: sentence.jp
    });
    addEdge(graph, meta.lesson.id, sentence.id);
  });

  practice.grammar.forEach((item) => {
    addNode(graph, {
      id: item.id,
      type: "grammar",
      label: item.pattern,
      title: item.pattern
    });
    addEdge(graph, meta.lesson.id, item.id);
  });

  content.blocks.forEach((block) => {
    addNode(graph, {
      id: block.id,
      type: "content",
      label: block.title,
      title: block.title
    });
    addEdge(graph, meta.lesson.id, block.id);
  });

  vocab.items.forEach((item) => {
    (item.related_sentences || []).forEach((sentenceId) => addEdge(graph, item.id, sentenceId));
  });

  practice.sentences.forEach((sentence) => {
    (sentence.grammar_points || []).forEach((grammarId) => addEdge(graph, sentence.id, grammarId));
    (sentence.linked_vocab || []).forEach((vocabId) => addEdge(graph, sentence.id, vocabId));
  });

  content.blocks.forEach((block) => {
    (block.related_vocab_ids || []).forEach((vocabId) => addEdge(graph, block.id, vocabId));
    (block.related_grammar_ids || []).forEach((grammarId) => addEdge(graph, block.id, grammarId));
  });

  return graph;
}
