# Game rules

This is a Danish house-rules trick-taking card game for 4 players, played
with a 55-card deck. It resembles Whist/Bridge in structure (partnerships,
tricks, a bidding auction) but has its own contract ladder, a rotating
partner mechanic, and a scoring scheme distinct from either.

This document is the plain-English reference. The authoritative,
machine-checked version of the same data lives in
[`packages/shared/src/contracts.config.ts`](../packages/shared/src/contracts.config.ts) —
if the two ever disagree, fix whichever one is wrong rather than assuming
this file is right.

## Deck, seats, and the deal

- 55 cards: a standard 52-card deck plus 3 jokers.
- 4 players. Partnerships are **not fixed** — who's on whose side is
  determined fresh every hand by the bidding contract (see below).
- Each hand, the dealer deals 13 cards to each player and sets aside a
  3-card **kitty** (face-down).
- The dealer rotates one seat clockwise after every hand that completes for
  real. A **session** is one full round: it ends when the dealer seat
  cycles back to whoever dealt first that session. There's no target
  score — a session just runs its course, and the host can start another
  one at the same table afterward.
- If all 4 players pass during bidding with no bid ever made, the same
  dealer re-deals (the dealer does not rotate for a redeal).

## The bidding ladder

Bidding goes clockwise starting from the seat to the dealer's left. Each
turn a player either **passes** or names a contract that outranks the
current high bid. The contracts form a fixed ladder, weakest to strongest:

| # | Contract | Points | Trump |
|---|---|---:|---|
| 1 | 8 | 2 | declarer's free choice |
| 2 | 8+ | 4 | one of 4 sub-methods (see below) |
| 3 | 9 | 4 | declarer's free choice |
| 4 | **Sol** | 10 | none — jokers rank highest |
| 5 | 9+ | 8 | one of 4 sub-methods |
| 6 | **Ren sol** | 20 | none — jokers rank highest |
| 7 | 10 | 8 | declarer's free choice |
| 8 | 10+ | 16 | one of 4 sub-methods |
| 9 | 11 | 16 | declarer's free choice |
| 10 | 11+ | 32 | one of 4 sub-methods |
| 11 | 12 | 32 | declarer's free choice |
| 12 | 12+ | 64 | one of 4 sub-methods |
| 13 | 13 | 64 | declarer's free choice |
| 14 | 13+ | 128 | one of 4 sub-methods |
| 15 | **Halv bordlægger** | 40 | none — jokers rank highest |
| 16 | **Bordlægger** | 80 | none — jokers rank highest |

The plain numbers (8, 9, 10, 11, 12, 13) require taking at least that many
of the 13 tricks, with the declarer freely choosing trump. **Sol** wins by
taking at most 1 trick; **Ren sol** by taking exactly 0. **Halv
bordlægger** and **Bordlægger** are the same 0-trick goal as Ren sol, but
with half or all of the declarer's hand exposed face-up to the table before
play, making it harder to hide what you're avoiding — hence the higher
point values.

The table can configure a **bid floor** (the lowest contract anyone may
open with) when starting or continuing a session — by default it's `9+`,
but it can be set anywhere on the ladder, including all the way down to
`8` or as high as `Bordlægger`.

**Passing is permanent.** Once a player passes, they're out of that
auction for good and get skipped for the rest of it — they cannot bid
again even if the auction comes back around. The auction ends the moment
only one active player remains: immediately, if that player already holds
the high bid (nobody is left to challenge them), or as a redeal if nobody
ever bid at all.

### The four sub-methods (8+, 9+, 10+, 11+, 12+, 13+)

Any "+" contract requires naming one of four sub-methods as part of the
bid itself (not chosen afterward):

- **Sans** — no trump; jokers rank highest.
- **Halv** ("half") — the secret partner (once found, see below) freely
  picks the trump suit themselves, and performs the kitty exchange instead
  of the declarer. The partner's identity is revealed immediately, since
  the whole table needs to know who's choosing trump.
- **Tip** — the dealer flips the 3 kitty cards face-up one at a time; the
  declarer stops the reveal as soon as they see a suit they want, which
  becomes trump. (If a flipped card is a joker it can't be stopped on —
  keep flipping. If the entire kitty gets revealed without landing on a
  usable suit, the hand falls back to no trump.)
- **Good** — trump is fixed to clubs, no choice involved.

**The 4 sub-methods have no ranking among themselves.** At a given "+"
tier, a bid is legal as long as it names a sub-method that hasn't already
been used at that tier this auction — regardless of which sub-method
currently holds the high bid. Once all 4 have been used at a tier, the
only way forward is escalating to the next tier (or passing). For example,
at `9+`: Sans, then Halv (a different, unused sub-method — legal), then
Sol — no, Sol is a different tier, not applicable here — then Tip, then
Good all becomes possible in any order across different bidders; once all
four have appeared, the next bid must be `Ren sol` or higher.

### Suit conflicts

