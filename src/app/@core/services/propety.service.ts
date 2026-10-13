import { Injectable } from "@angular/core";
import { IdParam, PropertyCacheType } from "../api/tl-api.service";
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

    getPropData(id: IdParam) {
        return this.tlApi.getPropData(id);
    }

    getPropCurrencyTotal(id: IdParam) {
        return this.tlApi.getPropCurrencyTotal(id);
    }

    getPropCache(id: IdParam, cacheType: PropertyCacheType = PropertyCacheType.Total) {
        return this.tlApi.getPropCache(id, cacheType);
    }

    getPropVestingInfo(id: IdParam) {
        return this.tlApi.getPropVestingInfo(id);
    }

    getPropLtcVolume(id: IdParam, startBlock: IdParam, endBlock: IdParam) {
        return this.tlApi.getPropLtcVolume(id, startBlock, endBlock);
    }
}
