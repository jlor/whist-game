import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as api from "../api/rest.js";
import SessionHistoryBrowser from "../components/History/SessionHistoryBrowser.js";
import HandDetail from "../components/History/HandDetail.js";

export default function HistoryPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [hands, setHands] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return;
    api.getSessionHands(sessionId).then((res: any) => setHands(res));
  }, [sessionId]);

  async function selectHand(handId: string) {
    const res = await api.getHandDetail(handId);
    setDetail(res);
  }

  return (
    <div className="page">
      <h1>Session history</h1>
      <SessionHistoryBrowser hands={hands} onSelect={selectHand} />
      <HandDetail detail={detail} />
    </div>
  );
}
