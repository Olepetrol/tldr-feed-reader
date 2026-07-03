import { parse } from "node-html-parser";

const EDITIONS = {
  tech: "https://tldr.tech/tech",
  ai: "https://tldr.tech/ai",
  webdev: "https://tldr.tech/webdev",
};

function parseEdition(html) {
  const root = parse(html);
  const nodes = root.querySelectorAll("h1, h2, h3, h4, p, div, td, span, a");

  const sections = [];
  let current = null;
  let lastItem = null;

  nodes.forEach((node) => {
    const tag = node.tagName ? node.tagName.toLowerCase() : "";
    const text = (node.text || "").trim();
    if (!text) return;

    if (tag === "a" && /\(\d+\s*minute read\)/i.test(text)) {
      const m = text.match(/\((\d+)\s*minute read\)/i);
      const title = text.replace(/\(\d+\s*minute read\)/i, "").trim();
      if (!current) {
        current = { section: "Nyheter", items: [] };
        sections.push(current);
      }
      lastItem = {
        title,
        url: node.getAttribute("href"),
        minutes: m ? parseInt(m[1], 10) : null,
        summary: "",
      };
      current.items.push(lastItem);
      return;
    }

    if (
      ["h1", "h2", "h3", "h4"].includes(tag) &&
      !/minute read/i.test(text) &&
      text.length < 60 &&
      /^[A-Za-z][A-Za-z &,]*$/.test(text)
    ) {
      current = { section: text, items: [] };
      sections.push(current);
      lastItem = null;
      return;
    }

    const className = node.getAttribute ? (node.getAttribute("class") || "") : "";
    const isSummaryDiv = tag === "div" && /newsletter-html/i.test(className);

    if (
      lastItem &&
      !lastItem.summary &&
      text.length > 15 &&
      text.length < 1500 &&
      text !== lastItem.title &&
      !/minute read/i.test(text) &&
      !/^advertisement/i.test(text) &&
      (isSummaryDiv ||
        ((tag === "p" || tag === "div" || tag === "td" || tag === "span") &&
          text.length > 30 &&
          !(node.querySelectorAll && node.querySelectorAll("a").length > 0)))
    ) {
      lastItem.summary = text;
    }
  });

  const cleaned = sections.filter((s) => s.items.length > 0);
  return cleaned.length ? cleaned : null;
}

export const handler = async (event) => {
  const edition = (event.queryStringParameters && event.queryStringParameters.edition) || "tech";
  const base = EDITIONS[edition] || EDITIONS.tech;

  try {
    const archivesRes = await fetch(`${base}/archives`);
    const archivesHtml = await archivesRes.text();
    const dateMatch = archivesHtml.match(
      new RegExp(`/${edition}/(\\d{4}-\\d{2}-\\d{2})`)
    );
    if (!dateMatch) throw new Error("no edition date found in archives");
    const date = dateMatch[1];

    const editionRes = await fetch(`${base}/${date}`);
    const editionHtml = await editionRes.text();
    const sections = parseEdition(editionHtml);
    if (!sections) throw new Error("could not parse edition content");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=1800",
      },
      body: JSON.stringify({ date, edition, sections }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
