import { Component, Input, OnInit } from '@angular/core';
import { PROPERTY_TYPES, PropertyToPropertyType, isLinkable, getLinkFromPropertyName } from '../property-types';

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
    if(!this.value) {
      return;
    }
    if (!isLinkable(this.key)) {
      return;
    }

    const propertyType: PROPERTY_TYPES = PropertyToPropertyType[this.key];
    this.isExternal = propertyType === 'url';
    if (this.isExternal) {
      return;
    }

    this.link = getLinkFromPropertyName(this.key, this.value);
  }
}
