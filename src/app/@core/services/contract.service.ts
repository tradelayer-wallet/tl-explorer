import { Injectable } from "@angular/core";
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

    getContract(id: number) {
        return this.tlApi.getContract(id);
    }

    getOpenInterest(id: number) {
        return this.tlApi.getContractOpenInterest(id); 
    }

    getTradeHistory(id: number) {
        return this.tlApi.getContractTradeHistory(id); 
    }

    getTradeHistoryUnfiltered(id: number) {
        return this.tlApi.getContractTradeHistoryUnfiltered(id); 
    }

    getNatives() {
        return this.tlApi.getNativeContracts();
    }

    getOracles() {
        return this.tlApi.getOracleContracts();
    }
}
