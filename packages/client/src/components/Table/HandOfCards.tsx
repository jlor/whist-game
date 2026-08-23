import { useGame } from "../../state/GameStateProvider.js";
import { formatCard } from "../../cardDisplay.js";

export default function HandOfCards() {
  const { state, actions } = useGame();
  const legal = new Set(state.legalPlays ?? []);

  return (
    <div className="hand-of-cards">
      {state.myCards.map((code) => {
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
