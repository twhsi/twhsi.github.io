import { SegmentAudioPlayer } from "./audio-player.js";
import { byId, createHero, createNav, createTag, loadJson, setActiveNav, uniq } from "./common.js";

function buildSentenceMap(sentences) {
  return new Map(sentences.map((sentence) => [sentence.id, sentence]));
}

function renderSentenceLink(sentence) {
  return `
    <a class="anchor-link" href="./practice-a.html#${sentence.id}">
      ${sentence.jp}
    </a>
    <p class="small">${sentence.zh}</p>
  `;
}

async function init() {
  const app = document.getElementById("app");
  const vocabData = await loadJson("data/lesson14-vocab.json");
  const practice = await loadJson("data/lesson14-practice-a.json");
  const sentenceMap = buildSentenceMap(practice.sentences);
  const posOptions = ["全部", ...uniq(vocabData.items.map((item) => item.pos))];

  app.innerHTML = `
    ${createNav()}
    ${createHero({
      eyebrow: "Vocabulary Index",
      title: "第14課 單字頁",
      lead: "以形音義為核心。搜尋單字、篩選詞性、查看 related sentence，之後擴充成更完整的課程索引。",
      metrics: [
        `${vocabData.items.length} 個核心單字`,
        `${posOptions.length - 1} 種詞性`,
        "形音義結構",
        "音檔介面已預留"
      ],
      aside: `
        <div class="section-heading">
          <h3>資料模型</h3>
          <p>每個單字都有 kana、kanji、romaji、中文解釋、詞性、補充、音檔欄位，並可連回練習A句子。</p>
        </div>
        <div class="pill-row" id="vocab-hero-tags"></div>
      `
    })}
    <section class="workspace">
      <div class="workspace-grid">
        <div class="panel">
          <div class="section-heading">
            <h2>單字列表</h2>
            <p>先輸入假名、漢字、羅馬拼音或中文。再用詞性篩選縮小範圍。</p>
          </div>
          <div class="controls">
            <input class="input" id="search" type="search" placeholder="搜尋：読んで、教える、交通…" />
            <select class="select" id="pos-filter">
              ${posOptions.map((pos) => `<option value="${pos}">${pos}</option>`).join("")}
            </select>
          </div>
          <div class="list" id="vocab-list"></div>
        </div>
        <aside class="detail-panel">
          <div id="vocab-detail"></div>
          <div data-audio-dock></div>
        </aside>
      </div>
    </section>
  `;

  setActiveNav();
  const audioPlayer = new SegmentAudioPlayer();

  const heroTags = document.getElementById("vocab-hero-tags");
  posOptions.slice(1).forEach((pos) => heroTags.appendChild(createTag(pos)));

  const listEl = document.getElementById("vocab-list");
  const detailEl = document.getElementById("vocab-detail");
  const searchEl = document.getElementById("search");
  const filterEl = document.getElementById("pos-filter");
  const hashId = decodeURIComponent(location.hash.replace(/^#/, ""));
  let activeId = vocabData.items.some((item) => item.id === hashId) ? hashId : vocabData.items[0]?.id || null;

  function renderDetail(item) {
    const relatedSentences = item.related_sentences.map((id) => sentenceMap.get(id)).filter(Boolean);
    const audioState = item.audio?.file ? "已設定音檔" : "待補人聲";
    detailEl.innerHTML = `
      <div class="detail-top">
        <div>
          <div class="romaji">${item.romaji}</div>
          <h2>${item.kanji || item.kana}</h2>
          <p class="lead">${item.kana}${item.kanji ? ` ・ ${item.kanji}` : ""}</p>
        </div>
        <span class="pill">${item.pos}</span>
      </div>
      <dl class="meta-list">
        <div class="meta-row">
          <dt>中文</dt>
          <dd>${item.meaning_zh}</dd>
        </div>
        <div class="meta-row">
          <dt>語法用途</dt>
          <dd>${item.notes}</dd>
        </div>
        <div class="meta-row">
          <dt>音檔狀態</dt>
          <dd>${audioState}</dd>
        </div>
      </dl>
      <div class="tag-row" id="detail-tags"></div>
      <div class="divider"></div>
      <div class="section-heading">
        <h3>Related sentence</h3>
        <p>從單字直接回到課本句子，不必靠記憶硬找。</p>
      </div>
      <div class="related-list">
        ${relatedSentences.length ? relatedSentences.map(renderSentenceLink).join("") : `<p class="muted">目前尚未連到句子。</p>`}
      </div>
      <button class="button" id="play-vocab" ${item.audio?.file ? "" : "disabled"}>播放老師音檔</button>
    `;

    const tagHost = detailEl.querySelector("#detail-tags");
    item.related_sentences.forEach((sentenceId) => {
      const sentence = sentenceMap.get(sentenceId);
      if (sentence) tagHost.appendChild(createTag(sentence.section));
    });

    detailEl.querySelector("#play-vocab")?.addEventListener("click", () => {
      audioPlayer.play(item.audio, `${item.kana} ${item.meaning_zh}`);
    });
  }

  function renderList() {
    const query = searchEl.value.trim().toLowerCase();
    const pos = filterEl.value;
    const items = vocabData.items.filter((item) => {
      const matchesText = [item.kana, item.kanji, item.romaji, item.meaning_zh, item.notes]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
      const matchesPos = pos === "全部" || item.pos === pos;
      return matchesText && matchesPos;
    });

    if (!items.some((item) => item.id === activeId)) {
      activeId = items[0]?.id || null;
    }

    listEl.innerHTML = items.length ? "" : `<p class="muted">沒有符合的單字。</p>`;
    items.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `vocab-item${item.id === activeId ? " active" : ""}`;
      button.innerHTML = `
        <div class="vocab-top">
          <div>
            <div class="jp">${item.kanji || item.kana}</div>
            <div class="romaji">${item.kana} / ${item.romaji}</div>
          </div>
          <span class="pill">${item.pos}</span>
        </div>
        <p>${item.meaning_zh}</p>
      `;
      button.addEventListener("click", () => {
        activeId = item.id;
        history.replaceState(null, "", `#${item.id}`);
        renderList();
        renderDetail(item);
      });
      listEl.appendChild(button);
    });

    const activeItem = byId(vocabData.items, activeId);
    if (activeItem) renderDetail(activeItem);
    else detailEl.innerHTML = `<p class="muted">請選擇一個單字。</p>`;
  }

  searchEl.addEventListener("input", renderList);
  filterEl.addEventListener("change", renderList);
  renderList();
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<main class="shell"><section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section></main>`;
});
