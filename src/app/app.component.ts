import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  searchValue: string = '';

  constructor(
    private router: Router,
  ) { }

  search(value:string) {
    const query = (value || '').trim();
    if (!query) {
      return;
    }
    this.searchValue = '';

    // Only an all-digit query is a block height. parseInt() used to send any
    // query that started with a digit (e.g. a P2SH address starting with '3')
    // to a block page. The lookup itself is validated in TradeLayerApi.
    const routeArray = query.length === 64
      ? ['tx', query]
      : /^\d+$/.test(query)
        ? ['blocks', query]
        : ['addresses', query];
    this.router.navigate(routeArray);
  }
}
