import { SUITS, type Suit } from "@whist/shared";

const SUIT_SYMBOL: Record<Suit, string> = { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" };
const SUIT_COLOR: Record<Suit, string> = { clubs: "black", diamonds: "red", hearts: "red", spades: "black" };

export default function SuitPicker({ value, onChange }: { value: Suit | null; onChange: (suit: Suit) => void }) {
  return (
    <div className="suit-picker">
      {SUITS.map((suit) => (
        <button
          key={suit}
          className={"suit-button" + (value === suit ? " selected" : "")}
          style={{ color: SUIT_COLOR[suit] }}
          onClick={() => onChange(suit)}
          title={suit}
        >
          {SUIT_SYMBOL[suit]}
        </button>
      ))}
    </div>
  );
}
