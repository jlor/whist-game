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
          return (
            <div key={seat} className="trick-slot">
              <div className="seat-label">Seat {seat + 1}</div>
              {play ? <span className="playing-card">{formatCard(play.card).label}</span> : <span className="empty-slot" />}
            </div>
          );
        })}
      </div>
      {state.lastTrickWinner && (
        <p>
          Trick {state.lastTrickWinner.trickNumber} won by seat {state.lastTrickWinner.winnerSeat + 1}
        </p>
      )}
      {state.trumpSuit && <p>Trump: {state.trumpSuit}</p>}
      {!state.trumpSuit && state.phase === "play" && <p>No trump this hand</p>}
    </div>
  );
}
