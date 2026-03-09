import { createHero, createNav, createTag, loadJson, setActiveNav } from "./common.js";
import { mountLocalGraph } from "./local-graph.js";
import { loadSiteGraph } from "./site-graph.js";

async function init() {
  const app = document.getElementById("app");
  const vocab = await loadJson("data/lesson14-vocab.json");
  const practice = await loadJson("data/lesson14-practice-a.json");
  const graph = await loadSiteGraph();
  const sentenceMap = new Map(practice.sentences.map((sentence) => [sentence.id, sentence]));
  const grammarMap = new Map(practice.grammar.map((item) => [item.id, item]));

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Index Map",
      title: "第14課 索引頁",
      lead: "索引頁把單語、句子、文法串起來。你可以從任一個入口回到其他資料，不用再在多份筆記裡來回找。",
      metrics: [
        `${vocab.items.length} 個單語節點`,
        `${practice.sentences.length} 個句子節點`,
        `${practice.grammar.length} 個文法節點`,
        "Obsidian 可對應"
      ],
      aside: `
        <div class="section-heading">
          <h3>索引用途</h3>
          <p>這一頁就是未來 Obsidian 與網站共用的中樞資料視圖。右側再補一個 Local Graph 總覽，方便對照網站的導引方式。</p>
        </div>
      `
    })}
    <section class="workspace">
      <div class="workspace-grid">
        <div class="panel">
          <div class="section-heading">
            <h2>單語 -> 句子 -> 文法</h2>
            <p class="lead">先從單語出發，直接看到它出現在哪些句子，以及句子對應的文法點。</p>
          </div>
          <div class="mapping-grid" id="mapping-grid"></div>
        </div>
        <aside class="detail-panel">
          <div id="index-graph"></div>
        </aside>
      </div>
    </section>
  `;

  setActiveNav();

  const grid = document.getElementById("mapping-grid");
  vocab.items.forEach((item) => {
    const relatedSentences = item.related_sentences.map((id) => sentenceMap.get(id)).filter(Boolean);
    const relatedGrammarIds = [...new Set(relatedSentences.flatMap((sentence) => sentence.grammar_points))];
    const card = document.createElement("article");
    card.className = "mapping-card";
    card.addEventListener("click", () => {
      mountLocalGraph(document.getElementById("index-graph"), graph, {
        focusId: item.id,
        description: "從索引頁點任一張卡，右側就只顯示這個詞的局部關聯。"
      });
    });
    card.innerHTML = `
      <div class="detail-top">
        <div>
          <div class="jp">${item.kanji || item.kana}</div>
          <div class="romaji">${item.kana} / ${item.romaji}</div>
        </div>
        <span class="pill">${item.pos}</span>
      </div>
      <p>${item.meaning_zh}</p>
      <div class="tag-row"></div>
      <div class="divider"></div>
      <div class="bullet-list">
        ${relatedSentences.map((sentence) => `<p><a class="anchor-link" href="./practice-a.html#${sentence.id}">${sentence.jp}</a><br><span class="small">${sentence.zh}</span></p>`).join("") || `<p class="muted">尚未連到句子。</p>`}
      </div>
      <div class="mapping-links"></div>
    `;

    const tagRow = card.querySelector(".tag-row");
    relatedGrammarIds.forEach((grammarId) => {
      const grammar = grammarMap.get(grammarId);
      if (grammar) tagRow.appendChild(createTag(grammar.pattern, "warn"));
    });

    const links = card.querySelector(".mapping-links");
    const vocabLink = document.createElement("a");
    vocabLink.href = `./vocab.html#${item.id}`;
    vocabLink.textContent = "查看單語詳情";
    links.appendChild(vocabLink);
    grid.appendChild(card);
  });

  mountLocalGraph(document.getElementById("index-graph"), graph, {
    focusId: graph.meta.lesson.id,
    description: "索引頁預設先顯示第14課中心節點。"
  });
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
