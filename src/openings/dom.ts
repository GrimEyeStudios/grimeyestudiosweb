/**
 * Tiny DOM builder. Everything goes through textContent / setAttribute, never innerHTML, so
 * user input and API strings can't inject markup.
 */
type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, string | number | boolean | null | undefined | EventListener>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = String(v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
}

export function $(sel: string, root: ParentNode = document) {
  return root.querySelector(sel) as HTMLElement | null;
}

export function mount(target: HTMLElement | null, ...children: Child[]) {
  if (!target) return;
  target.replaceChildren();
  append(target, children);
}

/**
 * Third-party URLs (AnimeThemes, AniList) go through this before becoming an href, so a
 * compromised API can't inject javascript: or data: links. Returns undefined (no href) otherwise.
 */
export function safeUrl(u: string | null | undefined): string | undefined {
  if (!u) return undefined;
  try {
    const url = new URL(u, location.href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function plural(n: number, one: string, many = one + 's') {
  return `${n.toLocaleString()} ${n === 1 ? one : many}`;
}
