import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, tap } from 'rxjs';
import { PropertyService } from 'src/app/@core/services/propety.service';

@Component({
  templateUrl: './property-page.component.html',
  styleUrls: ['./property-page.component.scss']
})
export class PropertyPageComponent implements OnInit {
  propLoading: boolean = false;
  propData: any = null;

  constructor(
    private propertyService: PropertyService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.getPropertyData();
  }

  private getPropertyData() {
    const propId = parseFloat(this.route.snapshot.params?.['id']) || null;
    if (!propId) {
      return;
    }
    this.propLoading = true;
    this.propertyService.getPropData(propId)
      .pipe(
        tap((res) => {
          this.propData = res.data;
        }),
        finalize(() => this.propLoading = false),
        catchError((error) => {
          return this.router.navigate(['error']);
        })
      )
      .subscribe();
  }
}
