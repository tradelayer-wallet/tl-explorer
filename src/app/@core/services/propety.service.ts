import { Injectable } from "@angular/core";
import { PropertyCacheType } from "../api/tl-api.service";
import { ApiService } from "./api.service";

@Injectable({
    providedIn: 'root',
})

export class PropertyService {
    constructor(
        private apiService: ApiService,
    ) {}

    private get tlApi() {
        return this.apiService.tlApi;
    }

    getProperties() {
        return this.tlApi.getProperties();
    }

    getPropData(id: number) {
        return this.tlApi.getPropData(id);
    }

    getPropCurrencyTotal(id: number) {
        return this.tlApi.getPropCurrencyTotal(id);
    }

    getPropCache(id: number, cacheType: PropertyCacheType = PropertyCacheType.Total) {
        return this.tlApi.getPropCache(id, cacheType);
    }

    getPropVestingInfo(id: number) {
        return this.tlApi.getPropVestingInfo(id);
    }

    getPropLtcVolume(id: number, startBlock: number, endBlock: number) {
        return this.tlApi.getPropLtcVolume(id, startBlock, endBlock);
    }
}
