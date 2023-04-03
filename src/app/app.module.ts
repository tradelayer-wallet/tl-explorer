import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AddressPageComponent } from './@pages/address-page/address-page.component';
import { HomePageComponent } from './@pages/home-page/home-page.component';
import { TxPageComponent } from './@pages/tx-page/tx-page.component';
import { PropertyPageComponent } from './@pages/property-page/property-page.component';
import { TableBodyPipe, TableHeadersPipe } from './@utils/pipes';
import { ContractPageComponent } from './@pages/contract-page/contract-page.component';
import { LastWinnersPageComponent } from './@pages/last-winners/last-winners-page.component';
import { PossibleLinkComponent } from './@components/possible-link/possible-link.component';
import { CollectionTableComponent } from './@components/collection-table/collection-table.component';
import { ObjectTableComponent } from './@components/object-table/object-table.component';
import { ListTableComponent } from './@components/list-table/list-table.component';

const CUSTOM_COMPONENTS = [
  PossibleLinkComponent,
  CollectionTableComponent,
  ObjectTableComponent,
  ListTableComponent,
]

const PAGE_COMPONENTS = [
    HomePageComponent,
    AddressPageComponent,
    ContractPageComponent,
    LastWinnersPageComponent,
    TxPageComponent,
    PropertyPageComponent,
];

const DIRECTIVES = [
  TableHeadersPipe,
  TableBodyPipe
]

@NgModule({
  declarations: [
    AppComponent,
    ...CUSTOM_COMPONENTS,
    ...PAGE_COMPONENTS,
    ...DIRECTIVES,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(router: Router) {
    router.routeReuseStrategy.shouldReuseRoute = () => false;
  }
}
