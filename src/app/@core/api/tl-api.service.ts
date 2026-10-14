import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient } from "@angular/common/http";
import { catchError, EMPTY, map, Observable, of } from "rxjs";
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




// Route params are interpolated into backend URL paths. Without validation, a
// crafted link (e.g. `..%2F..%2Fsome_other_endpoint`) lets the browser smuggle
// GET requests to unrelated endpoints on the RPC proxy (security review H3).
//
// Every API path is built by TradeLayerApi.get(), a tagged template whose
// interpolations must be ApiParam values. A raw string is a type error. An
// object literal shaped like ApiParam is a type error too, because the class has
// a private member. get() also refuses at runtime anything that the factories
// did not create, so an `as unknown as ApiParam` cast cannot reach the URL.
const TXID_RE = /^[0-9a-fA-F]{64}$/;
// base58 (legacy) and bech32 (segwit) addresses are alphanumeric. This charset
// excludes `/`, `.`, `?`, `#`, `%` and whitespace, so encoding is a no-op.
const ADDRESS_RE = /^[A-Za-z0-9]{10,120}$/;
// Numeric ids arrive as route-param strings (`'123'`) or as numbers. Strings
// must be canonical decimal digits (no sign, point, hex or exponent) of at most
// 16 characters; numbers must be safe non-negative integers. Number.isSafeInteger
// rejects the values above 2^53 - 1 that a 16-digit string can still express.
const ID_RE = /^\d{1,16}$/;

export type IdParam = number | string;

class ApiParam {
    // The private member makes the type nominal: an object literal with the
    // same shape is not assignable to ApiParam.
    private constructor(private readonly encoded: string | null) {}

    // Every instance the factories create is recorded here. segment() accepts
    // only these, so a runtime forgery (Object.create, a double cast) is refused.
    private static readonly issued = new WeakSet<ApiParam>();

    private static create(encoded: string | null): ApiParam {
        const param = new ApiParam(encoded);
        // Frozen so that code holding an issued value cannot rewrite its encoded
        // segment at runtime (defineProperty on the instance now throws).
        Object.freeze(param);
        ApiParam.issued.add(param);
        return param;
    }

    // The encoded path segment, or null unless `param` came from a factory and
    // its validator accepted the input.
    static segment(param: unknown): string | null {
        return (param instanceof ApiParam && ApiParam.issued.has(param))
            ? param.encoded
            : null;
    }

    static txid(value: unknown): ApiParam {
        return ApiParam.create(ApiParam.match(value, TXID_RE));
    }

    static address(value: unknown): ApiParam {
        return ApiParam.create(ApiParam.match(value, ADDRESS_RE));
    }

    static id(value: unknown): ApiParam {
        return ApiParam.create(ApiParam.canonicalId(value));
    }

    private static match(value: unknown, pattern: RegExp): string | null {
        return (typeof value === 'string' && pattern.test(value)) ? encodeURIComponent(value) : null;
    }

    private static canonicalId(value: unknown): string | null {
        if (typeof value === 'string') {
            if (!ID_RE.test(value)) return null;
            // Number() drops leading zeros: '007' -> 7.
            value = Number(value);
        }
        return (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
            ? String(value)
            : null;
    }
}

@Injectable({
    providedIn: 'root',
})
export class TradeLayerApi {
    constructor(
        private http: HttpClient,
        private router: Router,
    ) {}

    validateAddress(address: string): Observable<any> {
        return this.get`/addresses/${ApiParam.address(address)}/validate/`;
    }

    getBalance(address: string): Observable<any> {
        return this.get`/tl_getAllBalancesForAddress/${ApiParam.address(address)}`;
    }

    getUnvestedBalance(address: string): Observable<any> {
        return this.get`/addresses/${ApiParam.address(address)}/unvested_balance`;
    }

    getProperties(): Observable<any> {
        return this.get`/tl_listproperties`;
    }

