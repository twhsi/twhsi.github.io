import { SegmentAudioPlayer } from "./audio-player.js";
import { byId, createHero, createNav, loadJson, setActiveNav } from "./common.js";
import { mountLocalGraph } from "./local-graph.js";
import { loadSiteGraph } from "./site-graph.js";
import { TtsPlayer } from "./tts-player.js";

function buildSentenceMandalaCard(sentence, activeId, vocabMap, grammarMap) {
  const grammar = sentence.grammar_points.map((id) => grammarMap.get(id)?.pattern).filter(Boolean).join(" / ");
  const vocabText = (sentence.linked_vocab || []).map((id) => vocabMap.get(id)?.kanji || vocabMap.get(id)?.kana).filter(Boolean).join("、");
  return `
    <button type="button" class="mandala-cell${sentence.id === activeId ? " center" : ""}" data-sentence-card="${sentence.id}">
      <div class="mandala-label">${sentence.section}</div>
      <div class="mandala-title">${sentence.jp}</div>
      <p class="mandala-caption">${sentence.zh}</p>
      <div class="mandala-meta">
        <span class="pill">${grammar || "句型"}</span>
        ${vocabText ? `<span class="pill">${vocabText}</span>` : ""}
      </div>
    </button>
  `;
}

async function init() {
  const app = document.getElementById("app");
  const lessonData = await loadJson("data/lesson14-meta.json");
  const practice = await loadJson("data/lesson14-practice-a.json");
  const vocab = await loadJson("data/lesson14-vocab.json");
  const graph = await loadSiteGraph();
  const vocabMap = new Map(vocab.items.map((item) => [item.id, item]));
  const grammarMap = new Map(practice.grammar.map((item) => [item.id, item]));

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Practice A Mandala",
      title: "第14課 練習A 九宮",
      lead: "把練習A 的核心句子做成 3x3 九宮。先點一格，再播放音檔、看單語、看文法。",
      metrics: [
        `${practice.sentences.length} 句練習A`,
        `${practice.grammar.length} 個文法點`,
        lessonData.audio_sources[1].label,
        "九宮句子桌面"
      ],
      aside: `
        <div class="section-heading">
          <h3>九宮閱讀法</h3>
          <p>中心格放全課中心句；外圍八格放本課代表句。每點一格，右側就同步更新音檔與局部 graph。</p>
        </div>
      `
    })}
    <section class="workspace">
      <div class="workspace-grid">
        <div class="panel">
          <div class="section-heading">
            <h2>句子九宮</h2>
            <p>先點句子，再往右看單語、文法與播放。</p>
          </div>
          <div class="mandala-grid" id="sentence-grid"></div>
        </div>
        <aside class="detail-panel">
          <div id="sentence-detail"></div>
          <div class="list" id="grammar-list"></div>
          <div id="practice-graph"></div>
          <div data-audio-dock></div>
        </aside>
      </div>
    </section>
  `;

  setActiveNav();
  const audioPlayer = new SegmentAudioPlayer();
  const ttsPlayer = new TtsPlayer();
  const hashId = decodeURIComponent(location.hash.replace(/^#/, ""));
  let activeId = practice.sentences.some((item) => item.id === hashId) ? hashId : (practice.sentences.find((item) => item.layout === "center")?.id || practice.sentences[0]?.id);

  const grid = document.getElementById("sentence-grid");
  const detail = document.getElementById("sentence-detail");
  const grammarList = document.getElementById("grammar-list");

  function renderDetail(sentence) {
    const linkedVocab = (sentence.linked_vocab || []).map((id) => vocabMap.get(id)).filter(Boolean);
    const linkedGrammar = sentence.grammar_points.map((id) => grammarMap.get(id)).filter(Boolean);

    detail.innerHTML = `
      <div class="section-heading">
        <h2>${sentence.jp}</h2>
        <p class="lead">${sentence.zh}</p>
      </div>
      <p class="small">${sentence.romaji}</p>
      <div class="tag-row">
        ${linkedGrammar.map((item) => `<a class="tag-link" href="#${item.id}">${item.pattern}</a>`).join("")}
      </div>
      <div class="tag-row">
        ${linkedVocab.map((item) => `<a class="tag-link" href="./vocab.html#${item.id}">${item.kanji || item.kana}</a>`).join("")}
      </div>
      <div class="button-row">
        <button class="button" id="play-sentence">播放句子</button>
        <button class="ghost-button" id="tts-sentence">機器發音</button>
      </div>
      <p class="footnote">${sentence.audio?.label || "課本音檔"} / ${sentence.start}s to ${sentence.end}s</p>
    `;

    detail.querySelector("#play-sentence")?.addEventListener("click", () => {
      audioPlayer.play(sentence.audio, sentence.jp);
    });
    detail.querySelector("#tts-sentence")?.addEventListener("click", () => {
      ttsPlayer.speak(sentence.jp);
    });
    mountLocalGraph(document.getElementById("practice-graph"), graph, {
      focusId: sentence.id,
      description: "點中的句子會把單語、文法與導引節點串在右側。"
    });
  }

  function renderGrid() {
    grid.innerHTML = practice.sentences.slice(0, 9).map((sentence) => buildSentenceMandalaCard(sentence, activeId, vocabMap, grammarMap)).join("");
    grid.querySelectorAll("[data-sentence-card]").forEach((button) => {
      button.addEventListener("click", () => {
        activeId = button.dataset.sentenceCard;
        history.replaceState(null, "", `#${activeId}`);
        renderGrid();
      });
    });

    const activeSentence = byId(practice.sentences, activeId);
    if (activeSentence) renderDetail(activeSentence);
  }

  practice.grammar.forEach((item) => {
    const article = document.createElement("article");
    article.className = "card";
    article.id = item.id;
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

  renderGrid();
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
