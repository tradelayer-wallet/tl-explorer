import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PropertyService } from 'src/app/@core/services/propety.service';

@Component({
  templateUrl: './property-page.component.html',
  styleUrls: ['./property-page.component.scss']
})
export class PropertyPageComponent {
  propLoading: boolean = false;
  propData: any = null;

  constructor(
    private propertyService: PropertyService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.getPropertyData();
  }

  private getPropertyData() {
    const propId = parseFloat(this.route.snapshot.params?.['id']) || null;
    if (!propId) return;
    this.propLoading = true;
    this.propertyService.getPropData(propId)
      .subscribe({
        next: (res) => {
          if (res.error || !res.data) {
            this.router.navigate(['error']);
          } else {
            this.propData = res.data;
          }
          this.propLoading = false;
        },
        error: (err) => {
          this.router.navigate(['error']);
          this.propLoading = false;
        }
      });
  }
}
