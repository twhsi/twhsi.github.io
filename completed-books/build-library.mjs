import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, "docs");
const OUTPUT_DATA = path.join(OUTPUT_DIR, "site-data.json");
const OUTPUT_DATA_JS = path.join(OUTPUT_DIR, "site-data.js");
const IGNORED_DIRS = new Set(["docs", "obsidian-publish-clone", "node_modules"]);
const CELL_ORDER = ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8"];

const preferredHomeEntries = [
  ["📚 0.0及第一部/📚 0.0 前言", "前言"],
  ["📚 0.0及第一部/📚 1.1 FAST", "FAST"],
  ["📚 0.0及第一部/📚 1.2 日計劃", "日計劃"],
  ["📚 0.0及第一部/📚 1.3 行動清單", "行動清單"],
  ["📚 0.0及第一部/📚 1.4 九宮格", "九宮格"],
  ["📚 0.0及第一部/📚 1.5 番茄工作法", "番茄工作法"],
  ["📚 第二部", "第二部"],
  ["第四部", "第四部"],
];

async function main() {
  const files = await collectMarkdownFiles(ROOT);
  const chapters = [];
  let overviewText = "";

  for (const relativePath of files) {
    const absolutePath = path.join(ROOT, relativePath);
    const raw = await fs.readFile(absolutePath, "utf8");
    const text = stripFrontmatter(raw).trim();
    if (!text) {
      continue;
    }

    if (path.basename(relativePath) === "0.04 本書目錄及各章節的九宮.md") {
      overviewText = text;
    }

    chapters.push(buildChapter(relativePath, text));
  }

  chapters.sort((a, b) => a.path.localeCompare(b.path, "zh-Hant"));

  const library = buildLibrary(chapters, overviewText);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_DATA, JSON.stringify(library, null, 2), "utf8");
  await fs.writeFile(OUTPUT_DATA_JS, `window.__SITE_DATA__ = ${JSON.stringify(library, null, 2)};\n`, "utf8");

  console.log(`Built ${chapters.length} chapters -> ${path.relative(ROOT, OUTPUT_DATA)}`);
}

async function collectMarkdownFiles(dir, prefix = "") {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const relativePath = path.join(prefix, entry.name);
    const absolutePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      files.push(...(await collectMarkdownFiles(absolutePath, relativePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relativePath);
    }
  }

  return files;
}

function stripFrontmatter(text) {
  if (!text.startsWith("---\n")) {
    return text;
  }

  const end = text.indexOf("\n---", 4);
  if (end === -1) {
    return text;
  }

  return text.slice(end + 4);
}

function buildChapter(relativePath, text) {
  const segments = relativePath.split(path.sep);
  const top = segments[0];
  const shelf = segments.length > 2 ? segments[1] : segments[0];
  const title = cleanTitle(path.basename(relativePath, ".md"));
  const boards = parseMandalaBoards(text);
  const plainText = normalizeWhitespace(stripMarkdown(text));
  const summary = makeExcerpt(plainText, 140);
  const keywords = extractKeywords(text, title, segments);
  const html = renderMarkdown(text);
  const id = makeId(relativePath);

  return {
    id,
    path: relativePath,
    title,
    top,
    shelf,
    summary,
    keywords,
    html,
    boards,
    hasMandala: boards.length > 0,
    orderKey: relativePath,
  };
}

