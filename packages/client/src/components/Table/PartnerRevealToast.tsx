import { useGame } from "../../state/GameStateProvider.js";

export default function PartnerRevealToast() {
  const { state } = useGame();
  if (state.partnerStatus === "solo" || !state.contractCode) return null;

  return (
    <div className="toast">
      {state.amSecretPartner && state.partnerStatus === "secret" && (
        <span>You are the secret partner — keep it quiet until your card is played.</span>
      )}
      {state.partnerStatus === "revealed" && state.partnerSeat !== null && (
        <span>Partner revealed: seat {state.partnerSeat + 1}</span>
      )}
    </div>
  );
}
