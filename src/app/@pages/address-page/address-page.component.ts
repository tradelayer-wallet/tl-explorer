import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddressService } from 'src/app/@core/services/address.service';
import { convertArrayToTable } from 'src/app/@utils/convert';

@Component({
  templateUrl: './address-page.component.html',
  styleUrls: ['./address-page.component.scss']
})
export class AddressPageComponent {
  balanceLoading: boolean = false;
  balanceData: any[] = [];

  constructor(
    private addressService: AddressService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.getAddressBalance();
  }

  get address() {
    return this.route.snapshot.params?.['address'];
  }

  getAddressBalance() {
    const address = this.address || null;
    if (!address) return;
    this.balanceLoading = true;
    this.addressService.getBalance(address)
      .subscribe({
        next: (res) => {
          console.log(res)
          if (res.error || !res.data) {
            this.router.navigate(['error']);
          } else {
            this.balanceData = convertArrayToTable(res.data);
          }
          this.balanceLoading = false;
        },
        error: (err) => {
          this.router.navigate(['error']);
          this.balanceLoading = false;
        }
      });
  }
}
