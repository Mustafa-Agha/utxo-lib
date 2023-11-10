"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZcashPsbt = void 0;
const UtxoPsbt_1 = require("../UtxoPsbt");
const ZcashTransaction_1 = require("./ZcashTransaction");
const __1 = require("../../");
const bip174_1 = require("bip174");
const types = require("bitcoinjs-lib/src/types");
const typeforce = require('typeforce');
const CONSENSUS_BRANCH_ID_KEY = Buffer.concat([
    Buffer.of(0xfc),
    Buffer.of(0x05),
    Buffer.from(UtxoPsbt_1.PSBT_PROPRIETARY_IDENTIFIER),
    Buffer.of(UtxoPsbt_1.ProprietaryKeySubtype.ZEC_CONSENSUS_BRANCH_ID),
]);
class ZcashPsbt extends UtxoPsbt_1.UtxoPsbt {
    static transactionFromBuffer(buffer, network) {
        return ZcashTransaction_1.ZcashTransaction.fromBuffer(buffer, false, 'bigint', network);
    }
    static createPsbt(opts, data) {
        return new ZcashPsbt(opts, data || new bip174_1.Psbt(new __1.PsbtTransaction({ tx: new ZcashTransaction_1.ZcashTransaction(opts.network) })));
    }
    /**
     * In version < 5 of Zcash transactions, the consensus branch ID is not serialized in the transaction
     * whereas in version 5 it is. If the transaction is less than a version 5, set the consensus branch id
     * in the global map in the psbt. If it is a version 5 transaction, throw an error if the consensus
     * branch id is set in the psbt (because it should be on the transaction already).
     * @param buffer Psbt buffer
     * @param opts options
     */
    static fromBuffer(buffer, opts) {
        var _a;
        const psbt = super.fromBuffer(buffer, opts);
        // Read `consensusBranchId` from the global-map
        let consensusBranchId = undefined;
        (_a = psbt.data.globalMap.unknownKeyVals) === null || _a === void 0 ? void 0 : _a.forEach(({ key, value }, i) => {
            if (key.equals(CONSENSUS_BRANCH_ID_KEY)) {
                consensusBranchId = value.readUint32LE();
            }
        });
        switch (psbt.tx.version) {
            case 4:
            case ZcashTransaction_1.ZcashTransaction.VERSION4_BRANCH_CANOPY:
            case ZcashTransaction_1.ZcashTransaction.VERSION4_BRANCH_NU5:
                if (!consensusBranchId || !psbt.data.globalMap.unknownKeyVals) {
                    throw new Error('Could not find consensus branch id on psbt for version 4 Zcash transaction');
                }
                psbt.tx.consensusBranchId = consensusBranchId;
                psbt.data.globalMap.unknownKeyVals = psbt.data.globalMap.unknownKeyVals.filter(({ key }) => key !== CONSENSUS_BRANCH_ID_KEY);
                // Delete consensusBranchId from globalMap so that if we were to serialize the psbt again
                // we would not add a duplicate key into the global map
                psbt.data.globalMap.unknownKeyVals.pop();
                return psbt;
            case 5:
            case ZcashTransaction_1.ZcashTransaction.VERSION5_BRANCH_NU5:
                if (consensusBranchId) {
                    throw new Error('Found consensus branch id in psbt global-map for version 5 Zcash transaction');
                }
                return psbt;
            default:
                throw new Error(`Unsupported transaction version ${psbt.tx.version}`);
        }
    }
    /**
     * If it is a version 4 transaction, add the consensus branch id to
     * the global map. If it is a version 5 transaction, just return the
     * buffer because the consensus branch id is already serialized in
     * the transaction.
     */
    toBuffer() {
        if (this.tx.version === 5 || this.tx.version === ZcashTransaction_1.ZcashTransaction.VERSION5_BRANCH_NU5) {
            return super.toBuffer();
        }
        const value = Buffer.alloc(4);
        value.writeUint32LE(this.tx.consensusBranchId);
        this.addUnknownKeyValToGlobal({ key: CONSENSUS_BRANCH_ID_KEY, value });
        if (!this.data.globalMap.unknownKeyVals) {
            throw new Error('Failed adding consensus branch id to unknownKeyVals');
        }
        const buff = super.toBuffer();
        this.data.globalMap.unknownKeyVals.pop();
        return buff;
    }
    setVersion(version, overwinter = true) {
        typeforce(types.UInt32, version);
        this.tx.overwintered = overwinter ? 1 : 0;
        this.tx.version = version;
        return this;
    }
    setDefaultsForVersion(network, version) {
        switch (version) {
            case 4:
            case ZcashTransaction_1.ZcashTransaction.VERSION4_BRANCH_CANOPY:
            case ZcashTransaction_1.ZcashTransaction.VERSION4_BRANCH_NU5:
                this.setVersion(4);
                break;
            case 5:
            case ZcashTransaction_1.ZcashTransaction.VERSION5_BRANCH_NU5:
                this.setVersion(5);
                break;
            default:
                throw new Error(`invalid version ${version}`);
        }
        this.tx.versionGroupId = ZcashTransaction_1.getDefaultVersionGroupIdForVersion(version);
        this.tx.consensusBranchId = ZcashTransaction_1.getDefaultConsensusBranchIdForVersion(network, version);
    }
    // For Zcash transactions, we do not have to have non-witness UTXO data for non-segwit
    // transactions because zcash hashes the value directly. Thus, it is unnecessary to have
    // the previous transaction hash on the unspent.
    signInput(inputIndex, keyPair, sighashTypes) {
        return this.withUnsafeSignNonSegwitTrue(super.signInput.bind(this, inputIndex, keyPair, sighashTypes));
    }
    validateSignaturesOfInput(inputIndex, validator, pubkey) {
        return this.withUnsafeSignNonSegwitTrue(super.validateSignaturesOfInput.bind(this, inputIndex, validator, pubkey));
    }
    withUnsafeSignNonSegwitTrue(fn) {
        this.__CACHE.__UNSAFE_SIGN_NONSEGWIT = true;
        try {
            return fn();
        }
        finally {
            this.__CACHE.__UNSAFE_SIGN_NONSEGWIT = false;
        }
    }
    setPropertyCheckSignatures(propName, value) {
        if (this.tx[propName] === value) {
            return;
        }
        this.checkForSignatures(propName);
        this.tx[propName] = value;
    }
    setConsensusBranchId(consensusBranchId) {
        typeforce(types.UInt32, consensusBranchId);
        this.setPropertyCheckSignatures('consensusBranchId', consensusBranchId);
    }
    setVersionGroupId(versionGroupId) {
        typeforce(types.UInt32, versionGroupId);
        this.setPropertyCheckSignatures('versionGroupId', versionGroupId);
    }
    setExpiryHeight(expiryHeight) {
        typeforce(types.UInt32, expiryHeight);
        this.setPropertyCheckSignatures('expiryHeight', expiryHeight);
    }
}
exports.ZcashPsbt = ZcashPsbt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiWmNhc2hQc2J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2JpdGdvL3pjYXNoL1pjYXNoUHNidC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwQ0FBcUc7QUFDckcseURBSTRCO0FBQzVCLDhCQUEwRDtBQUMxRCxtQ0FBMEM7QUFDMUMsaURBQWlEO0FBRWpELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUV2QyxNQUFNLHVCQUF1QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDNUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDZixNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztJQUNmLE1BQU0sQ0FBQyxJQUFJLENBQUMsc0NBQTJCLENBQUM7SUFDeEMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxnQ0FBcUIsQ0FBQyx1QkFBdUIsQ0FBQztDQUN6RCxDQUFDLENBQUM7QUFFSCxNQUFhLFNBQVUsU0FBUSxtQkFBa0M7SUFDckQsTUFBTSxDQUFDLHFCQUFxQixDQUFDLE1BQWMsRUFBRSxPQUFnQjtRQUNyRSxPQUFPLG1DQUFnQixDQUFDLFVBQVUsQ0FBUyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFjLEVBQUUsSUFBZTtRQUMvQyxPQUFPLElBQUksU0FBUyxDQUNsQixJQUFJLEVBQ0osSUFBSSxJQUFJLElBQUksYUFBUSxDQUFDLElBQUksbUJBQWUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLG1DQUFnQixDQUFTLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDOUYsQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFjLEVBQUUsSUFBYzs7UUFDOUMsTUFBTSxJQUFJLEdB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QU0sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMsMEJBQTBCLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ2hFLENBQUM7Q0FDRjtBQWxKRCw4QkFrSkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQU0JUX1BST1BSSUVUQVJZX0lERU5USUZJRVIsIFBzYnRPcHRzLCBQcm9wcmlldGFyeUtleVN1YnR5cGUsIFV0eG9Qc2J0IH0gZnJvbSAnLi4vVXR4b1BzYnQnO1xuaW1wb3J0IHtcbiAgZ2V0RGVmYXVsdENvbnNlbnN1c0JyYW5jaElkRm9yVmVyc2lvbixcbiAgZ2V0RGVmYXVsdFZlcnNpb25Hcm91cElkRm9yVmVyc2lvbixcbiAgWmNhc2hUcmFuc2FjdGlvbixcbn0gZnJvbSAnLi9aY2FzaFRyYW5zYWN0aW9uJztcbmltcG9ydCB7IE5ldHdvcmssIFBzYnRUcmFuc2FjdGlvbiwgU2lnbmVyIH0gZnJvbSAnLi4vLi4vJztcbmltcG9ydCB7IFBzYnQgYXMgUHNidEJhc2UgfSBmcm9tICdiaXAxNzQnO1xuaW1wb3J0ICogYXMgdHlwZXMgZnJvbSAnYml0Y29pbmpzLWxpYi9zcmMvdHlwZXMnO1xuaW1wb3J0IHsgVmFsaWRhdGVTaWdGdW5jdGlvbiB9IGZyb20gJ2JpdGNvaW5qcy1saWIvc3JjL3BzYnQnO1xuY29uc3QgdHlwZWZvcmNlID0gcmVxdWlyZSgndHlwZWZvcmNlJyk7XG5cbmNvbnN0IENPTlNFTlNVU19CUkFOQ0hfSURfS0VZID0gQnVmZmVyLmNvbmNhdChbXG4gIEJ1ZmZlci5vZigweGZjKSxcbiAgQnVmZmVyLm9mKDB4MDUpLFxuICBCdWZmZXIuZnJvbShQU0JUX1BST1BSSUVUQVJZX0lERU5USUZJRVIpLFxuICBCdWZmZXIub2YoUHJvcHJpZXRhcnlLZXlTdWJ0eXBlLlpFQ19DT05TRU5TVVNfQlJBTkNIX0lEKSxcbl0pO1xuXG5leHBvcnQgY2xhc3MgWmNhc2hQc2J0IGV4dGVuZHMgVXR4b1BzYnQ8WmNhc2hUcmFuc2FjdGlvbjxiaWdpbnQ+PiB7XG4gIHByb3RlY3RlZCBzdGF0aWMgdHJhbnNhY3Rpb25Gcm9tQnVmZmVyKGJ1ZmZlcjogQnVmZmVyLCBuZXR3b3JrOiBOZXR3b3JrKTogWmNhc2hUcmFuc2FjdGlvbjxiaWdpbnQ+IHtcbiAgICByZXR1cm4gWmNhc2hUcmFuc2FjdGlvbi5mcm9tQnVmZmVyPGJpZ2ludD4oYnVmZmVyLCBmYWxzZSwgJ2JpZ2ludCcsIG5ldHdvcmspO1xuICB9XG5cbiAgc3RhdGljIGNyZWF0ZVBzYnQob3B0czogUHNidE9wdHMsIGRhdGE/OiBQc2J0QmFzZSk6IFpjYXNoUHNidCB7XG4gICAgcmV0dXJuIG5ldyBaY2FzaFBzYnQoXG4gICAgICBvcHRzLFxuICAgICAgZGF0YSB8fCBuZXcgUHNidEJhc2UobmV3IFBzYnRUcmFuc2FjdGlvbih7IHR4OiBuZXcgWmNhc2hUcmFuc2FjdGlvbjxiaWdpbnQ+KG9wdHMubmV0d29yaykgfSkpXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJbiB2ZXJzaW9uIDwgNSBvZiBaY2FzaCB0cmFuc2FjdGlvbnMsIHRoZSBjb25zZW5zdXMgYnJhbmNoIElEIGlzIG5vdCBzZXJpYWxpemVkIGluIHRoZSB0cmFuc2FjdGlvblxuICAgKiB3aGVyZWFzIGluIHZlcnNpb24gNSBpdCBpcy4gSWYgdGhlIHRyYW5zYWN0aW9uIGlzIGxlc3MgdGhhbiBhIHZlcnNpb24gNSwgc2V0IHRoZSBjb25zZW5zdXMgYnJhbmNoIGlkXG4gICAqIGluIHRoZSBnbG9iYWwgbWFwIGluIHRoZSBwc2J0LiBJZiBpdCBpcyBhIHZlcnNpb24gNSB0cmFuc2FjdGlvbiwgdGhyb3cgYW4gZXJyb3IgaWYgdGhlIGNvbnNlbnN1c1xuICAgKiBicmFuY2ggaWQgaXMgc2V0IGluIHRoZSBwc2J0IChiZWNhdXNlIGl0IHNob3VsZCBiZSBvbiB0aGUgdHJhbnNhY3Rpb24gYWxyZWFkeSkuXG4gICAqIEBwYXJhbSBidWZmZXIgUHNidCBidWZmZXJcbiAgICogQHBhcmFtIG9wdHMgb3B0aW9uc1xuICAgKi9cbiAgc3RhdGljIGZyb21CdWZmZXIoYnVmZmVyOiBCdWZmZXIsIG9wdHM6IFBzYnRPcHRzKTogVXR4b1BzYnQ8WmNhc2hUcmFuc2FjdGlvbjxiaWdpbnQ+PiB7XG4gICAgY29uc3QgcHNidCA9IHN1cGVyLmZyb21CdWZmZXIoYnVmZmVyLCBvcHRzKSBhcyBaY2FzaFBzYnQ7XG5cbiAgICAvLyBSZWFkIGBjb25zZW5zdXNCcmFuY2hJZGAgZnJvbSB0aGUgZ2xvYmFsLW1hcFxuICAgIGxldCBjb25zZW5zdXNCcmFuY2hJZDogbnVtYmVyIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIHBzYnQuZGF0YS5nbG9iYWxNYXAudW5rbm93bktleVZhbHM/LmZvckVhY2goKHsga2V5LCB2YWx1ZSB9LCBpKSA9PiB7XG4gICAgICBpZiAoa2V5LmVxdWFscyhDT05TRU5TVVNfQlJBTkNIX0lEX0tFWSkpIHtcbiAgICAgICAgY29uc2Vuc3VzQnJhbmNoSWQgPSB2YWx1ZS5yZWFkVWludDMyTEUoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBzd2l0Y2ggKHBzYnQudHgudmVyc2lvbikge1xuICAgICAgY2FzZSA0OlxuICAgICAgY2FzZSBaY2FzaFRyYW5zYWN0aW9uLlZFUlNJT040X0JSQU5DSF9DQU5PUFk6XG4gICAgICBjYXNlIFpjYXNoVHJhbnNhY3Rpb24uVkVSU0lPTjRfQlJBTkNIX05VNTpcbiAgICAgICAgaWYgKCFjb25zZW5zdXNCcmFuY2hJZCB8fCAhcHNidC5kYXRhLmdsb2JhbE1hcC51bmtub3duS2V5VmFscykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ291bGQgbm90IGZpbmQgY29uc2Vuc3VzIGJyYW5jaCBpZCBvbiBwc2J0IGZvciB2ZXJzaW9uIDQgWmNhc2ggdHJhbnNhY3Rpb24nKTtcbiAgICAgICAgfVxuICAgICAgICBwc2J0LnR4LmNvbnNlbnN1c0JyYW5jaElkID0gY29uc2Vuc3VzQnJhbmNoSWQ7XG4gICAgICAgIHBzYnQuZGF0YS5nbG9iYWxNYXAudW5rbm93bktleVZhbHMgPSBwc2J0LmRhdGEuZ2xvYmFsTWFwLnVua25vd25LZXlWYWxzLmZpbHRlcihcbiAgICAgICAgICAoeyBrZXkgfSkgPT4ga2V5ICE9PSBDT05TRU5TVVNfQlJBTkNIX0lEX0tFWVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIERlbGV0ZSBjb25zZW5zdXNCcmFuY2hJZCBmcm9tIGdsb2JhbE1hcCBzbyB0aGF0IGlmIHdlIHdlcmUgdG8gc2VyaWFsaXplIHRoZSBwc2J0IGFnYWluXG4gICAgICAgIC8vIHdlIHdvdWxkIG5vdCBhZGQgYSBkdXBsaWNhdGUga2V5IGludG8gdGhlIGdsb2JhbCBtYXBcbiAgICAgICAgcHNidC5kYXRhLmdsb2JhbE1hcC51bmtub3duS2V5VmFscy5wb3AoKTtcbiAgICAgICAgcmV0dXJuIHBzYnQ7XG4gICAgICBjYXNlIDU6XG4gICAgICBjYXNlIFpjYXNoVHJhbnNhY3Rpb24uVkVSU0lPTjVfQlJBTkNIX05VNTpcbiAgICAgICAgaWYgKGNvbnNlbnN1c0JyYW5jaElkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGb3VuZCBjb25zZW5zdXMgYnJhbmNoIGlkIGluIHBzYnQgZ2xvYmFsLW1hcCBmb3IgdmVyc2lvbiA1IFpjYXNoIHRyYW5zYWN0aW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBzYnQ7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuc3VwcG9ydGVkIHRyYW5zYWN0aW9uIHZlcnNpb24gJHtwc2J0LnR4LnZlcnNpb259YCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIElmIGl0IGlzIGEgdmVyc2lvbiA0IHRyYW5zYWN0aW9uLCBhZGQgdGhlIGNvbnNlbnN1cyBicmFuY2ggaWQgdG9cbiAgICogdGhlIGdsb2JhbCBtYXAuIElmIGl0IGlzIGEgdmVyc2lvbiA1IHRyYW5zYWN0aW9uLCBqdXN0IHJldHVybiB0aGVcbiAgICogYnVmZmVyIGJlY2F1c2UgdGhlIGNvbnNlbnN1cyBicmFuY2ggaWQgaXMgYWxyZWFkeSBzZXJpYWxpemVkIGluXG4gICAqIHRoZSB0cmFuc2FjdGlvbi5cbiAgICovXG4gIHRvQnVmZmVyKCk6IEJ1ZmZlciB7XG4gICAgaWYgKHRoaXMudHgudmVyc2lvbiA9PT0gNSB8fCB0aGlzLnR4LnZlcnNpb24gPT09IFpjYXNoVHJhbnNhY3Rpb24uVkVSU0lPTjVfQlJBTkNIX05VNSkge1xuICAgICAgcmV0dXJuIHN1cGVyLnRvQnVmZmVyKCk7XG4gICAgfVxuICAgIGNvbnN0IHZhbHVlID0gQnVmZmVyLmFsbG9jKDQpO1xuICAgIHZhbHVlLndyaXRlVWludDMyTEUodGhpcy50eC5jb25zZW5zdXNCcmFuY2hJZCk7XG4gICAgdGhpcy5hZGRVbmtub3duS2V5VmFsVG9HbG9iYWwoeyBrZXk6IENPTlNFTlNVU19CUkFOQ0hfSURfS0VZLCB2YWx1ZSB9KTtcbiAgICBpZiAoIXRoaXMuZGF0YS5nbG9iYWxNYXAudW5rbm93bktleVZhbHMpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIGFkZGluZyBjb25zZW5zdXMgYnJhbmNoIGlkIHRvIHVua25vd25LZXlWYWxzJyk7XG4gICAgfVxuICAgIGNvbnN0IGJ1ZmYgPSBzdXBlci50b0J1ZmZlcigpO1xuICAgIHRoaXMuZGF0YS5nbG9iYWxNYXAudW5rbm93bktleVZhbHMucG9wKCk7XG4gICAgcmV0dXJuIGJ1ZmY7XG4gIH1cblxuICBzZXRWZXJzaW9uKHZlcnNpb246IG51bWJlciwgb3ZlcndpbnRlciA9IHRydWUpOiB0aGlzIHtcbiAgICB0eXBlZm9yY2UodHlwZXMuVUludDMyLCB2ZXJzaW9uKTtcbiAgICB0aGlzLnR4Lm92ZXJ3aW50ZXJlZCA9IG92ZXJ3aW50ZXIgPyAxIDogMDtcbiAgICB0aGlzLnR4LnZlcnNpb24gPSB2ZXJzaW9uO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgc2V0RGVmYXVsdHNGb3JWZXJzaW9uKG5ldHdvcms6IE5ldHdvcmssIHZlcnNpb246IG51bWJlcik6IHZvaWQge1xuICAgIHN3aXRjaCAodmVyc2lvbikge1xuICAgICAgY2FzZSA0OlxuICAgICAgY2FzZSBaY2FzaFRyYW5zYWN0aW9uLlZFUlNJT040X0JSQU5DSF9DQU5PUFk6XG4gICAgICBjYXNlIFpjYXNoVHJhbnNhY3Rpb24uVkVSU0lPTjRfQlJBTkNIX05VNTpcbiAgICAgICAgdGhpcy5zZXRWZXJzaW9uKDQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgNTpcbiAgICAgIGNhc2UgWmNhc2hUcmFuc2FjdGlvbi5WRVJTSU9ONV9CUkFOQ0hfTlU1OlxuICAgICAgICB0aGlzLnNldFZlcnNpb24oNSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHZlcnNpb24gJHt2ZXJzaW9ufWApO1xuICAgIH1cblxuICAgIHRoaXMudHgudmVyc2lvbkdyb3VwSWQgPSBnZXREZWZhdWx0VmVyc2lvbkdyb3VwSWRGb3JWZXJzaW9uKHZlcnNpb24pO1xuICAgIHRoaXMudHguY29uc2Vuc3VzQnJhbmNoSWQgPSBnZXREZWZhdWx0Q29uc2Vuc3VzQnJhbmNoSWRGb3JWZXJzaW9uKG5ldHdvcmssIHZlcnNpb24pO1xuICB9XG5cbiAgLy8gRm9yIFpjYXNoIHRyYW5zYWN0aW9ucywgd2UgZG8gbm90IGhhdmUgdG8gaGF2ZSBub24td2l0bmVzcyBVVFhPIGRhdGEgZm9yIG5vbi1zZWd3aXRcbiAgLy8gdHJhbnNhY3Rpb25zIGJlY2F1c2UgemNhc2ggaGFzaGVzIHRoZSB2YWx1ZSBkaXJlY3RseS4gVGh1cywgaXQgaXMgdW5uZWNlc3NhcnkgdG8gaGF2ZVxuICAvLyB0aGUgcHJldmlvdXMgdHJhbnNhY3Rpb24gaGFzaCBvbiB0aGUgdW5zcGVudC5cbiAgc2lnbklucHV0KGlucHV0SW5kZXg6IG51bWJlciwga2V5UGFpcjogU2lnbmVyLCBzaWdoYXNoVHlwZXM/OiBudW1iZXJbXSk6IHRoaXMge1xuICAgIHJldHVybiB0aGlzLndpdGhVbnNhZmVTaWduTm9uU2Vnd2l0VHJ1ZShzdXBlci5zaWduSW5wdXQuYmluZCh0aGlzLCBpbnB1dEluZGV4LCBrZXlQYWlyLCBzaWdoYXNoVHlwZXMpKTtcbiAgfVxuXG4gIHZhbGlkYXRlU2lnbmF0dXJlc09mSW5wdXQoaW5wdXRJbmRleDogbnVtYmVyLCB2YWxpZGF0b3I6IFZhbGlkYXRlU2lnRnVuY3Rpb24sIHB1YmtleT86IEJ1ZmZlcik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLndpdGhVbnNhZmVTaWduTm9uU2Vnd2l0VHJ1ZShzdXBlci52YWxpZGF0ZVNpZ25hdHVyZXNPZklucHV0LmJpbmQodGhpcywgaW5wdXRJbmRleCwgdmFsaWRhdG9yLCBwdWJrZXkpKTtcbiAgfVxuXG4gIHByaXZhdGUgd2l0aFVuc2FmZVNpZ25Ob25TZWd3aXRUcnVlPFQ+KGZuOiAoKSA9PiBUKTogVCB7XG4gICAgKHRoaXMgYXMgYW55KS5fX0NBQ0hFLl9fVU5TQUZFX1NJR05fTk9OU0VHV0lUID0gdHJ1ZTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGZuKCk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICh0aGlzIGFzIGFueSkuX19DQUNIRS5fX1VOU0FGRV9TSUdOX05PTlNFR1dJVCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc2V0UHJvcGVydHlDaGVja1NpZ25hdHVyZXMocHJvcE5hbWU6IGtleW9mIFpjYXNoVHJhbnNhY3Rpb248YmlnaW50PiwgdmFsdWU6IHVua25vd24pIHtcbiAgICBpZiAodGhpcy50eFtwcm9wTmFtZV0gPT09IHZhbHVlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuY2hlY2tGb3JTaWduYXR1cmVzKHByb3BOYW1lKTtcbiAgICB0aGlzLnR4W3Byb3BOYW1lXSA9IHZhbHVlIGFzIGFueTtcbiAgfVxuXG4gIHNldENvbnNlbnN1c0JyYW5jaElkKGNvbnNlbnN1c0JyYW5jaElkOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0eXBlZm9yY2UodHlwZXMuVUludDMyLCBjb25zZW5zdXNCcmFuY2hJZCk7XG4gICAgdGhpcy5zZXRQcm9wZXJ0eUNoZWNrU2lnbmF0dXJlcygnY29uc2Vuc3VzQnJhbmNoSWQnLCBjb25zZW5zdXNCcmFuY2hJZCk7XG4gIH1cblxuICBzZXRWZXJzaW9uR3JvdXBJZCh2ZXJzaW9uR3JvdXBJZDogbnVtYmVyKTogdm9pZCB7XG4gICAgdHlwZWZvcmNlKHR5cGVzLlVJbnQzMiwgdmVyc2lvbkdyb3VwSWQpO1xuICAgIHRoaXMuc2V0UHJvcGVydHlDaGVja1NpZ25hdHVyZXMoJ3ZlcnNpb25Hcm91cElkJywgdmVyc2lvbkdyb3VwSWQpO1xuICB9XG5cbiAgc2V0RXhwaXJ5SGVpZ2h0KGV4cGlyeUhlaWdodDogbnVtYmVyKTogdm9pZCB7XG4gICAgdHlwZWZvcmNlKHR5cGVzLlVJbnQzMiwgZXhwaXJ5SGVpZ2h0KTtcbiAgICB0aGlzLnNldFByb3BlcnR5Q2hlY2tTaWduYXR1cmVzKCdleHBpcnlIZWlnaHQnLCBleHBpcnlIZWlnaHQpO1xuICB9XG59XG4iXX0=