import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useGame } from "../state/GameStateProvider.js";
import SeatsRing from "../components/Table/SeatsRing.js";
import BiddingPanel from "../components/Table/BiddingPanel.js";
import ContractDeclarationPanel from "../components/Table/ContractDeclarationPanel.js";
import TrumpTipRevealPanel from "../components/Table/TrumpTipRevealPanel.js";
import KittyExchangeModal from "../components/Table/KittyExchangeModal.js";
import HandOfCards from "../components/Table/HandOfCards.js";
import TrickArea from "../components/Table/TrickArea.js";
import Scoreboard from "../components/Table/Scoreboard.js";
import PartnerRevealToast from "../components/Table/PartnerRevealToast.js";
import BidFloorPicker from "../components/Table/BidFloorPicker.js";

export default function TablePage() {
  const { code } = useParams<{ code: string }>();
  const { state, actions } = useGame();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    actions.joinTable(code).catch((err) => setError(err.message ?? "could not join table"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (error) return <p className="error">{error}</p>;

  return (
    <div className="page table-page">
      <h1>
        {state.name ?? "Table"} — {state.code ?? code}
      </h1>
      <PartnerRevealToast />
      <SeatsRing />

      {state.tableStatus === "lobby" && state.seats.every((s) => s !== null) && state.amHost && (
        <BidFloorPicker defaultRank={state.bidFloorRank} onStart={(rank) => actions.startSession(rank)} label="Start session" />
      )}
      {state.tableStatus === "lobby" && state.seats.every((s) => s !== null) && !state.amHost && (
        <p>Waiting on the host to start the session…</p>
      )}

      <BiddingPanel />
      <ContractDeclarationPanel />
      <TrumpTipRevealPanel />
      <KittyExchangeModal />
      <TrickArea />
      <Scoreboard />

      {state.myCards.length > 0 && <HandOfCards />}

      {state.errors.length > 0 && (
        <ul className="error-log">
          {state.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
