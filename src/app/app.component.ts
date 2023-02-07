import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private _searchValue: string = '';
  searchInProgress: boolean = false;

  constructor(
    private router: Router,
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  get searchValue() {
    return this._searchValue;
  }

  set searchValue(value: string) {
    this._searchValue = value;
  }

  async search() {
    if (!this.searchValue) {
      return;
    }
    this.searchInProgress = true;
    const value = this.searchValue;
    this.searchValue = '';

    const routeArray = value.length === 64
      ? ['tx', value]
      : value.length >= 26 && value.length <= 35
        ? ['address', value]
        : ['error'];
    this.router.navigate(routeArray);
    this.searchInProgress = false;
  }
  
  navigateToHome() {
    this.router.navigate(['/']);
  }
}
