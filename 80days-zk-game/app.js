const DOMAINS = [
  "職涯",
  "財務",
  "健康",
  "關係",
  "家庭",
  "創作",
  "學習",
  "社群",
];

const DECADES = ["20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-99"];

const ROUTES = {
  sprint: {
    label: "衝刺",
    note: "高產出、高風險。短期推進快，但對健康與關係有壓力。",
    resourceAdjust: { time: -1, energy: -2, cash: 2, trust: -1, health: -2 },
    domainAdjust: 2,
  },
  balanced: {
    label: "平衡",
    note: "穩定累積。風險低，長期曲線平順。",
    resourceAdjust: { time: 0, energy: 0, cash: 0, trust: 0, health: 0 },
    domainAdjust: 0,
  },
  recovery: {
    label: "修復",
    note: "回補健康與關係，短期產出下降，但長期更穩。",
    resourceAdjust: { time: -1, energy: 2, cash: -1, trust: 1, health: 2 },
    domainAdjust: -1,
  },
};

const MEMORY_CARDS = [
  {
    id: "c01",
    title: "港口出發日誌",
    yearRange: "20-29",
    arc: "arc01",
    domain: "職涯",
    people: ["導師", "夥伴 A"],
    keywords: ["出發", "方向", "實驗"],
    snippet: "你在第一份工作學會：不是先找到完美地圖，而是先上船。",
    reliability: 0.83,
    emotionalWeight: 0.62,
    minDecade: 0,
    choices: [
      {
        label: "把這段經驗寫成方法卡",
        effects: {
          resources: { time: -3, energy: -2, cash: 1, trust: 1, health: 0 },
          domainGain: 8,
          unlock: ["c04"],
          note: "你把混亂變成可複用流程。",
        },
      },
      {
        label: "直接接下一個案子",
        effects: {
          resources: { time: -2, energy: -2, cash: 3, trust: -1, health: -1 },
          domainGain: 6,
          unlock: ["c06"],
          note: "短期收益提升，但反思不足。",
        },
      },
    ],
  },
  {
    id: "c02",
    title: "卡片盒第一百張",
    yearRange: "30-39",
    arc: "arc02",
    domain: "學習",
    people: ["未來的自己"],
    keywords: ["卡片盒", "連結", "知識網"],
    snippet: "你開始把零碎筆記接成網，寫作速度終於跟上思考速度。",
    reliability: 0.91,
    emotionalWeight: 0.74,
    minDecade: 0,
    choices: [
      {
        label: "建立索引與關鍵字規則",
        effects: {
          resources: { time: -4, energy: -2, cash: 0, trust: 1, health: 0 },
          domainGain: 9,
          unlock: ["c05", "c08"],
          note: "搜尋效率大幅提高。",
        },
      },
      {
        label: "先累積內容不整理",
        effects: {
          resources: { time: -2, energy: -1, cash: 0, trust: 0, health: 0 },
          domainGain: 5,
          unlock: ["c07"],
          note: "你累積了很多素材，但檢索成本上升。",
        },
      },
    ],
  },
  {
    id: "c03",
    title: "家庭餐桌對話",
    yearRange: "30-39",
    arc: "arc02",
    domain: "家庭",
    people: ["家人", "伴侶"],
    keywords: ["家庭", "承諾", "時間分配"],
    snippet: "真正的長程專案，不只靠意志，也靠可被理解的安排。",
    reliability: 0.79,
    emotionalWeight: 0.81,
    minDecade: 0,
    choices: [
      {
        label: "重排週行程，固定家庭時段",
        effects: {
          resources: { time: -2, energy: -1, cash: 0, trust: 3, health: 1 },
          domainGain: 8,
          unlock: ["c09"],
          note: "關係信用回升，整體穩定性提升。",
        },
      },
      {
        label: "暫時延後，先衝專案",
        effects: {
          resources: { time: 0, energy: -1, cash: 2, trust: -3, health: -1 },
          domainGain: 4,
          unlock: ["c10"],
          note: "你保住節奏，但留下延遲後果。",
        },
      },
    ],
  },
  {
    id: "c04",
    title: "第一次公開演講",
    yearRange: "40-49",
    arc: "arc03",
    domain: "社群",
    people: ["學員", "合作夥伴"],
    keywords: ["演講", "影響力", "社群"],
    snippet: "你發現教學不是輸出知識，而是打造可重玩的路徑。",
    reliability: 0.84,
    emotionalWeight: 0.69,
    minDecade: 1,
    choices: [
      {
        label: "把演講拆成 8 領域挑戰任務",
        effects: {
          resources: { time: -3, energy: -2, cash: 2, trust: 2, health: 0 },
          domainGain: 8,
          unlock: ["c11"],
          note: "你的方法開始可被傳承。",
        },
      },
      {
        label: "維持單向輸出模式",
        effects: {
          resources: { time: -2, energy: -1, cash: 2, trust: 0, health: 0 },
          domainGain: 5,
          unlock: [],
          note: "短期順利，但參與度有限。",
        },
      },
    ],
  },
  {
    id: "c05",
    title: "健康赤字警報",
    yearRange: "40-49",
    arc: "arc03",
    domain: "健康",
    people: ["教練", "醫師"],
    keywords: ["健康", "過勞", "恢復"],
    snippet: "你能靠毅力撐一陣子，但無法靠透支跑一百年。",
    reliability: 0.95,
    emotionalWeight: 0.88,
    minDecade: 1,
    choices: [
      {
        label: "啟動修復期，降低產能一季",
        effects: {
          resources: { time: -2, energy: 4, cash: -2, trust: 1, health: 4 },
          domainGain: 9,
          unlock: ["c12"],
          note: "你犧牲短期產出，換來長期續航。",
        },
      },
      {
        label: "繼續硬撐，等下季再說",
        effects: {
          resources: { time: 0, energy: -3, cash: 1, trust: -1, health: -4 },
          domainGain: 3,
          unlock: ["c13"],
          note: "風險被推遲，但沒有消失。",
        },
      },
    ],
  },
  {
    id: "c06",
    title: "跨國專案邀約",
    yearRange: "50-59",
    arc: "arc04",
    domain: "財務",
    people: ["海外客戶", "團隊"],
    keywords: ["海外", "財務", "擴張"],
    snippet: "新市場給你更大舞台，也要求更穩的系統。",
    reliability: 0.82,
    emotionalWeight: 0.63,
    minDecade: 2,
    choices: [
      {
        label: "建立可複製 SOP 再擴張",
        effects: {
          resources: { time: -3, energy: -2, cash: 4, trust: 1, health: -1 },
          domainGain: 9,
          unlock: ["c14"],
          note: "現金流與風險控制一起提升。",
        },
      },
      {
        label: "快速接單衝營收",
        effects: {
          resources: { time: -2, energy: -3, cash: 6, trust: -1, health: -2 },
          domainGain: 7,
          unlock: [],
          note: "財務漂亮，但波動加大。",
        },
      },
    ],
  },
  {
    id: "c07",
    title: "寫作瓶頸夜",
    yearRange: "50-59",
    arc: "arc04",
    domain: "創作",
    people: ["編輯", "讀者"],
    keywords: ["寫作", "瓶頸", "重構"],
    snippet: "不是沒內容，而是素材無法快速召回。",
    reliability: 0.9,
    emotionalWeight: 0.77,
    minDecade: 2,
    choices: [
      {
        label: "回頭整理記憶卡 schema",
        effects: {
          resources: { time: -3, energy: -1, cash: 0, trust: 0, health: 1 },
          domainGain: 8,
          unlock: ["c15"],
          note: "結構修復後，產出穩定回升。",
        },
      },
      {
        label: "靠意志硬寫",
        effects: {
          resources: { time: -1, energy: -3, cash: 1, trust: 0, health: -2 },
          domainGain: 5,
          unlock: [],
          note: "你完成了稿件，但系統負債增加。",
        },
      },
    ],
  },
  {
    id: "c08",
    title: "老友重逢",
    yearRange: "60-69",
    arc: "arc05",
    domain: "關係",
    people: ["舊友", "同行"],
    keywords: ["關係", "信任", "合作"],
    snippet: "過去累積的信用，在關鍵時刻成為資源。",
    reliability: 0.88,
    emotionalWeight: 0.72,
    minDecade: 3,
    choices: [
      {
        label: "投入時間深聊，建立長期合作",
        effects: {
          resources: { time: -2, energy: -1, cash: 1, trust: 4, health: 1 },
          domainGain: 9,
          unlock: ["c16"],
          note: "關係網變成新的推進引擎。",
        },
      },
      {
        label: "保持禮貌但不深入",
        effects: {
          resources: { time: -1, energy: 0, cash: 0, trust: 1, health: 0 },
          domainGain: 4,
          unlock: [],
          note: "沒有風險，也沒有真正突破。",
        },
      },
    ],
  },
  {
    id: "c09",
    title: "八領域年度檢視",
    yearRange: "60-69",
    arc: "arc05",
    domain: "學習",
    people: ["未來團隊"],
    keywords: ["檢視", "八領域", "策略"],
    snippet: "你開始用年度儀表板，避免單點衝刺造成長期失衡。",
    reliability: 0.93,
    emotionalWeight: 0.66,
    minDecade: 3,
    choices: [
      {
        label: "啟動每季策略回顧",
        effects: {
          resources: { time: -2, energy: -1, cash: 0, trust: 1, health: 1 },
          domainGain: 7,
          unlock: [],
          note: "你對風險的反應速度變快。",
        },
      },
      {
        label: "繼續靠直覺決策",
        effects: {
          resources: { time: 0, energy: -1, cash: 1, trust: -1, health: -1 },
          domainGain: 3,
          unlock: [],
          note: "短期快，但偏差逐漸累積。",
        },
      },
    ],
  },
  {
    id: "c10",
    title: "傳承計畫立案",
    yearRange: "70-79",
    arc: "arc06",
    domain: "社群",
    people: ["後輩", "學習社群"],
    keywords: ["傳承", "教學", "系統"],
    snippet: "你開始把方法交給下一代，而不是只靠自己運行。",
    reliability: 0.87,
    emotionalWeight: 0.8,
    minDecade: 4,
    choices: [
      {
        label: "建立開放教材與導師制",
        effects: {
          resources: { time: -3, energy: -1, cash: -1, trust: 4, health: 1 },
          domainGain: 8,
          unlock: [],
          note: "系統從個人能力轉為組織能力。",
        },
      },
      {
        label: "先維持小圈運作",
        effects: {
          resources: { time: -1, energy: 0, cash: 0, trust: 1, health: 0 },
          domainGain: 4,
          unlock: [],
          note: "維持品質，但擴散速度慢。",
        },
      },
    ],
  },
  {
    id: "c11",
    title: "百年卷宗封面",
    yearRange: "80-99",
    arc: "arc07",
    domain: "創作",
    people: ["讀者", "家族"],
    keywords: ["卷宗", "總結", "百年"],
    snippet: "最後的任務不是更多成就，而是留下可被延續的路線圖。",
    reliability: 0.97,
    emotionalWeight: 0.9,
    minDecade: 5,
    choices: [
      {
        label: "撰寫完整百年通關卷宗",
        effects: {
          resources: { time: -4, energy: -2, cash: 0, trust: 3, health: 0 },
          domainGain: 10,
          unlock: [],
          note: "你的路線開始具有可傳承性。",
        },
      },
      {
        label: "只留下簡短備忘",
        effects: {
          resources: { time: -1, energy: -1, cash: 0, trust: 1, health: 0 },
          domainGain: 3,
          unlock: [],
          note: "節省了時間，但失去大部分可複用脈絡。",
        },
      },
    ],
  },
];

