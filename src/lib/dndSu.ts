import bestiaryIndex from "@/features/bestiary/dndSuBestiaryIndex.json";
import itemsIndex from "@/features/items/dndSuItemsIndex.json";

/**
 * dnd.su has no public API and its robots.txt explicitly disallows the
 * bulk list/search endpoints (`/piece*`, `*search*`). What IS fair game is
 * their sitemap.xml (the mechanism robots.txt itself points crawlers to)
 * and fetching one specific page per lookup — the same thing a GM would do
 * by hand. `dndSuBestiaryIndex.json`/`dndSuItemsIndex.json` are a one-time,
 * build-time snapshot of sitemap.xml (slug -> numeric id), used only to
 * resolve a page URL; nothing is scraped in bulk at runtime.
 */

function normalizeSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveDndSuBestiaryUrl(englishName: string): string | null {
  const slug = normalizeSlug(englishName);
  const id = (bestiaryIndex as Record<string, number>)[slug];
  if (!id) return null;
  return `https://dnd.su/bestiary/${id}-${slug}/`;
}

export function resolveDndSuItemUrl(englishName: string): string | null {
  const slug = normalizeSlug(englishName);
  const id = (itemsIndex as Record<string, number>)[slug];
  if (!id) return null;
  return `https://dnd.su/items/${id}-${slug}/`;
}

/** Only works inside the built Tauri app (uses the Rust-side HTTP client to
 * bypass the webview's CORS restriction — dnd.su sends no CORS headers).
 * In a plain browser dev preview this throws, which callers should treat
 * as "dnd.su data unavailable, fall back to the open5e-sourced view". */
async function fetchDndSuHtml(url: string): Promise<string> {
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
  const res = await tauriFetch(url);
  if (!res.ok) throw new Error(`dnd.su вернул ${res.status}`);
  return res.text();
}

export type DndSuStatLine = { label: string; value: string };
export type DndSuBlock = { title: string | null; html: string }[];

export type DndSuMonster = {
  name: string;
  sizeTypeAlignment: string;
  lines: DndSuStatLine[];
  abilities: { abbr: string; score: string }[];
  blocks: DndSuBlock;
};

export type DndSuItem = {
  name: string;
  sizeTypeAlignment: string;
  lines: DndSuStatLine[];
  blocks: DndSuBlock;
};

function parseParamsList(doc: Document): { sizeTypeAlignment: string; lines: DndSuStatLine[]; abilities: DndSuMonster["abilities"]; blocks: DndSuBlock } {
  const list = doc.querySelector("ul.params.card__article-body");
  if (!list) throw new Error("Не нашёл блок статблока на странице dnd.su");

  let sizeTypeAlignment = "";
  const lines: DndSuStatLine[] = [];
  const abilities: DndSuMonster["abilities"] = [];
  const blocks: DndSuBlock = [];
  let currentTitle: string | null = null;

  for (const li of Array.from(list.children)) {
    if (li.classList.contains("size-type-alignment")) {
      sizeTypeAlignment = li.textContent?.replace(/\?/g, "").trim() ?? "";
      continue;
    }
    if (li.classList.contains("abilities")) {
      for (const stat of Array.from(li.querySelectorAll(".stat"))) {
        const divs = stat.querySelectorAll("div");
        abilities.push({ abbr: divs[0]?.textContent?.trim() ?? "", score: divs[1]?.textContent?.trim() ?? "" });
      }
      continue;
    }
    if (li.classList.contains("subsection") && li.classList.contains("desc")) {
      const heading = li.querySelector(".subsection-title");
      if (heading) currentTitle = heading.textContent?.trim() ?? null;
      const container = li.querySelector("div") ?? li;
      // Drop the heading itself from the captured HTML, keep the rest.
      const clone = container.cloneNode(true) as Element;
      clone.querySelectorAll(".subsection-title").forEach((h) => h.remove());
      blocks.push({ title: heading ? currentTitle : null, html: clone.innerHTML });
      continue;
    }
    const strong = li.querySelector("strong");
    if (strong) {
      const label = strong.textContent?.trim().replace(/:$/, "") ?? "";
      const clone = li.cloneNode(true) as Element;
      clone.querySelector("strong")?.remove();
      const value = clone.textContent?.trim() ?? "";
      if (label) lines.push({ label, value });
    }
  }

  return { sizeTypeAlignment, lines, abilities, blocks };
}

export async function fetchDndSuMonster(englishName: string): Promise<DndSuMonster | null> {
  const url = resolveDndSuBestiaryUrl(englishName);
  if (!url) return null;
  const html = await fetchDndSuHtml(url);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nameEl = doc.querySelector(".card-title span[data-copy]");
  const name = nameEl?.textContent?.trim() || englishName;
  const { sizeTypeAlignment, lines, abilities, blocks } = parseParamsList(doc);
  return { name, sizeTypeAlignment, lines, abilities, blocks };
}

export async function fetchDndSuItem(englishName: string): Promise<DndSuItem | null> {
  const url = resolveDndSuItemUrl(englishName);
  if (!url) return null;
  const html = await fetchDndSuHtml(url);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nameEl = doc.querySelector(".card-title span[data-copy]");
  const name = nameEl?.textContent?.trim() || englishName;
  const { sizeTypeAlignment, lines, blocks } = parseParamsList(doc);
  return { name, sizeTypeAlignment, lines, blocks };
}
