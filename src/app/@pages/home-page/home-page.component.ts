import { Component, OnInit } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { ChainService } from 'src/app/@core/services/chain.service';
import { ContractService } from 'src/app/@core/services/contract.service';
import { PropertyService } from 'src/app/@core/services/propety.service';
import { TxService } from 'src/app/@core/services/tx.service';

@Component({
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit {
  blocks$: Observable<any> = of();
  properties$: Observable<any> = of();
  natives$: Observable<any> = of();
  oracles$: Observable<any> = of();
  nextReward$: Observable<any> = of([]);

  constructor(
    private txService: TxService,
    private propertyService: PropertyService,
    private chainService: ChainService,
    private contractService: ContractService,
  ) {  }

  ngOnInit(): void {
    
    this.blocks$ = this.chainService.getTop10Blocks();
    
    //this.properties$ = this.propertyService.getProperties();
    //this.oracles$ = this.contractService.getOracles();
    //this.mainChainInfo$ = this.chainService.getChainInfo();
    // this.natives$ = this.contractService.getNatives();
    // this.oracles$ = this.contractService.getOracles();
    // this.nextReward$ = this.chainService.getNextReward();
  }
}
