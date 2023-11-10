"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addWalletOutputToPsbt = void 0;
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const chains_1 = require("./chains");
const outputScripts_1 = require("../outputScripts");
/**
 * Add a verifiable wallet output to the PSBT. The output and all data
 * needed to verify it from public keys only are added to the PSBT.
 * Typically these are change outputs
 *
 * @param psbt the PSBT to add change output to
 * @param rootWalletKeys keys that will be able to spend the output
 * @param chain chain code to use for deriving scripts (and to determine script
 *              type) chain is an API parameter in the BitGo API, and may be
 *              any valid ChainCode
 * @param index derivation index for the change address
 * @param value value of the change output
 */
function addWalletOutputToPsbt(psbt, rootWalletKeys, chain, index, value) {
    const walletKeys = rootWalletKeys.deriveForChainAndIndex(chain, index);
    const scriptType = chains_1.scriptTypeForChain(chain);
    if (scriptType === 'p2tr' || scriptType === 'p2trMusig2') {
        const payment = scriptType === 'p2tr' ? outputScripts_1.createPaymentP2tr(walletKeys.publicKeys) : outputScripts_1.createPaymentP2trMusig2(walletKeys.publicKeys);
        const allLeafHashes = payment.redeems.map((r) => bitcoinjs_lib_1.taproot.hashTapLeaf(r.output));
        psbt.addOutput({
            script: payment.output,
            value,
            tapTree: payment.tapTree,
            tapInternalKey: payment.internalPubkey,
            tapBip32Derivation: [0, 1, 2].map((idx) => {
                const pubkey = outputScripts_1.toXOnlyPublicKey(walletKeys.triple[idx].publicKey);
                const leafHashes = [];
                payment.redeems.forEach((r, idx) => {
                    if (r.pubkeys.find((pk) => pk.equals(pubkey))) {
                        leafHashes.push(allLeafHashes[idx]);
                    }
                });
                return {
                    leafHashes,
                    pubkey,
                    path: walletKeys.paths[idx],
                    masterFingerprint: rootWalletKeys.triple[idx].fingerprint,
                };
            }),
        });
    }
    else {
        const { scriptPubKey, witnessScript, redeemScript } = outputScripts_1.createOutputScript2of3(walletKeys.publicKeys, scriptType);
        psbt.addOutput({
            script: scriptPubKey,
            value,
            bip32Derivation: [0, 1, 2].map((idx) => ({
                pubkey: walletKeys.triple[idx].publicKey,
                path: walletKeys.paths[idx],
                masterFingerprint: rootWalletKeys.triple[idx].fingerprint,
            })),
        });
        const outputIndex = psbt.txOutputs.length - 1;
        if (witnessScript) {
            psbt.updateOutput(outputIndex, { witnessScript });
        }
        if (redeemScript) {
            psbt.updateOutput(outputIndex, { redeemScript });
        }
    }
}
exports.addWalletOutputToPsbt = addWalletOutputToPsbt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2FsbGV0T3V0cHV0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2JpdGdvL3dhbGxldC9XYWxsZXRPdXRwdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaURBQXdDO0FBR3hDLHFDQUF5RDtBQUN6RCxvREFBd0g7QUFFeEg7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsU0FBZ0IscUJBQXFCLENBQ25DLElBQWMsRUFDZCxjQUE4QixFQUM5QixLQUFnQixFQUNoQixLQUFhLEVBQ2IsS0FBYTtJQUViLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkUsTUFBTSxVQUFVLEdBQUcsMkJBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDN0MsSUFBSSxVQUFVLEtBQUssTUFBTSxJQUFJLFVBQVUsS0FBSyxZQUFZLEVBQUU7UUFDeEQsTUFBTSxPQUFPLEdBQ1gsVUFBVSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUMsaUNBQWlCLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyx1Q0FBdUIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEgsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLE9BQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLHVCQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFPLENBQUMsQ0FBQyxDQUFDO1FBRWxGLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDYixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU87WUFDdkIsS0FBSztZQUNMLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7WUFDdEMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO2dCQUN4QyxNQUFNLE1BQU0sR0FBRyxnQ0FBZ0IsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNsRSxNQUFNLFVBQVUsR0FBYSxFQUFFLENBQUM7Z0JBQ2hDLE9BQU8sQ0FBQyxPQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxFQUFFO29CQUNsQyxJQUFJLENBQUMsQ0FBQyxPQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUU7d0JBQzlDLFVBQVUsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7cUJBQ3JDO2dCQUNILENBQUMsQ0FBQyxDQUFDO2dCQUNILE9BQU87b0JBQ0wsVUFBVTtvQkFDVixNQUFNO29CQUNOLElBQUksRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztvQkFDM0IsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxXQUFXO2lCQUMxRCxDQUFDO1lBQ0osQ0FBQyxDQUFDO1NBQ0gsQ0FBQyxDQUFDO0tBQ0o7U0FBTTtRQUNMLE1BQU0sRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLFlBQVksRUFBRSxHQUFHLHNDQUFzQixDQUFDLFVBQVUsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDaEgsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNiLE1BQU0sRUFBRSxZQUFZO1lBQ3BCLEtBQUs7WUFDTCxlQUFlLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUztnQkFDeEMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO2dCQUMzQixpQkFBaUIsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVc7YUFDMUQsQ0FBQyxDQUFDO1NBQ0osQ0FBQyxDQUFDO1FBQ0gsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQzlDLElBQUksYUFBYSxFQUFFO1lBQ2pCLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztTQUNuRDtRQUNELElBQUksWUFBWSxFQUFFO1lBQ2hCLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxFQUFFLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztTQUNsRDtLQUNGO0FBQ0gsQ0FBQztBQXRERCxzREFzREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB0YXByb290IH0gZnJvbSAnYml0Y29pbmpzLWxpYic7XG5pbXBvcnQgeyBVdHhvUHNidCB9IGZyb20gJy4uL1V0eG9Qc2J0JztcbmltcG9ydCB7IFJvb3RXYWxsZXRLZXlzIH0gZnJvbSAnLi9XYWxsZXRLZXlzJztcbmltcG9ydCB7IENoYWluQ29kZSwgc2NyaXB0VHlwZUZvckNoYWluIH0gZnJvbSAnLi9jaGFpbnMnO1xuaW1wb3J0IHsgY3JlYXRlT3V0cHV0U2NyaXB0Mm9mMywgY3JlYXRlUGF5bWVudFAydHIsIGNyZWF0ZVBheW1lbnRQMnRyTXVzaWcyLCB0b1hPbmx5UHVibGljS2V5IH0gZnJvbSAnLi4vb3V0cHV0U2NyaXB0cyc7XG5cbi8qKlxuICogQWRkIGEgdmVyaWZpYWJsZSB3YWxsZXQgb3V0cHV0IHRvIHRoZSBQU0JULiBUaGUgb3V0cHV0IGFuZCBhbGwgZGF0YVxuICogbmVlZGVkIHRvIHZlcmlmeSBpdCBmcm9tIHB1YmxpYyBrZXlzIG9ubHkgYXJlIGFkZGVkIHRvIHRoZSBQU0JULlxuICogVHlwaWNhbGx5IHRoZXNlIGFyZSBjaGFuZ2Ugb3V0cHV0c1xuICpcbiAqIEBwYXJhbSBwc2J0IHRoZSBQU0JUIHRvIGFkZCBjaGFuZ2Ugb3V0cHV0IHRvXG4gKiBAcGFyYW0gcm9vdFdhbGxldEtleXMga2V5cyB0aGF0IHdpbGwgYmUgYWJsZSB0byBzcGVuZCB0aGUgb3V0cHV0XG4gKiBAcGFyYW0gY2hhaW4gY2hhaW4gY29kZSB0byB1c2UgZm9yIGRlcml2aW5nIHNjcmlwdHMgKGFuZCB0byBkZXRlcm1pbmUgc2NyaXB0XG4gKiAgICAgICAgICAgICAgdHlwZSkgY2hhaW4gaXMgYW4gQVBJIHBhcmFtZXRlciBpbiB0aGUgQml0R28gQVBJLCBhbmQgbWF5IGJlXG4gKiAgICAgICAgICAgICAgYW55IHZhbGlkIENoYWluQ29kZVxuICogQHBhcmFtIGluZGV4IGRlcml2YXRpb24gaW5kZXggZm9yIHRoZSBjaGFuZ2UgYWRkcmVzc1xuICogQHBhcmFtIHZhbHVlIHZhbHVlIG9mIHRoZSBjaGFuZ2Ugb3V0cHV0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZGRXYWxsZXRPdXRwdXRUb1BzYnQoXG4gIHBzYnQ6IFV0eG9Qc2J0LFxuICByb290V2FsbGV0S2V5czogUm9vdFdhbGxldEtleXMsXG4gIGNoYWluOiBDaGFpbkNvZGUsXG4gIGluZGV4OiBudW1iZXIsXG4gIHZhbHVlOiBiaWdpbnRcbik6IHZvaWQge1xuICBjb25zdCB3YWxsZXRLZXlzID0gcm9vdFdhbGxldEtleXMuZGVyaXZlRm9yQ2hhaW5BbmRJbmRleChjaGFpbiwgaW5kZXgpO1xuICBjb25zdCBzY3JpcHRUeXBlID0gc2NyaXB0VHlwZUZvckNoYWluKGNoYWluKTtcbiAgaWYgKHNjcmlwdFR5cGUgPT09ICdwMnRyJyB8fCBzY3JpcHRUeXBlID09PSAncDJ0ck11c2lnMicpIHtcbiAgICBjb25zdCBwYXltZW50ID1cbiAgICAgIHNjcmlwdFR5cGUgPT09ICdwMnRyJyA/IGNyZWF0ZVBheW1lbnRQMnRyKHdhbGxldEtleXMucHVibGljS2V5cykgOiBjcmVhdGVQYXltZW50UDJ0ck11c2lnMih3YWxsZXRLZXlzLnB1YmxpY0tleXMpO1xuICAgIGNvbnN0IGFsbExlYWZIYXNoZXMgPSBwYXltZW50LnJlZGVlbXMhLm1hcCgocikgPT4gdGFwcm9vdC5oYXNoVGFwTGVhZihyLm91dHB1dCEpKTtcblxuICAgIHBzYnQuYWRkT3V0cHV0KHtcbiAgICAgIHNjcmlwdDogcGF5bWVudC5vdXRwdXQhLFxuICAgICAgdmFsdWUsXG4gICAgICB0YXBUcmVlOiBwYXltZW50LnRhcFRyZWUsXG4gICAgICB0YXBJbnRlcm5hbEtleTogcGF5bWVudC5pbnRlcm5hbFB1YmtleSxcbiAgICAgIHRhcEJpcDMyRGVyaXZhdGlvbjogWzAsIDEsIDJdLm1hcCgoaWR4KSA9PiB7XG4gICAgICAgIGNvbnN0IHB1YmtleSA9IHRvWE9ubHlQdWJsaWNLZXkod2FsbGV0S2V5cy50cmlwbGVbaWR4XS5wdWJsaWNLZXkpO1xuICAgICAgICBjb25zdCBsZWFmSGFzaGVzOiBCdWZmZXJbXSA9IFtdO1xuICAgICAgICBwYXltZW50LnJlZGVlbXMhLmZvckVhY2goKHIsIGlkeCkgPT4ge1xuICAgICAgICAgIGlmIChyLnB1YmtleXMhLmZpbmQoKHBrKSA9PiBway5lcXVhbHMocHVia2V5KSkpIHtcbiAgICAgICAgICAgIGxlYWZIYXNoZXMucHVzaChhbGxMZWFmSGFzaGVzW2lkeF0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbGVhZkhhc2hlcyxcbiAgICAgICAgICBwdWJrZXksXG4gICAgICAgICAgcGF0aDogd2FsbGV0S2V5cy5wYXRoc1tpZHhdLFxuICAgICAgICAgIG1hc3RlckZpbmdlcnByaW50OiByb290V2FsbGV0S2V5cy50cmlwbGVbaWR4XS5maW5nZXJwcmludCxcbiAgICAgICAgfTtcbiAgICAgIH0pLFxuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHsgc2NyaXB0UHViS2V5LCB3aXRuZXNzU2NyaXB0LCByZWRlZW1TY3JpcHQgfSA9IGNyZWF0ZU91dHB1dFNjcmlwdDJvZjMod2FsbGV0S2V5cy5wdWJsaWNLZXlzLCBzY3JpcHRUeXBlKTtcbiAgICBwc2J0LmFkZE91dHB1dCh7XG4gICAgICBzY3JpcHQ6IHNjcmlwdFB1YktleSxcbiAgICAgIHZhbHVlLFxuICAgICAgYmlwMzJEZXJpdmF0aW9uOiBbMCwgMSwgMl0ubWFwKChpZHgpID0+ICh7XG4gICAgICAgIHB1YmtleTogd2FsbGV0S2V5cy50cmlwbGVbaWR4XS5wdWJsaWNLZXksXG4gICAgICAgIHBhdGg6IHdhbGxldEtleXMucGF0aHNbaWR4XSxcbiAgICAgICAgbWFzdGVyRmluZ2VycHJpbnQ6IHJvb3RXYWxsZXRLZXlzLnRyaXBsZVtpZHhdLmZpbmdlcnByaW50LFxuICAgICAgfSkpLFxuICAgIH0pO1xuICAgIGNvbnN0IG91dHB1dEluZGV4ID0gcHNidC50eE91dHB1dHMubGVuZ3RoIC0gMTtcbiAgICBpZiAod2l0bmVzc1NjcmlwdCkge1xuICAgICAgcHNidC51cGRhdGVPdXRwdXQob3V0cHV0SW5kZXgsIHsgd2l0bmVzc1NjcmlwdCB9KTtcbiAgICB9XG4gICAgaWYgKHJlZGVlbVNjcmlwdCkge1xuICAgICAgcHNidC51cGRhdGVPdXRwdXQob3V0cHV0SW5kZXgsIHsgcmVkZWVtU2NyaXB0IH0pO1xuICAgIH1cbiAgfVxufVxuIl19