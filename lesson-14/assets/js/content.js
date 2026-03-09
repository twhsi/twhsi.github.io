import { createHero, createNav, createTag, loadJson, setActiveNav } from "./common.js";
import { mountLocalGraph } from "./local-graph.js";
import { loadSiteGraph } from "./site-graph.js";

async function init() {
  const app = document.getElementById("app");
  const lessonData = await loadJson("data/lesson14-meta.json");
  const lesson = lessonData.lesson;
  const content = await loadJson("data/lesson14-content.json");
  const graph = await loadSiteGraph();

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Study Guide",
      title: "第14課 導引頁",
      lead: "這頁不直接塞滿長文，而是放課程導引、來源筆記、音檔策略與 Local Graph View 的閱讀方式。",
      metrics: [
        `${content.blocks.length} 個內容區塊`,
        `${content.blocks.filter((block) => block.type === "note").length} 個摘要區塊`,
        `${content.blocks.filter((block) => block.type === "placeholder").length} 個 placeholder`,
        lesson.subtitle
      ],
      aside: `
        <div class="section-heading">
          <h3>閱讀順序</h3>
          <p>先看單語，再看練習A句子。若想知道某句牽涉哪些單語與文法，就用右側 graph 追過去。</p>
        </div>
      `
    })}
    <section class="workspace">
      <div class="workspace-grid">
        <div class="panel">
          <div class="section-heading">
            <h2>導引區塊</h2>
            <p class="lead">目前先把來源筆記、課程導引、補充筆記與待整理段落分開，方便逐步擴寫。</p>
          </div>
          <div class="content-grid" id="content-grid"></div>
        </div>
        <aside class="detail-panel">
          <div id="content-graph"></div>
        </aside>
      </div>
    </section>
  `;

  setActiveNav();

  const grid = document.getElementById("content-grid");
  content.blocks.forEach((block) => {
    const article = document.createElement("article");
    article.className = "content-block";
    article.dataset.type = block.type;
    article.innerHTML = `
      <div class="detail-top">
        <div>
          <div class="romaji">${block.type}</div>
          <h3>${block.title}</h3>
        </div>
      </div>
      <p>${block.body}</p>
      <div class="tag-row"></div>
    `;
    const tagRow = article.querySelector(".tag-row");
    block.related_vocab.forEach((item) => tagRow.appendChild(createTag(item)));
    block.related_grammar.forEach((item) => tagRow.appendChild(createTag(item, "warn")));
    article.addEventListener("click", () => {
      history.replaceState(null, "", `#${block.id}`);
      mountLocalGraph(document.getElementById("content-graph"), graph, {
        focusId: block.id,
        description: "導引頁右側會顯示目前區塊牽涉到的單語與文法。"
      });
    });
    grid.appendChild(article);
  });

  const initialFocus = decodeURIComponent(location.hash.replace(/^#/, "")) || content.blocks[0]?.id || lesson.id;
  mountLocalGraph(document.getElementById("content-graph"), graph, {
    focusId: initialFocus,
    description: "這裡用來解釋右側 Local Graph View 的閱讀方式。"
  });
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