function buildLibrary(chapters, overviewText) {
  const topMap = new Map();

  for (const chapter of chapters) {
    if (!topMap.has(chapter.top)) {
      topMap.set(chapter.top, {
        id: makeId(chapter.top),
        title: cleanTitle(chapter.top),
        path: chapter.top,
        summary: "",
        shelves: new Map(),
        chapterCount: 0,
      });
    }

    const group = topMap.get(chapter.top);
    group.chapterCount += 1;

    if (!group.shelves.has(chapter.shelf)) {
      group.shelves.set(chapter.shelf, {
        id: makeId(`${chapter.top}/${chapter.shelf}`),
        title: cleanTitle(chapter.shelf),
        path: chapter.shelf === chapter.top ? chapter.top : `${chapter.top}/${chapter.shelf}`,
        summary: "",
        chapters: [],
      });
    }

    group.shelves.get(chapter.shelf).chapters.push(chapter);
  }

  const groups = [...topMap.values()]
    .map((group) => {
      const shelves = [...group.shelves.values()]
        .map((shelf) => {
          shelf.chapters.sort((a, b) => a.orderKey.localeCompare(b.orderKey, "zh-Hant"));
          shelf.summary = summarizeShelf(shelf);
          return shelf;
        })
        .filter((shelf) => shelf.chapters.length > 0)
        .sort((a, b) => a.path.localeCompare(b.path, "zh-Hant"));

      group.summary = summarizeGroup(group, shelves);
      return {
        id: group.id,
        title: group.title,
        path: group.path,
        summary: group.summary,
        chapterCount: group.chapterCount,
        shelves,
      };
    })
    .filter((group) => group.chapterCount > 0)
    .sort((a, b) => a.path.localeCompare(b.path, "zh-Hant"));

  const allKeywords = new Map();
  for (const chapter of chapters) {
    for (const keyword of chapter.keywords) {
      allKeywords.set(keyword, (allKeywords.get(keyword) || 0) + 1);
    }
  }

  const overview = normalizeWhitespace(stripMarkdown(overviewText));
  const homeBoard = buildHomeBoard(groups, overview);

  return {
    title: "九宮書稿網站",
    subtitle: "從已完成書稿生成的九宮閱讀站",
    summary: makeExcerpt(overview || groups.map((group) => group.summary).join(" "), 220),
    generatedAt: new Date().toISOString(),
    homeBoard,
    groups,
    keywords: [...allKeywords.entries()]
      .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], "zh-Hant"))
      .slice(0, 80)
      .map(([keyword]) => keyword),
  };
}

function summarizeShelf(shelf) {
  const lead = pickLeadChapter(shelf.chapters);
  if (!lead) {
    return "";
  }
  return `${lead.summary}${shelf.chapters.length > 1 ? ` 共收錄 ${shelf.chapters.length} 篇。` : ""}`;
}

function summarizeGroup(group, shelves) {
  const leadShelf = shelves.find((shelf) => pickLeadChapter(shelf.chapters)) || shelves[0];
  if (!leadShelf) {
    return "";
  }
  return `${leadShelf.summary}${shelves.length > 1 ? ` 目前分成 ${shelves.length} 個主題區。` : ""}`;
}

function pickLeadChapter(chapters) {
  if (!chapters.length) {
    return null;
  }

  return [...chapters].sort((a, b) => scoreSummary(b.summary) - scoreSummary(a.summary))[0];
}

function scoreSummary(summary) {
  if (!summary) {
    return -1;
  }

  let score = Math.min(summary.length, 160);
  score -= (summary.match(/\|/g) || []).length * 12;
  score -= (summary.match(/</g) || []).length * 10;
  score -= (summary.match(/（待補）/g) || []).length * 20;
  return score;
}

function buildHomeBoard(groups, overview) {
  const shelfIndex = new Map();

  for (const group of groups) {
    shelfIndex.set(group.path, {
      id: group.id,
      title: group.title,
      summary: group.summary,
      targetType: "group",
    });

    for (const shelf of group.shelves) {
      shelfIndex.set(shelf.path, {
        id: shelf.id,
        title: shelf.title,
        summary: shelf.summary,
        targetType: "shelf",
      });
    }
  }

  const cells = preferredHomeEntries.map(([key, fallbackTitle], index) => {
    const entry = shelfIndex.get(key);
    return {
      id: `home-${index + 1}`,
      title: entry?.title || fallbackTitle,
      summary: makeExcerpt(entry?.summary || "", 72),
      targetId: entry?.id || "",
      targetType: entry?.targetType || "shelf",
    };
  });

  return {
    id: "home-board",
    title: "全書九宮導覽",
    summary: makeExcerpt(overview, 160),
    center: {
      title: "書稿總覽",
      summary: makeExcerpt(overview, 220),
      html: `<p>${escapeHtml(makeExcerpt(overview, 220))}</p>`,
    },
    cells,
  };
}

