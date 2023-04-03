import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ChainService } from 'src/app/@core/services/chain.service';

@Component({
  templateUrl: './last-winners-page.component.html',
  styleUrls: ['./last-winners-page.component.scss']
})
export class LastWinnersPageComponent implements OnInit {
  lastWinners$: Observable<any> = of([]);

  constructor(private chainService: ChainService) { }

  ngOnInit(): void {
    this.lastWinners$ = this.chainService.getLastWinners();
  }
}
