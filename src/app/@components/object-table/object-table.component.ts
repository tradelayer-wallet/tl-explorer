import { Component, Input } from '@angular/core';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'tl-object-table',
  templateUrl: './object-table.component.html',
  styleUrls: ['./object-table.component.scss']
})
export class ObjectTableComponent {

  @Input()
  public object$: Observable<{}> = of({});

  @Input()
  public objectName: string ='';
}
