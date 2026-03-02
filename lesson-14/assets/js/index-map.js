import { createHero, createNav, createTag, loadJson, setActiveNav } from "./common.js";

async function init() {
  const app = document.getElementById("app");
  const vocab = await loadJson("data/lesson14-vocab.json");
  const practice = await loadJson("data/lesson14-practice-a.json");
  const sentenceMap = new Map(practice.sentences.map((sentence) => [sentence.id, sentence]));
  const grammarMap = new Map(practice.grammar.map((item) => [item.id, item]));

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Index Map",
      title: "第14課 索引頁",
      lead: "索引頁把單字、句子、文法串起來。你可以從任一個入口回到其他資料，不用再在多份筆記裡來回找。",
      metrics: [
        `${vocab.items.length} 個單字節點`,
        `${practice.sentences.length} 個句子節點`,
        `${practice.grammar.length} 個文法節點`,
        "Obsidian 可對應"
      ],
      aside: `
        <div class="section-heading">
          <h3>索引用途</h3>
          <p>這一頁就是未來 Obsidian 與網站共用的中樞資料視圖。現在先做最小可用版，之後可以再加分類、標籤、學習進度。</p>
        </div>
      `
    })}
    <section class="panel">
      <div class="section-heading">
        <h2>單字 -> 句子 -> 文法</h2>
        <p class="lead">先從單字出發，直接看到它出現在哪些句子，以及句子對應的文法點。</p>
      </div>
      <div class="mapping-grid" id="mapping-grid"></div>
    </section>
  `;

  setActiveNav();

  const grid = document.getElementById("mapping-grid");
  vocab.items.forEach((item) => {
    const relatedSentences = item.related_sentences.map((id) => sentenceMap.get(id)).filter(Boolean);
    const relatedGrammarIds = [...new Set(relatedSentences.flatMap((sentence) => sentence.grammar_points))];
    const card = document.createElement("article");
    card.className = "mapping-card";
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
    vocabLink.textContent = "查看單字詳情";
    links.appendChild(vocabLink);
    grid.appendChild(card);
  });
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
