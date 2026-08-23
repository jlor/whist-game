export default function SessionHistoryBrowser({
  hands,
  onSelect,
}: {
  hands: any[];
  onSelect: (handId: string) => void;
}) {
  return (
    <ul>
      {hands.map((h) => (
        <li key={h.id}>
          <button onClick={() => onSelect(h.id)}>
            Hand {h.handNumber} — {h.status}
          </button>
        </li>
      ))}
    </ul>
  );
}
