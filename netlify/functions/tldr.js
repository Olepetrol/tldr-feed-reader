import { parse } from "node-html-parser";

const EDITIONS = {
  tech: "https://tldr.tech/tech",
  ai: "https://tldr.tech/ai",
  webdev: "https://tldr.tech/webdev",
};

function parseEdition(html) {
  const root = parse(html);
  const anchors = root.querySelectorAll("a").filter((a) =>
    /\(\d+\s*minute read\)/i.test(a.text || "")
  );
  if (anchors.length < 5) return null;

  const sections = [];
  let current = null;

  anchors.forEach((a) => {
    const heading = a.closest("h1,h2,h3,h4");
    let sectionLabel = "Nyheter";
    let el = heading ? heading.previousElementSibling : null;
    let hops = 0;
    while (el && hops < 8) {
      const txt = (el.text || "").trim();
      if (
        txt &&
        txt.length < 60 &&
        !/minute read/i.test(txt) &&
        /^[A-Za-z][A-Za-z &,]*$/.test(txt)
      ) {
        sectionLabel = txt;
        break;
      }
      el = el.previousElementSibling;
      hops++;
    }

    if (!current || current.section !== sectionLabel) {
      current = { section: sectionLabel, items: [] };
      sections.push(current);
    }

    const raw = a.text || "";
    const m = raw.match(/\((\d+)\s*minute read\)/i);
    const title = raw.replace(/\(\d+\s*minute read\)/i, "").trim();

    let summary = "";
    const sib = heading ? heading.nextElementSibling : a.nextElementSibling;
    if (sib && sib.tagName === "P") summary = (sib.text || "").trim();

    current.items.push({
      title,
      url: a.getAttribute("href"),
      minutes: m ? parseInt(m[1], 10) : null,
      summary,
    });
  });

  return sections;
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
