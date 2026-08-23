import { SUITS, type Suit } from "@whist/shared";
import { formatCard } from "../../cardDisplay.js";

export default function PartnerCardPicker({
  eligibleRanks,
  value,
  onChange,
  excludeSuit,
}: {
  eligibleRanks: string[];
  value: { rank: string; suit: Suit } | null;
  onChange: (card: { rank: string; suit: Suit }) => void;
  /** e.g. Good's fixed trump suit, which the partner card can't also be. */
  excludeSuit?: Suit | null;
}) {
  return (
    <div className="partner-card-picker">
      {eligibleRanks.map((rank) => (
        <div key={rank} className="partner-card-rank-row">
          {SUITS.map((suit) => {
            const code = `${rank}${suit[0].toUpperCase()}`;
            const { label, color } = formatCard(code);
            const isSelected = value?.rank === rank && value?.suit === suit;
            const disabled = suit === excludeSuit;
            return (
              <button
                key={suit}
                className={"playing-card" + (isSelected ? " selected" : "")}
                style={{ color }}
                onClick={() => onChange({ rank, suit })}
                disabled={disabled}
                title={disabled ? "same suit as the fixed trump — not allowed" : ""}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
