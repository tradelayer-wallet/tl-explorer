import { Component, Input, } from '@angular/core';
import { Observable, of } from 'rxjs';
import { getLinkFromPropertyType } from '../property-types';

@Component({
  selector: 'tl-list-table',
  templateUrl: './list-table.component.html',
  styleUrls: ['./list-table.component.scss']
})
export class ListTableComponent {

  @Input()
  collection$: Observable<string[]> = of([]);

  @Input()
  collectionName: string = '';

  @Input()
  linkType: string = '';

  link(value: string): string[] {
    return getLinkFromPropertyType(this.linkType, value);
  }
}
