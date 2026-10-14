const ADDRESS_PROPERTIES = [
  'issuer',
];
const CONTRACT_PROPERTIES: string[] = [];
const URL_PROPERTIES = [
  'url',
];
const TRANSACTION_PROPERTIES = [
  'creationtxid',
];
const PROPERTY_PROPERTIES = [
  'propertyid'
];
const BLOCK_PROPERTIES = [
  'blockid'
];

const PROPERTY_TYPES = ['blocks', 'address', 'contract', 'url', 'transaction', 'property'];
export type PROPERTY_TYPES = 'blocks' | 'address' | 'contract' | 'url' | 'transaction' | 'property';

function isPropertyType(value: string): value is PROPERTY_TYPES {
  return PROPERTY_TYPES.includes(value);
}

const PropertyTypeToProperties: {
  [key in PROPERTY_TYPES]: string[];
} = {
  blocks: BLOCK_PROPERTIES,
  address: ADDRESS_PROPERTIES,
  contract: CONTRACT_PROPERTIES,
  url: URL_PROPERTIES,
  transaction: TRANSACTION_PROPERTIES,
  property: PROPERTY_PROPERTIES,
};

export type LinkFunction = (value: string) => string[];

export const TypeToHandler: {
  [key in PROPERTY_TYPES]: LinkFunction
} = {
  blocks: (value: string) => ['/', 'blocks', value],
  address: (value: string) => ['/', 'addresses', value],
  transaction: (value: string) => ['/', 'tx', value],
  contract: (value: string) => ['/', 'contracts', value],
  property: (value: string) => ['/', 'properties', value],
  // Never a router link: URLs go through safeExternalHref() as an href instead.
  // A router path built from on-chain text would be an in-app navigation sink.
  url: (_value: string) => []
};

export const PropertyToPropertyType: { [key: string]: PROPERTY_TYPES; } = {};

// Own keys only: a plain object would otherwise answer for inherited names such
// as `constructor` or `__proto__`.
export const propertyTypeOf = (key: string): PROPERTY_TYPES | undefined =>
  Object.prototype.hasOwnProperty.call(PropertyToPropertyType, key)
    ? PropertyToPropertyType[key]
    : undefined;

Object.entries(PropertyTypeToProperties)
  .forEach(([propertyType, property]: [string, string[]]) => {
    property.forEach(prop => {
      PropertyToPropertyType[prop] = propertyType as PROPERTY_TYPES;
    });
  });

const noLink: LinkFunction = function() {return []}

export const getLinkFromPropertyName = (propertyName: string, value: string): string[] => {
  return getLinkFromPropertyType(propertyTypeOf(propertyName) ?? '', value);
}

// The shape each link target accepts. A value outside it is not linked: the value
// goes into a router path, and Angular resolves `..` and `/` inside it, so an
// unchecked value could steer a link to another page while its text says otherwise.
const VALUE_FORMAT: { [key in PROPERTY_TYPES]: RegExp | null } = {
  blocks: /^\d{1,16}$/,
  address: /^[A-Za-z0-9]{10,120}$/,
  contract: /^\d{1,16}$/,
  url: null,
  transaction: /^[0-9a-fA-F]{64}$/,
  property: /^\d{1,16}$/,
};

export const getLinkFromPropertyType = (propertyType: string, value: string | number): string[] => {
  if (!isPropertyType(propertyType)) {
    return noLink(String(value));
  }
  const format = VALUE_FORMAT[propertyType];
  const text = typeof value === 'number' ? String(value) : value;
  if (!format || typeof text !== 'string' || !format.test(text)) {
    return [];
  }
  return TypeToHandler[propertyType](text);
}

export const isLinkable = (key: string): boolean => {
  return propertyTypeOf(key) !== undefined;
}
