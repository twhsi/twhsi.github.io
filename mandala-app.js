(function () {
  const config = window.MANDALA_CONFIG;
  if (!config || !Array.isArray(config.cards) || config.cards.length !== 9) {
    throw new Error("MANDALA_CONFIG.cards must be an array of 9 items");
  }

  const titleEl = document.getElementById("page-title");
  const hintEl = document.getElementById("page-hint");
  const grid = document.getElementById("grid");
  const cardId = document.getElementById("card-id");
  const cardTitle = document.getElementById("card-title");
  const cardBody = document.getElementById("card-body");
  const themeBtn = document.getElementById("theme-btn");
  const copyBtn = document.getElementById("copy-template-btn");
  const splitBtn = document.getElementById("run-check-btn");
  const textInput = document.getElementById("heading-input");
  const checkResult = document.getElementById("check-result");

  titleEl.textContent = config.pageTitle || "DEVONthink 甜蜜長度九宮格";
  hintEl.textContent = config.hint || "貼入長文，按「切成九宮」，再複製 Markdown Section。";

  let activeIndex = 4;
  let runtimeCards = config.cards.slice();
  let latestMarkdown = "";

  const SWEET = {
    min: 75,
    max: 1200,
    hardMin: 50,
    hardMax: 1500
  };

  function measureLength(text) {
    return (text || "").replace(/\s+/g, "").length;
  }

  function shortText(text, maxLen) {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "未命名段落";
    return clean.length > maxLen ? clean.slice(0, maxLen).trim() + "…" : clean;
  }

  function splitLongParagraph(paragraph, maxLen) {
    if (measureLength(paragraph) <= maxLen) return [paragraph.trim()];

    const bySentence = paragraph
      .split(/(?<=[。！？!?\.])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (bySentence.length === 0) return [paragraph.trim()];

    const output = [];
    let buffer = "";

    bySentence.forEach((sentence) => {
      const candidate = buffer ? buffer + " " + sentence : sentence;
      if (measureLength(candidate) <= maxLen) {
        buffer = candidate;
      } else {
        if (buffer) output.push(buffer.trim());
        if (measureLength(sentence) > maxLen) {
          const rough = sentence.match(new RegExp(`.{1,${Math.max(80, Math.floor(maxLen * 0.75))}}`, "g")) || [sentence];
          rough.forEach((part) => output.push(part.trim()));
          buffer = "";
        } else {
          buffer = sentence;
        }
      }
    });

    if (buffer) output.push(buffer.trim());
    return output;
  }

  function toCandidateChunks(rawText) {
    const paragraphs = (rawText || "")
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const chunks = [];
    paragraphs.forEach((p) => {
      splitLongParagraph(p, SWEET.hardMax).forEach((piece) => {
        if (piece) chunks.push(piece);
      });
    });

    return chunks;
  }

  function mergeToEight(chunks) {
    const next = chunks.slice();
    while (next.length > 8) {
      const tail = next.pop();
      next[next.length - 1] = next[next.length - 1] + "\n\n" + tail;
    }
    return next;
  }

  function normalizeEight(chunks) {
    if (chunks.length > 8) return mergeToEight(chunks);

    const padded = chunks.slice();
    while (padded.length < 8) {
      padded.push("（保留格）可放關鍵引文、反例、延伸問題或行動方案。");
    }
    return padded;
  }

  function scoreChunk(text) {
    const len = measureLength(text);
    if (len >= SWEET.min && len <= SWEET.max) return "甜蜜";
    if (len < SWEET.hardMin || len > SWEET.hardMax) return "過短/過長";
    return "可用";
  }

  function buildCardTitle(text, index) {
    return `${index + 1}. ${shortText(text, 22)}`;
  }

  function buildMarkdown(cards, stats) {
    const lines = [
      `# ${titleEl.textContent}`,
      "",
      `> Sweet spot 參考：${SWEET.min}-${SWEET.max} 字；硬限制：${SWEET.hardMin}-${SWEET.hardMax} 字。`,
      `> 本次輸入長度：${stats.totalLength} 字；切塊數：${stats.chunkCount}。`,
      ""
    ];

    cards.forEach((card) => {
      lines.push(`## ${card.id} ${card.title}`);
      lines.push("");
      lines.push(card.body || "（空白）");
      lines.push("");
    });

    return lines.join("\n");
  }

  function generateMandalaFromText(rawText) {
    const source = (rawText || "").trim();
    if (!source) {
      return {
        ok: false,
        message: "[WARN] 請先貼入文章內容，再執行切塊。"
      };
    }

    const candidates = toCandidateChunks(source);
    const normalized = normalizeEight(candidates);

    const sideSlots = [0, 1, 2, 3, 5, 6, 7, 8];
    const nextCards = config.cards.map((card) => ({ ...card }));
    const statuses = [];

    normalized.forEach((chunk, i) => {
      const slot = sideSlots[i];
      const len = measureLength(chunk);
      const status = scoreChunk(chunk);
      statuses.push(`Cell ${i + 1}: ${len}字 (${status})`);
      nextCards[slot] = {
        id: String(i + 1),
        title: buildCardTitle(chunk, i),
        body: chunk
      };
    });

    const totalLength = measureLength(source);
    const centerBody = [
      "以段落為單位切塊，讓 DEVONthink 的語意關聯更容易命中。",
      `本次輸入約 ${totalLength} 字，先切成 ${candidates.length} 塊，再整理成九宮格 8 個外圍 cell。`,
      `建議區間：${SWEET.min}-${SWEET.max} 字；極端可容許 ${SWEET.hardMin}-${SWEET.hardMax} 字。`,
      "原則：檔案不是檢索單位，段落/片段才是檢索單位。"
    ].join("\n");

    nextCards[4] = {
      id: "5 核心",
      title: "甜蜜長度策略（Chunk over File）",
      body: centerBody
    };

    const stats = {
      totalLength,
      chunkCount: candidates.length
    };

    return {
      ok: true,
      cards: nextCards,
      markdown: buildMarkdown(nextCards, stats),
      report: `[OK] 已切成九宮格。\n${statuses.join("\n")}`
    };
  }

  function renderGrid() {
    grid.innerHTML = "";
    runtimeCards.forEach((card, index) => {
      const button = document.createElement("button");
      const isCenter = index === 4;
      button.type = "button";
      button.className = "cell" + (index === activeIndex ? " active" : "") + (isCenter ? " cell-center" : "");
      button.innerHTML = "<span class=\"cell-id\">" + card.id + "</span><span class=\"cell-title\">" + card.title + "</span>";
      button.addEventListener("click", () => setActive(index));
      grid.appendChild(button);
    });
  }

  function setActive(index) {
    activeIndex = index;
    const card = runtimeCards[index];
    cardId.textContent = card.id;
    cardTitle.textContent = card.title;
    cardBody.textContent = card.body;
    renderGrid();
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);
    themeBtn.textContent = isDark ? "切換成明亮" : "切換成暗色";
  }

  function initTheme() {
    const key = "mandala-theme";
    const saved = localStorage.getItem(key);
    if (saved === "dark" || saved === "light") {
      applyTheme(saved);
    } else {
      const preferDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(preferDark ? "dark" : "light");
    }

    themeBtn.addEventListener("click", () => {
      const next = document.body.classList.contains("dark") ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(key, next);
    });
  }

  async function copyMarkdown() {
    if (!latestMarkdown) {
      checkResult.className = "check-result warn";
      checkResult.textContent = "[WARN] 尚未產生 Markdown。請先按「切成九宮」。";
      return;
    }

    try {
      await navigator.clipboard.writeText(latestMarkdown);
      checkResult.className = "check-result ok";
      checkResult.textContent = "[OK] 已複製 Markdown Section，可直接貼進 Obsidian/DEVONthink。";
    } catch (error) {
      checkResult.className = "check-result warn";
      checkResult.textContent = "[WARN] 複製失敗，請手動複製下方內容：\n\n" + latestMarkdown;
    }
  }

  function runSplit() {
    const result = generateMandalaFromText(textInput.value);
    if (!result.ok) {
      checkResult.className = "check-result warn";
      checkResult.textContent = result.message;
      return;
    }

    runtimeCards = result.cards;
    latestMarkdown = result.markdown;
    setActive(4);
    checkResult.className = "check-result ok";
    checkResult.textContent = result.report;
  }

  function initShortcuts() {
    document.addEventListener("keydown", (event) => {
      const tag = (event.target && event.target.tagName) || "";
      const isTyping = tag === "TEXTAREA" || tag === "INPUT";
      if (isTyping) return;

      const row = Math.floor(activeIndex / 3);
      const col = activeIndex % 3;
      let next = activeIndex;

      if (event.key === "ArrowUp") next = Math.max(0, (row - 1) * 3 + col);
      if (event.key === "ArrowDown") next = Math.min(8, (row + 1) * 3 + col);
      if (event.key === "ArrowLeft") next = row * 3 + Math.max(0, col - 1);
      if (event.key === "ArrowRight") next = row * 3 + Math.min(2, col + 1);

      if (next !== activeIndex) {
        event.preventDefault();
        setActive(next);
      }
    });
  }

  function initTools() {
    copyBtn.textContent = "複製 Markdown";
    splitBtn.textContent = "切成九宮";
    textInput.placeholder = "在這裡貼入原文（可中英混合）。";
    checkResult.textContent = "貼入全文後按「切成九宮」，會依甜蜜長度切塊並更新九宮格。";

    copyBtn.addEventListener("click", copyMarkdown);
    splitBtn.addEventListener("click", runSplit);
  }

  setActive(activeIndex);
  initTheme();
  initTools();
  initShortcuts();
})();