const QUICK_TAGS = ["卡片盒", "健康", "家庭", "財務", "寫作", "社群", "傳承"];

const STORAGE_KEY = "world80days_zk_game_save_v1";

const elements = {
  searchInput: document.querySelector("#search-input"),
  searchBtn: document.querySelector("#search-btn"),
  quickTags: document.querySelector("#quick-tags"),
  searchResults: document.querySelector("#search-results"),
  storyCard: document.querySelector("#story-card"),
  choiceList: document.querySelector("#choice-list"),
  resourceBars: document.querySelector("#resource-bars"),
  domainGrid: document.querySelector("#domain-grid"),
  timeline: document.querySelector("#timeline"),
  eventLog: document.querySelector("#event-log"),
  searchBudget: document.querySelector("#search-budget"),
  decadeLabel: document.querySelector("#decade-label"),
  turnLabel: document.querySelector("#turn-label"),
  routeButtons: document.querySelector("#route-buttons"),
  routeNote: document.querySelector("#route-note"),
  advanceBtn: document.querySelector("#advance-btn"),
  saveBtn: document.querySelector("#save-btn"),
  loadBtn: document.querySelector("#load-btn"),
  resetBtn: document.querySelector("#reset-btn"),
};

function makeDefaultDomains() {
  return Object.fromEntries(DOMAINS.map((name) => [name, { score: 0, touched: false }]));
}

