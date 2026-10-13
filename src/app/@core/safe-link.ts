// The one place that turns a value from the chain or the API into an external
// href. Returns null when the value must not be rendered as a link.
//
// The rule is that the text a user reads must name the host the link goes to.
// So the input is refused unless it is printable ASCII with no backslash: the
// WHATWG parser silently drops tabs and newlines, maps backslash to a slash and
// punycodes non-ASCII hosts, and each of those would change the target away
// from the text. Only http and https links are produced. A value without a
// scheme must look like a host name with a dot (`example.com`, optionally with
// a port or path), so `javascript:0`, `ftp://x` and `//x` are refused rather
// than becoming https links to single-label hosts. URLs with credentials, or
// with an `@` anywhere in the authority, are refused for the same display reason.
const MAX_LENGTH = 2048;
const PRINTABLE_ASCII = /^[\x21-\x7e]+$/;
const SCHEME = /^https?:\/\//i;
const BARE_HOST = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+(:\d{1,5})?([/?#].*)?$/;

export function safeExternalHref(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_LENGTH) {
    return null;
  }
  if (!PRINTABLE_ASCII.test(trimmed) || trimmed.includes('\\')) {
    return null;
  }
  const hasScheme = SCHEME.test(trimmed);
  if (!hasScheme && !BARE_HOST.test(trimmed)) {
    return null;
  }
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;
  const authority = candidate.slice(candidate.indexOf('//') + 2).split(/[/?#]/)[0];
  if (authority.includes('@')) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return null;
  }
  if (url.username || url.password) {
    return null;
  }
  return url.href;
}
