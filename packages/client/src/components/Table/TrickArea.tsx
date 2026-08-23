import { useGame } from "../../state/GameStateProvider.js";
import { formatCard } from "../../cardDisplay.js";

export default function TrickArea() {
  const { state } = useGame();
  if (state.phase !== "play") return null;

  return (
    <div className="trick-area">
      <h3>Current trick</h3>
      <div className="trick-cards">
        {[0, 1, 2, 3].map((seat) => {
          const play = state.currentTrick.find((p) => p.seat === seat);
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
      {state.lastTrickWinner && (
        <p>
          Trick {state.lastTrickWinner.trickNumber} won by seat {state.lastTrickWinner.winnerSeat + 1}
        </p>
      )}
    </div>
  );
}
