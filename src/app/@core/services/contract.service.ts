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

    getNatives() {
        return this.tlApi.getNatives();
    }

    getOracles() {
        return this.tlApi.getOracles();
    }
}
