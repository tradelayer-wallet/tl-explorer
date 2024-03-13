import { Injectable } from "@angular/core";
import { map } from "rxjs";
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
    
    getTop10Blocks(){
        return this.tlApi.getTop10Blocks();
    }
}
