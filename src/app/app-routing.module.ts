import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddressPageComponent } from './@pages/address-page/address-page.component';
import { ErrorPageComponent } from './@pages/error-page/error-page.component';
import { HomePageComponent } from './@pages/home-page/home-page.component';
import { PropertyPageComponent } from './@pages/property-page/property-page.component';
import { TxPageComponent } from './@pages/tx-page/tx-page.component';

const routes: Routes = [
  {
    path:'',
    component: HomePageComponent,
  },
  {
    path:'address/:address',
    component: AddressPageComponent,
  },
  {
    path:'tx/:txid',
    component: TxPageComponent,
  },
  {
    path:'prop/:id',
    component: PropertyPageComponent,
  },
  {
    path: '**',
    component: ErrorPageComponent,
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
