import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChainService } from 'src/app/@core/services/chain.service';
import { PropertyService } from 'src/app/@core/services/propety.service';
import { convertArrayToTable } from 'src/app/@utils/convert';


@Component({
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit {
  propertiesLoading: boolean = false;
  chainInfoLoading: boolean = false;
  chainInfo: any = null;
  properties: any[] = [];

  constructor(
    private propertyService: PropertyService,
    private chainService: ChainService,
    private router: Router,
  ) {  }

  ngOnInit(): void {
    this.getProperties();
    this.getMainData();
  }

  getProperties() {
    this.propertiesLoading = true;
    this.propertyService.getProperties()
      .subscribe({
        next: (res) => {
          if (res.error || !res.data) {
            console.log('Error')
          } else {
            this.properties = convertArrayToTable(res.data);;
          }
          this.propertiesLoading = false;
        },
        error: (err) => {
          console.log(err);
          this.propertiesLoading = false;
        }
      });
  }

  getMainData() {
    this.chainInfoLoading = true;
    this.chainService.getChainInfo()
      .subscribe({
        next: (res) => {
          if (res.error || !res.data) {
            console.log('Error')
          } else {
            this.chainInfo = res.data;
          }
          this.chainInfoLoading = false;
        },
        error: (err) => {
          console.log(err);
          this.chainInfoLoading = false;
        }
      });
  }

  goToProp(id: number) {
    this.router.navigate(['prop', id.toString()]);
  }
}
