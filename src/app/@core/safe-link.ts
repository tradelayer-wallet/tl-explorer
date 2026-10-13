// The one place that turns a value from the chain or the API into an external
// href. Returns null when the value must not be rendered as a link.
//
// Only http and https hrefs are produced. A value without an http(s):// prefix
// is read as a host and given https://, so javascript:, data: and vbscript:
// either fail to parse or become https links to a host of that name. The scheme
// is still checked on the parsed URL as a final guard. URLs with embedded
// credentials are refused, so the link text cannot name one host while the link
// goes to another.
export function safeExternalHref(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
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
