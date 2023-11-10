"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsign = exports.getInputUpdate = void 0;
const __1 = require("../..");
const parseInput_1 = require("../parseInput");
const signature_1 = require("../signature");
const outputScripts_1 = require("../outputScripts");
function omitUndefined(v) {
    return Object.fromEntries(Object.entries(v).filter(([k, v]) => v !== undefined));
}
function getInputUpdate(tx, vin, prevOuts) {
    const nonWitnessUtxo = prevOuts[vin].prevTx;
    const { script, witness } = tx.ins[vin];
    if (script.length === 0 && witness.length === 0) {
        return nonWitnessUtxo ? { nonWitnessUtxo } : {};
    }
    const parsedInput = parseInput_1.parseSignatureScript(tx.ins[vin]);
    function getPartialSigs() {
        return signature_1.getSignaturesWithPublicKeys(tx, vin, prevOuts, parsedInput.publicKeys).flatMap((signature, i) => signature
            ? [
                {
                    pubkey: parsedInput.publicKeys[i],
                    signature,
                },
            ]
            : []);
    }
    // Because Zcash directly hashes the value for non-segwit transactions, we do not need to check indirectly
    // with the previous transaction. Therefore, we can treat Zcash non-segwit transactions as Bitcoin
    // segwit transactions
    if (!outputScripts_1.hasWitnessData(parsedInput.scriptType) && !nonWitnessUtxo && __1.getMainnet(tx.network) !== __1.networks.zcash) {
        throw new Error(`scriptType ${parsedInput.scriptType} requires prevTx Buffer`);
    }
    switch (parsedInput.scriptType) {
        case 'p2shP2pk':
            return {
                nonWitnessUtxo,
                partialSig: [{ pubkey: parsedInput.publicKeys[0], signature: parsedInput.signatures[0] }],
            };
        case 'p2sh':
        case 'p2wsh':
        case 'p2shP2wsh':
            return omitUndefined({
                nonWitnessUtxo,
                partialSig: getPartialSigs(),
                redeemScript: parsedInput.redeemScript,
                witnessScript: parsedInput.witnessScript,
            });
        case 'p2tr':
            if (!('controlBlock' in parsedInput)) {
                throw new Error(`keypath not implemented`);
            }
            const leafHash = __1.taproot.getTapleafHash(__1.ecc, parsedInput.controlBlock, parsedInput.pubScript);
            return {
                tapLeafScript: [
                    {
                        controlBlock: parsedInput.controlBlock,
                        script: parsedInput.pubScript,
                        leafVersion: parsedInput.leafVersion,
                    },
                ],
                tapScriptSig: getPartialSigs().map((obj) => ({ ...obj, leafHash })),
            };
    }
}
exports.getInputUpdate = getInputUpdate;
/**
 * Takes a partially signed transaction and removes the scripts and signatures.
 *
 * Inputs must be one of:
 *  - p2shP2pk
 *  - p2sh 2-of-3
 *  - p2shP2wsh 2-of-3
 *  - p2wsh 2-of-3
 *  - p2tr script path 2-of-2
 *
 * @param tx the partially signed transaction
 * @param prevOuts
 *
 * @return the removed scripts and signatures, ready to be added to a PSBT
 */
