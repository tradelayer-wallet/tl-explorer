import { Injectable } from "@angular/core";
import { ApiService } from "./api.service";

@Injectable({
    providedIn: 'root',
})
export class AddressService {
    constructor(
        private apiService: ApiService,
    ) {}

    private get tlApi() {
        return this.apiService.tlApi;
    }

    validateAddress(address: string) {
        return this.tlApi.validateAddress(address);
    }

    getBalance(address: string) {
        return this.tlApi.getBalance(address);
    }

    getUnvestedBalance(address: string) {
        return this.tlApi.getUnvestedBalance(address);
    }
}
