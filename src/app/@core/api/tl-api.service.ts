import { Injectable } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient } from "@angular/common/http";
import { map, Observable } from "rxjs";

@Injectable({
    providedIn: 'root',
})
export class TradeLayerApi {
    constructor(
        private http: HttpClient
    ) {}

    validateAddress(address: string): Observable<any> {
        const path = `/address/validate/${address}`;
        return this.get(path);
    }

    getBalance(address: string): Observable<any> {
        const path = `/address/balance/${address}`;
        return this.get(path);
    }

    getProperties(): Observable<any> {
        const path = '/token/list';
        return this.get(path);
    }
    
    getNatives(): Observable<any> {
        const path = '/contract/natives';
        return this.get(path);
    }

    getOracles(): Observable<any> {
        const path = '/contract/oracles';
        return this.get(path);
    }

    getChainInfo(): Observable<any>  {
        const path = '/chain/info';
        return this.get(path);
    }

    getPropData(id: number): Observable<any>  {
        const path = `/token/${id}`;
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
                })
            );
    }
}
