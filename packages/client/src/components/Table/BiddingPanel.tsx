import { CONTRACT_LADDER, DEFAULT_BID_FLOOR_RANK, SUB_METHODS, getContract } from "@whist/shared";
import { useGame } from "../../state/GameStateProvider.js";

export default function BiddingPanel() {
  const { state, actions } = useGame();
  if (state.phase !== "bidding") return null;

  const myTurn = state.mySeat !== null && state.mySeat === state.biddingTurnSeat;
  const highRank = state.highBid ? getContract(state.highBid.contractCode as any).ladderRank : (state.bidFloorRank ?? DEFAULT_BID_FLOOR_RANK) - 1;

  return (
    <div className="panel">
      <h3>Bidding</h3>
      <p>
        {state.highBid
          ? `High bid: seat ${state.highBid.seat + 1} — ${getContract(state.highBid.contractCode as any).displayName}${
              state.highBid.subMethod ? ` (${SUB_METHODS.find((s) => s.code === state.highBid!.subMethod)?.displayName})` : ""
            }`
          : "No bids yet"}
      </p>
      <ul className="bid-log">
        {state.bids.map((b, i) => (
          <li key={i}>
            Seat {b.seat + 1}:{" "}
            {b.isPass
              ? "pass"
              : `${getContract(b.contractCode as any).displayName}${
                  b.subMethod ? ` (${SUB_METHODS.find((s) => s.code === b.subMethod)?.displayName})` : ""
                }`}
          </li>
        ))}
      </ul>
      {myTurn && (
        <div className="bid-options">
          {/* Same tier as the current high bid, but a different sub-method — no order among sans/half/tip/strong, so this is always a legal re-bid. */}
          {state.highBid &&
            (() => {
              const currentContract = getContract(state.highBid.contractCode as any);
              if (currentContract.trumpMode !== "submethod_only") return null;
              return (
                <div className="bid-tier-group">
                  <span className="bid-tier-label">{currentContract.displayName} (any other sub-method beats it):</span>
                  {SUB_METHODS.filter((s) => s.code !== state.highBid!.subMethod).map((s) => (
                    <button key={s.code} onClick={() => actions.placeBid(currentContract.code, s.code)}>
                      {s.displayName}
                    </button>
                  ))}
                </div>
              );
            })()}

          {CONTRACT_LADDER.filter((c) => c.ladderRank > highRank).map((c) =>
            c.trumpMode === "submethod_only" ? (
              <div key={c.code} className="bid-tier-group">
                <span className="bid-tier-label">
                  {c.displayName} ({c.pointValue}):
                </span>
                {SUB_METHODS.map((s) => (
                  <button key={s.code} onClick={() => actions.placeBid(c.code, s.code)}>
                    {s.displayName}
                  </button>
                ))}
              </div>
            ) : (
              <button key={c.code} onClick={() => actions.placeBid(c.code)}>
                {c.displayName} ({c.pointValue})
              </button>
            )
          )}
          <button className="pass" onClick={() => actions.placeBid(null)}>
            Pass
          </button>
        </div>
      )}
    </div>
  );
}
