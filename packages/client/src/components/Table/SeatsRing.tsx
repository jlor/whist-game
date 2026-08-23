import { useGame } from "../../state/GameStateProvider.js";

export default function SeatsRing() {
  const { state, actions } = useGame();

  return (
    <div className="seats-ring">
      {state.seats.map((occupant, seatIndex) => (
        <div
          key={seatIndex}
          className={
            "seat" +
            (seatIndex === state.mySeat ? " seat-mine" : "") +
            (seatIndex === state.dealerSeat ? " seat-dealer" : "") +
            (seatIndex === state.biddingTurnSeat || seatIndex === state.playTurnSeat ? " seat-turn" : "")
          }
        >
          {occupant ? (
            <span>{occupant.displayName}</span>
          ) : state.tableStatus === "lobby" ? (
            <button onClick={() => actions.takeSeat(seatIndex)}>Sit here</button>
          ) : (
            <span className="empty">empty</span>
          )}
          {occupant && seatIndex === state.mySeat && state.tableStatus === "lobby" && (
            <button onClick={() => actions.leaveSeat()}>Stand up</button>
          )}
          {seatIndex === state.dealerSeat && <span className="badge">dealer</span>}
          {seatIndex === state.declarerSeat && <span className="badge">declarer</span>}
          {seatIndex === state.partnerSeat && <span className="badge">partner</span>}
        </div>
      ))}
    </div>
  );
}
