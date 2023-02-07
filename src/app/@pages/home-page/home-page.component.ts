import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of, tap } from 'rxjs';
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
      .pipe(
        tap((res) => this.properties = convertArrayToTable(res.data)),
        finalize(() => this.propertiesLoading = false),
        catchError((err) => {
          console.log(err);
          return of();
        })
      )
      .subscribe();
  }

  getMainData() {
    this.chainInfoLoading = true;
    this.chainService.getChainInfo()
      .pipe(
        tap((res => this.chainInfo = res.data)),
        finalize(() => this.chainInfoLoading = false),
        catchError((error) => {
          console.log(error)
          return of();
        })
      )
      .subscribe();
  }

  goToProp(id: number) {
    this.router.navigate(['prop', id.toString()]);
  }
}
