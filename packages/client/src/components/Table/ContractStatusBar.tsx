import { SUB_METHODS, getContract } from "@whist/shared";
import { useGame } from "../../state/GameStateProvider.js";

function seatName(state: ReturnType<typeof useGame>["state"], seat: number | null): string {
  if (seat === null) return "?";
  return state.seats[seat]?.displayName ?? `Seat ${seat + 1}`;
}

export default function ContractStatusBar() {
  const { state } = useGame();
  if (!state.contractCode || !["declaration", "trump_resolution", "kitty_exchange", "play"].includes(state.phase ?? "")) {
    return null;
  }

  const contract = getContract(state.contractCode as any);
  const subMethodName = state.subMethod ? SUB_METHODS.find((s) => s.code === state.subMethod)?.displayName : null;

  let partnerText: string;
  if (contract.isSolo) {
    partnerText = "solo — no partner";
  } else if (state.partnerStatus === "revealed" && state.partnerSeat !== null) {
    partnerText = `${seatName(state, state.partnerSeat)} (revealed)`;
  } else if (state.partnerStatus === "solo") {
    partnerText = "solo (named card was self-held or in the kitty)";
  } else {
    partnerText = "secret, not yet revealed";
  }

  const declarerSide = new Set<number>(
    state.partnerStatus === "revealed" && state.partnerSeat !== null
      ? [state.declarerSeat!, state.partnerSeat]
      : [state.declarerSeat!]
  );
  const declarerTricks = state.trickWinners.filter((s) => declarerSide.has(s)).length;
  const otherTricks = state.trickWinners.length - declarerTricks;
  const knowsFullSplit = contract.isSolo || state.partnerStatus !== "secret";

  return (
    <div className="panel contract-status-bar">
      <span>
        <strong>{contract.displayName}</strong>
        {subMethodName ? ` (${subMethodName})` : ""} — declarer {seatName(state, state.declarerSeat)}
      </span>
      <span>Trump: {state.trumpSuit ?? "none"}</span>
      <span>Partner: {partnerText}</span>
      {state.phase === "play" && (
        <span>
          Tricks — {knowsFullSplit ? "declarer's side" : "declarer"}: {declarerTricks} · {knowsFullSplit ? "defense" : "others"}:{" "}
          {otherTricks}
        </span>
      )}
    </div>
  );
}
