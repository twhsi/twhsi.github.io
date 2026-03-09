import { formatTime, loadJson, resolveMediaPath } from "./common.js";

function architectureCard(item) {
  return `
    <article class="architecture-card">
      <div class="detail-top">
        <div>
          <div class="eyebrow architecture-step">${item.step}</div>
          <h3>${item.title}</h3>
        </div>
      </div>
      <p>${item.body}</p>
      <pre class="code-block">${item.snippet}</pre>
    </article>
  `;
}

function lineCard(line) {
  return `
    <button type="button" class="dialogue-line" data-line-id="${line.id}">
      <div class="dialogue-line-top">
        <div class="speaker-pill">${line.speaker}</div>
        <div class="timeline-pill">${formatTime(line.start)} - ${formatTime(line.end)}</div>
      </div>
      <p class="dialogue-jp">${line.jp}</p>
      <p class="dialogue-zh">${line.zh}</p>
    </button>
  `;
}

async function init() {
  const app = document.getElementById("app");
  const data = await loadJson("data/lesson14-dialogue.json");
  const { lesson, architecture, transcript } = data;
  const audioSrc = resolveMediaPath(lesson.audio_file);

  app.innerHTML = `
    <section class="hero dialogue-hero">
      <div class="eyebrow">Audio + Timecode + Transcript</div>
      <div class="hero-grid">
        <div class="section-heading">
          <h1>${lesson.title}</h1>
          <p class="lead">${lesson.subtitle} / ${transcript.heading_jp}</p>
          <div class="hero-metrics">
            <span class="pill">${lesson.duration_label}</span>
            <span class="pill">${transcript.lines.length} 句</span>
            <span class="pill">點句播放</span>
            <span class="pill">單頁版</span>
          </div>
        </div>
        <div class="card">
          <div class="section-heading">
            <h3>這頁做的事</h3>
            <p>${lesson.notes}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="workspace">
      <div class="single-page-grid">
        <div class="panel">
          <div class="section-heading">
            <h2>播放器</h2>
            <p class="lead">整段播放會自動高亮目前句子；點任一句子會只播那一句。</p>
          </div>
          <div class="player-shell">
            <audio id="dialogue-audio" controls preload="metadata" src="${audioSrc}"></audio>
            <div class="now-playing">
              <div>
                <div class="small">目前播放</div>
                <div class="now-playing-title" id="now-playing-title">${transcript.heading_jp}</div>
              </div>
              <div class="timeline-pill" id="now-playing-range">00:00 - --:--</div>
            </div>
            <div class="button-row">
              <button class="button" id="play-all">從頭播放</button>
              <button class="ghost-button" id="replay-line" disabled>重播這一句</button>
            </div>
            <div class="progress-strip" id="progress-strip"></div>
          </div>
          <div class="dialogue-list" id="dialogue-list">
            ${transcript.lines.map(lineCard).join("")}
          </div>
        </div>

        <aside class="detail-panel dialogue-sidebar">
          <div class="section-heading">
            <h2>課文</h2>
            <p>${transcript.heading_jp}<br><span class="small">${transcript.heading_zh}</span></p>
          </div>
          <div class="full-script" id="full-script"></div>
          <div class="section-heading">
            <h2>拆分方式</h2>
            <p>照你的要求保留三層：資料結構、時間標記、網站播放。</p>
          </div>
          <div class="architecture-list">
            ${architecture.map(architectureCard).join("")}
          </div>
        </aside>
      </div>
    </section>
  `;

  const audio = document.getElementById("dialogue-audio");
  const dialogueList = document.getElementById("dialogue-list");
  const fullScript = document.getElementById("full-script");
  const progressStrip = document.getElementById("progress-strip");
  const nowPlayingTitle = document.getElementById("now-playing-title");
  const nowPlayingRange = document.getElementById("now-playing-range");
  const replayLine = document.getElementById("replay-line");
  const playAll = document.getElementById("play-all");

  fullScript.innerHTML = transcript.lines.map((line) => `
    <article class="script-row">
      <div class="speaker-pill subtle">${line.speaker}</div>
      <p class="dialogue-jp">${line.jp}</p>
      <p class="dialogue-zh">${line.zh}</p>
    </article>
  `).join("");

  progressStrip.innerHTML = transcript.lines.map((line) => {
    const width = ((line.end - line.start) / lesson.duration) * 100;
    return `<button type="button" class="progress-chip" data-progress-id="${line.id}" style="width:${Math.max(width, 4)}%"></button>`;
  }).join("");

  let activeLine = null;
  let stopAt = null;

  function syncActiveLine(line) {
    activeLine = line || null;
    const activeId = activeLine?.id || "";
    dialogueList.querySelectorAll("[data-line-id]").forEach((button) => {
      button.classList.toggle("active", button.dataset.lineId === activeId);
    });
    progressStrip.querySelectorAll("[data-progress-id]").forEach((button) => {
      button.classList.toggle("active", button.dataset.progressId === activeId);
    });

    if (activeLine) {
      nowPlayingTitle.textContent = `${activeLine.speaker} · ${activeLine.jp}`;
      nowPlayingRange.textContent = `${formatTime(activeLine.start)} - ${formatTime(activeLine.end)}`;
      replayLine.disabled = false;
    } else {
      nowPlayingTitle.textContent = transcript.heading_jp;
      nowPlayingRange.textContent = `${formatTime(audio.currentTime)} - ${lesson.duration_label}`;
      replayLine.disabled = true;
    }
  }

  async function playSegment(line) {
    if (!line) return;
    stopAt = line.end;
    syncActiveLine(line);
    if (audio.readyState < 1) {
      await new Promise((resolve) => {
        audio.addEventListener("loadedmetadata", resolve, { once: true });
        audio.load();
      });
    }
    audio.currentTime = line.start;
    await audio.play();
  }

  audio.addEventListener("timeupdate", () => {
    const currentTime = audio.currentTime;
    const matched = transcript.lines.find((line) => currentTime >= line.start && currentTime < line.end) || null;
    if (matched?.id !== activeLine?.id) {
      syncActiveLine(matched);
    } else if (!matched && !audio.paused) {
      nowPlayingRange.textContent = `${formatTime(currentTime)} - ${lesson.duration_label}`;
    }

    if (stopAt !== null && currentTime >= stopAt) {
      audio.pause();
      stopAt = null;
    }
  });

  audio.addEventListener("pause", () => {
    if (stopAt === null && !audio.ended) {
      syncActiveLine(activeLine);
    }
  });

  audio.addEventListener("ended", () => {
    stopAt = null;
    syncActiveLine(null);
  });

  playAll.addEventListener("click", async () => {
    stopAt = null;
    audio.currentTime = 0;
    await audio.play();
  });

  replayLine.addEventListener("click", () => playSegment(activeLine));

  dialogueList.querySelectorAll("[data-line-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const line = transcript.lines.find((item) => item.id === button.dataset.lineId);
      playSegment(line).catch((error) => console.error(error));
    });
  });

  progressStrip.querySelectorAll("[data-progress-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const line = transcript.lines.find((item) => item.id === button.dataset.progressId);
      playSegment(line).catch((error) => console.error(error));
    });
  });

  syncActiveLine(null);
}

init().catch((error) => {
  console.error(error);
  document.getElementById("app").innerHTML = `<section class="panel"><h2>載入失敗</h2><p>${error.message}</p></section>`;
});
