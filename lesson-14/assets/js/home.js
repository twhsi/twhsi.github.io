import { createHero, createNav, loadJson, setActiveNav } from "./common.js";
import { mountLocalGraph } from "./local-graph.js";
import { loadSiteGraph } from "./site-graph.js";

async function init() {
  const app = document.getElementById("app");
  const lessonData = await loadJson("data/lesson14-meta.json");
  const lesson = lessonData.lesson;
  const vocab = await loadJson("data/lesson14-vocab.json");
  const practice = await loadJson("data/lesson14-practice-a.json");
  const content = await loadJson("data/lesson14-content.json");
  const graph = await loadSiteGraph();

  const placeholderBlocks = content.blocks.filter((block) => block.type === "placeholder").length;

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Lesson 14 Study Desk",
      title: lesson.title,
      lead: lesson.description,
      metrics: [
        `${vocab.items.length} 個單語入口`,
        `${practice.sentences.length} 句練習A句子`,
        `${content.blocks.length} 個導引區塊`,
        "GitHub Pages 靜態部署"
      ],
      aside: `
        <div class="section-heading">
          <h3>這版網站先做到的事</h3>
          <p>從單語、練習A、導引、索引四個入口進入。練習A 先用老師音檔 timestamp 播放，單語頁則補上機器發音與句子反查。</p>
        </div>
        <div class="pill-row">
          <span class="pill">單語搜尋</span>
          <span class="pill">機器發音</span>
          <span class="pill">句子 timestamp</span>
          <span class="pill">Local Graph View</span>
        </div>
      `
    })}
    <section class="panel dashboard">
      <div class="section-heading">
        <h2>This is a lesson 14 book</h2>
        <p class="lead">這不是展示頁，而是第十四課的學習工作台。來源是 <code>第十四課 網站/P.28 單語</code> 與 <code>第十四課 網站/P.32 練習A</code> 兩份資料，並把兩者之間的雙向連結做成網站。</p>
      </div>
      <div class="card">
        <h3>使用方式</h3>
        <div class="bullet-list">
          <p>先從單語頁看詞目與機器發音，再用「原句引用」回查練習A句子。</p>
          <p>到練習A頁逐句播放老師音檔，並反查牽涉到的單語。</p>
          <p>右側 Local Graph View 會顯示目前節點的鄰近關聯，當作網站導引。</p>
        </div>
      </div>
    </section>
    <section class="grid-2">
      <article class="card">
        <div class="section-heading">
          <h3>主入口</h3>
          <p>四個頁面都是同一個資料系統的不同切面。</p>
        </div>
        <div class="mapping-links">
          <a href="./pages/vocab.html">前往單語頁</a>
          <a href="./pages/practice-a.html">前往練習A頁</a>
          <a href="./pages/content.html">前往導引頁</a>
          <a href="./pages/index-map.html">前往索引頁</a>
        </div>
      </article>
      <article class="card">
        <div class="section-heading">
          <h3>目前資料狀態</h3>
          <p>已重用第十四課網站來源筆記與音檔，未完成的人聲逐字 timestamp 先保留可擴充欄位，不把結構拖死在單一頁面。</p>
        </div>
        <div class="bullet-list">
          <p>練習A 已建立句子、文法點、音檔來源欄位。</p>
          <p>單語表先收錄核心詞彙，並加上句子回查與 TTS。</p>
          <p>導引頁目前還有 ${placeholderBlocks} 個 placeholder 區塊待補全文。</p>
        </div>
      </article>
    </section>
    <section class="dashboard">
      <article class="card">
        <div class="section-heading">
          <h3>單語</h3>
          <p>以詞目為主，附上機器發音、詞性、句子回查與引用。</p>
        </div>
        <a class="anchor-link" href="./pages/vocab.html">查看單語頁</a>
      </article>
      <article class="card">
        <div class="section-heading">
          <h3>練習A</h3>
          <p>以句子為主，保留課本音檔 timestamp 與對應單語。</p>
        </div>
        <a class="anchor-link" href="./pages/practice-a.html">查看練習A卡片</a>
      </article>
      <article class="detail-panel">
        <div class="section-heading">
          <h3>Local Graph View</h3>
          <p>首頁先放總覽圖；各分頁右側會切換成當前節點的局部圖。</p>
        </div>
        <div id="home-graph"></div>
      </article>
    </section>
    <section class="panel">
      <div class="section-heading">
        <h2>發布邊界</h2>
        <p class="lead">這一版先把可上線網址做出來，首頁不併入主站，只部署成 GitHub Pages 子路徑。</p>
      </div>
      <div class="grid-3">
        <article class="mapping-card">
          <h3>已可用</h3>
          <p>主索引、單語搜尋、練習A 句子卡片、機器發音、老師音檔切段、Local Graph View。</p>
        </article>
        <article class="mapping-card">
          <h3>待校正</h3>
          <p>單語的人聲 mp3 還沒有逐詞 timestamp；目前先保留 schema 與整段來源。</p>
        </article>
        <article class="mapping-card">
          <h3>待補全文</h3>
          <p>導引頁保留課堂補充與逐字稿欄位，之後只要改 JSON 就能續寫。</p>
        </article>
      </div>
    </section>
  `;

  setActiveNav();
  mountLocalGraph(document.getElementById("home-graph"), graph, {
    focusId: lesson.id,
    description: "從首頁看全課中心，點進去後右側會只保留相鄰關聯。"
  });
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
