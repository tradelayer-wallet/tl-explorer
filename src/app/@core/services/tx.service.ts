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

    getTxData(txid: string) {
        return this.tlApi.getTxData(txid);
    }
}