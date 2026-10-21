// The one definition of what a lookup value looks like. The API path builder
// (api/tl-api.service.ts) and the in-app router links (@components/property-types.ts)
// both take their values from here, so an id, txid or address is accepted or refused
// the same way on the request and on the link that opens it.

export type LookupKind = 'txid' | 'address' | 'id';

// Numeric ids arrive as route-param strings (`'123'`) or as numbers. Strings
// must be canonical decimal digits (no sign, point, hex or exponent) of at most
// 16 characters; numbers must be safe non-negative integers. Number.isSafeInteger
// rejects the values above 2^53 - 1 that a 16-digit string can still express.
const ID_RE = /^\d{1,16}$/;
const TXID_RE = /^[0-9a-fA-F]{64}$/;
// base58 (legacy) and bech32 (segwit) addresses are alphanumeric. This charset
// excludes `/`, `.`, `?`, `#`, `%` and whitespace, so encoding is a no-op.
const ADDRESS_RE = /^[A-Za-z0-9]{10,120}$/;

const canonicalId = (value: unknown): string | null => {
  if (typeof value === 'string') {
    if (!ID_RE.test(value)) return null;
    // Number() drops leading zeros: '007' -> 7.
    value = Number(value);
  }
  return (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
    ? String(value)
    : null;
};

// The text a lookup carries, or null when the value does not have the kind's shape.
export const canonicalLookup = (kind: LookupKind, value: unknown): string | null => {
  if (kind === 'id') {
    return canonicalId(value);
  }
  const pattern = kind === 'txid' ? TXID_RE : ADDRESS_RE;
  return (typeof value === 'string' && pattern.test(value)) ? value : null;
};
