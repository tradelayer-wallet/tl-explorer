import { Component, OnInit } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { ChainService } from 'src/app/@core/services/chain.service';
import { PropertyService } from 'src/app/@core/services/propety.service';


@Component({
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit {
  mainChainInfo$: Observable<any> = of();
  properties$: Observable<any> = of();

  constructor(
    private propertyService: PropertyService,
    private chainService: ChainService,
  ) {  }

  ngOnInit(): void {
    this.properties$ = this.getProperties();
    this.mainChainInfo$ = this.getMainData();
  }

  getProperties(): Observable<any> {
    return this.propertyService.getProperties()
      .pipe(
        catchError((err) => {
          console.log(err);
          return of([]);
        })
      );
  }

  getMainData() {
    return this.chainService.getChainInfo()
      .pipe(
        catchError((error) => {
          console.log(error)
          return of({});
        })
      );
  }
}
