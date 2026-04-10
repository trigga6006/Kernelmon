# Forked Kernel Design Doc

## Overview

`Forked Kernel` is a new tactical board mode for Kernelmon.

It borrows the readability and positional tension of chess, but it is not a chess clone. The mode is built around simultaneous orders, contested captures, uplink control, and deterministic mind games. The goal is to make strategy and prediction decide the match, not hardware power or loot rarity.

This mode should feel like "two operating systems trying to out-schedule, out-route, and out-fork each other on a live board."

## Pillars

1. Strategy beats stats.
2. Positioning and tempo matter more than raw force.
3. Kernelmon flavor comes from roles, doctrines, and systems language, not from unfair stat gaps.
4. Ranked play is deterministic and normalized.
5. The mode should read clearly in a terminal at a glance.

## Design Goals

- Create a board mode that is immediately legible to players who understand chess-like tactics.
- Introduce enough novelty that the mode feels native to Kernelmon rather than a reskin.
- Preserve outplay through prediction, support, and macro board control.
- Support both solo AI play and online PvP with deterministic resolution.
- Leave room for a later "chaos" variant that reintroduces cards, artifacts, and wild modifiers.

## Non-Goals

- Recreating orthodox chess exactly.
- Making hardware scans directly determine who wins.
- Allowing rare cards, artifacts, or premium inventory to dominate ranked matches.
- Building a visually dense multi-layer 3D board in the first version.

## Fairness Model

The fairness rule is simple:

`Your rig determines your doctrine, not your power.`

In ranked `Forked Kernel`:

- Piece classes use normalized base values.
- No random crits, dodge rolls, or damage variance.
- No rarity-based loadout advantage.
- No direct HP or damage scaling from real hardware.
- Real hardware only influences `Doctrine`, which is a side-grade strategic identity.

This preserves the Kernelmon fantasy while keeping matches skill-based.

## Core Match Structure

Each round has four phases:

1. Order Phase
2. Reveal Phase
3. Conflict Phase
4. Control Phase

Both players submit orders before anything resolves.

### Order Phase

Each player secretly assigns exactly `2 orders` per round.

Valid order types:

- `Move`: move a unit according to its movement rule
- `Capture`: move into an occupied enemy square to start a conflict
- `Fortify`: remain in place and prepare defense or support
- `Overclock`: special once-per-cycle tactical action granted by doctrine or board state

Not every unit acts every round. This creates scheduling tension and makes tempo management central to the mode.

### Reveal Phase

Both players' orders are revealed simultaneously.

If orders do not contest the same space, they resolve in a deterministic priority order:

1. Forced board rules
2. Static effects
3. Movement priority by unit class
4. Control updates

### Conflict Phase

If opposing units collide on the same square, they do not immediately delete each other.

Instead they enter a `forked conflict`.

This is the heart of the mode and the main novelty over chess.

### Control Phase

After movement and conflicts, the board checks:

- uplink control
- Core breach state
- promotion conditions
- locked conflicts that persist
- round victory conditions

## Victory Conditions

A player wins by either:

1. `Core Breach`: the enemy Core is destroyed or left without a legal recovery state.
2. `Uplink Lock`: hold `2 of the 3 uplinks` continuously for `2 full rounds`.

This gives the mode both tactical and strategic win paths.

The dual win condition is important because it prevents the mode from degenerating into pure king-hunting.

## Board

Recommended launch board: `7x7`

Reasoning:

- Larger than checkers-like layouts
- Smaller and clearer than chess on an 8x8 board when rendered in the terminal
- Enough room for flanks, center pressure, and meaningful support chains

### Board Features

- `3 uplinks` placed across the center band
- optional `firewall squares` in later variants
- no random terrain in ranked mode

Example conceptual layout:

```text
  a b c d e f g
7 . . . . . . .
6 . . . U . . .
5 . . . . . . .
4 . U . X . U .
3 . . . . . . .
2 . . . . . . .
1 . . . . . . .
```

Legend:

- `U` = uplink
- `X` = center nexus lane

Final spawn geometry should be symmetrical and optimized for terminal readability.

## Starting Roster

Each player starts with:

- `1 Core`
- `1 CPU`
- `1 GPU`
- `1 RAM`
- `1 NVMe`
- `3 Processes`

Total: `8 units`

This is enough to create layered tactics without overwhelming the player.

## Unit Roles

Units should feel distinct, but they should be balanced around utility and board role, not raw stat gaps.

### Core

- The king-equivalent
- Slow
- Critical to survival
- Can issue a local stabilization field
- Cannot recklessly project force across the board

Role:

- anchor
- command piece
- endgame liability

### CPU

- Direct attacker
- Best at forcing and finishing conflicts
- Threatens nearby lanes aggressively

Role:

- burst unit
- brawler
- tactical diver

