import { useState } from "react";
import { useGame } from "../../state/GameStateProvider.js";
import { formatCard } from "../../cardDisplay.js";

export default function KittyExchangeModal() {
  const { state, actions } = useGame();
  const [selected, setSelected] = useState<string[]>([]);

  if (state.phase !== "kitty_exchange") return null;

  const amPerformer = state.mySeat !== null && state.mySeat === state.kittyAwaitingSeat;
  const hiddenCount = 3 - state.tipReveals.length;

  if (!amPerformer) {
    return (
      <div className="panel">
        <h3>Kitty exchange</h3>
        <p>Waiting on seat {(state.kittyAwaitingSeat ?? 0) + 1} to decide whether to exchange with the kitty.</p>
      </div>
    );
  }

  function toggle(card: string) {
    setSelected((prev) => (prev.includes(card) ? prev.filter((c) => c !== card) : [...prev, card]));
  }

  return (
    <div className="panel">
      <h3>Kitty exchange</h3>
      <p>
        The kitty is hidden — {hiddenCount} card{hiddenCount === 1 ? "" : "s"} unseen
        {state.tipReveals.length > 0 && (
          <>
            {" "}
            (already seen during the trump search:{" "}
            {state.tipReveals.map((r) => formatCard(r.card).label).join(" ")})
          </>
        )}
        .
      </p>
      <p>Pick exactly 3 cards from your hand to swap for the kitty blind, or decline (all-or-none).</p>
      <div className="hand-of-cards">
        {state.myCards.map((code) => (
          <button
            key={code}
            className={"playing-card" + (selected.includes(code) ? " selected" : "")}
            onClick={() => toggle(code)}
          >
            {formatCard(code).label}
          </button>
        ))}
      </div>
      <div className="actions">
        <button disabled={selected.length !== 3} onClick={() => actions.performKittyExchange(selected)}>
          Exchange these 3
        </button>
        <button onClick={() => actions.performKittyExchange(null)}>Keep my hand</button>
      </div>
    </div>
  );
}
