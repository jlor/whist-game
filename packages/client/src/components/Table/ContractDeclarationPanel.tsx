import { useState } from "react";
import { SUB_METHODS, getContract, type Suit } from "@whist/shared";
import { useGame } from "../../state/GameStateProvider.js";
import SuitPicker from "./SuitPicker.js";
import PartnerCardPicker from "./PartnerCardPicker.js";

export default function ContractDeclarationPanel() {
  const { state, actions } = useGame();
  const [trumpSuit, setTrumpSuit] = useState<Suit | null>(null);
  const [partnerCard, setPartnerCard] = useState<{ rank: string; suit: Suit } | null>(null);

  if (state.phase !== "declaration" || state.mySeat !== state.declarerSeat || !state.contractCode) return null;

  const contract = getContract(state.contractCode as any);
  const subMethodDef = state.subMethod ? SUB_METHODS.find((s) => s.code === state.subMethod) : null;
  const fixedTrumpSuit = subMethodDef?.fixedTrumpSuit as Suit | undefined;
  const canSubmit = (contract.trumpMode !== "free" || trumpSuit !== null) && (contract.isSolo || partnerCard !== null);

  function submit() {
    actions.declareContract({
      contractCode: state.contractCode!,
      trumpSuit: contract.trumpMode === "free" ? trumpSuit! : undefined,
      partnerCard: contract.isSolo ? undefined : partnerCard!,
    });
  }

  return (
    <div className="panel">
      <h3>You won the bid: {contract.displayName}</h3>
      {subMethodDef && (
        <p>
          Trump method (locked in from your bid): <strong>{subMethodDef.displayName}</strong>
          {fixedTrumpSuit && ` — trump is fixed to ${fixedTrumpSuit}`}
        </p>
      )}

      {contract.trumpMode === "free" && (
        <fieldset>
          <legend>Pick trump suit</legend>
          <SuitPicker value={trumpSuit} onChange={setTrumpSuit} />
        </fieldset>
      )}

      {!contract.isSolo && (
        <fieldset>
          <legend>Name a partner card</legend>
          <PartnerCardPicker
            eligibleRanks={state.eligiblePartnerCardRanks ?? ["A"]}
            value={partnerCard}
            onChange={setPartnerCard}
            excludeSuit={fixedTrumpSuit ?? null}
          />
        </fieldset>
      )}

      <button disabled={!canSubmit} onClick={submit}>
        Declare
      </button>
    </div>
  );
}
