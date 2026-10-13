import { Injectable } from "@angular/core";
import { IdParam } from "../api/tl-api.service";
import { ApiService } from "./api.service";

@Injectable({
    providedIn: 'root',
})

export class ContractService {
    constructor(
        private apiService: ApiService,
    ) {}

    private get tlApi() {
        return this.apiService.tlApi;
    }

    getContract(id: IdParam) {
        return this.tlApi.getContract(id);
    }

    getOpenInterest(id: IdParam) {
        return this.tlApi.getContractOpenInterest(id); 
    }

    getTradeHistory(id: IdParam) {
        return this.tlApi.getContractTradeHistory(id); 
    }

    getTradeHistoryUnfiltered(id: IdParam) {
        return this.tlApi.getContractTradeHistoryUnfiltered(id); 
    }

    getNatives() {
        return this.tlApi.getNativeContracts();
    }

    getOracles() {
        return this.tlApi.getOracleContracts();
    }
}
