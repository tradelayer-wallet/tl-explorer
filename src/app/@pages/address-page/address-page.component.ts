import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AddressService } from 'src/app/@core/services/address.service';

@Component({
  templateUrl: './address-page.component.html',
  styleUrls: ['./address-page.component.scss']
})
export class AddressPageComponent implements OnInit {
  balanceData$: Observable<any[]> = of([]);
  unvestedBalance$: Observable<any> = of({});

  constructor(
    private addressService: AddressService,
    private route: ActivatedRoute,
  ) {}
  
  ngOnInit(): void {
    if (!this.address) {
      return;
    }
    this.balanceData$ = this.addressService.getBalance(this.address);
    this.unvestedBalance$ = this.addressService.getUnvestedBalance(this.address);
  }
  
  get address() {
    return this.route.snapshot.params?.['address'] || null;
  }
}