function makeInitialState() {
  return {
    decadeIndex: 0,
    turn: 1,
    searchesLeft: 6,
    actionsInDecade: 0,
    route: "balanced",
    resources: {
      time: 72,
      energy: 72,
      cash: 58,
      trust: 56,
      health: 64,
    },
    domains: makeDefaultDomains(),
    unlocked: new Set(["c01", "c02", "c03"]),
    selectedCardId: null,
    completedDecades: [],
    logs: ["系統啟動：你正從 20-29 歲開始建立百年路線。"],
    gameOver: false,
  };
}

let state = makeInitialState();

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function pushLog(text) {
  const stamp = `T${state.turn}`;
  state.logs.unshift(`[${stamp}] ${text}`);
  state.logs = state.logs.slice(0, 26);
}

function unlockedCards() {
  return MEMORY_CARDS.filter(
    (card) => state.unlocked.has(card.id) && state.decadeIndex >= card.minDecade,
  );
}

function revealCardsByDecade() {
  MEMORY_CARDS.forEach((card) => {
    if (card.minDecade <= state.decadeIndex) {
      state.unlocked.add(card.id);
    }
  });
}

function applyResourceDelta(delta) {
  Object.entries(delta).forEach(([key, change]) => {
    const routeChange = ROUTES[state.route].resourceAdjust[key] || 0;
    state.resources[key] = clamp(state.resources[key] + change + routeChange);
  });
}

