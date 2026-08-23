import { useState } from "react";
import { SUITS, type Suit } from "@whist/shared";
import { useGame } from "../../state/GameStateProvider.js";
import { formatCard } from "../../cardDisplay.js";

export default function TrumpTipRevealPanel() {
  const { state, actions } = useGame();
  const [suit, setSuit] = useState<Suit>("clubs");

  if (state.phase !== "trump_resolution") return null;

  return (
    <div className="panel">
      <h3>Choosing trump</h3>
      {state.tipReveals.length > 0 && (
        <p>
          Revealed:{" "}
          {state.tipReveals.map((r) => (
            <span key={r.index} className="mini-card">
              {formatCard(r.card).label}
            </span>
          ))}
        </p>
      )}

      {state.awaitingTipStop && (
        <div className="actions">
          <button onClick={() => actions.revealNextTipCard()}>Flip next kitty card</button>
          <button
            disabled={state.tipReveals.length === 0 || state.tipReveals[state.tipReveals.length - 1].card.startsWith("JOKER")}
            onClick={() => actions.stopTipReveal()}
          >
            Stop here — use this suit
          </button>
        </div>
      )}

      {state.awaitingTrumpChoice && (
        <div className="actions">
          <select value={suit} onChange={(e) => setSuit(e.target.value as Suit)}>
            {SUITS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button onClick={() => actions.choosePartnerTrump(suit)}>Choose trump</button>
        </div>
      )}

      {!state.awaitingTipStop && !state.awaitingTrumpChoice && <p>Waiting…</p>}
    </div>
  );
}
