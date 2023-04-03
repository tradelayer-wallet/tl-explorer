import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { mergeMap, Observable, of, shareReplay } from 'rxjs';
import { ContractService } from 'src/app/@core/services/contract.service';

@Component({
  templateUrl: './contract-page.component.html',
  styleUrls: ['./contract-page.component.scss']
})
export class ContractPageComponent implements OnInit {
  contract$: Observable<any> = of();
  openInterest$: Observable<any> = of();
  tradeHistory$: Observable<any> = of();
  tradeHistoryUnfiltered$: Observable<any> = of();

  constructor(private route: ActivatedRoute, 
    private contratService: ContractService) { }

  ngOnInit(): void {
    const contractId = this.route.snapshot.params?.['contractId'];
    this.contract$ = this.contratService.getContract(contractId)
      .pipe(shareReplay(1));
    this.openInterest$ = this.contract$.pipe(
      mergeMap(_contract => this.contratService.getOpenInterest(contractId)));
    this.tradeHistory$ = this.contract$.pipe(
        mergeMap(_contract => this.contratService.getTradeHistory(contractId)));
    this.tradeHistoryUnfiltered$ = this.contract$.pipe(
          mergeMap(_contract => this.contratService.getTradeHistoryUnfiltered(contractId)));
  }
}
