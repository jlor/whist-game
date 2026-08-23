import type { Card, Suit } from "@whist/shared";
import { getSubMethod, type SubMethodCode } from "@whist/shared";

export interface KittyRevealState {
  kitty: Card[];
  revealed: Card[];
  /** undefined = not yet resolved. null = exhausted with no usable suit (falls back to no trump). */
  resolvedTrump: Suit | null | undefined;
}

export function startKittyReveal(kitty: Card[]): KittyRevealState {
  return { kitty, revealed: [], resolvedTrump: undefined };
}

export function revealNextKittyCard(state: KittyRevealState): {
  state: KittyRevealState;
  card: Card;
} {
  if (state.revealed.length >= state.kitty.length) {
    throw new Error("kitty is fully revealed");
  }
  const card = state.kitty[state.revealed.length];
  return { state: { ...state, revealed: [...state.revealed, card] }, card };
}

export function canStopOnLastReveal(state: KittyRevealState): boolean {
  const last = state.revealed[state.revealed.length - 1];
  return last !== undefined && last.kind === "standard";
}

/** Declarer stops the reveal; trump becomes the suit of the last-revealed card. */
export function stopKittyReveal(state: KittyRevealState): KittyRevealState {
  if (!canStopOnLastReveal(state)) {
    throw new Error("cannot stop the reveal on a joker or before any card has been revealed");
  }
  const last = state.revealed[state.revealed.length - 1];
  const suit = last.kind === "standard" ? last.suit : undefined;
  return { ...state, resolvedTrump: suit ?? null };
}

/**
 * If the whole kitty gets revealed (declarer never stopped, e.g. every card
 * was a joker) there is no suit left to force — falls back to no trump for
 * the hand, same as `sans`. This edge case isn't covered by the source
 * rules; flagged as an assumption.
 */
export function finalizeExhaustedReveal(state: KittyRevealState): KittyRevealState {
  if (state.revealed.length < state.kitty.length) {
    throw new Error("kitty reveal is not yet exhausted");
  }
  if (state.resolvedTrump !== undefined) return state;
  const lastStandard = [...state.revealed].reverse().find((c) => c.kind === "standard");
  const suit = lastStandard?.kind === "standard" ? lastStandard.suit : null;
  return { ...state, resolvedTrump: suit };
}

/** Resolves trump for the non-`tip` sub-methods, and for solo/no-trump contracts. */
export function resolveStaticTrump(
  subMethodCode: SubMethodCode,
  partnerChoice?: Suit
): Suit | null {
  const subMethod = getSubMethod(subMethodCode);
  switch (subMethod.trumpResolution) {
    case "none":
      return null;
    case "fixed":
      if (!subMethod.fixedTrumpSuit) throw new Error("fixed sub-method missing fixedTrumpSuit");
      return subMethod.fixedTrumpSuit;
    case "partner_choice":
      if (!partnerChoice) throw new Error("half sub-method requires the partner's trump choice");
      return partnerChoice;
    case "kitty_reveal":
      throw new Error("tip trump is resolved via startKittyReveal/stopKittyReveal, not this function");
  }
}
