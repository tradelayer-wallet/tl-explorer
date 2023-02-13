import { Injectable } from "@angular/core";
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
}
