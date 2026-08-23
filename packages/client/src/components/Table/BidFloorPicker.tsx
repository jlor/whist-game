import { useState } from "react";
import { CONTRACT_LADDER } from "@whist/shared";

export default function BidFloorPicker({
  defaultRank,
  onStart,
  label,
}: {
  defaultRank: number | null;
  onStart: (bidFloorRank: number) => void;
  label: string;
}) {
  const [rank, setRank] = useState<number>(defaultRank ?? 2);

  return (
    <div className="panel">
      <label>
        Lowest allowed bid
        <select value={rank} onChange={(e) => setRank(Number(e.target.value))}>
          {CONTRACT_LADDER.map((c) => (
            <option key={c.code} value={c.ladderRank}>
              {c.displayName}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => onStart(rank)}>{label}</button>
    </div>
  );
}
