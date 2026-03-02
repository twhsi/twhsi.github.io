import { createHero, createNav, createTag, loadJson, setActiveNav } from "./common.js";

async function init() {
  const app = document.getElementById("app");
  const lessonData = await loadJson("data/lesson14-meta.json");
  const lesson = lessonData.lesson;
  const content = await loadJson("data/lesson14-content.json");

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Google Doc Content",
      title: "上課內容頁",
      lead: "這頁先把 Google Doc / 上課逐字稿的資料容器建好。內容區塊已經可按類型、關聯單字、關聯文法擴充，不再把長文直接塞進 HTML。",
      metrics: [
        `${content.blocks.length} 個內容區塊`,
        `${content.blocks.filter((block) => block.type === "note").length} 個摘要區塊`,
        `${content.blocks.filter((block) => block.type === "placeholder").length} 個 placeholder`,
        lesson.subtitle
      ],
      aside: `
        <div class="section-heading">
          <h3>資料結構</h3>
          <p>每個 block 都有 id、title、type、body、related_vocab、related_grammar。後續從 Google Docs 補資料時，直接更新 JSON 即可。</p>
        </div>
      `
    })}
    <section class="panel">
      <div class="section-heading">
        <h2>內容區塊</h2>
        <p class="lead">目前先把老師講解、補充筆記與待整理段落分開，方便逐步擴寫。</p>
      </div>
      <div class="content-grid" id="content-grid"></div>
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
    grid.appendChild(article);
  });
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
