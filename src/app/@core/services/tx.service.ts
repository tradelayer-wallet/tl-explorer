import { Injectable } from "@angular/core";
import { IdParam } from "../api/tl-api.service";
import { ApiService } from "./api.service";

@Injectable({
    providedIn: 'root',
})

export class TxService {
    constructor(
        private apiService: ApiService,
    ) {}

    private get tlApi() {
        return this.apiService.tlApi;
    }

    getTransaction(txid: string) {
        return this.tlApi.getTransaction(txid);
    }

    getTransactionsForAddress(addr: string) {
        return this.tlApi.getTransactionsForAddress(addr);
    }

    getTransactionsForBlock(bid: IdParam) {
        return this.tlApi.getTransactionsForBlock(bid);
    }
}