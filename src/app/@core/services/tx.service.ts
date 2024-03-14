import { Injectable } from "@angular/core";
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

    getTransactionsForBlock(bid: number) {
        return this.tlApi.getTransactionsForBlock(bid);
    }
}