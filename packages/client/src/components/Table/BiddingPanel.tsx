import { CONTRACT_LADDER, DEFAULT_BID_FLOOR_RANK, getContract } from "@whist/shared";
import { useGame } from "../../state/GameStateProvider.js";

export default function BiddingPanel() {
  const { state, actions } = useGame();
  if (state.phase !== "bidding") return null;

  const myTurn = state.mySeat !== null && state.mySeat === state.biddingTurnSeat;
  const highRank = state.highBid ? getContract(state.highBid.contractCode as any).ladderRank : DEFAULT_BID_FLOOR_RANK - 1;

  return (
    <div className="panel">
      <h3>Bidding</h3>
      <p>
        {state.highBid
          ? `High bid: seat ${state.highBid.seat + 1} — ${getContract(state.highBid.contractCode as any).displayName}`
          : "No bids yet"}
      </p>
      <ul className="bid-log">
        {state.bids.map((b, i) => (
          <li key={i}>
            Seat {b.seat + 1}: {b.isPass ? "pass" : getContract(b.contractCode as any).displayName}
          </li>
        ))}
      </ul>
      {myTurn && (
        <div className="bid-options">
          {CONTRACT_LADDER.filter((c) => c.ladderRank > highRank).map((c) => (
            <button key={c.code} onClick={() => actions.placeBid(c.code)}>
              {c.displayName} ({c.pointValue})
            </button>
          ))}
          <button className="pass" onClick={() => actions.placeBid(null)}>
            Pass
          </button>
        </div>
      )}
    </div>
  );
}
