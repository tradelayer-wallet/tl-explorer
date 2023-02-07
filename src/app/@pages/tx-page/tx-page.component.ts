import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, finalize, tap } from 'rxjs';
import { TxService } from 'src/app/@core/services/tx.service';

@Component({
  templateUrl: './tx-page.component.html',
  styleUrls: ['./tx-page.component.scss']
})
export class TxPageComponent implements OnInit{
  txLoading: boolean = false;
  txData: any = null;

  constructor(
    private route: ActivatedRoute,
    private txService: TxService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.getTxData();
  }

  private getTxData() {
    const txId = this.route.snapshot.params?.['txid'] || null;
    if (!txId) {
      return;
    }
    this.txLoading = true;
    this.txService.getTxData(txId)
      .pipe(
        tap((res) => {
          this.txData = res.data;
        }),
        finalize(() => {
          this.txLoading = false;
        }),
        catchError(() => {
          return this.router.navigate(['error']);
        })
      )
      .subscribe();
  }
}
