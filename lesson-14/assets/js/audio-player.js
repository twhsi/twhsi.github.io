import { formatTime, resolveMediaPath } from "./common.js";

export class SegmentAudioPlayer {
  constructor({ mountSelector = "[data-audio-dock]" } = {}) {
    this.mount = document.querySelector(mountSelector);
    this.audio = null;
    this.label = null;
    this.meta = null;
    this.stopAt = null;
    this.boundaryHandler = this.handleBoundary.bind(this);
    this.currentSourceKey = "";
    this.lastPlay = null;
    this.render();
  }

  render() {
    if (!this.mount) return;
    this.mount.innerHTML = `
      <div class="audio-dock">
        <div class="section-heading">
          <h3>老師音檔播放器</h3>
          <p class="muted">支援整段 MP3 + time segment，也支援未來改成逐句音檔。</p>
        </div>
        <audio controls preload="metadata"></audio>
        <div class="timeline">
          <span data-audio-label>尚未播放</span>
          <span data-audio-range>--:-- to --:--</span>
        </div>
      </div>
    `;
    this.audio = this.mount.querySelector("audio");
    this.label = this.mount.querySelector("[data-audio-label]");
    this.meta = this.mount.querySelector("[data-audio-range]");
    this.audio.addEventListener("timeupdate", this.boundaryHandler);
    this.audio.addEventListener("ended", () => {
      this.stopAt = null;
    });
  }

  setStatus(text, range = "--:-- to --:--") {
    if (this.label) this.label.textContent = text;
    if (this.meta) this.meta.textContent = range;
  }

  handleBoundary() {
    if (this.stopAt === null || !this.audio) return;
    if (this.audio.currentTime >= this.stopAt) {
      this.audio.pause();
      this.stopAt = null;
    }
  }

  async play(audioConfig = {}, fallbackLabel = "音檔") {
    if (!this.audio || !audioConfig?.file) return;

    const start = Number.isFinite(Number(audioConfig.start)) ? Number(audioConfig.start) : null;
    const end = Number.isFinite(Number(audioConfig.end)) ? Number(audioConfig.end) : null;
    const sourceKey = JSON.stringify({
      file: audioConfig.file,
      mode: audioConfig.mode || "segment"
    });
    const source = resolveMediaPath(audioConfig.file);

    if (this.currentSourceKey !== sourceKey) {
      this.audio.src = source;
      this.currentSourceKey = sourceKey;
    }

    this.stopAt = end;
    this.setStatus(audioConfig.label || fallbackLabel, `${formatTime(start)} to ${formatTime(end)}`);

    const doPlay = async () => {
      if (start !== null) this.audio.currentTime = start;
      await this.audio.play();
      this.lastPlay = audioConfig;
    };

    if (this.audio.readyState < 1) {
      await new Promise((resolve) => {
        this.audio.addEventListener("loadedmetadata", resolve, { once: true });
        this.audio.load();
      });
    }

    try {
      await doPlay();
    } catch (error) {
      this.setStatus("音檔播放失敗");
      throw error;
    }
  }
}
