function pickJapaneseVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find((voice) => /ja|jpn|japanese/i.test(`${voice.lang} ${voice.name}`)) || null;
}

export class TtsPlayer {
  constructor() {
    this.voice = null;
    this.handleVoicesChanged = this.handleVoicesChanged.bind(this);

    if ("speechSynthesis" in window) {
      this.handleVoicesChanged();
      window.speechSynthesis.addEventListener("voiceschanged", this.handleVoicesChanged);
    }
  }

  handleVoicesChanged() {
    this.voice = pickJapaneseVoice();
  }

  supported() {
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  speak(text) {
    if (!this.supported() || !text) return false;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.92;
    utterance.pitch = 1;
    if (this.voice) utterance.voice = this.voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  }
}
