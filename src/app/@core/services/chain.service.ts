import { Injectable } from "@angular/core";
import { ApiService } from "./api.service";

@Injectable({
    providedIn: 'root',
})
export class ChainService {
    constructor(
        private apiService: ApiService,
    ) {}

    private get tlApi() {
        return this.apiService.tlApi;
    }

    getChainInfo() {
        return this.tlApi.getChainInfo();
    }

    getNextReward() {
        return this.tlApi.getNextReward();
    }

    listNodeRewardAddresses() {
        return this.tlApi.listNodeRewardAddresses();
    }

    getLastWinners() {
        return this.tlApi.getLastWinners();
    }
}
