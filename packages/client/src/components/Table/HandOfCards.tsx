import { useGame } from "../../state/GameStateProvider.js";
import { formatCard, sortHand } from "../../cardDisplay.js";

export default function HandOfCards() {
  const { state, actions } = useGame();
  const legal = new Set(state.legalPlays ?? []);
  const sorted = sortHand(state.myCards, state.contractCode);

  return (
    <div className="hand-of-cards">
      {sorted.map((code) => {
        const { label, color } = formatCard(code);
        const isLegal = !state.myTurnToPlay || legal.has(code);
        return (
          <button
            key={code}
            className="playing-card"
            style={{ color }}
            disabled={!state.myTurnToPlay || !legal.has(code)}
            onClick={() => actions.playCard(code)}
            title={isLegal ? "" : "not a legal play right now"}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
