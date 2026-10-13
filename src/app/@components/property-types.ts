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

export const getLinkFromPropertyType = (propertyType: string, value: string): string[] => {
  let linker: LinkFunction = noLink;

  if(isPropertyType(propertyType)) {
    linker = TypeToHandler[propertyType];
  }

  return linker(value);
}

export const isLinkable = (key: string): boolean => {
  return propertyTypeOf(key) !== undefined;
}
