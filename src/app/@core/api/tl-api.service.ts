import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient } from "@angular/common/http";
import { catchError, from, map, Observable, of } from "rxjs";
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
    // Route params are interpolated into backend URL paths. Without strict
    // validation and percent-encoding, a crafted link (e.g.
    // `..%2F..%2Fsome_other_endpoint`) lets the browser smuggle GET requests
    // to unrelated endpoints on the RPC proxy. See security review #9 (H3).
    private static readonly TXID_RE = /^[0-9a-fA-F]{64}$/;
    // base58 (legacy) / bech32 (segwit) addresses are strictly alphanumeric;
    // this charset excludes `/`, `.`, `?`, `#` and `%` regardless of format.
    private static readonly ADDRESS_RE = /^[A-Za-z0-9]{10,120}$/;

    constructor(
        private http: HttpClient,
        private router: Router,
    ) {}

    private invalidParam(): Observable<any> {
        return from(this.router.navigate(['error'], {
            queryParams: { message: 'Invalid lookup parameter' }}));
    }

    private pathSegment(value: string, pattern: RegExp): string | null {
        return (typeof value === 'string' && pattern.test(value)) ? encodeURIComponent(value) : null;
    }

    private safeId(id: number): string | null {
        return (Number.isSafeInteger(id) && id >= 0) ? String(id) : null;
    }

    validateAddress(address: string): Observable<any> {
        const seg = this.pathSegment(address, TradeLayerApi.ADDRESS_RE);
        if (seg === null) return this.invalidParam();
        const path = `/addresses/${seg}/validate/`;
        return this.get(path);
    }

    getBalance(address: string): Observable<any> {
        const seg = this.pathSegment(address, TradeLayerApi.ADDRESS_RE);
        if (seg === null) return this.invalidParam();
        const path = `/tl_getAllBalancesForAddress/${seg}`;
        return this.get(path);
    }

    getUnvestedBalance(address: string): Observable<any> {
        const seg = this.pathSegment(address, TradeLayerApi.ADDRESS_RE);
        if (seg === null) return this.invalidParam();
        const path = `/addresses/${seg}/unvested_balance`;
        return this.get(path);
    }

    getProperties(): Observable<any> {
        const path = '/tl_listproperties';
        return this.get(path);
    }

    getPropData(id: number): Observable<any>  {
        const sid = this.safeId(id);
        if (sid === null) return this.invalidParam();
        const path = `/tl_getproperty/${sid}`;
        return this.get(path);
    }

    getPropCurrencyTotal(id: number): Observable<any>  {
        const sid = this.safeId(id);
        if (sid === null) return this.invalidParam();
        const path = `/token/${sid}/currency_total`;
        return this.get(path);
    }

    getPropCache(id: number, cacheType: PropertyCacheType = PropertyCacheType.Total): Observable<any>  {
        const sid = this.safeId(id);
        if (sid === null) return this.invalidParam();
        const path = `/tl_propertyFeeCache/${sid}`;  ///cache?cacheType=${cacheType}`;
        return this.get(path);
    }

    getPropVestingInfo(id: number) {
        const sid = this.safeId(id);
        if (sid === null) return this.invalidParam();
        const path = `/token/${sid}/vesting_info`;
        return this.get(path);
    }

    getPropLtcVolume(id: number, startBlock: number, endBlock: number): Observable<any>  {
        const sid = this.safeId(id);
        const sStart = this.safeId(startBlock);
        const sEnd = this.safeId(endBlock);
        if (sid === null || sStart === null || sEnd === null) return this.invalidParam();
        const path = `/token/${sid}/ltc_volume?startBlock=${sStart}&endBlock=${sEnd}`;
        return this.get(path);
    }

    getContract(id: number): Observable<any> {
        const sid = this.safeId(id);
        if (sid === null) return this.invalidParam();
        const path = `/contracts/${sid}`;
        return this.get(path);
    }

    getContractOpenInterest(id: number): Observable<any> {
        const sid = this.safeId(id);
        if (sid === null) return this.invalidParam();
        const path = `/contracts/${sid}/open_interest`;
        return this.get(path);
    }
    getContractTradeHistory(id: number): Observable<any> {
        const sid = this.safeId(id);
        if (sid === null) return this.invalidParam();
        const path = `/contracts/${sid}/trade_history`;
        return this.get(path);
    }
    getContractTradeHistoryUnfiltered(id: number): Observable<any> {
        const sid = this.safeId(id);
        if (sid === null) return this.invalidParam();
        const path = `/contracts/${sid}/trade_history_unfiltered`;
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
        const seg = this.pathSegment(id, TradeLayerApi.TXID_RE);
        if (seg === null) return this.invalidParam();
        const path = `/tl_gettransaction/${seg}`;
        return this.get(path);
    }

    getTransactionsForAddress(addr: string): Observable<any> {
        //return of(TXs.filter(x=>x.to == addr || x.from == addr));
        const seg = this.pathSegment(addr, TradeLayerApi.ADDRESS_RE);
        if (seg === null) return this.invalidParam();
        const path = `/tl_gettransactionsforaddress/${seg}`;
        return this.get(path);
    }
    
    getTransactionsForBlock(bid: number): Observable<any> {
        // let b = BLOCKS.find(b=>b.blockId == bid)
        // return of(b?.tx);
        const sbid = this.safeId(bid);
        if (sbid === null) return this.invalidParam();
        const path = `/tl_gettransactionsforblock/${sbid}`;
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