function applyDomainGain(domain, baseGain) {
  const routeGain = ROUTES[state.route].domainAdjust;
  const gain = Math.max(1, baseGain + routeGain);
  state.domains[domain].score = clamp(state.domains[domain].score + gain);
  state.domains[domain].touched = true;
}

function renderQuickTags() {
  elements.quickTags.innerHTML = "";
  QUICK_TAGS.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-btn";
    btn.textContent = tag;
    btn.addEventListener("click", () => {
      elements.searchInput.value = tag;
      runSearch(tag);
    });
    elements.quickTags.appendChild(btn);
  });
}

function cardMatch(card, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = [
    card.title,
    card.yearRange,
    card.domain,
    card.arc,
    ...card.people,
    ...card.keywords,
    card.snippet,
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(q);
}

function renderSearchResults(cards) {
  elements.searchResults.innerHTML = "";
  if (!cards.length) {
    const empty = document.createElement("li");
    empty.className = "search-item";
    empty.innerHTML = "<h4>沒有找到結果</h4><p class='hint'>換一個人物、領域或事件關鍵字試試。</p>";
    elements.searchResults.appendChild(empty);
    return;
  }

  cards.forEach((card) => {
    const li = document.createElement("li");
    li.className = "search-item";
    li.innerHTML = `
      <h4>${card.title}</h4>
      <div class="search-meta">${card.yearRange} · ${card.domain} · 關鍵字：${card.keywords.join("、")}</div>
      <p class="hint">${card.snippet.slice(0, 74)}...</p>
    `;
    li.addEventListener("click", () => selectCard(card.id));
    elements.searchResults.appendChild(li);
  });
}

function runSearch(query) {
  if (state.gameOver) return;
  if (state.searchesLeft <= 0) {
    pushLog("本期深度搜尋次數已用完，請先結算十年。");
    render();
    return;
  }

  state.searchesLeft -= 1;
  applyResourceDelta({ time: -2, energy: -2, cash: 0, trust: 0, health: 0 });
  const cards = unlockedCards().filter((card) => cardMatch(card, query)).slice(0, 5);
  renderSearchResults(cards);
  pushLog(`搜尋「${query || "全部"}」返回 ${cards.length} 張卡片。`);
  render();
}

function selectCard(cardId) {
  const card = MEMORY_CARDS.find((item) => item.id === cardId);
  if (!card) return;
  state.selectedCardId = card.id;

  elements.storyCard.innerHTML = `
    <h3>${card.title}</h3>
    <p class="search-meta">${card.yearRange} · ${card.domain} · 可信度 ${(card.reliability * 100).toFixed(0)}%</p>
    <p>${card.snippet}</p>
    <p class="hint">人物：${card.people.join("、")} ｜ 情緒權重 ${(card.emotionalWeight * 100).toFixed(0)}%</p>
  `;

  elements.choiceList.innerHTML = "";
  card.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = choice.label;
    btn.addEventListener("click", () => applyChoice(card, choice));
    elements.choiceList.appendChild(btn);
  });
}