    getPropData(id: IdParam): Observable<any>  {
        return this.get`/tl_getproperty/${ApiParam.id(id)}`;
    }

    getPropCurrencyTotal(id: IdParam): Observable<any>  {
        return this.get`/token/${ApiParam.id(id)}/currency_total`;
    }

    getPropCache(id: IdParam, cacheType: PropertyCacheType = PropertyCacheType.Total): Observable<any>  {
        return this.get`/tl_propertyFeeCache/${ApiParam.id(id)}`;  ///cache?cacheType=${cacheType}`;
    }

    getPropVestingInfo(id: IdParam) {
        return this.get`/token/${ApiParam.id(id)}/vesting_info`;
    }

    getPropLtcVolume(id: IdParam, startBlock: IdParam, endBlock: IdParam): Observable<any>  {
        return this.get`/token/${ApiParam.id(id)}/ltc_volume?startBlock=${ApiParam.id(startBlock)}&endBlock=${ApiParam.id(endBlock)}`;
    }

    getContract(id: IdParam): Observable<any> {
        return this.get`/contracts/${ApiParam.id(id)}`;
    }

    getContractOpenInterest(id: IdParam): Observable<any> {
        return this.get`/contracts/${ApiParam.id(id)}/open_interest`;
    }
    getContractTradeHistory(id: IdParam): Observable<any> {
        return this.get`/contracts/${ApiParam.id(id)}/trade_history`;
    }
    getContractTradeHistoryUnfiltered(id: IdParam): Observable<any> {
        return this.get`/contracts/${ApiParam.id(id)}/trade_history_unfiltered`;
    }

    getNativeContracts(): Observable<any> {
        return this.get`/contracts/natives`;
    }

    getOracleContracts(): Observable<any> {
        return this.get`/tl_listoracles`;
    }

    getChainInfo(): Observable<any> {
        return this.get`/tl_getchaininfo`;
    }

    getTop10Blocks(): Observable<any> {
        //return of(BLOCKS.map(b=>({ blockId: b.blockId, date: b.date.toISOString(), tx: b.tx.length })));
        return this.get`/tl_gettop10blocks`;
    }

    getTransaction(id: string): Observable<any> {
        //return of({});
        return this.get`/tl_gettransaction/${ApiParam.txid(id)}`;
    }

    getTransactionsForAddress(addr: string): Observable<any> {
        //return of(TXs.filter(x=>x.to == addr || x.from == addr));
        return this.get`/tl_gettransactionsforaddress/${ApiParam.address(addr)}`;
    }

    getTransactionsForBlock(bid: IdParam): Observable<any> {
        // let b = BLOCKS.find(b=>b.blockId == bid)
        // return of(b?.tx);
        return this.get`/tl_gettransactionsforblock/${ApiParam.id(bid)}`;
    }

    private get apiUrl() {
        return environment.apiUrl;
    }

    // The only place an API URL is built. The literal parts come from this file.
    // Every interpolated value must be an ApiParam: if one is invalid (or is not
    // an ApiParam at all), the user goes to the error page and no request is sent.
    private get(strings: TemplateStringsArray, ...params: ApiParam[]): Observable<any> {
        let path = strings[0];
        for (let i = 0; i < params.length; i++) {
            const encoded = ApiParam.segment(params[i]);
            if (encoded === null) {
                return this.invalidParam();
            }
            path += encoded + strings[i + 1];
        }
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
                    // Same contract as invalidParam(): navigate to the error
                    // page and complete without emitting the navigation result.
                    this.router.navigate(['error'], {
                        queryParams: { message }});
                    return EMPTY;
                })
            );
    }

    private invalidParam(): Observable<never> {
        // Navigate to the error page but emit nothing downstream: callers
        // chain these observables into data pipelines, and emitting the
        // navigation result (`true`) made tables briefly render `true` and
        // chained lookups fire extra error navigations. See adversarial review.
        this.router.navigate(['error'], {
            queryParams: { message: 'Invalid lookup parameter' }});
        return EMPTY;
    }
}
