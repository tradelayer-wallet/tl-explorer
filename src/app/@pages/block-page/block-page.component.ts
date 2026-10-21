import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { TxService } from 'src/app/@core/services/tx.service';

@Component({
  templateUrl: './block-page.component.html',
  styleUrls: ['./block-page.component.scss']
})
export class BlockPageComponent implements OnInit{
  tx$: Observable<any[]> = of([]);

  constructor(
    private route: ActivatedRoute,
    private txService: TxService,
  ) { }

  ngOnInit(): void {
    // Passed through unparsed: TradeLayerApi validates route ids in one place.
    const bid = this.route.snapshot.params?.['blockId'];
    if (!bid) return;
    this.tx$ = this.txService.getTransactionsForBlock(bid);
  }
}
