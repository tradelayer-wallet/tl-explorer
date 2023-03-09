import { Component, Input, OnInit } from '@angular/core';

const ADDRESS_PROPERTIES = [
  'issuer',
];
const CONTRACT_PROPERTIES:string[] = [];
const URL_PROPERTIES = [
  'url',
];
const TRANSACTION_PROPERTIES = [
  'creationtxid',
];
const PROPERTY_PROPERTIES = [
  'propertyid'
];

type PROPERTY_TYPES = 'address' | 'contract' | 'url' | 'transaction' | 'property'

const map: {[key in PROPERTY_TYPES]: string[]} = {
  address: ADDRESS_PROPERTIES,
  contract: CONTRACT_PROPERTIES,
  url: URL_PROPERTIES,
  transaction: TRANSACTION_PROPERTIES,
  property: PROPERTY_PROPERTIES,
}

const TypeToHandler = {
  address: (value: string) => ['/', 'addresses', value],
  transaction: (value: string) => ['/', 'tx', value],
  contract: (value: string) => ['/', 'contracts', value],
  property: (value: string) => ['/', 'properties', value],
  url: (value: string) => ['/', value]
}

const asd:{[key: string]: PROPERTY_TYPES} = {};

Object.entries(map).forEach(([k, v]: [string, string[]]) => {
  v.forEach(prop => asd[prop] = k as PROPERTY_TYPES);
});

console.log(asd);

@Component({
  selector: 'tl-possible-link',
  templateUrl: './possible-link.component.html',
  styleUrls: ['./possible-link.component.scss']
})
export class PossibleLinkComponent implements OnInit {
  @Input()
  public set key(value: unknown) {
    this._key = value as string;
  }
  public get key(): string {
    return this._key;
  }
  _key: string = '';

  @Input()
  public set value(value: unknown) {
    this._value = value as string;
  }
  public get value(): string {
    return this._value;
  }
  _value: string = '';

  public isExternal: boolean = false;

  public link: string[]=[];

  ngOnInit(): void {
    console.log(this.key, this.value)
    if(!this.value) {
      return;
    }
    const key = JSON.stringify(this.key);
    const propertyType: PROPERTY_TYPES = asd[this.key];
    if (!propertyType) {
      return;
    }
    this.isExternal = propertyType === 'url';
    if (this.isExternal) {
      return;
    }
    console.log(key, propertyType, this.value)
    const linker = TypeToHandler[propertyType] || function() {};
    this.link = linker(this.value);
    console.log('init', key, this);
  }
}
