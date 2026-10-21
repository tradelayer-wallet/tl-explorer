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
// is refused in any label count. A name under a WILDCARD_DNS_DOMAINS service, or
// with four labels that spell an IPv4 address, is answered with the address it
// names, so it is refused as that address would be. The service list is not
// complete: a wildcard service that is not listed is not caught. Other DNS names
// are not resolved. `hostname` comes from WHATWG, so it is lowercase and IPv4 is
// dotted decimal.
const LOCAL_NAME_SUFFIXES = [
  '.localhost', '.local', '.localdomain', '.lan', '.home', '.home.arpa', '.internal',
  '.corp', '.intranet', '.private', '.test', '.example', '.invalid',
];
const WILDCARD_DNS_DOMAINS = ['nip.io', 'sslip.io', 'xip.io', 'localtest.me', 'lvh.me', 'vcap.me'];

// An IPv4 address is judged by its first three octets: private, loopback,
// link-local (cloud metadata), CGNAT, benchmarking, documentation, the IETF
// protocol block, multicast and reserved space.
const nonPublicIPv4 = (a: number, b: number, c: number): boolean =>
  a === 0 || a === 10 || a === 127 || a >= 224
  || (a === 100 && b >= 64 && b <= 127)   // CGNAT
  || (a === 169 && b === 254)             // link-local, cloud metadata
  || (a === 172 && b >= 16 && b <= 31)
  || (a === 192 && b === 168)
  || (a === 192 && b === 0 && c === 0)    // IETF protocol assignments 192.0.0.0/24
  || (a === 192 && b === 0 && c === 2)    // documentation 192.0.2.0/24
  || (a === 198 && (b === 18 || b === 19)) // benchmarking 198.18.0.0/15
  || (a === 198 && b === 51 && c === 100) // documentation 198.51.100.0/24
  || (a === 203 && b === 0 && c === 113); // documentation 203.0.113.0/24

// The eight 16-bit groups of an IPv6 literal (WHATWG spelling, without brackets),
// or null when the spelling is not one this parser understands.
const ipv6Groups = (inner: string): number[] | null => {
  const halves = inner.split('::');
  if (halves.length > 2) {
    return null;
  }
  const groups = (part: string): number[] =>
    part === '' ? [] : part.split(':').map((g) => (/^[0-9a-f]{1,4}$/i.test(g) ? parseInt(g, 16) : NaN));
  const head = groups(halves[0]);
  const tail = halves.length === 2 ? groups(halves[1]) : [];
  if ([...head, ...tail].some(Number.isNaN)) {
    return null;
  }
  const missing = 8 - head.length - tail.length;
  if (halves.length === 2 ? missing < 1 : missing !== 0) {
    return null;
  }
  return [...head, ...new Array<number>(missing).fill(0), ...tail];
};

// Only global unicast 2000::/3 is external. The transition prefixes that embed an
// IPv4 address are judged by that address: NAT64 64:ff9b::/96 (last 32 bits) and
// 6to4 2002::/16 (groups 2 and 3). Everything else is refused, including the
// unspecified, loopback, IPv4-mapped and IPv4-compatible ::/96 forms, unique local
// and link-local, site-local, multicast, the NAT64 local-use prefix 64:ff9b:1::/48,
// the discard prefix 100::/64, the IETF block 2001::/23 (Teredo, which obfuscates
// its address, and the benchmarking and ORCHID blocks), documentation 2001:db8::/32
// and documentation 3fff::/20.
const nonPublicIPv6 = (inner: string): boolean => {
  const g = ipv6Groups(inner);
  if (g === null) {
    return true;
  }
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g;
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return nonPublicIPv4(g6 >> 8, g6 & 0xff, g7 >> 8);
  }
  if (g0 === 0x2002) {
    return nonPublicIPv4(g1 >> 8, g1 & 0xff, g2 >> 8);
  }
  if ((g0 & 0xe000) !== 0x2000) {
    return true;
  }
  return (g0 === 0x2001 && g1 < 0x0200) || (g0 === 0x2001 && g1 === 0x0db8) || (g0 === 0x3fff && g1 < 0x1000);
};

const isOctet = (label: string): boolean => /^\d{1,3}$/.test(label) && Number(label) <= 255;

// Four dot-separated labels that are octets, anywhere in the name, spell an IPv4
// literal (`10.0.0.1.example.com`), which a wildcard service would answer.
const embedsIPv4Literal = (host: string): boolean => {
  const labels = host.split('.');
  for (let i = 0; i + 4 <= labels.length; i++) {
    if (labels.slice(i, i + 4).every(isOctet)) {
      return true;
    }
  }
  return false;
};

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
    return nonPublicIPv4(Number(v4[1]), Number(v4[2]), Number(v4[3]));
  }
  if (host.startsWith('[')) {
    return nonPublicIPv6(host.slice(1, -1));
  }
  if (WILDCARD_DNS_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
    return true;
  }
  return embedsIPv4Literal(host);
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
  const hostText = authority.replace(/:\d*$/, '').toLowerCase().replace(/\.+$/, '');
  if (!hostText) {
    return null;
  }
  // A trailing dot names the same host. An IPv6 literal is compared by address:
  // WHATWG's spelling drops zero groups (`[2001:0db8::1]` is `[2001:db8::1]`), and
  // a literal has no percent-escapes or numeric forms that could change its target.
  const sameHost = hostText.startsWith('[')
    || hostText === url.hostname.replace(/\.+$/, '');
  if (!sameHost) {
    return null;
  }
  if (isNonPublicHost(url.hostname)) {
    return null;
  }
  return url.href;
}
