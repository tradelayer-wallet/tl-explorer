import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { mergeMap, Observable, of, shareReplay } from 'rxjs';
import { PropertyCacheType } from 'src/app/@core/api/tl-api.service';
import { ChainService } from 'src/app/@core/services/chain.service';
import { PropertyService } from 'src/app/@core/services/propety.service';

const LTC_BLOCKS_PER_DAY = 576;

@Component({
  templateUrl: './property-page.component.html',
  styleUrls: ['./property-page.component.scss']
})
export class PropertyPageComponent implements OnInit {
  public propData$: Observable<any> = of(null);
  public propCurrencyTotal$: Observable<any> = of(null);
  public ltcVolume$: Observable<any> = of(null);
  public propCache$: Observable<any> = of(null);
  public vestingInfo$: Observable<any> = of(null);

  constructor(
    private propertyService: PropertyService,
    private route: ActivatedRoute,
    private chainService: ChainService
  ) { }

  ngOnInit(): void {
    const propertyId = parseFloat(this.route.snapshot.params?.['propertyId']);
    this.propData$ = this.propertyService.getPropData(propertyId)
      .pipe(shareReplay(1));
    // this.propCurrencyTotal$ = this.propData$
    //   .pipe(
    //     mergeMap(() => this.propertyService.getPropCurrencyTotal(propertyId))
    //   );
    // this.ltcVolume$ = this.propData$
    //   .pipe(
    //     mergeMap(() => this.chainService.getChainInfo()),
    //     mergeMap(({block}: {block: number}) => {
    //       return this.propertyService.getPropLtcVolume(propertyId, block - LTC_BLOCKS_PER_DAY, block);
    //     }));
    this.propCache$ = this.propData$
      .pipe(
        mergeMap(() => {
          return this.propertyService.getPropCache(propertyId, PropertyCacheType.Total);
        }));
    // this.vestingInfo$ = this.propData$
    //   .pipe(
    //     mergeMap(() => {
    //       return this.propertyService.getPropVestingInfo(propertyId);
    //     }));
  }
}
