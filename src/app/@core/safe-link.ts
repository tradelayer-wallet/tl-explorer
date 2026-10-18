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

// Loopback, private, link-local and unspecified targets are refused too. An
// on-chain URL must not open the reader's own machine or LAN (a router admin page
// at http://192.168.0.1/, or a local service on localhost). Only literal
// addresses, single-label names and the local name spaces are judged here. A
// single label (`localhost`, `nas`) resolves through the reader's DNS search
// suffixes, so it is refused like a LAN name; a public name has a dot. A name
// under one of LOCAL_NAME_SUFFIXES is answered by local DNS or is reserved, so it
// is refused in any label count. Other DNS names are not resolved. `hostname`
// comes from WHATWG, so it is lowercase and IPv4 is dotted decimal.
const LOCAL_NAME_SUFFIXES = [
  '.localhost', '.local', '.localdomain', '.lan', '.home', '.home.arpa', '.internal',
  '.corp', '.intranet', '.private', '.test', '.example', '.invalid',
];

const isNonPublicHost = (hostname: string): boolean => {
  const host = hostname.replace(/\.+$/, '');
  if (!host.startsWith('[') && !host.includes('.')) {
    return true;
  }
  if (LOCAL_NAME_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    return true;
  }
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    return a === 0 || a === 10 || a === 127 || a >= 224
      || (a === 100 && b >= 64 && b <= 127)   // CGNAT
      || (a === 169 && b === 254)             // link-local, cloud metadata
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168);
  }
  if (host.startsWith('[')) {
    const inner = host.slice(1, -1);
    return inner.startsWith('::')   // unspecified, loopback, IPv4-mapped and compatible
      || /^f[cd]/.test(inner)       // fc00::/7 unique local
      || /^fe[89ab]/.test(inner)    // fe80::/10 link-local
      || /^ff/.test(inner);         // multicast
  }
  return false;
};

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
  // The host the user reads must be the host the browser opens. WHATWG
  // decodes percent-escapes in hosts (`%65vil.com`) and turns numeric forms
  // into dotted IPv4 (`0x7f.1`, `2130706433`), and it accepts an empty host
  // (`https:///x.com`). Each of those changes the target away from the text.
  const hostText = authority.replace(/:\d*$/, '').toLowerCase();
  if (!hostText || url.hostname !== hostText) {
    return null;
  }
  if (isNonPublicHost(url.hostname)) {
    return null;
  }
  return url.href;
}
