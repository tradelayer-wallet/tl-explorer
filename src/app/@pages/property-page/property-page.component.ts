import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { PropertyService } from 'src/app/@core/services/propety.service';

@Component({
  templateUrl: './property-page.component.html',
  styleUrls: ['./property-page.component.scss']
})
export class PropertyPageComponent implements OnInit {
  propData$: Observable<any> = of(null);
  propCurrencyTotal$: Observable<any> = of(null);

  constructor(
    private propertyService: PropertyService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    const propertyId = parseFloat(this.route.snapshot.params?.['propertyId']);
    this.propData$ = this.getPropertyData(propertyId);
    this.propCurrencyTotal$ = this.propertyService.getPropCurrencyTotal(propertyId);
  }

  private getPropertyData(propId: number | null) {
    if (!propId) {
      return of(null);
    }
    return this.propertyService.getPropData(propId)
      .pipe(
        catchError((error) => {
          return this.router.navigate(['error']);
        })
      );
  }
}
