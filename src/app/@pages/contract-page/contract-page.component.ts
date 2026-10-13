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
    // Route params are strings; convert explicitly with a strict digit gate
    // so junk (`1.5`, `1e3`, `0x10`, `123abc`) can never normalize into a
    // valid id. NaN is rejected downstream by the API's safeId guard.
    const rawId = this.route.snapshot.params?.['contractId'];
    const contractId = (typeof rawId === 'string' && /^\d{1,16}$/.test(rawId))
      ? Number(rawId)
      : Number.NaN;
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
