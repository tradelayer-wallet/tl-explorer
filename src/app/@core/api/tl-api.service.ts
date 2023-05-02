import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable } from "rxjs";
import { Router } from "@angular/router";

export enum PropertyCacheType {
    NativeFees = 0,
    OracleFees = 1,
    SpotFees = 2,
    Total
};

@Injectable({
    providedIn: 'root',
})
export class TradeLayerApi {
    constructor(
        private http: HttpClient,
        private router: Router,
    ) {}

    validateAddress(address: string): Observable<any> {
        const path = `/addresses/${address}/validate/`;
        return this.get(path);
    }

    getBalance(address: string): Observable<any> {
        const path = `/addresses/${address}/balance`;
        return this.get(path);
    }

    getUnvestedBalance(address: string): Observable<any> {
        const path = `/addresses/${address}/unvested_balance`;
        return this.get(path);
    }

    getProperties(): Observable<any> {
        const path = '/token/list';
        return this.get(path);
    }

    getPropData(id: number): Observable<any>  {
        const path = `/token/${id}`;
        return this.get(path);
    }

    getPropCurrencyTotal(id: number): Observable<any>  {
        const path = `/token/${id}/currency_total`;
        return this.get(path);
    }

    getPropCache(id: number, cacheType: PropertyCacheType = PropertyCacheType.Total): Observable<any>  {
        const path = `/token/${id}/cache?cacheType=${cacheType}`;
        return this.get(path);
    }

    getPropVestingInfo(id: number) {
        const path = `/token/${id}/vesting_info`;
        return this.get(path);
    }

    getPropLtcVolume(id: number, startBlock: number, endBlock: number): Observable<any>  {
        const path = `/token/${id}/ltc_volume?startBlock=${startBlock}&endBlock=${endBlock}`;
        return this.get(path);
    }

    getContract(id: number): Observable<any> {
        const path = `/contracts/${id}`;
        return this.get(path);
    }

    getContractOpenInterest(id: number): Observable<any> {
        const path = `/contracts/${id}/open_interest`;
        return this.get(path);
    }
    getContractTradeHistory(id: number): Observable<any> {
        const path = `/contracts/${id}/trade_history`;
        return this.get(path);
    }
    getContractTradeHistoryUnfiltered(id: number): Observable<any> {
        const path = `/contracts/${id}/trade_history_unfiltered`;
        return this.get(path);
    }
    
    getNativeContracts(): Observable<any> {
        const path = '/contracts/natives';
        return this.get(path);
    }

    getOracleContracts(): Observable<any> {
        const path = '/contracts/oracles';
        return this.get(path);
    }

    getChainInfo(): Observable<any> {
        const path = '/chain/info';
        return this.get(path);
    }

    getNextReward(): Observable<any> {
        const path = '/chain/next_reward';
        return this.get(path);
    }

    listNodeRewardAddresses(): Observable<any> {
        const path = '/chain/node_reward_addresses';
        return this.get(path);
    }

    getLastWinners(): Observable<any> {
        const path = '/chain/last_winners';
        return this.get(path);
    }

    getTxData(id: string): Observable<any> {
        const path = `/tx/${id}`;
        return this.get(path);
    }

    private get apiUrl() {
        return environment.apiUrl;
    }
    
    private get(path: string) : Observable<any> {
        const url = `${this.apiUrl}${path}`;
        return this.http.get(url)
            .pipe(
                map((res: any) => {
                    if (res.error || !res.data) {
                        throw res.error;
                    }
                    return res.data;
                }),
                catchError((error) => {
                    console.log(error);
                    const message = error?.message || error;
                    return this.router.navigate(['error'], {
                        queryParams: { message }});
                })
            );
    }
}
