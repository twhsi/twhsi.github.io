import { createHero, createNav, loadJson, setActiveNav } from "./common.js";

async function init() {
  const app = document.getElementById("app");
  const lessonData = await loadJson("data/lesson14-meta.json");
  const lesson = lessonData.lesson;
  const vocab = await loadJson("data/lesson14-vocab.json");
  const practice = await loadJson("data/lesson14-practice-a.json");
  const content = await loadJson("data/lesson14-content.json");

  const placeholderBlocks = content.blocks.filter((block) => block.type === "placeholder").length;

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Lesson 14 Study Desk",
      title: lesson.title,
      lead: lesson.description,
      metrics: [
        `${vocab.items.length} 個單字入口`,
        `${practice.sentences.length} 句練習A句子`,
        `${content.blocks.length} 個內容區塊`,
        "GitHub Pages 靜態部署"
      ],
      aside: `
        <div class="section-heading">
          <h3>這次 MVP 能做的事</h3>
          <p>從首頁進入單字、練習A、內容、索引四個工作區。資料已抽離成 JSON，音檔播放支援整段 MP3 + 秒數切段。</p>
        </div>
        <div class="pill-row">
          <span class="pill">單字搜尋</span>
          <span class="pill">詞性篩選</span>
          <span class="pill">句子播放</span>
          <span class="pill">Obsidian 對應</span>
        </div>
      `
    })}
    <section class="panel dashboard">
      <div class="section-heading">
        <h2>This is a lesson 14 book</h2>
        <p class="lead">這不是展示頁，而是第十四課的學習工作台。目標是把課本音檔、上課筆記、單字索引、文法整理放進同一套可維護的前端結構。</p>
      </div>
      <div class="card">
        <h3>使用方式</h3>
        <div class="bullet-list">
          <p>先從單字頁確認本課詞彙，利用 related sentence 反查句子。</p>
          <p>再到練習A頁逐句播放，對照 time segment 修正秒數。</p>
          <p>內容頁保留 Google Doc 區塊，後續逐步補進老師講解與逐字稿。</p>
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
          <a href="./pages/vocab.html">前往單字頁</a>
          <a href="./pages/practice-a.html">前往練習A頁</a>
          <a href="./pages/content.html">前往內容頁</a>
          <a href="./pages/index-map.html">前往索引頁</a>
        </div>
      </article>
      <article class="card">
        <div class="section-heading">
          <h3>目前資料狀態</h3>
          <p>已重用現有第十四課筆記與音檔，未完成的地方保留 placeholder，不把結構拖死在單一頁面。</p>
        </div>
        <div class="bullet-list">
          <p>練習A 已建立句子、文法點、音檔來源欄位。</p>
          <p>單字表先收錄核心詞彙，之後可直接追加 JSON。</p>
          <p>Google Doc 內容目前還有 ${placeholderBlocks} 個 placeholder 區塊待補全文。</p>
        </div>
      </article>
    </section>
    <section class="grid-3">
      <article class="card">
        <div class="section-heading">
          <h3>目錄</h3>
          <p>以句子為單位，結合音檔播放與文法標籤。</p>
        </div>
        <a class="anchor-link" href="./pages/practice-a.html">查看練習A卡片</a>
      </article>
      <article class="card">
        <div class="section-heading">
          <h3>內容</h3>
          <p>承接 Google Doc 的課堂全文、補充說明與老師講解。</p>
        </div>
        <a class="anchor-link" href="./pages/content.html">查看內容骨架</a>
      </article>
      <article class="card">
        <div class="section-heading">
          <h3>索引</h3>
          <p>以單字為入口，連回句子、文法、補充筆記。</p>
        </div>
        <a class="anchor-link" href="./pages/index-map.html">查看索引關聯</a>
      </article>
    </section>
    <section class="panel">
      <div class="section-heading">
        <h2>MVP 邊界</h2>
        <p class="lead">這一版先把第十四課網站系統搭起來，不假裝資料已經完整。</p>
      </div>
      <div class="grid-3">
        <article class="mapping-card">
          <h3>已可用</h3>
          <p>主索引、單字搜尋、練習A 句子卡片、統一音檔播放器、內容頁骨架、Obsidian mapping 說明。</p>
        </article>
        <article class="mapping-card">
          <h3>待校正</h3>
          <p>練習A 整段 MP3 的 start/end 仍需你實聽後微調；目前數值是可編輯的初始 segment。</p>
        </article>
        <article class="mapping-card">
          <h3>待補全文</h3>
          <p>Google Doc 區塊只先放摘要與 placeholder，之後補資料時只需更新 JSON。</p>
        </article>
      </div>
    </section>
  `;

  setActiveNav();
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
