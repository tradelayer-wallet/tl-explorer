import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, Observable, of, tap } from 'rxjs';
import { AddressService } from 'src/app/@core/services/address.service';
import { ChainService } from 'src/app/@core/services/chain.service';

@Component({
  templateUrl: './address-page.component.html',
  styleUrls: ['./address-page.component.scss']
})
export class AddressPageComponent implements OnInit {
  balanceData$: Observable<any[]> = of([]);
  unvestedBalance$: Observable<any> = of({});
  isWinningAddress$: Observable<boolean> = of(false);

  constructor(
    private addressService: AddressService,
    private chainService: ChainService,
    private route: ActivatedRoute,
  ) {}
  
  ngOnInit(): void {
    if (!this.address) {
      return;
    }
    this.balanceData$ = this.addressService.getBalance(this.address);
    // this.unvestedBalance$ = this.addressService.getUnvestedBalance(this.address);
    // this.isWinningAddress$ = this.chainService.listNodeRewardAddresses()
    //   .pipe(
    //     map((addresses: Array<string>) => addresses.includes(this.address))
    //   );
  }

  get address() {
    return this.route.snapshot.params?.['address'] || null;
  }
}
