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
    const bid = this.getBlockId();
    if (!bid) return;
    this.tx$ = this.txService.getTransactionsForBlock(bid);
  }

  getBlockId() {
    let bid = parseInt(this.route.snapshot.params?.['blockId']);
    return Number.isNaN(bid) ? 0 : bid;
  }
}
