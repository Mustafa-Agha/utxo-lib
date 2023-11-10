"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultWalletKeys = exports.getDefaultCosigner = exports.getKeyName = exports.getKeyTriple = exports.getKey = void 0;
const bip32_1 = require("bip32");
const crypto = require("crypto");
const bitgo_1 = require("../bitgo");
const noble_ecc_1 = require("../noble_ecc");
const bip32 = bip32_1.BIP32Factory(noble_ecc_1.ecc);
function getKey(seed) {
    return bip32.fromSeed(crypto.createHash('sha256').update(seed).digest());
}
exports.getKey = getKey;
function getKeyTriple(seed) {
    return [getKey(seed + '.0'), getKey(seed + '.1'), getKey(seed + '.2')];
}
exports.getKeyTriple = getKeyTriple;
function getKeyName(triple, k) {
    return ['user', 'backup', 'bitgo'][triple.indexOf(k)];
}
exports.getKeyName = getKeyName;
function getDefaultCosigner(keyset, signer) {
    const eq = (a, b) => a === b || (Buffer.isBuffer(a) && Buffer.isBuffer(b) && a.equals(b));
    const [user, backup, bitgo] = keyset;
    if (eq(signer, user)) {
        return bitgo;
    }
    if (eq(signer, backup)) {
        return bitgo;
    }
    if (eq(signer, bitgo)) {
        return user;
    }
    throw new Error(`signer not in pubkeys`);
}
exports.getDefaultCosigner = getDefaultCosigner;
function getDefaultWalletKeys() {
    return new bitgo_1.RootWalletKeys(getKeyTriple('default'));
}
exports.getDefaultWalletKeys = getDefaultWalletKeys;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90ZXN0dXRpbC9rZXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGlDQUErRDtBQUMvRCxpQ0FBaUM7QUFHakMsb0NBQTBDO0FBQzFDLDRDQUFtQztBQUVuQyxNQUFNLEtBQUssR0FBYSxvQkFBWSxDQUFDLGVBQUcsQ0FBQyxDQUFDO0FBSTFDLFNBQWdCLE1BQU0sQ0FBQyxJQUFZO0lBQ2pDLE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQzNFLENBQUM7QUFGRCx3QkFFQztBQUVELFNBQWdCLFlBQVksQ0FBQyxJQUFZO0lBQ3ZDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3pFLENBQUM7QUFGRCxvQ0FFQztBQUVELFNBQWdCLFVBQVUsQ0FBQyxNQUE4QixFQUFFLENBQWlCO0lBQzFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRkQsZ0NBRUM7QUFFRCxTQUFnQixrQkFBa0IsQ0FBSSxNQUFpQixFQUFFLE1BQVM7SUFDaEUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFJLEVBQUUsQ0FBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNoRyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsR0FBRyxNQUFNLENBQUM7SUFDckMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBQ3BCLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7SUFDRCxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEVBQUU7UUFDdEIsT0FBTyxLQUFLLENBQUM7S0FDZDtJQUNELElBQUksRUFBRSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRTtRQUNyQixPQUFPLElBQUksQ0FBQztLQUNiO0lBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFiRCxnREFhQztBQUVELFNBQWdCLG9CQUFvQjtJQUNsQyxPQUFPLElBQUksc0JBQWMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUNyRCxDQUFDO0FBRkQsb0RBRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCSVAzMkFQSSwgQklQMzJGYWN0b3J5LCBCSVAzMkludGVyZmFjZSB9IGZyb20gJ2JpcDMyJztcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xuXG5pbXBvcnQgeyBUcmlwbGUgfSBmcm9tICcuLi9iaXRnbyc7XG5pbXBvcnQgeyBSb290V2FsbGV0S2V5cyB9IGZyb20gJy4uL2JpdGdvJztcbmltcG9ydCB7IGVjYyB9IGZyb20gJy4uL25vYmxlX2VjYyc7XG5cbmNvbnN0IGJpcDMyOiBCSVAzMkFQSSA9IEJJUDMyRmFjdG9yeShlY2MpO1xuXG5leHBvcnQgdHlwZSBLZXlUcmlwbGUgPSBUcmlwbGU8QklQMzJJbnRlcmZhY2U+O1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0S2V5KHNlZWQ6IHN0cmluZyk6IEJJUDMySW50ZXJmYWNlIHtcbiAgcmV0dXJuIGJpcDMyLmZyb21TZWVkKGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUoc2VlZCkuZGlnZXN0KCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0S2V5VHJpcGxlKHNlZWQ6IHN0cmluZyk6IEtleVRyaXBsZSB7XG4gIHJldHVybiBbZ2V0S2V5KHNlZWQgKyAnLjAnKSwgZ2V0S2V5KHNlZWQgKyAnLjEnKSwgZ2V0S2V5KHNlZWQgKyAnLjInKV07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRLZXlOYW1lKHRyaXBsZTogVHJpcGxlPEJJUDMySW50ZXJmYWNlPiwgazogQklQMzJJbnRlcmZhY2UpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICByZXR1cm4gWyd1c2VyJywgJ2JhY2t1cCcsICdiaXRnbyddW3RyaXBsZS5pbmRleE9mKGspXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRDb3NpZ25lcjxUPihrZXlzZXQ6IFRyaXBsZTxUPiwgc2lnbmVyOiBUKTogVCB7XG4gIGNvbnN0IGVxID0gKGE6IFQsIGI6IFQpID0+IGEgPT09IGIgfHwgKEJ1ZmZlci5pc0J1ZmZlcihhKSAmJiBCdWZmZXIuaXNCdWZmZXIoYikgJiYgYS5lcXVhbHMoYikpO1xuICBjb25zdCBbdXNlciwgYmFja3VwLCBiaXRnb10gPSBrZXlzZXQ7XG4gIGlmIChlcShzaWduZXIsIHVzZXIpKSB7XG4gICAgcmV0dXJuIGJpdGdvO1xuICB9XG4gIGlmIChlcShzaWduZXIsIGJhY2t1cCkpIHtcbiAgICByZXR1cm4gYml0Z287XG4gIH1cbiAgaWYgKGVxKHNpZ25lciwgYml0Z28pKSB7XG4gICAgcmV0dXJuIHVzZXI7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGBzaWduZXIgbm90IGluIHB1YmtleXNgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRXYWxsZXRLZXlzKCk6IFJvb3RXYWxsZXRLZXlzIHtcbiAgcmV0dXJuIG5ldyBSb290V2FsbGV0S2V5cyhnZXRLZXlUcmlwbGUoJ2RlZmF1bHQnKSk7XG59XG4iXX0=