"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashTransactionBuilder = void 0;
const UtxoTransactionBuilder_1 = require("../UtxoTransactionBuilder");
const DashTransaction_1 = require("./DashTransaction");
class DashTransactionBuilder extends UtxoTransactionBuilder_1.UtxoTransactionBuilder {
    constructor(network, tx) {
        super(network, tx);
        if (tx instanceof DashTransaction_1.DashTransaction) {
            this.setType(tx.type);
            this.setExtraPayload(tx.extraPayload);
        }
    }
    static newTransactionBuilder(network, tx) {
        return new DashTransactionBuilder(network, tx);
    }
    createInitialTransaction(network, tx) {
        return new DashTransaction_1.DashTransaction(network, tx);
    }
    setType(type) {
        this.tx.type = type;
    }
    setExtraPayload(extraPayload) {
        this.tx.extraPayload = extraPayload;
    }
}
exports.DashTransactionBuilder = DashTransactionBuilder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGFzaFRyYW5zYWN0aW9uQnVpbGRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9iaXRnby9iYmMvRGFzaFRyYW5zYWN0aW9uQnVpbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxzRUFBbUU7QUFDbkUsdURBQW9EO0FBR3BELE1BQWEsc0JBQWlFLFNBQVEsK0NBR3JGO0lBQ0MsWUFBWSxPQUFnQixFQUFFLEVBQTZCO1FBQ3pELEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkIsSUFBSSxFQUFFLFlBQVksaUNBQWUsRUFBRTtZQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0QixJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQztTQUN2QztJQUNILENBQUM7SUFFUyxNQUFNLENBQUMscUJBQXFCLENBQ3BDLE9BQWdCLEVBQ2hCLEVBQTRCO1FBRTVCLE9BQU8sSUFBSSxzQkFBc0IsQ0FBVSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVTLHdCQUF3QixDQUFDLE9BQWdCLEVBQUUsRUFBbUM7UUFDdEYsT0FBTyxJQUFJLGlDQUFlLENBQVUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFRCxPQUFPLENBQUMsSUFBWTtRQUNsQixJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7SUFDdEIsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUFxQjtRQUNuQyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDdEMsQ0FBQztDQUNGO0FBOUJELHdEQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGJpdGNvaW5qcyBmcm9tICdiaXRjb2luanMtbGliJztcbmltcG9ydCB7IE5ldHdvcmsgfSBmcm9tICcuLi8uLi9uZXR3b3Jrcyc7XG5pbXBvcnQgeyBVdHhvVHJhbnNhY3Rpb25CdWlsZGVyIH0gZnJvbSAnLi4vVXR4b1RyYW5zYWN0aW9uQnVpbGRlcic7XG5pbXBvcnQgeyBEYXNoVHJhbnNhY3Rpb24gfSBmcm9tICcuL0Rhc2hUcmFuc2FjdGlvbic7XG5pbXBvcnQgeyBVdHhvVHJhbnNhY3Rpb24gfSBmcm9tICcuLi9VdHhvVHJhbnNhY3Rpb24nO1xuXG5leHBvcnQgY2xhc3MgRGFzaFRyYW5zYWN0aW9uQnVpbGRlcjxUTnVtYmVyIGV4dGVuZHMgbnVtYmVyIHwgYmlnaW50ID0gbnVtYmVyPiBleHRlbmRzIFV0eG9UcmFuc2FjdGlvbkJ1aWxkZXI8XG4gIFROdW1iZXIsXG4gIERhc2hUcmFuc2FjdGlvbjxUTnVtYmVyPlxuPiB7XG4gIGNvbnN0cnVjdG9yKG5ldHdvcms6IE5ldHdvcmssIHR4PzogVXR4b1RyYW5zYWN0aW9uPFROdW1iZXI+KSB7XG4gICAgc3VwZXIobmV0d29yaywgdHgpO1xuICAgIGlmICh0eCBpbnN0YW5jZW9mIERhc2hUcmFuc2FjdGlvbikge1xuICAgICAgdGhpcy5zZXRUeXBlKHR4LnR5cGUpO1xuICAgICAgdGhpcy5zZXRFeHRyYVBheWxvYWQodHguZXh0cmFQYXlsb2FkKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgc3RhdGljIG5ld1RyYW5zYWN0aW9uQnVpbGRlcjxUTnVtYmVyIGV4dGVuZHMgbnVtYmVyIHwgYmlnaW50PihcbiAgICBuZXR3b3JrOiBOZXR3b3JrLFxuICAgIHR4OiBVdHhvVHJhbnNhY3Rpb248VE51bWJlcj5cbiAgKTogRGFzaFRyYW5zYWN0aW9uQnVpbGRlcjxUTnVtYmVyPiB7XG4gICAgcmV0dXJuIG5ldyBEYXNoVHJhbnNhY3Rpb25CdWlsZGVyPFROdW1iZXI+KG5ldHdvcmssIHR4KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBjcmVhdGVJbml0aWFsVHJhbnNhY3Rpb24obmV0d29yazogTmV0d29yaywgdHg/OiBiaXRjb2luanMuVHJhbnNhY3Rpb248VE51bWJlcj4pOiBEYXNoVHJhbnNhY3Rpb248VE51bWJlcj4ge1xuICAgIHJldHVybiBuZXcgRGFzaFRyYW5zYWN0aW9uPFROdW1iZXI+KG5ldHdvcmssIHR4KTtcbiAgfVxuXG4gIHNldFR5cGUodHlwZTogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy50eC50eXBlID0gdHlwZTtcbiAgfVxuXG4gIHNldEV4dHJhUGF5bG9hZChleHRyYVBheWxvYWQ/OiBCdWZmZXIpOiB2b2lkIHtcbiAgICB0aGlzLnR4LmV4dHJhUGF5bG9hZCA9IGV4dHJhUGF5bG9hZDtcbiAgfVxufVxuIl19