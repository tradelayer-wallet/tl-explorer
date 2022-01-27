import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TxService } from 'src/app/@core/services/tx.service';

@Component({
  templateUrl: './tx-page.component.html',
  styleUrls: ['./tx-page.component.scss']
})
export class TxPageComponent {
  txLoading: boolean = false;
  txData: any = null;

  constructor(
    private route: ActivatedRoute,
    private txService: TxService,
    private router: Router,
  ) {
    this.getTxData();
  }

  private getTxData() {
    const txId = this.route.snapshot.params?.['txid'] || null;
    if (!txId) return;
    this.txLoading = true;
    this.txService.getTxData(txId)
      .subscribe({
        next: (res) => {
          if (res.error || !res.data) {
            this.router.navigate(['error']);
          } else {
            this.txData = res.data;
          }
          this.txLoading = false;
        },
        error: (err) => {
          this.router.navigate(['error']);
          this.txLoading = false;
        }
      });
  }
}