function applyChoice(card, choice) {
  if (state.gameOver) return;
  applyResourceDelta(choice.effects.resources);
  applyDomainGain(card.domain, choice.effects.domainGain);
  choice.effects.unlock.forEach((id) => state.unlocked.add(id));

  state.actionsInDecade += 1;
  state.turn += 1;

  pushLog(`${card.title}：${choice.effects.note}`);

  if (state.actionsInDecade >= 8) {
    pushLog("你本期行動已滿 8 次，可按「結算本期十年」。");
  }

  render();
}

function renderRoutes() {
  elements.routeButtons.innerHTML = "";
  Object.entries(ROUTES).forEach(([id, route]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `route-btn ${state.route === id ? "active" : ""}`;
    btn.textContent = route.label;
    btn.addEventListener("click", () => {
      state.route = id;
      pushLog(`本期路線切換為「${route.label}」。`);
      render();
    });
    elements.routeButtons.appendChild(btn);
  });
  elements.routeNote.textContent = ROUTES[state.route].note;
}

function renderResources() {
  elements.resourceBars.innerHTML = "";
  Object.entries(state.resources).forEach(([key, value]) => {
    const item = document.createElement("div");
    item.className = "resource-item";
    item.innerHTML = `
      <div>${key.toUpperCase()}：${value}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${value}%"></div></div>
    `;
    elements.resourceBars.appendChild(item);
  });
}

function renderDomains() {
  elements.domainGrid.innerHTML = "";
  DOMAINS.forEach((domain) => {
    const info = state.domains[domain];
    const item = document.createElement("div");
    item.className = "domain-item";
    item.innerHTML = `
      <div>${domain}：${info.score}</div>
      <div class="progress-track"><div class="progress-fill" style="width:${info.score}%"></div></div>
      <div class="hint">本期觸發：${info.touched ? "是" : "否"}</div>
    `;
    elements.domainGrid.appendChild(item);
  });
}

function renderTimeline() {
  elements.timeline.innerHTML = "";
  DECADES.forEach((decade, index) => {
    const li = document.createElement("li");
    const done = index < state.decadeIndex;
    const current = index === state.decadeIndex && !state.gameOver;
    const text = done ? `${decade} 已完成` : current ? `${decade} 進行中` : `${decade} 待解鎖`;
    li.textContent = text;
    if (current) li.style.color = "#ffe1a6";
    elements.timeline.appendChild(li);
  });
}

function renderLogs() {
  elements.eventLog.innerHTML = "";
  state.logs.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    elements.eventLog.appendChild(li);
  });
}

function computeEnding() {
  const totalDomain = DOMAINS.reduce((sum, name) => sum + state.domains[name].score, 0);
  const resourceAvg =
    (state.resources.time + state.resources.energy + state.resources.cash + state.resources.trust + state.resources.health) /
    5;

  if (resourceAvg >= 65 && totalDomain >= 420) {
    return {
      type: "成就型結局",
      summary: "你在高壓環境下維持策略穩定，完成高成就且可持續的百年路線。",
    };
  }

  if (state.resources.trust + state.resources.health >= 130) {
    return {
      type: "平衡型結局",
      summary: "你把關係與健康放在核心，雖然速度較慢，但建立了可長可久的系統。",
    };
  }

  return {
    type: "傳承型結局",
    summary: "你把核心方法交給後輩，路線不一定最耀眼，但留下了可以延續的秩序。",
  };
}

