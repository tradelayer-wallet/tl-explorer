import { Component, Input, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { getLinkFromPropertyType, PROPERTY_TYPES } from '../property-types';

@Component({
  selector: 'tl-collection-table',
  templateUrl: './collection-table.component.html',
  styleUrls: ['./collection-table.component.scss']
})
export class CollectionTableComponent {
  @Input()
  collection$: Observable<unknown[][]> = of([]);

  @Input()
  collectionName: string = 'Items';

  @Input()
  linkType: PROPERTY_TYPES | string = '';
  
  public link(value: string): string[] {
    return getLinkFromPropertyType(this.linkType, value);
  }
}
