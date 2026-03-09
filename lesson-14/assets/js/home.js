import { createHero, createNav, createStatus, createTag, loadJson, setActiveNav } from "./common.js";
import { mountLocalGraph } from "./local-graph.js";
import { loadSiteGraph } from "./site-graph.js";

function mandalaCell({ label, title, body, href = "", tags = [], center = false }) {
  const tagHtml = tags.map((tag) => `<span class="pill">${tag}</span>`).join("");
  const inner = `
    <div class="mandala-label">${label}</div>
    <div class="mandala-title">${title}</div>
    <p class="mandala-caption">${body}</p>
    <div class="mandala-meta">${tagHtml}</div>
  `;
  if (href) {
    return `<a class="mandala-cell${center ? " center" : ""}" href="${href}">${inner}</a>`;
  }
  return `<article class="mandala-cell${center ? " center" : ""}">${inner}</article>`;
}

async function init() {
  const app = document.getElementById("app");
  const lessonData = await loadJson("data/lesson14-meta.json");
  const lesson = lessonData.lesson;
  const vocab = await loadJson("data/lesson14-vocab.json");
  const practice = await loadJson("data/lesson14-practice-a.json");
  const content = await loadJson("data/lesson14-content.json");
  const graph = await loadSiteGraph();

  const centerGrammar = practice.grammar.map((item) => item.pattern).join(" / ");

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Mandala Entry",
      title: "第14課 九宮入口",
      lead: "把第14課做成可掃描、可點入、可回查的九宮學習桌面。先選一格，再往下鑽到單語、句子、文法與導引。",
      metrics: [
        `${vocab.items.length} 個單語`,
        `${practice.sentences.length} 句練習A`,
        `${practice.grammar.length} 個核心句型`,
        "3x3 九宮入口"
      ],
      aside: `
        <div class="section-heading">
          <h3>入口邏輯</h3>
          <p>這版不再先給長列表，而是先給九宮入口。中心是第14課，周圍八格分別帶你進單語、句型、句子、導引與索引。</p>
        </div>
      `
    })}
    <section class="workspace">
      <div class="workspace-grid">
        <div class="panel">
          <div class="section-heading">
            <h2>第14課九宮</h2>
            <p class="lead">這一頁參考 Bunpro 的卡片索引感，但改成固定 3x3 九宮，讓課次本身就是主畫面。</p>
          </div>
          <div class="mandala-grid">
            ${mandalaCell({
              label: "Cell 1",
              title: "單語入口",
              body: "從詞目切入，查看意思、機器發音、原句引用與關聯節點。",
              href: "./pages/vocab.html",
              tags: ["P28", "單語"]
            })}
            ${mandalaCell({
              label: "Cell 2",
              title: "て形變化",
              body: "先記動詞怎麼轉成て形，再回到句型使用。",
              href: "./pages/index-map.html#vocab-kaku",
              tags: ["動詞變化", "基礎"]
            })}
            ${mandalaCell({
              label: "Cell 3",
              title: "Vてください",
              body: "請求句入口，先看代表句，再回查裡面的單語。",
              href: "./pages/practice-a.html#grammar-te-kudasai",
              tags: ["請求", "句型"]
            })}
            ${mandalaCell({
              label: "Cell 4",
              title: "練習A",
              body: "以句子為主的九宮視圖，播放老師音檔、點詞回查單語。",
              href: "./pages/practice-a.html",
              tags: ["P32", "句子"]
            })}
            ${mandalaCell({
              label: "Center",
              title: "第14課",
              body: `中心主題是 ${centerGrammar}。從這裡往外擴到單語、練習A、文法與導引。`,
              tags: [lesson.subtitle, "九宮中心"],
              center: true
            })}
            ${mandalaCell({
              label: "Cell 5",
              title: "V2 + ましょうか",
              body: "提案／幫忙句型入口，適合接服務場景和口語延伸。",
              href: "./pages/practice-a.html#grammar-mashouka",
              tags: ["提案", "幫忙"]
            })}
            ${mandalaCell({
              label: "Cell 6",
              title: "導引頁",
              body: "解釋來源筆記、閱讀順序、音檔策略與 Local Graph View 的讀法。",
              href: "./pages/content.html",
              tags: ["導引", "結構"]
            })}
            ${mandalaCell({
              label: "Cell 7",
              title: "Vています",
              body: "進行、持續、狀態三種讀法的入口。",
              href: "./pages/practice-a.html#grammar-teimasu",
              tags: ["進行", "持續"]
            })}
            ${mandalaCell({
              label: "Cell 8",
              title: "索引圖",
              body: "從單語出發，把句子、文法與內容節點全部串起來。",
              href: "./pages/index-map.html",
              tags: ["索引", "回查"]
            })}
          </div>
        </div>
        <aside class="detail-panel">
          <div class="section-heading">
            <h2>Local Graph View</h2>
            <p>右側保留局部關聯圖，作為九宮之外的第二層導航。</p>
          </div>
          <div id="home-graph"></div>
          <div class="mandala-stack">
            <div class="card">
              <h3>本課狀態</h3>
              <div class="tag-row" id="home-status"></div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `;

  setActiveNav();
  mountLocalGraph(document.getElementById("home-graph"), graph, {
    focusId: lesson.id,
    description: "中心節點是第14課；九宮是固定入口，右側 graph 是動態關聯。"
  });

  const status = document.getElementById("home-status");
  status.appendChild(createStatus("九宮入口"));
  status.appendChild(createStatus(`${content.blocks.length} 個導引區塊`, "warn"));
  practice.grammar.forEach((item) => status.appendChild(createTag(item.pattern)));
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
