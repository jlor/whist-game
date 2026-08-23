export default function HandDetail({ detail }: { detail: any }) {
  if (!detail) return null;
  return (
    <div className="card">
      <h3>Hand {detail.hand?.handNumber}</h3>
      <p>
        Contract: {detail.contract?.contractCode} {detail.contract?.subMethod ?? ""} — declarer seat{" "}
        {detail.contract?.declarerSeat}
      </p>
      <p>
        {detail.contract?.success ? "Made" : "Missed"} ({detail.contract?.tricksTaken} tricks), point value{" "}
        {detail.contract?.pointValueApplied} x{detail.contract?.multiplierApplied}
      </p>
      <h4>Bids</h4>
      <ul>
        {detail.bids?.map((b: any) => (
          <li key={b.id}>
            Seat {b.seat}: {b.isPass ? "pass" : b.contractCode}
          </li>
        ))}
      </ul>
      <h4>Ledger</h4>
      <ul>
        {detail.ledger?.map((l: any) => (
          <li key={l.id}>
            {l.userId}: {l.pointsDelta} (running total {l.runningTotalAfter})
          </li>
        ))}
      </ul>
    </div>
  );
}