function unsign(tx, prevOuts) {
    return tx.ins.map((input, vin) => {
        const update = getInputUpdate(tx, vin, prevOuts);
        input.witness = [];
        input.script = Buffer.alloc(0);
        return update;
    });
}
exports.unsign = unsign;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbUhhbGZTaWduZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvYml0Z28vcHNidC9mcm9tSGFsZlNpZ25lZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw2QkFBK0U7QUFFL0UsOENBQXFEO0FBQ3JELDRDQUEyRDtBQUMzRCxvREFBa0Q7QUFFbEQsU0FBUyxhQUFhLENBQW9DLENBQTBCO0lBQ2xGLE9BQU8sTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQU0sQ0FBQztBQUN4RixDQUFDO0FBRUQsU0FBZ0IsY0FBYyxDQUM1QixFQUEyQixFQUMzQixHQUFXLEVBQ1gsUUFBb0Q7SUFFcEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUM1QyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtRQUMvQyxPQUFPLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0tBQ2pEO0lBRUQsTUFBTSxXQUFXLEdBQUcsaUNBQW9CLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBRXRELFNBQVMsY0FBYztRQUNyQixPQUFPLHVDQUEyQixDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FDckcsU0FBUztZQUNQLENBQUMsQ0FBQztnQkFDRTtvQkFDRSxNQUFNLEVBQUUsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQ2pDLFNBQVM7aUJBQ1Y7YUFDRjtZQUNILENBQUMsQ0FBQyxFQUFFLENBQ1AsQ0FBQztJQUNKLENBQUM7SUFDRCwwR0FBMEc7SUFDMUcsa0dBQWtHO0lBQ2xHLHNCQUFzQjtJQUN0QixJQUFJLENBQUMsOEJBQWMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksY0FBVSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxZQUFRLENBQUMsS0FBSyxFQUFFO1FBQzNHLE1BQU0sSUFBSSxLQUFLLENBQUMsY0FBYyxXQUFXLENBQUMsVUFBVSx5QkFBeUIsQ0FBQyxDQUFDO0tBQ2hGO0lBRUQsUUFBUSxXQUFXLENBQUMsVUFBVSxFQUFFO1FBQzlCLEtBQUssVUFBVTtZQUNiLE9BQU87Z0JBQ0wsY0FBYztnQkFDZCxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDMUYsQ0FBQztRQUNKLEtBQUssTUFBTSxDQUFDO1FBQ1osS0FBSyxPQUFPLENBQUM7UUFDYixLQUFLLFdBQVc7WUFDZCxPQUFPLGFBQWEsQ0FBQztnQkFDbkIsY0FBYztnQkFDZCxVQUFVLEVBQUUsY0FBYyxFQUFFO2dCQUM1QixZQUFZLEVBQUUsV0FBVyxDQUFDLFlBQVk7Z0JBQ3RDLGFBQWEsRUFBRSxXQUFXLENBQUMsYUFBYTthQUN6QyxDQUFDLENBQUM7UUFDTCxLQUFLLE1BQU07WUFDVCxJQUFJLENBQUMsQ0FBQyxjQUFjLElBQUksV0FBVyxDQUFDLEVBQUU7Z0JBQ3BDLE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQzthQUM1QztZQUNELE1BQU0sUUFBUSxHQUFHLFdBQU8sQ0FBQyxjQUFjLENBQUMsT0FBTSxFQUFFLFdBQVcsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pHLE9BQU87Z0JBQ0wsYUFBYSxFQUFFO29CQUNiO3dCQUNFLFlBQVksRUFBRSxXQUFXLENBQUMsWUFBWTt3QkFDdEMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxTQUFTO3dCQUM3QixXQUFXLEVBQUUsV0FBVyxDQUFDLFdBQVc7cUJBQ3JDO2lCQUNGO2dCQUNELFlBQVksRUFBRSxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEdBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO2FBQ3BFLENBQUM7S0FDTDtBQUNILENBQUM7QUEvREQsd0NBK0RDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxTQUFnQixNQUFNLENBQUMsRUFBMkIsRUFBRSxRQUE0QjtJQUM5RSxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQy9CLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pELEtBQUssQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ25CLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMvQixPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFQRCx3QkFPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBzYnRJbnB1dFVwZGF0ZSwgUGFydGlhbFNpZyB9IGZyb20gJ2JpcDE3NC9zcmMvbGliL2ludGVyZmFjZXMnO1xuaW1wb3J0IHsgZWNjIGFzIGVjY0xpYiwgVHhPdXRwdXQsIHRhcHJvb3QsIGdldE1haW5uZXQsIG5ldHdvcmtzIH0gZnJvbSAnLi4vLi4nO1xuaW1wb3J0IHsgVXR4b1RyYW5zYWN0aW9uIH0gZnJvbSAnLi4vVXR4b1RyYW5zYWN0aW9uJztcbmltcG9ydCB7IHBhcnNlU2lnbmF0dXJlU2NyaXB0IH0gZnJvbSAnLi4vcGFyc2VJbnB1dCc7XG5pbXBvcnQgeyBnZXRTaWduYXR1cmVzV2l0aFB1YmxpY0tleXMgfSBmcm9tICcuLi9zaWduYXR1cmUnO1xuaW1wb3J0IHsgaGFzV2l0bmVzc0RhdGEgfSBmcm9tICcuLi9vdXRwdXRTY3JpcHRzJztcblxuZnVuY3Rpb24gb21pdFVuZGVmaW5lZDxUIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4+KHY6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogVCB7XG4gIHJldHVybiBPYmplY3QuZnJvbUVudHJpZXMoT2JqZWN0LmVudHJpZXModikuZmlsdGVyKChbaywgdl0pID0+IHYgIT09IHVuZGVmaW5lZCkpIGFzIFQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRJbnB1dFVwZGF0ZShcbiAgdHg6IFV0eG9UcmFuc2FjdGlvbjxiaWdpbnQ+LFxuICB2aW46IG51bWJlcixcbiAgcHJldk91dHM6IChUeE91dHB1dDxiaWdpbnQ+ICYgeyBwcmV2VHg/OiBCdWZmZXIgfSlbXVxuKTogUHNidElucHV0VXBkYXRlIHtcbiAgY29uc3Qgbm9uV2l0bmVzc1V0eG8gPSBwcmV2T3V0c1t2aW5dLnByZXZUeDtcbiAgY29uc3QgeyBzY3JpcHQsIHdpdG5lc3MgfSA9IHR4Lmluc1t2aW5dO1xuICBpZiAoc2NyaXB0Lmxlbmd0aCA9PT0gMCAmJiB3aXRuZXNzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBub25XaXRuZXNzVXR4byA/IHsgbm9uV2l0bmVzc1V0eG8gfSA6IHt9O1xuICB9XG5cbiAgY29uc3QgcGFyc2VkSW5wdXQgPSBwYXJzZVNpZ25hdHVyZVNjcmlwdCh0eC5pbnNbdmluXSk7XG5cbiAgZnVuY3Rpb24gZ2V0UGFydGlhbFNpZ3MoKTogUGFydGlhbFNpZ1tdIHtcbiAgICByZXR1cm4gZ2V0U2lnbmF0dXJlc1dpdGhQdWJsaWNLZXlzKHR4LCB2aW4sIHByZXZPdXRzLCBwYXJzZWRJbnB1dC5wdWJsaWNLZXlzKS5mbGF0TWFwKChzaWduYXR1cmUsIGkpID0+XG4gICAgICBzaWduYXR1cmVcbiAgICAgICAgPyBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHB1YmtleTogcGFyc2VkSW5wdXQucHVibGljS2V5c1tpXSxcbiAgICAgICAgICAgICAgc2lnbmF0dXJlLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdXG4gICAgICAgIDogW11cbiAgICApO1xuICB9XG4gIC8vIEJlY2F1c2UgWmNhc2ggZGlyZWN0bHkgaGFzaGVzIHRoZSB2YWx1ZSBmb3Igbm9uLXNlZ3dpdCB0cmFuc2FjdGlvbnMsIHdlIGRvIG5vdCBuZWVkIHRvIGNoZWNrIGluZGlyZWN0bHlcbiAgLy8gd2l0aCB0aGUgcHJldmlvdXMgdHJhbnNhY3Rpb24uIFRoZXJlZm9yZSwgd2UgY2FuIHRyZWF0IFpjYXNoIG5vbi1zZWd3aXQgdHJhbnNhY3Rpb25zIGFzIEJpdGNvaW5cbiAgLy8gc2Vnd2l0IHRyYW5zYWN0aW9uc1xuICBpZiAoIWhhc1dpdG5lc3NEYXRhKHBhcnNlZElucHV0LnNjcmlwdFR5cGUpICYmICFub25XaXRuZXNzVXR4byAmJiBnZXRNYWlubmV0KHR4Lm5ldHdvcmspICE9PSBuZXR3b3Jrcy56Y2FzaCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgc2NyaXB0VHlwZSAke3BhcnNlZElucHV0LnNjcmlwdFR5cGV9IHJlcXVpcmVzIHByZXZUeCBCdWZmZXJgKTtcbiAgfVxuXG4gIHN3aXRjaCAocGFyc2VkSW5wdXQuc2NyaXB0VHlwZSkge1xuICAgIGNhc2UgJ3Ayc2hQMnBrJzpcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG5vbldpdG5lc3NVdHhvLFxuICAgICAgICBwYXJ0aWFsU2lnOiBbeyBwdWJrZXk6IHBhcnNlZElucHV0LnB1YmxpY0tleXNbMF0sIHNpZ25hdHVyZTogcGFyc2VkSW5wdXQuc2lnbmF0dXJlc1swXSB9XSxcbiAgICAgIH07XG4gICAgY2FzZSAncDJzaCc6XG4gICAgY2FzZSAncDJ3c2gnOlxuICAgIGNhc2UgJ3Ayc2hQMndzaCc6XG4gICAgICByZXR1cm4gb21pdFVuZGVmaW5lZCh7XG4gICAgICAgIG5vbldpdG5lc3NVdHhvLFxuICAgICAgICBwYXJ0aWFsU2lnOiBnZXRQYXJ0aWFsU2lncygpLFxuICAgICAgICByZWRlZW1TY3JpcHQ6IHBhcnNlZElucHV0LnJlZGVlbVNjcmlwdCxcbiAgICAgICAgd2l0bmVzc1NjcmlwdDogcGFyc2VkSW5wdXQud2l0bmVzc1NjcmlwdCxcbiAgICAgIH0pO1xuICAgIGNhc2UgJ3AydHInOlxuICAgICAgaWYgKCEoJ2NvbnRyb2xCbG9jaycgaW4gcGFyc2VkSW5wdXQpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihga2V5cGF0aCBub3QgaW1wbGVtZW50ZWRgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGxlYWZIYXNoID0gdGFwcm9vdC5nZXRUYXBsZWFmSGFzaChlY2NMaWIsIHBhcnNlZElucHV0LmNvbnRyb2xCbG9jaywgcGFyc2VkSW5wdXQucHViU2NyaXB0KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRhcExlYWZTY3JpcHQ6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb250cm9sQmxvY2s6IHBhcnNlZElucHV0LmNvbnRyb2xCbG9jayxcbiAgICAgICAgICAgIHNjcmlwdDogcGFyc2VkSW5wdXQucHViU2NyaXB0LFxuICAgICAgICAgICAgbGVhZlZlcnNpb246IHBhcnNlZElucHV0LmxlYWZWZXJzaW9uLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIHRhcFNjcmlwdFNpZzogZ2V0UGFydGlhbFNpZ3MoKS5tYXAoKG9iaikgPT4gKHsgLi4ub2JqLCBsZWFmSGFzaCB9KSksXG4gICAgICB9O1xuICB9XG59XG5cbi8qKlxuICogVGFrZXMgYSBwYXJ0aWFsbHkgc2lnbmVkIHRyYW5zYWN0aW9uIGFuZCByZW1vdmVzIHRoZSBzY3JpcHRzIGFuZCBzaWduYXR1cmVzLlxuICpcbiAqIElucHV0cyBtdXN0IGJlIG9uZSBvZjpcbiAqICAtIHAyc2hQMnBrXG4gKiAgLSBwMnNoIDItb2YtM1xuICogIC0gcDJzaFAyd3NoIDItb2YtM1xuICogIC0gcDJ3c2ggMi1vZi0zXG4gKiAgLSBwMnRyIHNjcmlwdCBwYXRoIDItb2YtMlxuICpcbiAqIEBwYXJhbSB0eCB0aGUgcGFydGlhbGx5IHNpZ25lZCB0cmFuc2FjdGlvblxuICogQHBhcmFtIHByZXZPdXRzXG4gKlxuICogQHJldHVybiB0aGUgcmVtb3ZlZCBzY3JpcHRzIGFuZCBzaWduYXR1cmVzLCByZWFkeSB0byBiZSBhZGRlZCB0byBhIFBTQlRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVuc2lnbih0eDogVXR4b1RyYW5zYWN0aW9uPGJpZ2ludD4sIHByZXZPdXRzOiBUeE91dHB1dDxiaWdpbnQ+W10pOiBQc2J0SW5wdXRVcGRhdGVbXSB7XG4gIHJldHVybiB0eC5pbnMubWFwKChpbnB1dCwgdmluKSA9PiB7XG4gICAgY29uc3QgdXBkYXRlID0gZ2V0SW5wdXRVcGRhdGUodHgsIHZpbiwgcHJldk91dHMpO1xuICAgIGlucHV0LndpdG5lc3MgPSBbXTtcbiAgICBpbnB1dC5zY3JpcHQgPSBCdWZmZXIuYWxsb2MoMCk7XG4gICAgcmV0dXJuIHVwZGF0ZTtcbiAgfSk7XG59XG4iXX0=