import { SegmentAudioPlayer } from "./audio-player.js";
import { byId, createHero, createNav, createTag, loadJson, setActiveNav, uniq } from "./common.js";
import { mountLocalGraph } from "./local-graph.js";
import { loadSiteGraph } from "./site-graph.js";
import { TtsPlayer } from "./tts-player.js";

function sentenceLink(sentence) {
  return `<a class="tag-link" href="./practice-a.html#${sentence.id}">${sentence.jp}</a>`;
}

function buildVocabCard(item, activeId) {
  const activeClass = item.id === activeId ? " center" : "";
  return `
    <button type="button" class="mandala-cell${activeClass}" data-vocab-card="${item.id}">
      <div class="mandala-label">${item.pos}</div>
      <div class="mandala-title">${item.kanji || item.kana}</div>
      <p class="mandala-caption">${item.meaning_zh}</p>
      <div class="mandala-meta">
        <span class="pill">${item.kana}</span>
        <span class="pill">${item.romaji}</span>
      </div>
    </button>
  `;
}

async function init() {
  const app = document.getElementById("app");
  const vocabData = await loadJson("data/lesson14-vocab.json");
  const practice = await loadJson("data/lesson14-practice-a.json");
  const graph = await loadSiteGraph();
  const sentenceMap = new Map(practice.sentences.map((sentence) => [sentence.id, sentence]));
  const posOptions = ["全部", ...uniq(vocabData.items.map((item) => item.pos))];

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Vocabulary Mandala",
      title: "第14課 單語九宮",
      lead: "先用九宮看核心單語，再點任一格，右側展開原句、發音與關聯圖。",
      metrics: [
        `${vocabData.items.length} 個單語`,
        `${posOptions.length - 1} 種詞性`,
        "九宮入口",
        "句子回查"
      ],
      aside: `
        <div class="section-heading">
          <h3>使用方式</h3>
          <p>左邊先選九宮中的一格。右側會顯示這個單語的詳細資訊、原句引用、機器發音與 Local Graph View。</p>
        </div>
      `
    })}
    <section class="workspace">
      <div class="workspace-grid">
        <div class="panel">
          <div class="section-heading">
            <h2>單語九宮</h2>
            <p>先用詞性篩選，再點選九宮中的詞卡。</p>
          </div>
          <div class="controls">
            <input class="input" id="search" type="search" placeholder="搜尋：読んで、教える、交通..." />
            <select class="select" id="pos-filter">
              ${posOptions.map((pos) => `<option value="${pos}">${pos}</option>`).join("")}
            </select>
          </div>
          <div class="mandala-grid" id="vocab-grid"></div>
        </div>
        <aside class="detail-panel">
          <div id="vocab-detail"></div>
          <div id="vocab-graph"></div>
          <div data-audio-dock></div>
        </aside>
      </div>
    </section>
  `;

  setActiveNav();
  const audioPlayer = new SegmentAudioPlayer();
  const ttsPlayer = new TtsPlayer();

  const gridEl = document.getElementById("vocab-grid");
  const detailEl = document.getElementById("vocab-detail");
  const searchEl = document.getElementById("search");
  const filterEl = document.getElementById("pos-filter");
  const hashId = decodeURIComponent(location.hash.replace(/^#/, ""));
  let activeId = vocabData.items.some((item) => item.id === hashId) ? hashId : vocabData.items[0]?.id || null;

  function renderDetail(item) {
    const relatedSentences = item.related_sentences.map((id) => sentenceMap.get(id)).filter(Boolean);
    detailEl.innerHTML = `
      <div class="section-heading">
        <h2>${item.kanji || item.kana}</h2>
        <p class="lead">${item.kana} / ${item.romaji}</p>
      </div>
      <div class="tag-row">
        <span class="pill">${item.pos}</span>
        <span class="pill">${item.meaning_zh}</span>
      </div>
      <p>${item.notes}</p>
      <div class="section-heading">
        <h3>原句引用</h3>
        <p>從單語直接跳回練習A。</p>
      </div>
      <div class="tag-row">
        ${relatedSentences.length ? relatedSentences.map(sentenceLink).join("") : `<span class="muted">目前尚未連到句子。</span>`}
      </div>
      <div class="button-row">
        <button class="button" id="tts-vocab">機器發音</button>
        <button class="ghost-button" id="play-vocab" ${item.audio?.file ? "" : "disabled"}>播放老師音檔</button>
      </div>
      <p class="footnote">來源：${item.source_note}</p>
    `;

    detailEl.querySelector("#tts-vocab")?.addEventListener("click", () => {
      ttsPlayer.speak(item.kanji ? `${item.kanji} ${item.kana}` : item.kana);
    });
    detailEl.querySelector("#play-vocab")?.addEventListener("click", () => {
      audioPlayer.play(item.audio, `${item.kana} ${item.meaning_zh}`);
    });
    mountLocalGraph(document.getElementById("vocab-graph"), graph, {
      focusId: item.id,
      description: "這個單語直接連到哪些句子與文法，右側一眼就能看見。"
    });
  }

  function filteredItems() {
    const query = searchEl.value.trim().toLowerCase();
    const pos = filterEl.value;
    return vocabData.items.filter((item) => {
      const matchesText = [item.kana, item.kanji, item.romaji, item.meaning_zh, item.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      const matchesPos = pos === "全部" || item.pos === pos;
      return matchesText && matchesPos;
    }).slice(0, 9);
  }

  function renderGrid() {
    const items = filteredItems();
    if (!items.some((item) => item.id === activeId)) activeId = items[0]?.id || null;
    gridEl.innerHTML = items.length
      ? items.map((item) => buildVocabCard(item, activeId)).join("")
      : `<article class="mandala-cell center"><div class="mandala-title">沒有符合的單語</div><p class="mandala-caption">請調整搜尋或詞性。</p></article>`;

    gridEl.querySelectorAll("[data-vocab-card]").forEach((button) => {
      button.addEventListener("click", () => {
        activeId = button.dataset.vocabCard;
        history.replaceState(null, "", `#${activeId}`);
        renderGrid();
      });
    });

    const activeItem = byId(vocabData.items, activeId);
    if (activeItem) renderDetail(activeItem);
  }

  searchEl.addEventListener("input", renderGrid);
  filterEl.addEventListener("change", renderGrid);
  renderGrid();
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
