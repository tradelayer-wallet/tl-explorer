import { Injectable, ɵɵsetComponentScope } from "@angular/core";
import { environment } from "src/environments/environment";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root',
})

export class TradeLayerApi {
    constructor(
        private http: HttpClient
    ) {}

    private get apiUrl() {
        return environment.apiUrl;
    }

    validateAddress(address: string): Observable<any> {
        const url = `${this.apiUrl}/address/validate/${address}`;
        return this.http.get(url);
    }

    getBalance(address: string): Observable<any> {
        const url = `${this.apiUrl}/address/balance/${address}`;
        return this.http.get(url);
    }

    getProperties(): Observable<any> {
        const url = `${this.apiUrl}/token/list`;
        return this.http.get(url);
    }

    getChainInfo(): Observable<any>  {
        const url = `${this.apiUrl}/chain/info`;
        return this.http.get(url);
    }

    getPropData(id: number): Observable<any>  {
        const url = `${this.apiUrl}/token/${id}`;
        return this.http.get(url);
    }

    getTxData(id: string): Observable<any> {
        const url = `${this.apiUrl}/tx/${id}`;
        return this.http.get(url);
    }
}