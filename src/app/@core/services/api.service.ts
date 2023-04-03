import { Injectable } from "@angular/core";
import { TradeLayerApi } from "../api/tl-api.service";

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    constructor(
        private tradeLayerApi: TradeLayerApi,
    ) {}

    get tlApi() {
        return this.tradeLayerApi;
    }
}
