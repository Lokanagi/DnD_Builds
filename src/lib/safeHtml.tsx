import { Fragment, type ReactNode } from "react";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "ul",
  "ol",
  "li",
  "sup",
  "h3",
]);

let keyCounter = 0;

function renderNode(node: ChildNode): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map((child) => (
    <Fragment key={keyCounter++}>{renderNode(child)}</Fragment>
  ));

  if (!ALLOWED_TAGS.has(tag)) {
    // Unknown/unsafe tag (scripts, styles, links, etc.) — keep its text, drop the wrapper.
    return <Fragment key={keyCounter++}>{children}</Fragment>;
  }

  switch (tag) {
    case "p":
      return <p key={keyCounter++}>{children}</p>;
    case "br":
      return <br key={keyCounter++} />;
    case "strong":
    case "b":
      return <strong key={keyCounter++}>{children}</strong>;
    case "em":
    case "i":
      return <em key={keyCounter++}>{children}</em>;
    case "table":
      return (
        <table key={keyCounter++} className="my-1 border-collapse text-xs">
          {children}
        </table>
      );
    case "thead":
      return <thead key={keyCounter++}>{children}</thead>;
    case "tbody":
      return <tbody key={keyCounter++}>{children}</tbody>;
    case "tr":
      return <tr key={keyCounter++}>{children}</tr>;
    case "td":
      return (
        <td key={keyCounter++} className="border border-slate-300 px-1.5 py-0.5 dark:border-slate-700">
          {children}
        </td>
      );
    case "th":
      return (
        <th key={keyCounter++} className="border border-slate-300 px-1.5 py-0.5 font-semibold dark:border-slate-700">
          {children}
        </th>
      );
    case "ul":
      return (
        <ul key={keyCounter++} className="list-disc pl-5">
          {children}
        </ul>
      );
    case "ol":
      return (
        <ol key={keyCounter++} className="list-decimal pl-5">
          {children}
        </ol>
      );
    case "li":
      return <li key={keyCounter++}>{children}</li>;
    case "sup":
      return <sup key={keyCounter++}>{children}</sup>;
    case "h3":
      return (
        <h3 key={keyCounter++} className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {children}
        </h3>
      );
    default:
      return children;
  }
}

/**
 * Converts a trusted-ish but externally-sourced HTML fragment (dnd.su page
 * content) into React nodes without ever using dangerouslySetInnerHTML.
 * DOMParser parses it inert (no script execution), then only a small
 * whitelist of formatting tags survives into real elements — every other
 * tag (script, style, a/href, on* handlers via attribute drop, etc.) is
 * unwrapped to its text content.
 */
export function renderSafeHtml(html: string): ReactNode {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.body.childNodes).map((node) => <Fragment key={keyCounter++}>{renderNode(node)}</Fragment>);
}
