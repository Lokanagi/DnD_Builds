/** LSS stores long-text fields (background, equipment, personality, ...) as
 * Tiptap/ProseMirror doc JSON. This flattens one down to plain paragraphs
 * for a read-only display — formatting (bold etc.) is intentionally dropped. */
export function tiptapToPlainText(value: unknown): string {
  const doc = (value as { data?: { content?: unknown[] } } | undefined)?.data;
  if (!doc?.content) return "";

  const paragraphs: string[] = [];
  for (const node of doc.content as Array<{ type: string; content?: Array<{ text?: string }> }>) {
    if (node.type !== "paragraph" || !node.content) {
      paragraphs.push("");
      continue;
    }
    paragraphs.push(node.content.map((n) => n.text ?? "").join(""));
  }
  return paragraphs.join("\n").trim();
}
