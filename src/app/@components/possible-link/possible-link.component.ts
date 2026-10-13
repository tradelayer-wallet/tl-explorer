import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PROPERTY_TYPES, PropertyToPropertyType, isLinkable, getLinkFromPropertyName } from '../property-types';

@Component({
  selector: 'tl-possible-link',
  templateUrl: './possible-link.component.html',
  styleUrls: ['./possible-link.component.scss']
})
export class PossibleLinkComponent implements OnChanges {
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

  // Safe, fully-validated href for external links (null = do not render a
  // link). Built in TS so the template never concatenates raw on-chain data.
  public externalHref: string | null = null;

  public link: string[]=[];

  // Derived state must be recomputed whenever either input changes: the
  // component instance is reused by *ngFor/async re-emissions while the
  // projected label content stays live, so an ngOnInit-only computation left
  // a stale href/routerLink from the previous row's data. See adversarial
  // review.
  ngOnChanges(changes: SimpleChanges): void {
    if ('key' in changes || 'value' in changes) {
      this.recompute();
    }
  }

  private recompute(): void {
    // Reset first: early-returning below must not leave the previous
    // instance's link or href behind.
    this.isExternal = false;
    this.externalHref = null;
    this.link = [];
    if (!this.value) {
      return;
    }
    if (!isLinkable(this.key)) {
      return;
    }

    const propertyType: PROPERTY_TYPES = PropertyToPropertyType[this.key];
    this.isExternal = propertyType === 'url';
    if (this.isExternal) {
      this.externalHref = PossibleLinkComponent.buildExternalHref(this.value);
      return;
    }

    this.link = getLinkFromPropertyName(this.key, this.value);
  }

  // The value comes from attacker-controllable on-chain metadata. The old
  // template gate `value.startsWith('http')` accepted junk schemes like
  // `httpfoo:` and threw on non-string values. Parse with the URL API and
  // allowlist http/https only. See security review #9 (M1).
  private static buildExternalHref(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const url = new URL(candidate);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return null;
      }
      return url.href;
    } catch {
      return null;
    }
  }
}
