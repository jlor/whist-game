import { SUITS, type Suit } from "@whist/shared";

const SUIT_SYMBOL: Record<Suit, string> = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" };
const SUIT_COLOR: Record<Suit, string> = { clubs: "black", diamonds: "red", hearts: "red", spades: "black" };

export default function SuitPicker({
  value,
  onChange,
  excludeSuit,
}: {
  value: Suit | null;
  onChange: (suit: Suit) => void;
  /** e.g. the partner-card's suit under Halv, which can't also be trump. */
  excludeSuit?: Suit | null;
}) {
  return (
    <div className="suit-picker">
      {SUITS.map((suit) => {
        const disabled = suit === excludeSuit;
        return (
          <button
            key={suit}
            className={"suit-button" + (value === suit ? " selected" : "")}
            style={{ color: SUIT_COLOR[suit] }}
            onClick={() => onChange(suit)}
            disabled={disabled}
            title={disabled ? "same suit as the partner card — not allowed" : suit}
          >
            {SUIT_SYMBOL[suit]}
          </button>
        );
      })}
    </div>
  );
}
