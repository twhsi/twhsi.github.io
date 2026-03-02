# 第14課網站資料對應 Obsidian 結構

## 建議資料夾

```text
第十四課/
├─ 00 首頁/
│  └─ 第14課-主索引.md
├─ 01 單字/
│  ├─ 第14課-單字-読みます.md
│  ├─ 第14課-單字-教えます.md
│  └─ ...
├─ 02 練習A/
│  ├─ 第14課-練習A-總覽.md
│  ├─ 第14課-練習A-句子卡.md
│  └─ 第14課-練習A-文法.md
├─ 03 內容/
│  ├─ 第14課-GoogleDoc-摘要.md
│  ├─ 第14課-GoogleDoc-逐字稿.md
│  └─ 第14課-GoogleDoc-補充單字.md
└─ 99 資料/
   └─ 第14課-網站資料對照.md
```

## 主索引筆記命名

- 建議使用 `第14課-主索引.md`
- 對應網站首頁 `index.html`
- 功能是列出網站四大入口：單字、練習A、內容、索引

## 單字筆記命名

- 建議格式：`第14課-單字-<詞目>.md`
- 例：`第14課-單字-読みます.md`
- 對應網站資料檔：`data/lesson14-vocab.json`
- 一個 JSON item 對應一則單字筆記

## 練習A 筆記命名

- 建議總覽：`第14課-練習A-總覽.md`
- 建議句子卡：`第14課-練習A-句子卡.md`
- 建議文法卡：`第14課-練習A-文法.md`
- 對應網站資料檔：`data/lesson14-practice-a.json`
- `sentences[]` 可拆成句子卡內容
- `grammar[]` 可拆成文法卡內容

## Google Doc 摘要筆記命名

- 建議摘要：`第14課-GoogleDoc-摘要.md`
- 建議逐字稿：`第14課-GoogleDoc-逐字稿.md`
- 建議補充：`第14課-GoogleDoc-補充單字.md`
- 對應網站資料檔：`data/lesson14-content.json`
- 每個 `blocks[]` item 都可對應一個段落或一則獨立筆記

## 網站資料檔與 Obsidian 筆記對應

### `data/lesson14-meta.json`

- 對應 `第14課-主索引.md`
- 放課程基本資訊、標題、描述、音檔來源

### `data/lesson14-vocab.json`

- 每個 `items[]` 對應一則單字筆記
- 欄位對應：
  - `kana` / `kanji` / `romaji` -> 單字標題與別名
  - `meaning_zh` -> 中文解釋
  - `pos` -> Frontmatter 標籤或欄位
  - `notes` -> 補充說明
  - `audio` -> 音檔欄位或外部連結
  - `related_sentences` -> 連回練習A句子筆記

### `data/lesson14-practice-a.json`

- `sentences[]` 對應句子卡
- `grammar[]` 對應文法卡
- `audio.file + start + end` 可寫入 Obsidian 筆記的 frontmatter，方便未來插件讀取

### `data/lesson14-content.json`

- `blocks[]` 對應 Google Doc 摘要、逐字稿、補充說明
- `related_vocab` 與 `related_grammar` 可轉成 Obsidian wiki links

## 同步原則

- 先改網站 JSON，再同步整理到 Obsidian，避免多份資料分叉
- 句子秒數只維護一份，以 `lesson14-practice-a.json` 為主
- 若未來單字人聲切成逐字 MP3，優先更新 `audio.file` 與 `audio.mode`
