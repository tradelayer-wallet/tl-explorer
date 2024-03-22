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
      : Number.isNaN(parseInt(value))
        ? ['addresses', value]
        : ['blocks', parseInt(value)];
    this.router.navigate(routeArray);
  }
}
