import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddressPageComponent } from './@pages/address-page/address-page.component';
import { ContractPageComponent } from './@pages/contract-page/contract-page.component';
import { ErrorPageComponent } from './@pages/error-page/error-page.component';
import { HomePageComponent } from './@pages/home-page/home-page.component';
import { LastWinnersPageComponent } from './@pages/last-winners/last-winners-page.component';
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
    path: 'last-winners',
    component: LastWinnersPageComponent,
  },
  {
    path:'tx/:txid',
    component: TxPageComponent,
  },
  {
    path:'properties/:propertyId',
    component: PropertyPageComponent,
  },
  {
    path:'contracts/:contractId',
    component: ContractPageComponent,
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