function parseMandalaBoards(text) {
  const sectionPattern = /<!--section:\s*([0-9.]+)\s*-->/g;
  const matches = [...text.matchAll(sectionPattern)];
  if (matches.length === 0) {
    return [];
  }

  const sections = new Map();
  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const key = current[1];
    const start = current.index + current[0].length;
    const end = next ? next.index : text.length;
    sections.set(key, text.slice(start, end).trim());
  }

  const roots = [...sections.keys()].filter((key) => /^\d+$/.test(key)).sort((a, b) => Number(a) - Number(b));
  return roots.map((root) => {
    const rootContent = sections.get(root) || "";
    const title = firstMeaningfulLine(rootContent) || `Mandala ${root}`;
    const cells = CELL_ORDER.map((suffix, index) => {
      const key = `${root}.${suffix.split(".")[1]}`;
      const content = sections.get(key) || "";
      return {
        id: key,
        title: firstMeaningfulLine(content) || `第 ${index + 1} 格`,
        summary: makeExcerpt(normalizeWhitespace(stripMarkdown(content)), 80),
        html: renderMarkdown(content || "（待補）"),
      };
    });

    return {
      id: `board-${root}`,
      title,
      summary: makeExcerpt(normalizeWhitespace(stripMarkdown(rootContent)), 100),
      center: {
        title,
        summary: makeExcerpt(normalizeWhitespace(stripMarkdown(rootContent)), 160),
        html: renderMarkdown(rootContent || "（待補）"),
      },
      cells,
    };
  });
}

function firstMeaningfulLine(text) {
  return text
    .split("\n")
    .map((line) => normalizeWhitespace(stripMarkdown(line)))
    .find(Boolean) || "";
}

function extractKeywords(text, title, segments) {
  const keywords = new Set();
  const linkPattern = /\[\[([^[\]]+)\]\]/g;
  const tagPattern = /(^|\s)#([^\s#]+)/g;

  keywords.add(title);
  segments
    .map(cleanTitle)
    .filter(Boolean)
    .forEach((item) => keywords.add(item));

  for (const match of text.matchAll(linkPattern)) {
    keywords.add(cleanTitle(match[1]));
  }

  for (const match of text.matchAll(tagPattern)) {
    keywords.add(cleanTitle(match[2]));
  }

  return [...keywords]
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 32)
    .slice(0, 20);
}

function renderMarkdown(source) {
  const text = source.trim();
  if (!text) {
    return "<p>（待補）</p>";
  }

  const lines = text.split("\n");
  const output = [];
  let listType = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (!listType) {
      return;
    }
    output.push(listType === "ol" ? "</ol>" : "</ul>");
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    if (/^#{1,6}\s/.test(trimmed)) {
      flushParagraph();
      closeList();
      const level = trimmed.match(/^#+/)[0].length;
      output.push(`<h${level}>${renderInline(trimmed.slice(level).trim())}</h${level}>`);
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph();
      closeList();
      output.push(`<blockquote><p>${renderInline(trimmed.replace(/^>\s?/, ""))}</p></blockquote>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      if (listType !== "ol") {
        closeList();
        output.push("<ol>");
        listType = "ol";
      }
      output.push(`<li>${renderInline(trimmed.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      if (listType !== "ul") {
        closeList();
        output.push("<ul>");
        listType = "ul";
      }
      output.push(`<li>${renderInline(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();

  return output.join("\n");
}

function renderInline(text) {
  const placeholders = [];
  let rendered = escapeHtml(text);

  rendered = rendered.replace(/\[\[([^[\]]+)\]\]/g, (_, value) => {
    const token = `__TOKEN_${placeholders.length}__`;
    placeholders.push(`<span class="wikilink">${escapeHtml(value)}</span>`);
    return token;
  });

  rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const token = `__TOKEN_${placeholders.length}__`;
    placeholders.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`);
    return token;
  });

  rendered = rendered
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  placeholders.forEach((tokenValue, index) => {
    rendered = rendered.replace(`__TOKEN_${index}__`, tokenValue);
  });

  return rendered;
}

function stripMarkdown(text) {
  return text
    .replace(/<!--section:\s*[0-9.]+\s*-->/g, " ")
    .replace(/\[\[([^[\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<br/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\|/g, " ")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\{\{\[\[table\]\]\}\}/g, " ");
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function cleanTitle(value) {
  return value
    .replace(/\.md$/i, "")
    .replace(/^[✅🟦🟧🟨🟩🐙⚗️✱🧠📚\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function makeExcerpt(text, length = 120) {
  if (!text) {
    return "";
  }
  if (text.length <= length) {
    return text;
  }
  return `${text.slice(0, Math.max(0, length - 1)).trim()}…`;
}

function makeId(value) {
  return value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "item";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
