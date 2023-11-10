"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTransactionBuilderFromTransaction = exports.createTransactionBuilderForNetwork = exports.createPsbtForNetwork = exports.setPsbtDefaults = exports.setTransactionBuilderDefaults = exports.getDefaultTransactionVersion = exports.createTransactionFromHex = exports.createPsbtFromTransaction = exports.createPsbtFromHex = exports.createPsbtFromBuffer = exports.createTransactionFromBuffer = void 0;
const networks_1 = require("../networks");
const UtxoPsbt_1 = require("./UtxoPsbt");
const UtxoTransaction_1 = require("./UtxoTransaction");
const UtxoTransactionBuilder_1 = require("./UtxoTransactionBuilder");
const DashPsbt_1 = require("./dash/DashPsbt");
const DashTransaction_1 = require("./dash/DashTransaction");
const DashTransactionBuilder_1 = require("./dash/DashTransactionBuilder");
const ZcashPsbt_1 = require("./zcash/ZcashPsbt");
const ZcashTransactionBuilder_1 = require("./zcash/ZcashTransactionBuilder");
const ZcashTransaction_1 = require("./zcash/ZcashTransaction");
function createTransactionFromBuffer(buf, network, { version, amountType } = {}, deprecatedAmountType) {
    if (amountType) {
        if (deprecatedAmountType && amountType !== deprecatedAmountType) {
            throw new Error(`invalid arguments`);
        }
    }
    else {
        if (deprecatedAmountType) {
            amountType = deprecatedAmountType;
        }
        else {
            amountType = 'number';
        }
    }
    switch (networks_1.getMainnet(network)) {
        case networks_1.networks.bitcoin:
        case networks_1.networks.bitcoincash:
        case networks_1.networks.bitcoinsv:
        case networks_1.networks.bitcoingold:
        case networks_1.networks.dogecoin:
        case networks_1.networks.ecash:
        case networks_1.networks.litecoin:
            return UtxoTransaction_1.UtxoTransaction.fromBuffer(buf, false, amountType, network);
        case networks_1.networks.dash:
            return DashTransaction_1.DashTransaction.fromBuffer(buf, false, amountType, network);
        case networks_1.networks.zcash:
            return ZcashTransaction_1.ZcashTransaction.fromBufferWithVersion(buf, network, version, amountType);
    }
    /* istanbul ignore next */
    throw new Error(`invalid network`);
}
exports.createTransactionFromBuffer = createTransactionFromBuffer;
function createPsbtFromBuffer(buf, network, bip32PathsAbsolute = false) {
    switch (networks_1.getMainnet(network)) {
        case networks_1.networks.bitcoin:
        case networks_1.networks.bitcoincash:
        case networks_1.networks.bitcoinsv:
        case networks_1.networks.bitcoingold:
        case networks_1.networks.dogecoin:
        case networks_1.networks.ecash:
        case networks_1.networks.litecoin:
            return UtxoPsbt_1.UtxoPsbt.fromBuffer(buf, { network, bip32PathsAbsolute });
        case networks_1.networks.dash:
            return DashPsbt_1.DashPsbt.fromBuffer(buf, { network, bip32PathsAbsolute });
        case networks_1.networks.zcash:
            return ZcashPsbt_1.ZcashPsbt.fromBuffer(buf, { network, bip32PathsAbsolute });
    }
    /* istanbul ignore next */
    throw new Error(`invalid network`);
}
exports.createPsbtFromBuffer = createPsbtFromBuffer;
function createPsbtFromHex(hex, network, bip32PathsAbsolute = false) {
    return createPsbtFromBuffer(Buffer.from(hex, 'hex'), network, bip32PathsAbsolute);
}
exports.createPsbtFromHex = createPsbtFromHex;
function createPsbtFromTransaction(tx, prevOuts) {
    switch (networks_1.getMainnet(tx.network)) {
        case networks_1.networks.bitcoin:
        case networks_1.networks.bitcoincash:
        case networks_1.networks.bitcoinsv:
        case networks_1.networks.bitcoingold:
        case networks_1.networks.dogecoin:
        case networks_1.networks.ecash:
        case networks_1.networks.litecoin:
            return UtxoPsbt_1.UtxoPsbt.fromTransaction(tx, prevOuts);
        case networks_1.networks.dash:
            return DashPsbt_1.DashPsbt.fromTransaction(tx, prevOuts);
        case networks_1.networks.zcash:
            return ZcashPsbt_1.ZcashPsbt.fromTransaction(tx, prevOuts);
    }
    /* istanbul ignore next */
    throw new Error(`invalid network`);
}
exports.createPsbtFromTransaction = createPsbtFromTransaction;
/* istanbul ignore next */
function createTransactionFromHex(hex, network, amountType = 'number') {
    return createTransactionFromBuffer(Buffer.from(hex, 'hex'), network, { amountType });
}
exports.createTransactionFromHex = createTransactionFromHex;
function getDefaultTransactionVersion(network) {
    switch (networks_1.getMainnet(network)) {
        case networks_1.networks.bitcoincash:
        case networks_1.networks.bitcoinsv:
        case networks_1.networks.bitcoingold:
        case networks_1.networks.ecash:
            return 2;
        case networks_1.networks.zcash:
            return ZcashTransaction_1.ZcashTransaction.VERSION4_BRANCH_NU5;
        default:
            return 1;
    }
}
exports.getDefaultTransactionVersion = getDefaultTransactionVersion;
function setTransactionBuilderDefaults(txb, network, { version = getDefaultTransactionVersion(network) } = {}) {
    switch (networks_1.getMainnet(network)) {
        case networks_1.networks.bitcoincash:
        case networks_1.networks.bitcoinsv:
        case networks_1.networks.bitcoingold:
        case networks_1.networks.ecash:
            if (version !== 2) {
                throw new Error(`invalid version`);
            }
            txb.setVersion(version);
            break;
        case networks_1.networks.zcash:
            txb.setDefaultsForVersion(network, version);
            break;
        default:
            if (version !== 1) {
                throw new Error(`invalid version`);
            }
    }
}
exports.setTransactionBuilderDefaults = setTransactionBuilderDefaults;
function setPsbtDefaults(psbt, network, { version = getDefaultTransactionVersion(network) } = {}) {
    switch (networks_1.getMainnet(network)) {
        case networks_1.networks.bitcoincash:
        case networks_1.networks.bitcoinsv:
        case networks_1.networks.bitcoingold:
        case networks_1.networks.ecash:
            if (version !== 2) {
                throw new Error(`invalid version`);
            }
            break;
        case networks_1.networks.zcash:
            if (![
                ZcashTransaction_1.ZcashTransaction.VERSION4_BRANCH_CANOPY,
                ZcashTransaction_1.ZcashTransaction.VERSION4_BRANCH_NU5,
                ZcashTransaction_1.ZcashTransaction.VERSION5_BRANCH_NU5,
            ].includes(version)) {
                throw new Error(`invalid version`);
            }
            psbt.setDefaultsForVersion(network, version);
            break;
        default:
            if (version !== 1) {
                throw new Error(`invalid version`);
            }
            // FIXME: set version here, because there's a bug in the upstream PSBT
            // that defaults transactions to v2.
            psbt.setVersion(version);
    }
}
exports.setPsbtDefaults = setPsbtDefaults;
function createPsbtForNetwork(psbtOpts, { version } = {}) {
    let psbt;
    switch (networks_1.getMainnet(psbtOpts.network)) {
        case networks_1.networks.bitcoin:
        case networks_1.networks.bitcoincash:
        case networks_1.networks.bitcoinsv:
        case networks_1.networks.bitcoingold:
        case networks_1.networks.dogecoin:
        case networks_1.networks.ecash:
        case networks_1.networks.litecoin: {
            psbt = UtxoPsbt_1.UtxoPsbt.createPsbt(psbtOpts);
            break;
        }
        case networks_1.networks.dash: {
            psbt = DashPsbt_1.DashPsbt.createPsbt(psbtOpts);
            break;
        }
        case networks_1.networks.zcash: {
            psbt = ZcashPsbt_1.ZcashPsbt.createPsbt(psbtOpts);
            break;
        }
        default:
            throw new Error(`unsupported network`);
    }
    setPsbtDefaults(psbt, psbtOpts.network, { version });
    return psbt;
}
exports.createPsbtForNetwork = createPsbtForNetwork;
function createTransactionBuilderForNetwork(network, { version } = {}) {
    let txb;
    switch (networks_1.getMainnet(network)) {
        case networks_1.networks.bitcoin:
        case networks_1.networks.bitcoincash:
        case networks_1.networks.bitcoinsv:
        case networks_1.networks.bitcoingold:
        case networks_1.networks.dogecoin:
        case networks_1.networks.ecash:
        case networks_1.networks.litecoin: {
            txb = new UtxoTransactionBuilder_1.UtxoTransactionBuilder(network);
            break;
        }
        case networks_1.networks.dash:
            txb = new DashTransactionBuilder_1.DashTransactionBuilder(network);
            break;
        case networks_1.networks.zcash: {
            txb = new ZcashTransactionBuilder_1.ZcashTransactionBuilder(network);
            break;
        }
        default:
            throw new Error(`unsupported network`);
    }
    setTransactionBuilderDefaults(txb, network, { version });
    return txb;
}
exports.createTransactionBuilderForNetwork = createTransactionBuilderForNetwork;
function createTransactionBuilderFromTransaction(tx, prevOutputs) {
    switch (networks_1.getMainnet(tx.network)) {
        case networks_1.networks.bitcoin:
        case networks_1.networks.bitcoincash:
        case networks_1.networks.bitcoinsv:
        case networks_1.networks.bitcoingold:
        case networks_1.networks.dogecoin:
        case networks_1.networks.ecash:
        case networks_1.networks.litecoin:
            return UtxoTransactionBuilder_1.UtxoTransactionBuilder.fromTransaction(tx, undefined, prevOutputs);
        case networks_1.networks.dash:
            return DashTransactionBuilder_1.DashTransactionBuilder.fromTransaction(tx, undefined, prevOutputs);
        case networks_1.networks.zcash:
            return ZcashTransactionBuilder_1.ZcashTransactionBuilder.fromTransaction(tx, undefined, prevOutputs);
    }
    throw new Error(`invalid network`);
}
exports.createTransactionBuilderFromTransaction = createTransactionBuilderFromTransaction;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhbnNhY3Rpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvYml0Z28vdHJhbnNhY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsMENBQTREO0FBRTVELHlDQUFnRDtBQUNoRCx1REFBb0Q7QUFDcEQscUVBQWtFO0FBQ2xFLDhDQUEyQztBQUMzQyw0REFBeUQ7QUFDekQsMEVBQXVFO0FBQ3ZFLGlEQUE4QztBQUM5Qyw2RUFBMEU7QUFDMUUsK0RBQTBFO0FBRTFFLFNBQWdCLDJCQUEyQixDQUN6QyxHQUFXLEVBQ1gsT0FBZ0IsRUFDaEIsRUFBRSxPQUFPLEVBQUUsVUFBVSxLQUE2RCxFQUFFLEVBQ3BGLG9CQUEwQztJQUUxQyxJQUFJLFVBQVUsRUFBRTtRQUNkLElBQUksb0JBQW9CLElBQUksVUFBVSxLQUFLLG9CQUFvQixFQUFFO1lBQy9ELE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztTQUN0QztLQUNGO1NBQU07UUFDTCxJQUFJLG9CQUFvQixFQUFFO1lBQ3hCLFVBQVUsR0FBRyxvQkFBb0IsQ0FBQztTQUNuQzthQUFNO1lBQ0wsVUFBVSxHQUFHLFFBQVEsQ0FBQztTQUN2QjtLQUNGO0lBQ0QsUUFBUSxxQkFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQzNCLEtBQUssbUJBQVEsQ0FBQyxPQUFPLENBQUM7UUFDdEIsS0FBSyxtQkFBUSxDQUFDLFdBQVcsQ0FBQztRQUMxQixLQUFLLG1CQUFRLENBQUMsU0FBUyxDQUFDO1FBQ3hCLEtBQUssbUJBQVEsQ0FBQyxXQUFXLENBQUM7UUFDMUIsS0FBSyxtQkFBUSxDQUFDLFFBQVEsQ0FBQztRQUN2QixLQUFLLG1CQUFRLENBQUMsS0FBSyxDQUFDO1FBQ3BCLEtBQUssbUJBQVEsQ0FBQyxRQUFRO1lBQ3BCLE9BQU8saUNBQWUsQ0FBQyxVQUFVLENBQVUsR0FBRyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7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USxDQUFDLFNBQVMsQ0FBQztRQUN4QixLQUFLLG1CQUFRLENBQUMsV0FBVyxDQUFDO1FBQzFCLEtBQUssbUJBQVEsQ0FBQyxRQUFRLENBQUM7UUFDdkIsS0FBSyxtQkFBUSxDQUFDLEtBQUssQ0FBQztRQUNwQixLQUFLLG1CQUFRLENBQUMsUUFBUTtZQUNwQixPQUFPLCtDQUFzQixDQUFDLGVBQWUsQ0FBVSxFQUFFLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3JGLEtBQUssbUJBQVEsQ0FBQyxJQUFJO1lBQ2hCLE9BQU8sK0NBQXNCLENBQUMsZUFBZSxDQUMzQyxFQUE4QixFQUM5QixTQUFTLEVBQ1QsV0FBa0MsQ0FDbkMsQ0FBQztRQUNKLEtBQUssbUJBQVEsQ0FBQyxLQUFLO1lBQ2pCLE9BQU8saURBQXVCLENBQUMsZUFBZSxDQUM1QyxFQUErQixFQUMvQixTQUFTLEVBQ1QsV0FBa0MsQ0FDbkMsQ0FBQztLQUNMO0lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUE1QkQsMEZBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVHhPdXRwdXQgfSBmcm9tICdiaXRjb2luanMtbGliJztcblxuaW1wb3J0IHsgbmV0d29ya3MsIE5ldHdvcmssIGdldE1haW5uZXQgfSBmcm9tICcuLi9uZXR3b3Jrcyc7XG5cbmltcG9ydCB7IFV0eG9Qc2J0LCBQc2J0T3B0cyB9IGZyb20gJy4vVXR4b1BzYnQnO1xuaW1wb3J0IHsgVXR4b1RyYW5zYWN0aW9uIH0gZnJvbSAnLi9VdHhvVHJhbnNhY3Rpb24nO1xuaW1wb3J0IHsgVXR4b1RyYW5zYWN0aW9uQnVpbGRlciB9IGZyb20gJy4vVXR4b1RyYW5zYWN0aW9uQnVpbGRlcic7XG5pbXBvcnQgeyBEYXNoUHNidCB9IGZyb20gJy4vZGFzaC9EYXNoUHNidCc7XG5pbXBvcnQgeyBEYXNoVHJhbnNhY3Rpb24gfSBmcm9tICcuL2Rhc2gvRGFzaFRyYW5zYWN0aW9uJztcbmltcG9ydCB7IERhc2hUcmFuc2FjdGlvbkJ1aWxkZXIgfSBmcm9tICcuL2Rhc2gvRGFzaFRyYW5zYWN0aW9uQnVpbGRlcic7XG5pbXBvcnQgeyBaY2FzaFBzYnQgfSBmcm9tICcuL3pjYXNoL1pjYXNoUHNidCc7XG5pbXBvcnQgeyBaY2FzaFRyYW5zYWN0aW9uQnVpbGRlciB9IGZyb20gJy4vemNhc2gvWmNhc2hUcmFuc2FjdGlvbkJ1aWxkZXInO1xuaW1wb3J0IHsgWmNhc2hOZXR3b3JrLCBaY2FzaFRyYW5zYWN0aW9uIH0gZnJvbSAnLi96Y2FzaC9aY2FzaFRyYW5zYWN0aW9uJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRyYW5zYWN0aW9uRnJvbUJ1ZmZlcjxUTnVtYmVyIGV4dGVuZHMgbnVtYmVyIHwgYmlnaW50ID0gbnVtYmVyPihcbiAgYnVmOiBCdWZmZXIsXG4gIG5ldHdvcms6IE5ldHdvcmssXG4gIHsgdmVyc2lvbiwgYW1vdW50VHlwZSB9OiB7IHZlcnNpb24/OiBudW1iZXI7IGFtb3VudFR5cGU/OiAnbnVtYmVyJyB8ICdiaWdpbnQnIH0gPSB7fSxcbiAgZGVwcmVjYXRlZEFtb3VudFR5cGU/OiAnbnVtYmVyJyB8ICdiaWdpbnQnXG4pOiBVdHhvVHJhbnNhY3Rpb248VE51bWJlcj4ge1xuICBpZiAoYW1vdW50VHlwZSkge1xuICAgIGlmIChkZXByZWNhdGVkQW1vdW50VHlwZSAmJiBhbW91bnRUeXBlICE9PSBkZXByZWNhdGVkQW1vdW50VHlwZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIGFyZ3VtZW50c2ApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVwcmVjYXRlZEFtb3VudFR5cGUpIHtcbiAgICAgIGFtb3VudFR5cGUgPSBkZXByZWNhdGVkQW1vdW50VHlwZTtcbiAgICB9IGVsc2Uge1xuICAgICAgYW1vdW50VHlwZSA9ICdudW1iZXInO1xuICAgIH1cbiAgfVxuICBzd2l0Y2ggKGdldE1haW5uZXQobmV0d29yaykpIHtcbiAgICBjYXNlIG5ldHdvcmtzLmJpdGNvaW46XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luY2FzaDpcbiAgICBjYXNlIG5ldHdvcmtzLmJpdGNvaW5zdjpcbiAgICBjYXNlIG5ldHdvcmtzLmJpdGNvaW5nb2xkOlxuICAgIGNhc2UgbmV0d29ya3MuZG9nZWNvaW46XG4gICAgY2FzZSBuZXR3b3Jrcy5lY2FzaDpcbiAgICBjYXNlIG5ldHdvcmtzLmxpdGVjb2luOlxuICAgICAgcmV0dXJuIFV0eG9UcmFuc2FjdGlvbi5mcm9tQnVmZmVyPFROdW1iZXI+KGJ1ZiwgZmFsc2UsIGFtb3VudFR5cGUsIG5ldHdvcmspO1xuICAgIGNhc2UgbmV0d29ya3MuZGFzaDpcbiAgICAgIHJldHVybiBEYXNoVHJhbnNhY3Rpb24uZnJvbUJ1ZmZlcjxUTnVtYmVyPihidWYsIGZhbHNlLCBhbW91bnRUeXBlLCBuZXR3b3JrKTtcbiAgICBjYXNlIG5ldHdvcmtzLnpjYXNoOlxuICAgICAgcmV0dXJuIFpjYXNoVHJhbnNhY3Rpb24uZnJvbUJ1ZmZlcldpdGhWZXJzaW9uPFROdW1iZXI+KGJ1ZiwgbmV0d29yayBhcyBaY2FzaE5ldHdvcmssIHZlcnNpb24sIGFtb3VudFR5cGUpO1xuICB9XG5cbiAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cbiAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIG5ldHdvcmtgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBzYnRGcm9tQnVmZmVyKGJ1ZjogQnVmZmVyLCBuZXR3b3JrOiBOZXR3b3JrLCBiaXAzMlBhdGhzQWJzb2x1dGUgPSBmYWxzZSk6IFV0eG9Qc2J0IHtcbiAgc3dpdGNoIChnZXRNYWlubmV0KG5ldHdvcmspKSB7XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luOlxuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbmNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luc3Y6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luZ29sZDpcbiAgICBjYXNlIG5ldHdvcmtzLmRvZ2Vjb2luOlxuICAgIGNhc2UgbmV0d29ya3MuZWNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5saXRlY29pbjpcbiAgICAgIHJldHVybiBVdHhvUHNidC5mcm9tQnVmZmVyKGJ1ZiwgeyBuZXR3b3JrLCBiaXAzMlBhdGhzQWJzb2x1dGUgfSk7XG4gICAgY2FzZSBuZXR3b3Jrcy5kYXNoOlxuICAgICAgcmV0dXJuIERhc2hQc2J0LmZyb21CdWZmZXIoYnVmLCB7IG5ldHdvcmssIGJpcDMyUGF0aHNBYnNvbHV0ZSB9KTtcbiAgICBjYXNlIG5ldHdvcmtzLnpjYXNoOlxuICAgICAgcmV0dXJuIFpjYXNoUHNidC5mcm9tQnVmZmVyKGJ1ZiwgeyBuZXR3b3JrLCBiaXAzMlBhdGhzQWJzb2x1dGUgfSk7XG4gIH1cblxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgbmV0d29ya2ApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHNidEZyb21IZXgoaGV4OiBzdHJpbmcsIG5ldHdvcms6IE5ldHdvcmssIGJpcDMyUGF0aHNBYnNvbHV0ZSA9IGZhbHNlKTogVXR4b1BzYnQge1xuICByZXR1cm4gY3JlYXRlUHNidEZyb21CdWZmZXIoQnVmZmVyLmZyb20oaGV4LCAnaGV4JyksIG5ldHdvcmssIGJpcDMyUGF0aHNBYnNvbHV0ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQc2J0RnJvbVRyYW5zYWN0aW9uKHR4OiBVdHhvVHJhbnNhY3Rpb248YmlnaW50PiwgcHJldk91dHM6IFR4T3V0cHV0PGJpZ2ludD5bXSk6IFV0eG9Qc2J0IHtcbiAgc3dpdGNoIChnZXRNYWlubmV0KHR4Lm5ldHdvcmspKSB7XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luOlxuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbmNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luc3Y6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luZ29sZDpcbiAgICBjYXNlIG5ldHdvcmtzLmRvZ2Vjb2luOlxuICAgIGNhc2UgbmV0d29ya3MuZWNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5saXRlY29pbjpcbiAgICAgIHJldHVybiBVdHhvUHNidC5mcm9tVHJhbnNhY3Rpb24odHgsIHByZXZPdXRzKTtcbiAgICBjYXNlIG5ldHdvcmtzLmRhc2g6XG4gICAgICByZXR1cm4gRGFzaFBzYnQuZnJvbVRyYW5zYWN0aW9uKHR4LCBwcmV2T3V0cyk7XG4gICAgY2FzZSBuZXR3b3Jrcy56Y2FzaDpcbiAgICAgIHJldHVybiBaY2FzaFBzYnQuZnJvbVRyYW5zYWN0aW9uKHR4LCBwcmV2T3V0cyk7XG4gIH1cblxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgbmV0d29ya2ApO1xufVxuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRyYW5zYWN0aW9uRnJvbUhleDxUTnVtYmVyIGV4dGVuZHMgbnVtYmVyIHwgYmlnaW50ID0gbnVtYmVyPihcbiAgaGV4OiBzdHJpbmcsXG4gIG5ldHdvcms6IE5ldHdvcmssXG4gIGFtb3VudFR5cGU6ICdudW1iZXInIHwgJ2JpZ2ludCcgPSAnbnVtYmVyJ1xuKTogVXR4b1RyYW5zYWN0aW9uPFROdW1iZXI+IHtcbiAgcmV0dXJuIGNyZWF0ZVRyYW5zYWN0aW9uRnJvbUJ1ZmZlcjxUTnVtYmVyPihCdWZmZXIuZnJvbShoZXgsICdoZXgnKSwgbmV0d29yaywgeyBhbW91bnRUeXBlIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdFRyYW5zYWN0aW9uVmVyc2lvbihuZXR3b3JrOiBOZXR3b3JrKTogbnVtYmVyIHtcbiAgc3dpdGNoIChnZXRNYWlubmV0KG5ldHdvcmspKSB7XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luY2FzaDpcbiAgICBjYXNlIG5ldHdvcmtzLmJpdGNvaW5zdjpcbiAgICBjYXNlIG5ldHdvcmtzLmJpdGNvaW5nb2xkOlxuICAgIGNhc2UgbmV0d29ya3MuZWNhc2g6XG4gICAgICByZXR1cm4gMjtcbiAgICBjYXNlIG5ldHdvcmtzLnpjYXNoOlxuICAgICAgcmV0dXJuIFpjYXNoVHJhbnNhY3Rpb24uVkVSU0lPTjRfQlJBTkNIX05VNTtcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIDE7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFRyYW5zYWN0aW9uQnVpbGRlckRlZmF1bHRzPFROdW1iZXIgZXh0ZW5kcyBudW1iZXIgfCBiaWdpbnQ+KFxuICB0eGI6IFV0eG9UcmFuc2FjdGlvbkJ1aWxkZXI8VE51bWJlcj4sXG4gIG5ldHdvcms6IE5ldHdvcmssXG4gIHsgdmVyc2lvbiA9IGdldERlZmF1bHRUcmFuc2FjdGlvblZlcnNpb24obmV0d29yaykgfTogeyB2ZXJzaW9uPzogbnVtYmVyIH0gPSB7fVxuKTogdm9pZCB7XG4gIHN3aXRjaCAoZ2V0TWFpbm5ldChuZXR3b3JrKSkge1xuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbmNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luc3Y6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luZ29sZDpcbiAgICBjYXNlIG5ldHdvcmtzLmVjYXNoOlxuICAgICAgaWYgKHZlcnNpb24gIT09IDIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHZlcnNpb25gKTtcbiAgICAgIH1cbiAgICAgIHR4Yi5zZXRWZXJzaW9uKHZlcnNpb24pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBuZXR3b3Jrcy56Y2FzaDpcbiAgICAgICh0eGIgYXMgWmNhc2hUcmFuc2FjdGlvbkJ1aWxkZXI8VE51bWJlcj4pLnNldERlZmF1bHRzRm9yVmVyc2lvbihuZXR3b3JrLCB2ZXJzaW9uKTtcbiAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICBpZiAodmVyc2lvbiAhPT0gMSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgdmVyc2lvbmApO1xuICAgICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRQc2J0RGVmYXVsdHMoXG4gIHBzYnQ6IFV0eG9Qc2J0LFxuICBuZXR3b3JrOiBOZXR3b3JrLFxuICB7IHZlcnNpb24gPSBnZXREZWZhdWx0VHJhbnNhY3Rpb25WZXJzaW9uKG5ldHdvcmspIH06IHsgdmVyc2lvbj86IG51bWJlciB9ID0ge31cbik6IHZvaWQge1xuICBzd2l0Y2ggKGdldE1haW5uZXQobmV0d29yaykpIHtcbiAgICBjYXNlIG5ldHdvcmtzLmJpdGNvaW5jYXNoOlxuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbnN2OlxuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbmdvbGQ6XG4gICAgY2FzZSBuZXR3b3Jrcy5lY2FzaDpcbiAgICAgIGlmICh2ZXJzaW9uICE9PSAyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB2ZXJzaW9uYCk7XG4gICAgICB9XG4gICAgICBicmVhaztcbiAgICBjYXNlIG5ldHdvcmtzLnpjYXNoOlxuICAgICAgaWYgKFxuICAgICAgICAhW1xuICAgICAgICAgIFpjYXNoVHJhbnNhY3Rpb24uVkVSU0lPTjRfQlJBTkNIX0NBTk9QWSxcbiAgICAgICAgICBaY2FzaFRyYW5zYWN0aW9uLlZFUlNJT040X0JSQU5DSF9OVTUsXG4gICAgICAgICAgWmNhc2hUcmFuc2FjdGlvbi5WRVJTSU9ONV9CUkFOQ0hfTlU1LFxuICAgICAgICBdLmluY2x1ZGVzKHZlcnNpb24pXG4gICAgICApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIHZlcnNpb25gKTtcbiAgICAgIH1cbiAgICAgIChwc2J0IGFzIFpjYXNoUHNidCkuc2V0RGVmYXVsdHNGb3JWZXJzaW9uKG5ldHdvcmssIHZlcnNpb24pO1xuICAgICAgYnJlYWs7XG4gICAgZGVmYXVsdDpcbiAgICAgIGlmICh2ZXJzaW9uICE9PSAxKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCB2ZXJzaW9uYCk7XG4gICAgICB9XG4gICAgICAvLyBGSVhNRTogc2V0IHZlcnNpb24gaGVyZSwgYmVjYXVzZSB0aGVyZSdzIGEgYnVnIGluIHRoZSB1cHN0cmVhbSBQU0JUXG4gICAgICAvLyB0aGF0IGRlZmF1bHRzIHRyYW5zYWN0aW9ucyB0byB2Mi5cbiAgICAgIHBzYnQuc2V0VmVyc2lvbih2ZXJzaW9uKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHNidEZvck5ldHdvcmsocHNidE9wdHM6IFBzYnRPcHRzLCB7IHZlcnNpb24gfTogeyB2ZXJzaW9uPzogbnVtYmVyIH0gPSB7fSk6IFV0eG9Qc2J0IHtcbiAgbGV0IHBzYnQ7XG5cbiAgc3dpdGNoIChnZXRNYWlubmV0KHBzYnRPcHRzLm5ldHdvcmspKSB7XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luOlxuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbmNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luc3Y6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luZ29sZDpcbiAgICBjYXNlIG5ldHdvcmtzLmRvZ2Vjb2luOlxuICAgIGNhc2UgbmV0d29ya3MuZWNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5saXRlY29pbjoge1xuICAgICAgcHNidCA9IFV0eG9Qc2J0LmNyZWF0ZVBzYnQocHNidE9wdHMpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNhc2UgbmV0d29ya3MuZGFzaDoge1xuICAgICAgcHNidCA9IERhc2hQc2J0LmNyZWF0ZVBzYnQocHNidE9wdHMpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNhc2UgbmV0d29ya3MuemNhc2g6IHtcbiAgICAgIHBzYnQgPSBaY2FzaFBzYnQuY3JlYXRlUHNidChwc2J0T3B0cyk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcihgdW5zdXBwb3J0ZWQgbmV0d29ya2ApO1xuICB9XG5cbiAgc2V0UHNidERlZmF1bHRzKHBzYnQsIHBzYnRPcHRzLm5ldHdvcmssIHsgdmVyc2lvbiB9KTtcblxuICByZXR1cm4gcHNidDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRyYW5zYWN0aW9uQnVpbGRlckZvck5ldHdvcms8VE51bWJlciBleHRlbmRzIG51bWJlciB8IGJpZ2ludCA9IG51bWJlcj4oXG4gIG5ldHdvcms6IE5ldHdvcmssXG4gIHsgdmVyc2lvbiB9OiB7IHZlcnNpb24/OiBudW1iZXIgfSA9IHt9XG4pOiBVdHhvVHJhbnNhY3Rpb25CdWlsZGVyPFROdW1iZXI+IHtcbiAgbGV0IHR4YjtcbiAgc3dpdGNoIChnZXRNYWlubmV0KG5ldHdvcmspKSB7XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luOlxuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbmNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luc3Y6XG4gICAgY2FzZSBuZXR3b3Jrcy5iaXRjb2luZ29sZDpcbiAgICBjYXNlIG5ldHdvcmtzLmRvZ2Vjb2luOlxuICAgIGNhc2UgbmV0d29ya3MuZWNhc2g6XG4gICAgY2FzZSBuZXR3b3Jrcy5saXRlY29pbjoge1xuICAgICAgdHhiID0gbmV3IFV0eG9UcmFuc2FjdGlvbkJ1aWxkZXI8VE51bWJlcj4obmV0d29yayk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY2FzZSBuZXR3b3Jrcy5kYXNoOlxuICAgICAgdHhiID0gbmV3IERhc2hUcmFuc2FjdGlvbkJ1aWxkZXI8VE51bWJlcj4obmV0d29yayk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIG5ldHdvcmtzLnpjYXNoOiB7XG4gICAgICB0eGIgPSBuZXcgWmNhc2hUcmFuc2FjdGlvbkJ1aWxkZXI8VE51bWJlcj4obmV0d29yayBhcyBaY2FzaE5ldHdvcmspO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYHVuc3VwcG9ydGVkIG5ldHdvcmtgKTtcbiAgfVxuXG4gIHNldFRyYW5zYWN0aW9uQnVpbGRlckRlZmF1bHRzPFROdW1iZXI+KHR4YiwgbmV0d29yaywgeyB2ZXJzaW9uIH0pO1xuXG4gIHJldHVybiB0eGI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUcmFuc2FjdGlvbkJ1aWxkZXJGcm9tVHJhbnNhY3Rpb248VE51bWJlciBleHRlbmRzIG51bWJlciB8IGJpZ2ludD4oXG4gIHR4OiBVdHhvVHJhbnNhY3Rpb248VE51bWJlcj4sXG4gIHByZXZPdXRwdXRzPzogVHhPdXRwdXQ8VE51bWJlcj5bXVxuKTogVXR4b1RyYW5zYWN0aW9uQnVpbGRlcjxUTnVtYmVyPiB7XG4gIHN3aXRjaCAoZ2V0TWFpbm5ldCh0eC5uZXR3b3JrKSkge1xuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbjpcbiAgICBjYXNlIG5ldHdvcmtzLmJpdGNvaW5jYXNoOlxuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbnN2OlxuICAgIGNhc2UgbmV0d29ya3MuYml0Y29pbmdvbGQ6XG4gICAgY2FzZSBuZXR3b3Jrcy5kb2dlY29pbjpcbiAgICBjYXNlIG5ldHdvcmtzLmVjYXNoOlxuICAgIGNhc2UgbmV0d29ya3MubGl0ZWNvaW46XG4gICAgICByZXR1cm4gVXR4b1RyYW5zYWN0aW9uQnVpbGRlci5mcm9tVHJhbnNhY3Rpb248VE51bWJlcj4odHgsIHVuZGVmaW5lZCwgcHJldk91dHB1dHMpO1xuICAgIGNhc2UgbmV0d29ya3MuZGFzaDpcbiAgICAgIHJldHVybiBEYXNoVHJhbnNhY3Rpb25CdWlsZGVyLmZyb21UcmFuc2FjdGlvbjxUTnVtYmVyPihcbiAgICAgICAgdHggYXMgRGFzaFRyYW5zYWN0aW9uPFROdW1iZXI+LFxuICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgIHByZXZPdXRwdXRzIGFzIFR4T3V0cHV0PFROdW1iZXI+W11cbiAgICAgICk7XG4gICAgY2FzZSBuZXR3b3Jrcy56Y2FzaDpcbiAgICAgIHJldHVybiBaY2FzaFRyYW5zYWN0aW9uQnVpbGRlci5mcm9tVHJhbnNhY3Rpb248VE51bWJlcj4oXG4gICAgICAgIHR4IGFzIFpjYXNoVHJhbnNhY3Rpb248VE51bWJlcj4sXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgcHJldk91dHB1dHMgYXMgVHhPdXRwdXQ8VE51bWJlcj5bXVxuICAgICAgKTtcbiAgfVxuXG4gIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBuZXR3b3JrYCk7XG59XG4iXX0=