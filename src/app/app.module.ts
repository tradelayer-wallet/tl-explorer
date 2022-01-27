import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { AddressPageComponent } from './@pages/address-page/address-page.component';
import { HomePageComponent } from './@pages/home-page/home-page.component';
import { TxPageComponent } from './@pages/tx-page/tx-page.component';
import { PropertyPageComponent } from './@pages/property-page/property-page.component';

const PAGE_COMPONENTS = [
    HomePageComponent,
    AddressPageComponent,
    TxPageComponent,
    PropertyPageComponent,
];

@NgModule({
  declarations: [
    AppComponent,
    ...PAGE_COMPONENTS
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
export class AppModule { }