### GPU

- Positional pressure piece
- Best at diagonal or ranged-like contest patterns
- Strong in conflict mind games through `Hack` pressure

Role:

- board controller
- angle creator
- support breaker

### RAM

- Defensive anchor
- Strongest fortify and support interactions
- Best at holding uplinks

Role:

- tank
- stabilizer
- point holder

### NVMe

- Fastest repositioning piece
- Best scout and uplink disruptor
- Lower staying power in direct conflict

Role:

- flanker
- tempo tool
- infiltration piece

### Process

- Cheap utility units
- Contest space
- screen important pieces
- can promote or specialize through board achievements

Role:

- workers
- blockers
- objective runners

## Movement Model

Movement should be inspired by chess, not copied from it.

Recommended launch rules:

- `Core`: 1 square any direction
- `CPU`: up to 2 orthogonal, cannot pass through units
- `GPU`: up to 2 diagonal, may project contest into destination lane
- `RAM`: 1 orthogonal, may `Fortify`
- `NVMe`: up to 3 in a straight line, may pass through one friendly Process
- `Process`: 1 forward or 1 sideways toward adjacent lane pressure

These should be playtested and tuned. Exact movement can change, but the role differentiation should remain.

## Forked Conflict System

When a capture or contested move occurs, involved units enter a `forked conflict`.

Conflicts resolve with secret stance selection, not random dice.

### Conflict Steps

1. Each involved side chooses a `stance`
2. Adjacent allied support is counted
3. Doctrine modifiers apply
4. Resolution is deterministic
5. Winner remains, loser is removed or displaced

### Base Stances

- `Burst`
- `Guard`
- `Hack`

Core triangle:

- `Burst` beats `Hack`
- `Hack` beats `Guard`
- `Guard` beats `Burst`

If both sides choose the same stance:

- resolve by support advantage
- if tied, resolve by unit role advantage table
- if still tied, both remain `locked` until next round

### Why This Matters

This creates meaningful outplay:

- prediction beats autopilot
- support matters
- strong-looking pieces can lose bad engagements
- weaker positions can win with better reading

This is the main equalizer that keeps the mode skill-first.

## Support Links

Adjacent allied units can contribute support to a conflict.

Support rules:

- orthogonally adjacent allies give `+1 support`
- some doctrines alter support shape
- fortified RAM may give `+2 support`
- Process units are especially good as support screens

Support should not completely override stance choices.

Recommended rule:

- stance outcome decides primary advantage
- support acts as the tiebreaker and margin amplifier

## Lock States

If a conflict ends in a true tie, both units become `locked`.

Locked units:

- cannot move freely next round
- may only choose conflict stances or retreat options
- still project zone pressure

This creates board texture and lets players intentionally jam files and lanes.

## Uplink System

The uplinks are the mode's positional objective layer.

### Capturing Uplinks

A player controls an uplink if:

- they have a unit on it, and
- no enemy unit contests that uplink zone at end of round

### Uplink Benefits

Each controlled uplink grants one strategic benefit:

- `+1 command bandwidth` every other round
- or `1 reroute token`
- or `Core breach pressure` if two are held

For MVP, keep uplink benefits simple:

- holding `2 of 3` starts the `Uplink Lock` win timer
- no extra economy system required at first

## Doctrines

Doctrines are the normalized way hardware identity enters the mode.

A doctrine is a side-grade package, not a stat buff.

### Launch Doctrine Candidates

#### Thermal Doctrine

Theme:

- heat management
- pressure through patience

Effects:

- fortified units gain stronger hold bonuses
- repeated use of the same unit in consecutive rounds reduces that unit's next conflict flexibility

Playstyle:

- setup and punishment

#### Cache Doctrine

Theme:

- coordination
- efficient support

Effects:

- support links are slightly stronger
- locked units recover faster

Playstyle:

- team play and board structure

#### I/O Doctrine

Theme:

- routing
- tempo

Effects:

- NVMe and Process units gain better lane reposition options
- one reroute action per cycle

Playstyle:

- mobility and objective play

#### Signal Doctrine

Theme:

- information and prediction

Effects:

- limited reveal of one enemy committed order per match cycle
- stronger `Hack` posture in tied conflicts

Playstyle:

- reading and counterplay

### Doctrine Assignment

Doctrines can be chosen in one of two ways:

- manually selected in ranked
- suggested by rig scan in casual

Recommended for fairness:

- ranked uses player choice
- casual can recommend doctrine from actual rig profile

## Overclock Actions

Each player gets a limited number of `Overclock` actions per match.

These are not loot skills. They are normalized tactical tools.

Examples:

- `Reroute`: swap two adjacent friendly non-Core units
- `Patch`: remove a lock or stabilize a damaged unit
- `Spike`: give one unit a temporary conflict stance bonus

