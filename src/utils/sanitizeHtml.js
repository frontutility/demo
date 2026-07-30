const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "i",
  "img",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
]);

const ALLOWED_ATTRS = new Set(["alt", "class", "colspan", "href", "rel", "rowspan", "src", "target", "title"]);
const URI_ATTRS = new Set(["href", "src"]);

function isSafeUrl(value, tagName, attrName) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return false;

  if (attrName === "src" && tagName === "img" && /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(trimmed)) {
    return true;
  }

  if (/^(https?:|mailto:|tel:|\/(?!\/)|#)/i.test(trimmed)) {
    return true;
  }

  return false;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeHtml(html) {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return escapeHtml(html);
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<div>${html || ""}</div>`, "text/html");
  const root = document.body.firstElementChild;

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }

    const tagName = node.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      const promotedChildren = Array.from(node.childNodes);
      node.replaceWith(...promotedChildren);
      // The promoted children remain untrusted and must be visited as well.
      promotedChildren.forEach(cleanNode);
      return;
    }

    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith("on") || name === "style" || !ALLOWED_ATTRS.has(name)) {
        node.removeAttribute(attr.name);
        return;
      }
      if (URI_ATTRS.has(name) && !isSafeUrl(value, tagName, name)) {
        node.removeAttribute(attr.name);
      }
    });

    if (tagName === "a") {
      node.setAttribute("rel", "noopener noreferrer");
    }

    Array.from(node.childNodes).forEach(cleanNode);
  }

  Array.from(root.childNodes).forEach(cleanNode);
  return root.innerHTML;
}

export function escapeAndHighlight(text, query) {
  let output = escapeHtml(text);
  const terms = String(query || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  terms.forEach((term) => {
    const regex = new RegExp(`(${term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    output = output.replace(regex, "<mark>$1</mark>");
  });

  return output;
}
