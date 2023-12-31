"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSegwit = exports.isTaproot = exports.isP2wpkh = exports.isP2wsh = void 0;
const opcodes = require("bitcoin-ops");
function isP2wsh(scriptPubkey, redeemScript) {
    const witnessProgramCandidate = redeemScript !== null && redeemScript !== void 0 ? redeemScript : scriptPubkey;
    return witnessProgramCandidate[0] === opcodes.OP_0 && witnessProgramCandidate.length === 34;
}
exports.isP2wsh = isP2wsh;
function isP2wpkh(scriptPubkey, redeemScript) {
    const witnessProgramCandidate = redeemScript !== null && redeemScript !== void 0 ? redeemScript : scriptPubkey;
    return witnessProgramCandidate[0] === opcodes.OP_0 && witnessProgramCandidate.length === 22;
}
exports.isP2wpkh = isP2wpkh;
function isTaproot(scriptPubkey) {
    return scriptPubkey[0] === opcodes.OP_1 && scriptPubkey.length === 34;
}
exports.isTaproot = isTaproot;
function isSegwit(scriptPubkey, redeemScript) {
    return isTaproot(scriptPubkey) || isP2wsh(scriptPubkey, redeemScript) || isP2wpkh(scriptPubkey, redeemScript);
}
exports.isSegwit = isSegwit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyaXB0VHlwZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvYml0Z28vcHNidC9zY3JpcHRUeXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx1Q0FBdUM7QUFFdkMsU0FBZ0IsT0FBTyxDQUFDLFlBQW9CLEVBQUUsWUFBcUI7SUFDakUsTUFBTSx1QkFBdUIsR0FBRyxZQUFZLGFBQVosWUFBWSxjQUFaLFlBQVksR0FBSSxZQUFZLENBQUM7SUFDN0QsT0FBTyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLHVCQUF1QixDQUFDLE1BQU0sS0FBSyxFQUFFLENBQUM7QUFDOUYsQ0FBQztBQUhELDBCQUdDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLFlBQW9CLEVBQUUsWUFBcUI7SUFDbEUsTUFBTSx1QkFBdUIsR0FBRyxZQUFZLGFBQVosWUFBWSxjQUFaLFlBQVksR0FBSSxZQUFZLENBQUM7SUFDN0QsT0FBTyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLENBQUMsSUFBSSxJQUFJLHVCQUF1QixDQUFDLE1BQU0sS0FBSyxFQUFFLENBQUM7QUFDOUYsQ0FBQztBQUhELDRCQUdDO0FBRUQsU0FBZ0IsU0FBUyxDQUFDLFlBQW9CO0lBQzVDLE9BQU8sWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxJQUFJLElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxFQUFFLENBQUM7QUFDeEUsQ0FBQztBQUZELDhCQUVDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLFlBQW9CLEVBQUUsWUFBcUI7SUFDbEUsT0FBTyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsSUFBSSxRQUFRLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ2hILENBQUM7QUFGRCw0QkFFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIG9wY29kZXMgZnJvbSAnYml0Y29pbi1vcHMnO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNQMndzaChzY3JpcHRQdWJrZXk6IEJ1ZmZlciwgcmVkZWVtU2NyaXB0PzogQnVmZmVyKTogYm9vbGVhbiB7XG4gIGNvbnN0IHdpdG5lc3NQcm9ncmFtQ2FuZGlkYXRlID0gcmVkZWVtU2NyaXB0ID8/IHNjcmlwdFB1YmtleTtcbiAgcmV0dXJuIHdpdG5lc3NQcm9ncmFtQ2FuZGlkYXRlWzBdID09PSBvcGNvZGVzLk9QXzAgJiYgd2l0bmVzc1Byb2dyYW1DYW5kaWRhdGUubGVuZ3RoID09PSAzNDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzUDJ3cGtoKHNjcmlwdFB1YmtleTogQnVmZmVyLCByZWRlZW1TY3JpcHQ/OiBCdWZmZXIpOiBib29sZWFuIHtcbiAgY29uc3Qgd2l0bmVzc1Byb2dyYW1DYW5kaWRhdGUgPSByZWRlZW1TY3JpcHQgPz8gc2NyaXB0UHVia2V5O1xuICByZXR1cm4gd2l0bmVzc1Byb2dyYW1DYW5kaWRhdGVbMF0gPT09IG9wY29kZXMuT1BfMCAmJiB3aXRuZXNzUHJvZ3JhbUNhbmRpZGF0ZS5sZW5ndGggPT09IDIyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNUYXByb290KHNjcmlwdFB1YmtleTogQnVmZmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBzY3JpcHRQdWJrZXlbMF0gPT09IG9wY29kZXMuT1BfMSAmJiBzY3JpcHRQdWJrZXkubGVuZ3RoID09PSAzNDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU2Vnd2l0KHNjcmlwdFB1YmtleTogQnVmZmVyLCByZWRlZW1TY3JpcHQ/OiBCdWZmZXIpOiBib29sZWFuIHtcbiAgcmV0dXJuIGlzVGFwcm9vdChzY3JpcHRQdWJrZXkpIHx8IGlzUDJ3c2goc2NyaXB0UHVia2V5LCByZWRlZW1TY3JpcHQpIHx8IGlzUDJ3cGtoKHNjcmlwdFB1YmtleSwgcmVkZWVtU2NyaXB0KTtcbn1cbiJdfQ==