Overclock actions should be scarce and readable.

Recommended MVP:

- 1 use per player per match

## Promotion / Evolution

Processes should have a lightweight upgrade path.

Suggested trigger:

- a Process that survives while helping secure an uplink twice can promote

Promotion options:

- `Daemon`: better support and lock control
- `Thread`: faster movement
- `Probe`: stronger `Hack`

This gives Processes a real strategic arc without copying pawn promotion directly.

## Match Length

Target:

- `10 to 18 minutes` average

That means:

- few units
- simultaneous orders
- fast conflict resolution
- no bloated sub-battles

If conflict resolution becomes too slow, the mode loses its appeal.

## Solo and Online Modes

### Solo

- play against deterministic AI
- ideal for learning movement and conflict patterns
- should support challenge ladders later

### Online

- simultaneous hidden orders fit online play well
- deterministic resolution means both clients can trust the same outcome
- room-code flow can reuse existing online structure

## Ranked Ruleset

Ranked `Forked Kernel` should be the clean competitive version.

Rules:

- deterministic only
- normalized unit values
- chosen doctrine only
- no cards
- no artifacts
- no part rarity advantage
- fixed board
- fixed roster

This is the correct place for "better player wins."

## Chaos Variant

Later, the game can add `Chaos Forked Kernel`.

This is where Kernelmon's wild progression can come back in:

- cards
- artifacts
- part-based modifiers
- altered boards
- environmental hazards

This variant should be explicitly non-ranked.

It can be broken, loud, and funny because the ranked version already serves the fair competitive fantasy.

## Why This Is Not Just Chess

`Forked Kernel` differs from chess in several major ways:

- simultaneous orders instead of pure alternating turns
- dual victory conditions
- contested captures instead of immediate deletion
- stance mind games
- support-link board geometry
- doctrine-based asymmetry
- lock states and control pressure

The result should feel familiar enough to learn quickly, but different enough to be its own game.

## Terminal UX Guidelines

The board must read instantly.

### Requirements

- Strong coordinate labels
- Distinct glyph per unit type
- Clear owner colors
- Uplink squares always visible
- Locked conflicts visually marked
- Conflict prompts compact and high contrast

### Suggested Unit Glyphs

- Core: `K`
- CPU: `C`
- GPU: `G`
- RAM: `R`
- NVMe: `N`
- Process: `P`

Color and frame treatment should carry most of the flavor.

## Integration With Existing Kernelmon Systems

The mode should reuse existing infrastructure where possible:

- launcher menu flow
- local and online room handling
- deterministic seeded resolution model
- ranked progression shell
- profile and doctrine presentation

The mode should not directly reuse the existing battle damage model for ranked conflicts.

What can still be reused conceptually:

- archetype/doctrine presentation style
- turn submission patterns
- deterministic online synchronization
- HUD and animation language

## Implementation Shape

Suggested new modules:

- `src/forkedkernel.js`
- `src/forkedkernel-renderer.js`
- `src/forkedkernel-ai.js`
- `src/forkedkernel-balance.js`

### Phase 1 MVP

- fixed `7x7` board
- fixed roster
- local play only
- simultaneous orders
- stance-based conflict system
- Core Breach and Uplink Lock win conditions
- 2 doctrines

### Phase 2

- online PvP
- ranked queue/lobby integration
- solo challenge ladder
- Process promotion

### Phase 3

- chaos variant
- alt boards
- more doctrines
- cosmetic unlocks

## Risks

### Risk: Too close to chess

Mitigation:

- keep simultaneous orders
- keep conflict stance system
- keep objective-based win condition

### Risk: Too complicated

Mitigation:

- launch with 5 stance/board concepts at most
- keep unit count low
- keep doctrines simple

### Risk: Hidden-order frustration

Mitigation:

- clear preview UI
- round logs explaining resolution
- deterministic tie rules

### Risk: Hardware identity feels lost

Mitigation:

- keep doctrines strongly themed
- use profile/archetype flavor in presentation
- reserve casual mode for wilder build expression

## Open Questions

1. Should locked conflicts last exactly one extra round, or persist until broken?
2. Should Processes move asymmetrically like pawns, or more freely to fit simultaneous play?
3. Should the GPU behave more like a bishop, artillery, or hacker-control piece?
4. Should uplinks provide only victory pressure in MVP, or also limited command economy?
5. Should doctrine be player-chosen in all modes, or auto-suggested by rig scan outside ranked?

## Recommendation

Build `Forked Kernel` as a normalized, deterministic, simultaneous-order tactics mode.

The equalizer is not "rubber-banding damage." The equalizer is that the mode's decisive layer is prediction, support, and objective control instead of stat superiority.

That gives Kernelmon a genuinely new strategy mode that still belongs to this universe.
