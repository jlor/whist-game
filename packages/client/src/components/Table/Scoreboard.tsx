import { getContract } from "@whist/shared";
import { useGame } from "../../state/GameStateProvider.js";

function nameFor(state: ReturnType<typeof useGame>["state"], userId: string): string {
  const occ = state.seats.find((s) => s?.userId === userId);
  return occ?.displayName ?? userId;
}

export default function Scoreboard() {
  const { state, actions } = useGame();

  return (
    <div className="panel">
      {state.lastHandResult && (
        <div className="hand-result">
          <h3>
            {getContract(state.lastHandResult.contractCode as any).displayName} —{" "}
            {state.lastHandResult.success ? "made" : "missed"} ({state.lastHandResult.tricksTaken} tricks)
          </h3>
          <ul>
            {state.lastHandResult.ledger.map((e) => (
              <li key={e.userId}>
                {nameFor(state, e.userId)}: {e.delta > 0 ? "+" : ""}
                {e.delta} (total {e.runningTotal})
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.sessionComplete && (
        <div className="session-result">
          <h3>Session complete</h3>
          <ul>
            {state.sessionComplete.finalTotals.map((t) => (
              <li key={t.userId}>
                {nameFor(state, t.userId)}: {t.total}
              </li>
            ))}
          </ul>
          <button onClick={() => actions.hostAction("continueSession")}>Continue session (host)</button>
        </div>
      )}
    </div>
  );
}
