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

const PROPERTY_TYPES = ['address', 'contract', 'url', 'transaction', 'property'];
export type PROPERTY_TYPES = 'address' | 'contract' | 'url' | 'transaction' | 'property';

function isPropertyType(value: string): value is PROPERTY_TYPES {
  return PROPERTY_TYPES.includes(value);
}

const PropertyTypeToProperties: {
  [key in PROPERTY_TYPES]: string[];
} = {
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
  address: (value: string) => ['/', 'addresses', value],
  transaction: (value: string) => ['/', 'tx', value],
  contract: (value: string) => ['/', 'contracts', value],
  property: (value: string) => ['/', 'properties', value],
  url: (value: string) => ['/', value]
};

export const PropertyToPropertyType: { [key: string]: PROPERTY_TYPES; } = {};

Object.entries(PropertyTypeToProperties)
  .forEach(([propertyType, property]: [string, string[]]) => {
    property.forEach(prop => {
      PropertyToPropertyType[prop] = propertyType as PROPERTY_TYPES;
    });
  });

const noLink: LinkFunction = function() {return []}

export const getLinkFromPropertyName = (propertyName: string, value: string): string[] => {
  let propertyType = PropertyToPropertyType[propertyName];
  return getLinkFromPropertyType(propertyType, value);
}

export const getLinkFromPropertyType = (propertyType: string, value: string): string[] => {
  let linker: LinkFunction = noLink;

  if(isPropertyType(propertyType)) {
    linker = TypeToHandler[propertyType];
  }

  return linker(value);
}

export const isLinkable = (key: string): boolean => {
  const propertyType: PROPERTY_TYPES = PropertyToPropertyType[key];
  return !!propertyType;
}
