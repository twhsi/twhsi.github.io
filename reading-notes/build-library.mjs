import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const vaultRoot = path.resolve(siteDir, "..");
const outputFile = path.join(siteDir, "library-data.js");
const excludedDirs = new Set([".obsidian", "3*3思考法", "讀書心得網站"]);

function normalizeBaseTitle(name) {
  return name
    .replace(/\.md$/i, "")
    .replace(/^[\d\s._-]+/, "")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
}

function stripMarkdown(text) {
  return String(text || "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/^\|.*\|$/gm, " ")
    .replace(/^:?-{3,}:?$/gm, " ")
    .replace(/[*_`>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text, max = 72) {
  const plain = stripMarkdown(text);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { body: raw, tags: [] };
  const tags = [];
  let inTags = false;
  match[1].split("\n").forEach((line) => {
    if (/^tags:\s*$/.test(line.trim())) {
      inTags = true;
      return;
    }
    if (inTags && /^\s*-\s+/.test(line)) {
      tags.push(line.replace(/^\s*-\s+/, "").trim());
      return;
    }
    inTags = false;
  });
  return { body: raw.slice(match[0].length), tags };
}

function parseSections(body) {
  const regex = /<!--section:\s*([^>]+?)-->\s*([\s\S]*?)(?=(?:<!--section:\s*[^>]+?-->|$))/g;
  const sections = [];
  let match;
  while ((match = regex.exec(body))) {
    sections.push({ id: match[1].trim(), content: match[2].trim() });
  }
  return sections;
}

function isNoiseToken(token) {
  return !token || /^section$/i.test(token) || /^\d+(\.\d+)+$/.test(token) || /^[\-─—=]+$/.test(token) || token.includes("---");
}

function firstUsefulText(content) {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^\|.*\|$/.test(line))
    .filter((line) => !/^:?-{3,}:?$/.test(line));
  return lines[0] || "";
}

function deriveTitle(sectionId, content, fallback) {
  const lines = String(content || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const heading = lines.find((line) => /^#{1,6}\s+/.test(line));
  if (heading) return stripMarkdown(heading.replace(/^#{1,6}\s+/, ""));
  const summaryLine = lines.find((line) => line.startsWith("**"));
  if (summaryLine) return excerpt(summaryLine.replace(/\*\*/g, ""), 40);
  const candidate = firstUsefulText(content);
  if (candidate) return excerpt(candidate, 40);
  return fallback || `Section ${sectionId}`;
}

function extractKeywords(text) {
  const fromLinks = [...String(text || "").matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1].trim());
  const plain = stripMarkdown(text);
  const tokens = plain
    .split(/[\s、，。:：；;（）()\/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && token.length <= 18)
    .filter((token) => !isNoiseToken(token));
  return [...fromLinks, ...tokens].slice(0, 40);
}

function buildBoard(sourceFile, rootId, rootSection, childSections, tags, fallbackTitle) {
  const orderedIds = [`${rootId}.1`, `${rootId}.2`, `${rootId}.3`, `${rootId}.4`, rootId, `${rootId}.5`, `${rootId}.6`, `${rootId}.7`, `${rootId}.8`];
  const centerTitle = deriveTitle(rootId, rootSection?.content || "", fallbackTitle);
  const cells = orderedIds.map((id) => {
    const section = id === rootId ? rootSection : childSections.get(id);
    const content = section?.content || "";
    return {
      id,
      title: deriveTitle(id, content, id === rootId ? centerTitle : `Section ${id}`),
      summary: excerpt(content, 58),
      content,
      isCenter: id === rootId
    };
  });
  const boardText = rootSection?.content || cells.find((cell) => !cell.isCenter && cell.content)?.content || "";
  return {
    id: rootId,
    title: centerTitle,
    summary: excerpt(boardText || cells.map((cell) => cell.title).join(" "), 96),
    sourceFile,
    keywords: Array.from(new Set([...tags, centerTitle, ...extractKeywords(boardText + "\n" + cells.map((cell) => `${cell.title}\n${cell.content}`).join("\n"))])).slice(0, 20),
    cells
  };
}

async function loadBook(folderName) {
  const bookDir = path.join(vaultRoot, folderName);
  const entries = await fs.readdir(bookDir, { withFileTypes: true });
  const mdFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));

  const cleanedTitle = normalizeBaseTitle(folderName.replace(/^\d+[_\s﹍？?　.-]*/, "")) || folderName;
  const boards = [];
  const keywords = [];

  for (const fileName of mdFiles) {
    const fullPath = path.join(bookDir, fileName);
    const raw = await fs.readFile(fullPath, "utf8");
    if (!raw.includes("<!--section:")) continue;
    const { body, tags } = parseFrontmatter(raw);
    const sections = parseSections(body);
    if (!sections.length) continue;
    const byId = new Map(sections.map((section) => [section.id, section]));
    const rootIds = sections.map((section) => section.id).filter((id) => !id.includes("."));
    const fileFallbackTitle = normalizeBaseTitle(fileName) || cleanedTitle;
    rootIds.forEach((rootId) => {
      const childSections = new Map(sections.filter((section) => section.id.startsWith(`${rootId}.`)).map((section) => [section.id, section]));
      boards.push(buildBoard(path.join(folderName, fileName).replace(/\\/g, "/"), rootId, byId.get(rootId), childSections, tags, fileFallbackTitle));
    });
    keywords.push(...tags);
  }

  if (!boards.length) return null;

  boards.sort((a, b) => Number(a.id) - Number(b.id));
  const bookKeywords = Array.from(new Set([...keywords, cleanedTitle, ...boards.flatMap((board) => [board.title, ...board.keywords])])).filter((token) => !isNoiseToken(token)).slice(0, 24);
  return {
    id: folderName.split(" ")[0],
    folder: folderName,
    title: cleanedTitle,
    summary: boards[0]?.summary || "由多個標準化九宮組成。",
    keywords: bookKeywords,
    boards: boards.slice(0, 4)
  };
}

async function main() {
  const entries = await fs.readdir(vaultRoot, { withFileTypes: true });
  const folderNames = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && !excludedDirs.has(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "zh-Hant"));
  const books = [];
  for (const folderName of folderNames) {
    const book = await loadBook(folderName);
    if (book) books.push(book);
  }
  const output = `window.LIBRARY_DATA = ${JSON.stringify({ generatedAt: new Date().toISOString(), books }, null, 2)};\n`;
  await fs.writeFile(outputFile, output, "utf8");
  console.log(`Generated ${books.length} books to ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