function endDecade() {
  if (state.gameOver) return;

  const touchedCount = DOMAINS.filter((name) => state.domains[name].touched).length;
  const pass = touchedCount >= 6;

  if (pass) {
    applyResourceDelta({ time: 2, energy: 2, cash: 2, trust: 2, health: 2 });
    pushLog(`十年結算成功：本期觸發 ${touchedCount}/8 領域，獲得穩定加成。`);
  } else {
    applyResourceDelta({ time: -3, energy: -3, cash: -2, trust: -2, health: -3 });
    pushLog(`十年結算偏弱：僅觸發 ${touchedCount}/8 領域，系統出現失衡。`);
  }

  state.completedDecades.push({
    decade: DECADES[state.decadeIndex],
    touched: touchedCount,
    route: ROUTES[state.route].label,
  });

  if (state.decadeIndex === DECADES.length - 1) {
    state.gameOver = true;
    const ending = computeEnding();
    elements.storyCard.classList.add("end-card");
    elements.storyCard.innerHTML = `
      <h3>${ending.type}</h3>
      <p>${ending.summary}</p>
      <p class="hint">你完成了 100 年路線。可按「重新開始」挑戰其他策略。</p>
    `;
    elements.choiceList.innerHTML = "";
    pushLog(`通關完成：${ending.type}`);
    render();
    return;
  }

  state.decadeIndex += 1;
  state.turn += 1;
  state.searchesLeft = 6;
  state.actionsInDecade = 0;
  state.selectedCardId = null;
  elements.storyCard.classList.remove("end-card");

  DOMAINS.forEach((name) => {
    state.domains[name].touched = false;
  });

  applyResourceDelta({ time: -2, energy: -1, cash: 0, trust: 0, health: -1 });
  revealCardsByDecade();
  pushLog(`進入 ${DECADES[state.decadeIndex]}，請設定本期路線並開始調查。`);
  renderSearchResults(unlockedCards().slice(0, 5));
  render();
}

function serializeState() {
  return {
    ...state,
    unlocked: Array.from(state.unlocked),
  };
}

function restoreState(raw) {
  return {
    ...raw,
    unlocked: new Set(raw.unlocked || []),
  };
}

function saveGame() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState()));
  pushLog("進度已儲存到本機。");
  render();
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    pushLog("找不到可讀取的存檔。");
    render();
    return;
  }
  state = restoreState(JSON.parse(raw));
  pushLog("已讀取存檔。");
  renderSearchResults(unlockedCards().slice(0, 5));
  render();
}

function resetGame() {
  state = makeInitialState();
  elements.storyCard.classList.remove("end-card");
  renderSearchResults(unlockedCards().slice(0, 5));
  render();
}

function render() {
  elements.searchBudget.textContent = `搜尋剩餘 ${state.searchesLeft}`;
  elements.decadeLabel.textContent = `${DECADES[state.decadeIndex]} 十年期`;
  elements.turnLabel.textContent = `回合 ${state.turn}`;

  renderRoutes();
  renderResources();
  renderDomains();
  renderTimeline();
  renderLogs();

  if (!state.selectedCardId && !state.gameOver) {
    elements.storyCard.innerHTML = `
      <h3>等待下一張關鍵卡</h3>
      <p>先搜尋，再挑一張卡片做決策。每次選擇都會影響你的百年路線。</p>
    `;
    elements.choiceList.innerHTML = "";
  }
}

function bindEvents() {
  elements.searchBtn.addEventListener("click", () => runSearch(elements.searchInput.value));
  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch(elements.searchInput.value);
    }
  });

  elements.advanceBtn.addEventListener("click", endDecade);
  elements.saveBtn.addEventListener("click", saveGame);
  elements.loadBtn.addEventListener("click", loadGame);
  elements.resetBtn.addEventListener("click", resetGame);
}

function init() {
  renderQuickTags();
  bindEvents();
  revealCardsByDecade();
  renderSearchResults(unlockedCards().slice(0, 5));
  render();
}

init();
