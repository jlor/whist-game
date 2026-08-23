import { useState } from "react";
import { useGame } from "../../state/GameStateProvider.js";
import { formatCard } from "../../cardDisplay.js";
import type { TrickCardEntry } from "../../state/gameReducer.js";

function TrickCardsGrid({ cards }: { cards: TrickCardEntry[] }) {
  return (
    <div className="trick-cards">
      {[0, 1, 2, 3].map((seat) => {
        const play = cards.find((p) => p.seat === seat);
        const formatted = play ? formatCard(play.card) : null;
        return (
          <div key={seat} className="trick-slot">
            <div className="seat-label">Seat {seat + 1}</div>
            {formatted ? (
              <span className="playing-card" style={{ color: formatted.color }}>
                {formatted.label}
              </span>
            ) : (
              <span className="empty-slot" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function TrickArea() {
  const { state } = useGame();
  const [showLastTrick, setShowLastTrick] = useState(false);
  if (state.phase !== "play") return null;

  return (
    <div className="trick-area">
      <h3>Current trick</h3>
      <TrickCardsGrid cards={state.currentTrick} />
      {state.lastTrickWinner && (
        <p>
          Trick {state.lastTrickWinner.trickNumber} won by seat {state.lastTrickWinner.winnerSeat + 1}
        </p>
      )}

      {state.lastCompletedTrick.length > 0 && (
        <div className="last-trick">
          <button onClick={() => setShowLastTrick((v) => !v)}>
            {showLastTrick ? "Hide" : "Show"} last trick
          </button>
          {showLastTrick && <TrickCardsGrid cards={state.lastCompletedTrick} />}
        </div>
      )}
    </div>
  );
}
