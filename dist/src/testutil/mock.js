"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockUnspents = exports.mockWalletUnspent = exports.mockReplayProtectionUnspent = exports.isReplayProtectionUnspent = exports.replayProtectionKeyPair = exports.mockPrevTx = void 0;
const noble = require("@noble/secp256k1");
const utxolib = require("..");
const networks_1 = require("../networks");
const bitgo_1 = require("../bitgo");
const address_1 = require("../address");
const outputScripts_1 = require("../bitgo/outputScripts");
const keys_1 = require("./keys");
function mockPrevTx(vout, outputScript, value, network) {
    const psbtFromNetwork = bitgo_1.createPsbtForNetwork({ network });
    const privKey = noble.utils.randomPrivateKey();
    const pubkey = Buffer.from(noble.getPublicKey(privKey, true));
    const payment = utxolib.payments.p2wpkh({ pubkey });
    const destOutput = payment.output;
    if (!destOutput)
        throw new Error('Impossible, payment we just constructed has no output');
    for (let index = 0; index <= vout; index++) {
        if (index === vout) {
            psbtFromNetwork.addOutput({ script: outputScript, value });
        }
        else {
            psbtFromNetwork.addOutput({ script: destOutput, value });
        }
    }
    psbtFromNetwork.addInput({
        hash: Buffer.alloc(32, 0x01),
        index: 0,
        witnessUtxo: { script: destOutput, value: value * (BigInt(vout) + BigInt(1)) + BigInt(1000) },
    });
    psbtFromNetwork.signInput(0, {
        publicKey: pubkey,
        sign: (hash, lowR) => Buffer.from(noble.signSync(hash, privKey, { canonical: !lowR, der: false })),
    });
    psbtFromNetwork.validateSignaturesOfAllInputs();
    psbtFromNetwork.finalizeAllInputs();
    return psbtFromNetwork.extractTransaction();
}
exports.mockPrevTx = mockPrevTx;
exports.replayProtectionKeyPair = keys_1.getKey('replay-protection');
const replayProtectionScriptPubKey = outputScripts_1.createOutputScriptP2shP2pk(exports.replayProtectionKeyPair.publicKey).scriptPubKey;
function isReplayProtectionUnspent(u, network) {
    return u.address === address_1.fromOutputScript(replayProtectionScriptPubKey, network);
}
exports.isReplayProtectionUnspent = isReplayProtectionUnspent;
function mockReplayProtectionUnspent(network, value, { key = exports.replayProtectionKeyPair, vout = 0 } = {}) {
    const outputScript = outputScripts_1.createOutputScriptP2shP2pk(key.publicKey).scriptPubKey;
    const prevTransaction = mockPrevTx(vout, outputScript, BigInt(value), network);
    return { ...bitgo_1.fromOutputWithPrevTx(prevTransaction, vout), value };
}
exports.mockReplayProtectionUnspent = mockReplayProtectionUnspent;
function mockWalletUnspent(network, value, { chain = 0, index = 0, keys = keys_1.getDefaultWalletKeys(), vout = 0, id, } = {}) {
    const derivedKeys = keys.deriveForChainAndIndex(chain, index);
    const address = address_1.fromOutputScript(outputScripts_1.createOutputScript2of3(derivedKeys.publicKeys, bitgo_1.scriptTypeForChain(chain)).scriptPubKey, network);
    if (id && typeof id === 'string') {
        return { id, address, chain, index, value };
    }
    else {
        const prevTransaction = mockPrevTx(vout, outputScripts_1.createOutputScript2of3(derivedKeys.publicKeys, bitgo_1.scriptTypeForChain(chain), network).scriptPubKey, BigInt(value), network);
        const unspent = bitgo_1.isSegwit(chain) || networks_1.getMainnet(network) === networks_1.networks.zcash
            ? bitgo_1.fromOutput(prevTransaction, vout)
            : bitgo_1.fromOutputWithPrevTx(prevTransaction, vout);
        return {
            ...unspent,
            chain,
            index,
            value,
        };
    }
}
exports.mockWalletUnspent = mockWalletUnspent;
function mockUnspents(rootWalletKeys, inputScriptTypes, testOutputAmount, network) {
    return inputScriptTypes.map((t, i) => {
        if (bitgo_1.outputScripts.isScriptType2Of3(t)) {
            return mockWalletUnspent(network, testOutputAmount, {
                keys: rootWalletKeys,
                chain: bitgo_1.getExternalChainCode(t),
                vout: i,
            });
        }
        throw new Error(`invalid input type ${t}`);
    });
}
exports.mockUnspents = mockUnspents;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90ZXN0dXRpbC9tb2NrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDBDQUEwQztBQUMxQyw4QkFBOEI7QUFDOUIsMENBQTREO0FBRTVELG9DQWVrQjtBQUNsQix3Q0FBOEM7QUFDOUMsMERBQTRGO0FBRTVGLGlDQUFzRDtBQUl0RCxTQUFnQixVQUFVLENBQ3hCLElBQVksRUFDWixZQUFvQixFQUNwQixLQUFhLEVBQ2IsT0FBZ0I7SUFFaEIsTUFBTSxlQUFlLEdBQUcsNEJBQW9CLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBRTFELE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUMvQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDOUQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3BELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7SUFDbEMsSUFBSSxDQUFDLFVBQVU7UUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUM7SUFFMUYsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxJQUFJLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRTtRQUMxQyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7WUFDbEIsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztTQUM1RDthQUFNO1lBQ0wsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENB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VUFBVSxFQUFFLDBCQUFrQixDQUFDLEtBQUssQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLFlBQVksRUFDL0YsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUNiLE9BQU8sQ0FDUixDQUFDO1FBQ0YsTUFBTSxPQUFPLEdBQ1gsZ0JBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxxQkFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLG1CQUFRLENBQUMsS0FBSztZQUN2RCxDQUFDLENBQUMsa0JBQVUsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDO1lBQ25DLENBQUMsQ0FBQyw0QkFBb0IsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDbEQsT0FBTztZQUNMLEdBQUcsT0FBTztZQUNWLEtBQUs7WUFDTCxLQUFLO1lBQ0wsS0FBSztTQUNOLENBQUM7S0FDSDtBQUNILENBQUM7QUFwQ0QsOENBb0NDO0FBRUQsU0FBZ0IsWUFBWSxDQUMxQixjQUE4QixFQUM5QixnQkFBNkIsRUFDN0IsZ0JBQXlCLEVBQ3pCLE9BQWdCO0lBRWhCLE9BQU8sZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBMEIsRUFBRTtRQUMzRCxJQUFJLHFCQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckMsT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ2xELElBQUksRUFBRSxjQUFjO2dCQUNwQixLQUFLLEVBQUUsNEJBQW9CLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLEVBQUUsQ0FBQzthQUNSLENBQUMsQ0FBQztTQUNKO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM3QyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFoQkQsb0NBZ0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQklQMzJJbnRlcmZhY2UgfSBmcm9tICdiaXAzMic7XG5pbXBvcnQgKiBhcyBub2JsZSBmcm9tICdAbm9ibGUvc2VjcDI1NmsxJztcbmltcG9ydCAqIGFzIHV0eG9saWIgZnJvbSAnLi4nO1xuaW1wb3J0IHsgZ2V0TWFpbm5ldCwgTmV0d29yaywgbmV0d29ya3MgfSBmcm9tICcuLi9uZXR3b3Jrcyc7XG5cbmltcG9ydCB7XG4gIENoYWluQ29kZSxcbiAgY3JlYXRlUHNidEZvck5ldHdvcmssXG4gIGZyb21PdXRwdXQsXG4gIGZyb21PdXRwdXRXaXRoUHJldlR4LFxuICBnZXRFeHRlcm5hbENoYWluQ29kZSxcbiAgaXNTZWd3aXQsXG4gIE5vbldpdG5lc3NXYWxsZXRVbnNwZW50LFxuICBvdXRwdXRTY3JpcHRzLFxuICBSb290V2FsbGV0S2V5cyxcbiAgc2NyaXB0VHlwZUZvckNoYWluLFxuICBVbnNwZW50LFxuICBVbnNwZW50V2l0aFByZXZUeCxcbiAgVXR4b1RyYW5zYWN0aW9uLFxuICBXYWxsZXRVbnNwZW50LFxufSBmcm9tICcuLi9iaXRnbyc7XG5pbXBvcnQgeyBmcm9tT3V0cHV0U2NyaXB0IH0gZnJvbSAnLi4vYWRkcmVzcyc7XG5pbXBvcnQgeyBjcmVhdGVPdXRwdXRTY3JpcHQyb2YzLCBjcmVhdGVPdXRwdXRTY3JpcHRQMnNoUDJwayB9IGZyb20gJy4uL2JpdGdvL291dHB1dFNjcmlwdHMnO1xuXG5pbXBvcnQgeyBnZXREZWZhdWx0V2FsbGV0S2V5cywgZ2V0S2V5IH0gZnJvbSAnLi9rZXlzJztcblxuZXhwb3J0IHR5cGUgSW5wdXRUeXBlID0gb3V0cHV0U2NyaXB0cy5TY3JpcHRUeXBlMk9mMztcblxuZXhwb3J0IGZ1bmN0aW9uIG1vY2tQcmV2VHgoXG4gIHZvdXQ6IG51bWJlcixcbiAgb3V0cHV0U2NyaXB0OiBCdWZmZXIsXG4gIHZhbHVlOiBiaWdpbnQsXG4gIG5ldHdvcms6IE5ldHdvcmtcbik6IFV0eG9UcmFuc2FjdGlvbjxiaWdpbnQ+IHtcbiAgY29uc3QgcHNidEZyb21OZXR3b3JrID0gY3JlYXRlUHNidEZvck5ldHdvcmsoeyBuZXR3b3JrIH0pO1xuXG4gIGNvbnN0IHByaXZLZXkgPSBub2JsZS51dGlscy5yYW5kb21Qcml2YXRlS2V5KCk7XG4gIGNvbnN0IHB1YmtleSA9IEJ1ZmZlci5mcm9tKG5vYmxlLmdldFB1YmxpY0tleShwcml2S2V5LCB0cnVlKSk7XG4gIGNvbnN0IHBheW1lbnQgPSB1dHhvbGliLnBheW1lbnRzLnAyd3BraCh7IHB1YmtleSB9KTtcbiAgY29uc3QgZGVzdE91dHB1dCA9IHBheW1lbnQub3V0cHV0O1xuICBpZiAoIWRlc3RPdXRwdXQpIHRocm93IG5ldyBFcnJvcignSW1wb3NzaWJsZSwgcGF5bWVudCB3ZSBqdXN0IGNvbnN0cnVjdGVkIGhhcyBubyBvdXRwdXQnKTtcblxuICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDw9IHZvdXQ7IGluZGV4KyspIHtcbiAgICBpZiAoaW5kZXggPT09IHZvdXQpIHtcbiAgICAgIHBzYnRGcm9tTmV0d29yay5hZGRPdXRwdXQoeyBzY3JpcHQ6IG91dHB1dFNjcmlwdCwgdmFsdWUgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBzYnRGcm9tTmV0d29yay5hZGRPdXRwdXQoeyBzY3JpcHQ6IGRlc3RPdXRwdXQsIHZhbHVlIH0pO1xuICAgIH1cbiAgfVxuICBwc2J0RnJvbU5ldHdvcmsuYWRkSW5wdXQoe1xuICAgIGhhc2g6IEJ1ZmZlci5hbGxvYygzMiwgMHgwMSksXG4gICAgaW5kZXg6IDAsXG4gICAgd2l0bmVzc1V0eG86IHsgc2NyaXB0OiBkZXN0T3V0cHV0LCB2YWx1ZTogdmFsdWUgKiAoQmlnSW50KHZvdXQpICsgQmlnSW50KDEpKSArIEJpZ0ludCgxMDAwKSB9LFxuICB9KTtcbiAgcHNidEZyb21OZXR3b3JrLnNpZ25JbnB1dCgwLCB7XG4gICAgcHVibGljS2V5OiBwdWJrZXksXG4gICAgc2lnbjogKGhhc2g6IEJ1ZmZlciwgbG93Uj86IGJvb2xlYW4pID0+XG4gICAgICBCdWZmZXIuZnJvbShub2JsZS5zaWduU3luYyhoYXNoLCBwcml2S2V5LCB7IGNhbm9uaWNhbDogIWxvd1IsIGRlcjogZmFsc2UgfSkpLFxuICB9KTtcbiAgcHNidEZyb21OZXR3b3JrLnZhbGlkYXRlU2lnbmF0dXJlc09mQWxsSW5wdXRzKCk7XG4gIHBzYnRGcm9tTmV0d29yay5maW5hbGl6ZUFsbElucHV0cygpO1xuICByZXR1cm4gcHNidEZyb21OZXR3b3JrLmV4dHJhY3RUcmFuc2FjdGlvbigpIGFzIFV0eG9UcmFuc2FjdGlvbjxiaWdpbnQ+O1xufVxuXG5leHBvcnQgY29uc3QgcmVwbGF5UHJvdGVjdGlvbktleVBhaXIgPSBnZXRLZXkoJ3JlcGxheS1wcm90ZWN0aW9uJyk7XG5jb25zdCByZXBsYXlQcm90ZWN0aW9uU2NyaXB0UHViS2V5ID0gY3JlYXRlT3V0cHV0U2NyaXB0UDJzaFAycGsocmVwbGF5UHJvdGVjdGlvbktleVBhaXIucHVibGljS2V5KS5zY3JpcHRQdWJLZXk7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1JlcGxheVByb3RlY3Rpb25VbnNwZW50PFROdW1iZXIgZXh0ZW5kcyBiaWdpbnQgfCBudW1iZXI+KFxuICB1OiBVbnNwZW50PFROdW1iZXI+LFxuICBuZXR3b3JrOiBOZXR3b3JrXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIHUuYWRkcmVzcyA9PT0gZnJvbU91dHB1dFNjcmlwdChyZXBsYXlQcm90ZWN0aW9uU2NyaXB0UHViS2V5LCBuZXR3b3JrKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vY2tSZXBsYXlQcm90ZWN0aW9uVW5zcGVudDxUTnVtYmVyIGV4dGVuZHMgbnVtYmVyIHwgYmlnaW50PihcbiAgbmV0d29yazogTmV0d29yayxcbiAgdmFsdWU6IFROdW1iZXIsXG4gIHsga2V5ID0gcmVwbGF5UHJvdGVjdGlvbktleVBhaXIsIHZvdXQgPSAwIH06IHsga2V5PzogQklQMzJJbnRlcmZhY2U7IHZvdXQ/OiBudW1iZXIgfSA9IHt9XG4pOiBVbnNwZW50V2l0aFByZXZUeDxUTnVtYmVyPiB7XG4gIGNvbnN0IG91dHB1dFNjcmlwdCA9IGNyZWF0ZU91dHB1dFNjcmlwdFAyc2hQMnBrKGtleS5wdWJsaWNLZXkpLnNjcmlwdFB1YktleTtcbiAgY29uc3QgcHJldlRyYW5zYWN0aW9uID0gbW9ja1ByZXZUeCh2b3V0LCBvdXRwdXRTY3JpcHQsIEJpZ0ludCh2YWx1ZSksIG5ldHdvcmspO1xuICByZXR1cm4geyAuLi5mcm9tT3V0cHV0V2l0aFByZXZUeChwcmV2VHJhbnNhY3Rpb24sIHZvdXQpLCB2YWx1ZSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW9ja1dhbGxldFVuc3BlbnQ8VE51bWJlciBleHRlbmRzIG51bWJlciB8IGJpZ2ludD4oXG4gIG5ldHdvcms6IE5ldHdvcmssXG4gIHZhbHVlOiBUTnVtYmVyLFxuICB7XG4gICAgY2hhaW4gPSAwLFxuICAgIGluZGV4ID0gMCxcbiAgICBrZXlzID0gZ2V0RGVmYXVsdFdhbGxldEtleXMoKSxcbiAgICB2b3V0ID0gMCxcbiAgICBpZCxcbiAgfTogeyBjaGFpbj86IENoYWluQ29kZTsgaW5kZXg/OiBudW1iZXI7IGtleXM/OiBSb290V2FsbGV0S2V5czsgdm91dD86IG51bWJlcjsgaWQ/OiBzdHJpbmcgfSA9IHt9XG4pOiBXYWxsZXRVbnNwZW50PFROdW1iZXI+IHwgTm9uV2l0bmVzc1dhbGxldFVuc3BlbnQ8VE51bWJlcj4ge1xuICBjb25zdCBkZXJpdmVkS2V5cyA9IGtleXMuZGVyaXZlRm9yQ2hhaW5BbmRJbmRleChjaGFpbiwgaW5kZXgpO1xuICBjb25zdCBhZGRyZXNzID0gZnJvbU91dHB1dFNjcmlwdChcbiAgICBjcmVhdGVPdXRwdXRTY3JpcHQyb2YzKGRlcml2ZWRLZXlzLnB1YmxpY0tleXMsIHNjcmlwdFR5cGVGb3JDaGFpbihjaGFpbikpLnNjcmlwdFB1YktleSxcbiAgICBuZXR3b3JrXG4gICk7XG4gIGlmIChpZCAmJiB0eXBlb2YgaWQgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHsgaWQsIGFkZHJlc3MsIGNoYWluLCBpbmRleCwgdmFsdWUgfTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwcmV2VHJhbnNhY3Rpb24gPSBtb2NrUHJldlR4KFxuICAgICAgdm91dCxcbiAgICAgIGNyZWF0ZU91dHB1dFNjcmlwdDJvZjMoZGVyaXZlZEtleXMucHVibGljS2V5cywgc2NyaXB0VHlwZUZvckNoYWluKGNoYWluKSwgbmV0d29yaykuc2NyaXB0UHViS2V5LFxuICAgICAgQmlnSW50KHZhbHVlKSxcbiAgICAgIG5ldHdvcmtcbiAgICApO1xuICAgIGNvbnN0IHVuc3BlbnQgPVxuICAgICAgaXNTZWd3aXQoY2hhaW4pIHx8IGdldE1haW5uZXQobmV0d29yaykgPT09IG5ldHdvcmtzLnpjYXNoXG4gICAgICAgID8gZnJvbU91dHB1dChwcmV2VHJhbnNhY3Rpb24sIHZvdXQpXG4gICAgICAgIDogZnJvbU91dHB1dFdpdGhQcmV2VHgocHJldlRyYW5zYWN0aW9uLCB2b3V0KTtcbiAgICByZXR1cm4ge1xuICAgICAgLi4udW5zcGVudCxcbiAgICAgIGNoYWluLFxuICAgICAgaW5kZXgsXG4gICAgICB2YWx1ZSxcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb2NrVW5zcGVudHM8VE51bWJlciBleHRlbmRzIG51bWJlciB8IGJpZ2ludD4oXG4gIHJvb3RXYWxsZXRLZXlzOiBSb290V2FsbGV0S2V5cyxcbiAgaW5wdXRTY3JpcHRUeXBlczogSW5wdXRUeXBlW10sXG4gIHRlc3RPdXRwdXRBbW91bnQ6IFROdW1iZXIsXG4gIG5ldHdvcms6IE5ldHdvcmtcbik6IFdhbGxldFVuc3BlbnQ8VE51bWJlcj5bXSB7XG4gIHJldHVybiBpbnB1dFNjcmlwdFR5cGVzLm1hcCgodCwgaSk6IFdhbGxldFVuc3BlbnQ8VE51bWJlcj4gPT4ge1xuICAgIGlmIChvdXRwdXRTY3JpcHRzLmlzU2NyaXB0VHlwZTJPZjModCkpIHtcbiAgICAgIHJldHVybiBtb2NrV2FsbGV0VW5zcGVudChuZXR3b3JrLCB0ZXN0T3V0cHV0QW1vdW50LCB7XG4gICAgICAgIGtleXM6IHJvb3RXYWxsZXRLZXlzLFxuICAgICAgICBjaGFpbjogZ2V0RXh0ZXJuYWxDaGFpbkNvZGUodCksXG4gICAgICAgIHZvdXQ6IGksXG4gICAgICB9KTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIGlucHV0IHR5cGUgJHt0fWApO1xuICB9KTtcbn1cbiJdfQ==