- **Good**: the partner card (see below) can never be named in clubs,
  since that's Good's own fixed trump suit.
- **Halv**: whoever picks trump (the partner, or the declarer if the
  partner-card search collapsed to a solo outcome) cannot choose the same
  suit as the already-named partner card.
- These two are the only cases with this restriction — free-trump
  contracts and Tip are unaffected (for Tip, trump isn't even known yet
  at the point the partner card is named).

## The partner-card mechanic

Every contract *except* the four structurally-solo ones (Sol, Ren sol,
Halv bordlægger, Bordlægger) uses a partner-finding mechanic instead of
fixed partnerships:

1. When declaring the contract, the declarer names a specific card — an
   **Ace**, by default.
2. Whoever holds that physical card becomes the declarer's secret partner
   for the hand. Partnerships are declarer + that one seat, versus the
   other two.
3. The partner's identity stays **secret** until that card is actually
   played to a trick — except under **Halv**, where it's revealed
   immediately (since the partner has to publicly choose trump).
4. **If the declarer holds the named card themselves, or it's sitting
   unused in the kitty, there is no partner** — the declarer plays solo,
   alone against the other 3.

### Naming something other than an Ace

The declarer isn't stuck with Aces if they hold all 4 of them:

- Holding all 4 Aces → may name a **King** instead.
- Holding all 4 Aces *and* all 4 Kings → may name a **Queen** instead.
- Holding all 4 Aces, Kings, *and* Queens → may name a **Jack** instead.

This is always optional, never required — a declarer holding all 4 Aces
may still name an Ace if they want (which guarantees a solo outcome, since
they hold it themselves).

## The kitty

After the deal, the 3 kitty cards are **completely hidden** from
everyone — including the declarer — until they're actually exchanged.
(The one exception: cards a `Tip` reveal has already shown face-up are
public knowledge, since that's an inherent part of how Tip works.)

Whoever performs the exchange (the declarer, except under Halv where it's
the partner) may swap **all 3** of their hand cards for the 3 kitty cards,
sight unseen, or decline and keep their hand as dealt — it's all-or-none,
never a partial swap. This applies to every contract, including the four
solo ones.

Under **Tip**, the kitty-reveal used to find trump is a *separate* step
from this exchange — after the reveal settles on a trump suit, the
declarer still gets the normal blind 3-for-3 exchange on top, using
whatever the kitty holds at that point (including any cards that were
revealed during the trump search).

## Playing a trick

- The player to the dealer's left leads the first trick; after that, the
  winner of each trick leads the next.
- **Must follow the suit led if able.** Jokers never count as following a
  suit — a player holding a joker but also holding a card of the led suit
  must play that card, not the joker. A player who cannot follow suit may
  play anything, including a joker or a trump card.
- **Trick winner:**
  - If there's a trump suit in play, the highest trump played wins. If no
    trump was played, the highest joker played wins. Otherwise, the
    highest card of the led suit wins.
  - If there's no trump this hand (Sans, Sol, Ren sol, Halv bordlægger,
    Bordlægger), jokers beat everything. The 3 jokers are equal rank
    among themselves — if more than one lands in the same trick, whichever
    was played **first** stands, since none of the later ones can beat it.

## Scoring

Every hand is **zero-sum** — the four players' point changes for that hand
always add up to exactly zero.

- **Partnered outcome** (declarer + a real, resolved partner): if the
  contract is made, both partners individually gain the contract's full
  point value, and both opponents individually lose that same amount. If
  it's missed, the signs flip.
- **Solo outcome** (a structurally solo contract, or any contract that
  collapsed to solo because the named card was self-held or stuck in the
  kitty): the lone player gains **3×** the point value if they make it (or
  loses 3× if they miss), and each of the other 3 players individually
  gets the mirrored 1× — so it still sums to zero (3× − 1× − 1× − 1× = 0).
- There's no bonus for overtricks — making a contract with extra tricks to
  spare scores exactly the same as making it precisely.

Running totals are per-individual-player across the whole session, not
per-partnership, since who's partnered with whom changes every hand.

## Assumptions flagged in the data

A couple of details weren't fully specified in the original rules and are
implemented as clearly-marked, easy-to-correct assumptions in
`contracts.config.ts`:

- **Halv bordlægger / Bordlægger's win condition** is assumed to be the
  same "exactly 0 tricks" goal as Ren sol (extended by hand exposure),
  rather than a variant of taking all 13 — inferred from the point values
  doubling cleanly along the Sol → Ren sol → Halv bordlægger → Bordlægger
  line.
- **Halv's solo fallback**: if the named partner card turns out to be
  self-held or kitty-stranded under Halv (no real partner exists), the
  declarer is assumed to fall back to picking trump and performing the
  kitty exchange themselves, same as any other solo outcome.

"Bordlægger med snak" (a 160-point variant requiring in-person table talk)
is intentionally not implemented, since it doesn't make sense online.
