import { useState } from "react";
import { getContract, SUITS, type Suit } from "@whist/shared";
import { useGame } from "../../state/GameStateProvider.js";

const SUB_METHOD_OPTIONS = [
  { code: "sans", label: "Sans — no trump, jokers top" },
  { code: "half", label: "Halv — partner picks trump" },
  { code: "tip", label: "Tip — flip the kitty for trump" },
  { code: "strong", label: "Stærke — trump is fixed to clubs" },
] as const;

export default function ContractDeclarationPanel() {
  const { state, actions } = useGame();
  const [subMethod, setSubMethod] = useState<string>("sans");
  const [trumpSuit, setTrumpSuit] = useState<Suit>("clubs");
  const [partnerRank, setPartnerRank] = useState<string>("A");
  const [partnerSuit, setPartnerSuit] = useState<Suit>("hearts");

  if (state.phase !== "declaration" || state.mySeat !== state.declarerSeat || !state.contractCode) return null;

  const contract = getContract(state.contractCode as any);

  function submit() {
    actions.declareContract({
      contractCode: state.contractCode!,
      subMethod: contract.trumpMode === "submethod_only" ? subMethod : undefined,
      trumpSuit: contract.trumpMode === "free" ? trumpSuit : undefined,
      partnerCard: contract.isSolo ? undefined : { rank: partnerRank, suit: partnerSuit },
    });
  }

  return (
    <div className="panel">
      <h3>You won the bid: {contract.displayName}</h3>

      {contract.trumpMode === "submethod_only" && (
        <label>
          Trump method
          <select value={subMethod} onChange={(e) => setSubMethod(e.target.value)}>
            {SUB_METHOD_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {contract.trumpMode === "free" && (
        <label>
          Trump suit
          <select value={trumpSuit} onChange={(e) => setTrumpSuit(e.target.value as Suit)}>
            {SUITS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}

      {!contract.isSolo && (
        <fieldset>
          <legend>Name a partner card</legend>
          <label>
            Rank
            <select value={partnerRank} onChange={(e) => setPartnerRank(e.target.value)}>
              {(state.eligiblePartnerCardRanks ?? ["A"]).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Suit
            <select value={partnerSuit} onChange={(e) => setPartnerSuit(e.target.value as Suit)}>
              {SUITS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      )}

      <button onClick={submit}>Declare</button>
    </div>
  );
}
