import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { TxService } from 'src/app/@core/services/tx.service';

@Component({
  templateUrl: './tx-page.component.html',
  styleUrls: ['./tx-page.component.scss']
})
export class TxPageComponent implements OnInit{
  txData$: Observable<any> = of(null);

  constructor(
    private route: ActivatedRoute,
    private txService: TxService,
  ) { }

  ngOnInit(): void {
    const txId = this.route.snapshot.params?.['txid'] || null;
    if (!txId) {
      this.txData$ =  of(null);
      return;
    }
    this.txData$ = this.txService.getTransaction(txId)
  }
}
