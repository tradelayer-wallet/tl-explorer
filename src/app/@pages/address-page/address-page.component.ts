import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, Observable, of } from 'rxjs';
import { AddressService } from 'src/app/@core/services/address.service';

@Component({
  templateUrl: './address-page.component.html',
  styleUrls: ['./address-page.component.scss']
})
export class AddressPageComponent implements OnInit {
  balanceData$: Observable<any[]> = of([]);

  constructor(
    private addressService: AddressService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}
  
  ngOnInit(): void {
    this.balanceData$ = this.getAddressBalance();
  }
  
  get address() {
    return this.route.snapshot.params?.['address'];
  }

  getAddressBalance() {
    const address = this.address || null;
    if (!address) {
      return of([]);
    }
    return this.addressService.getBalance(address)
      .pipe(
        catchError(err => {
          console.log(err)
          this.router.navigate(['error']);
          return of([]);
        })
      )
  }
}
