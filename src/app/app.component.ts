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
    if (!value) {
      return;
    }
    this.searchValue = '';

    const routeArray = value.length === 64
      ? ['tx', value]
      : value.length >= 26 && value.length <= 35
        ? ['address', value]
        : ['error'];
    this.router.navigate(routeArray);
  }
}
