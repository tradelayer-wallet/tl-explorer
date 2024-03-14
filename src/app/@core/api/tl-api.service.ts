import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient } from "@angular/common/http";
import { catchError, map, Observable, of } from "rxjs";
import { Router } from "@angular/router";

export enum PropertyCacheType {
    NativeFees = 0,
    OracleFees = 1,
    SpotFees = 2,
    Total
};

type Tx = {
    txid: string,
    from: string,
    to: string,
    amount: number
}

type Block = {
    blockId: number,
    date: Date,
    tx: Tx[],
}

const TXs: Tx[] = [
    {txid: 'a7b32f99f4dbb63f36511cdac6c55b7b17f9608e2b8c0ec27752441eebf11806', to: 'a', from: 'b', amount: 10},
    {txid: 'b7b32f99f4dbb63f36511cdac6c55b7b17f9608e2b8c0ec27752441eebf11806', to: 'b', from: 'c', amount: 20},
    {txid: 'c7b32f99f4dbb63f36511cdac6c55b7b17f9608e2b8c0ec27752441eebf11806', to: 'c', from: 'd', amount: 30},
    {txid: 'd7b32f99f4dbb63f36511cdac6c55b7b17f9608e2b8c0ec27752441eebf11806', to: 'd', from: 'a', amount: 40},
    {txid: 'e7b32f99f4dbb63f36511cdac6c55b7b17f9608e2b8c0ec27752441eebf11806', to: 'e', from: 'c', amount: 50},
    {txid: 'f7b32f99f4dbb63f36511cdac6c55b7b17f9608e2b8c0ec27752441eebf11806', to: 'f', from: 'b', amount: 60},
]
const Tip = 834692;
const DT = new Date('3/14/2024 2:35:30 PM')
const BLOCKS: Block[] = Array.from(Array(10)).map((n,i)=>(
    { blockId: Tip-i, date: DT, tx: TXs }
))




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
        const path = `/tl_getAllBalancesForAddress/${address}`;
        return this.get(path);
    }

    getUnvestedBalance(address: string): Observable<any> {
        const path = `/addresses/${address}/unvested_balance`;
        return this.get(path);
    }

    getProperties(): Observable<any> {
        const path = '/tl_listproperties';
        return this.get(path);
    }

    getPropData(id: number): Observable<any>  {
        const path = `/tl_getproperty/${id}`;
        return this.get(path);
    }

    getPropCurrencyTotal(id: number): Observable<any>  {
        const path = `/token/${id}/currency_total`;
        return this.get(path);
    }

    getPropCache(id: number, cacheType: PropertyCacheType = PropertyCacheType.Total): Observable<any>  {
        const path = `/tl_propertyFeeCache/${id}`;  ///cache?cacheType=${cacheType}`;
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
        const path = '/tl_listoracles';
        return this.get(path);
    }

    getChainInfo(): Observable<any> {
        const path = '/tl_getchaininfo';
        return this.get(path);
    }

    getTop10Blocks(): Observable<any> {
        //return of(BLOCKS.map(b=>({ blockId: b.blockId, date: b.date.toISOString(), tx: b.tx.length })));
        const path = '/tl_gettop10blocks';
        return this.get(path);
    }

    getTransaction(id: string): Observable<any> {
        //return of({});
        const path = `/tl_gettransaction/${id}`;
        return this.get(path);
    }

    getTransactionsForAddress(addr: string): Observable<any> {
        //return of(TXs.filter(x=>x.to == addr || x.from == addr));
        const path = `/tl_gettransactionsforaddress/${addr}`;
        return this.get(path);
    }
    
    getTransactionsForBlock(bid: number): Observable<any> {
        // let b = BLOCKS.find(b=>b.blockId == bid)
        // return of(b?.tx);
        const path = `/tl_gettransactionsforblock/${bid}`;
        return this.get(path);
    }

    private get apiUrl() {
        return environment.apiUrl;
    }
    
    private get(path: string) : Observable<any> {
        const url = `${this.apiUrl}${path}`;
        return this.http.get(url)
            .pipe(
                // map((res: any) => {
                //     if (res.error || !res.data) {
                //         throw res.error;
                //     }
                //     return res.data;
                // }),
                map(x=>x),
                catchError((error) => {
                    console.log(error);
                    const message = error?.message || error;
                    return this.router.navigate(['error'], {
                        queryParams: { message }});
                })
            );
    }
}
