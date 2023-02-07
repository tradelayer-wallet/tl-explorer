import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, map, Observable, of } from 'rxjs';
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
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.txData$ = this.getTxData();
  }

  private getTxData():Observable<any> {
    const txId = this.route.snapshot.params?.['txid'] || null;
    if (!txId) {
      return of(null);
    }
    return this.txService.getTxData(txId)
      .pipe(
        catchError(() => {
          return this.router.navigate(['error']);
        })
      );
  }
}
