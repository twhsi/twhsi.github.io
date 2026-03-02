import { SegmentAudioPlayer } from "./audio-player.js";
import { byId, createHero, createNav, createTag, loadJson, setActiveNav } from "./common.js";

function sentenceCard(sentence, grammarMap) {
  const grammarTags = sentence.grammar_points
    .map((id) => grammarMap.get(id)?.pattern)
    .filter(Boolean)
    .map((pattern) => `<span class="tag">${pattern}</span>`)
    .join("");

  return `
    <article class="sentence-card${sentence.layout === "center" ? " is-center" : ""}" id="${sentence.id}">
      <div class="sentence-top">
        <div>
          <div class="romaji">${sentence.section}</div>
          <h3>${sentence.jp}</h3>
        </div>
        <button class="button" type="button" data-play="${sentence.id}">播放句子</button>
      </div>
      <p>${sentence.zh}</p>
      <p class="small">${sentence.romaji}</p>
      <div class="sentence-tags">${grammarTags}</div>
      <div class="timeline">
        <span>${sentence.audio?.label || "課本音檔"}</span>
        <span>${sentence.start}s to ${sentence.end}s</span>
      </div>
      <p class="footnote">${sentence.note || ""}</p>
    </article>
  `;
}

async function init() {
  const app = document.getElementById("app");
  const lessonData = await loadJson("data/lesson14-meta.json");
  const practice = await loadJson("data/lesson14-practice-a.json");
  const grammarMap = new Map(practice.grammar.map((item) => [item.id, item]));

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Practice A",
      title: "第14課 練習A",
      lead: "用句子卡片整理第十四課練習A。每句都從資料檔讀入，播放邏輯統一支援整段 MP3 + start/end 或單獨音檔。",
      metrics: [
        `${practice.sentences.length} 張句子卡`,
        `${practice.grammar.length} 個文法點`,
        lessonData.audio_sources[0].label,
        "九宮式閱讀"
      ],
      aside: `
        <div class="section-heading">
          <h3>播放規則</h3>
          <p>這版優先使用課本整段 MP3 與秒數切段。你之後如果切成逐句 MP3，只要改 JSON 的 audio.mode 與 file，不必重寫頁面。</p>
        </div>
        <div class="pill-row">
          <span class="pill">整段 MP3 + 秒數</span>
          <span class="pill">逐句 MP3 相容</span>
          <span class="pill">文法標籤</span>
        </div>
      `
    })}
    <section class="workspace">
      <div class="workspace-grid">
        <div class="panel">
          <div class="section-heading">
            <h2>句子卡片</h2>
            <p>先聽老師錄音，再對照句型與中文。中心卡是本課三個核心句型。</p>
          </div>
          <div class="sentence-grid" id="sentence-grid"></div>
        </div>
        <aside class="detail-panel">
          <div class="section-heading">
            <h2>文法索引</h2>
            <p>句子不是單獨背。每張卡都掛回文法點，之後也能從單字頁與內容頁交叉連結。</p>
          </div>
          <div class="list" id="grammar-list"></div>
          <div data-audio-dock></div>
        </aside>
      </div>
    </section>
  `;

  setActiveNav();
  const audioPlayer = new SegmentAudioPlayer();

  const grid = document.getElementById("sentence-grid");
  grid.innerHTML = practice.sentences.map((sentence) => sentenceCard(sentence, grammarMap)).join("");
  grid.querySelectorAll("[data-play]").forEach((button) => {
    button.addEventListener("click", () => {
      const sentence = byId(practice.sentences, button.dataset.play);
      if (sentence) audioPlayer.play(sentence.audio, sentence.jp);
    });
  });

  const grammarList = document.getElementById("grammar-list");
  practice.grammar.forEach((item) => {
    const article = document.createElement("article");
    article.className = "card";
    article.innerHTML = `
      <div class="detail-top">
        <h3>${item.pattern}</h3>
        <span class="pill">${item.meaning}</span>
      </div>
      <p>${item.explanation}</p>
      <div class="bullet-list">
        ${item.examples.map((example) => `<p>${example.jp}<br><span class="small">${example.zh}</span></p>`).join("")}
      </div>
    `;
    grammarList.appendChild(article);
  });
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
