# Kernelmon

Your PC is the party member.

Kernelmon is a terminal-based creature battler where your real hardware becomes a fighter. The game scans your machine, turns your CPU, GPU, RAM, storage, and chassis into stats, archetypes, visuals, and move flavor, then throws that rig into flashy ASCII battles against AI opponents or other players.

It sits somewhere between a retro terminal toy, a hardware roast, and a multiplayer monster battler.

Older parts of the repo may still mention `PCArena` or `Workstation Off`. The current game name and launcher branding are `Kernelmon`.

## What Kind of Game Is This?

Think:

- Pokemon-inspired battles, but your computer is the monster
- animated terminal visuals instead of a browser UI
- real hardware profiling feeding directly into combat stats
- local progression with loot, builds, history, and unlock-style systems
- online room-code multiplayer through a lightweight relay

The tone is intentionally over the top: hacker callsigns, benchmark flavor text, big attack animations, loot drops, and dramatic boss-fight energy for regular desktop hardware.

## Highlights

- Your real machine becomes a fighter with stats derived from hardware
- Full-screen terminal launcher with animated menu, profile card, and game modes
- Turn-based battles with move selection, bag items, timers, and quick-hack typing events
- Auto-battle mode for fast matches and showpiece fight animations
- Online multiplayer with host/join room codes
- Workshop system that lets you override your scanned rig with collected parts
- Loot boxes, battle rewards, inventory, credits, and persistent progression
- Benchmark-to-battle transition that adds live machine-condition flavor and combat modifiers
- Extra modes like Dash Mode and Rogue Mode
- Keyboard and mouse-friendly launcher controls

## Main Features

### Hardware Becomes Combat

On launch, the game profiles your system and maps it into:

- `STR` from CPU power
- `MAG` from GPU power
- `SPD` from storage and clock speed
- `VIT` and `HP` from memory
- `DEF` from derived survivability

It also classifies your rig into an archetype such as offensive bruisers, balanced daemons, glass-cannon speedsters, workstation monsters, or laptop nomads.

The launcher keeps a single hardware snapshot for the entire app session, so your profile stays stable while you browse menus or enter different modes.

### Full Terminal Launcher

The recommended way to play is the full launcher:

- animated title screen
- main mode selection
- profile card and active build display
- bag, workshop, loot box, and battle log access
- host/join multiplayer flow

Controls supported in the launcher:

- Arrow keys
- `W`, `A`, `S`, `D`
- `H`, `J`, `K`, `L`
- `Enter` and `Space`
- mouse wheel on menu screens

### Turn-Based Battles

Turn battles are the most feature-rich mode in the project.

They include:

- move selection UI
- item usage from the bag during battle
- turn timers
- attack order based on speed and combat modifiers
- archetype passives and balance hooks
- online turn syncing with authoritative resolution
- quick-hack typing prompts that can grant a temporary buff on success

The quick-hack system flashes a command in the lower UI, gives the player a short timer to type it, and awards a small temporary bonus if completed correctly. It works in both local and online turn battles.

### Quick Battle / Auto Battle

If you want the spectacle without the input overhead, quick battle simulates the fight and focuses on the presentation:

- big projectile animations
- hit effects and KO moments
- personality from your hardware class and move pool
- fast back-to-back fights for testing builds and earning rewards

### Multiplayer

Online multiplayer is built around simple room codes.

- Host a room and share the code
- Join from another machine using the code
- Fight using the same hardware-derived fighter system as local play
- Turn-based online battles are relay-backed and host-authoritative to avoid desync

There is also support for direct local and LAN style CLI flows in the classic interface.

### Progression and Collection

Wins feed persistent progression stored locally.

You can earn:

- credits
- consumable battle items
- collectible hardware parts
- match history

You can then use those systems through:

- `BAG` for consumables
- `WORKSHOP` for parts and alternate builds
- `LOOT BOX` for credit sinks and progression loops
- `BATTLE LOG` for match history

### Workshop and Builds

The Workshop lets you go beyond your real machine.

You can collect replacement parts for:

- CPU
- GPU
- RAM
- storage

Those parts can be assembled into alternate builds, effectively creating custom fighters that override your live hardware scan for gameplay purposes.

### Benchmark Flavor Layer

Before battle, the game can run a benchmark-flavored transition that measures aspects of the machine and converts them into extra flavor and combat condition modifiers.

This gives fights a little more personality than a static scan:

- launch momentum
- thermal behavior
- focus and crit flavor
- memory and throughput vibes

It is meant to make each machine feel less like a stat block and more like a temperamental combatant.

### Extra Modes

The project also includes side modes beyond standard battles:

- `Dash Mode`: a side-scrolling obstacle runner in the terminal
- `Rogue Mode`: a lightweight run-based combat exploration mode

## Getting Started

### Requirements

- a recent version of Node.js
- a terminal with ANSI color support
- Windows Terminal, PowerShell, or another modern terminal is recommended

### Install

```bash
npm install
```

### Launch the Full App

```bash
npm run play
```

This starts the full-screen launcher and is the best entry point for most players.

### Other Scripts

```bash
npm start
npm run demo
npm run host
npm run join
```

These are the classic CLI entry points. They still work, but `npm run play` is the modern "full app" experience.

## Multiplayer

### Play Online Through the Main App

1. Launch with `npm run play`
2. Choose `HOST GAME` or `JOIN BATTLE`
3. Share or enter a room code
4. Fight

### Relay Server

The repo also includes the small matchmaking and battle relay used for online rooms in `relay/server.js`.

To run it locally:

```bash
cd relay
npm install
npm start
```

By default, the game is configured to use a Fly.io relay URL from the client code.

## Controls

### Launcher

- `W/S`, arrow keys, or mouse wheel: move selection
- `A/D` or left/right: collapse sections or move focus
- `Enter` or `Space`: select
- `Q` or `Esc`: back or quit depending on screen

### Turn Battles

- arrow keys or `J/K`-style navigation in battle menus
- `Enter` or `Space` to confirm moves
- `Esc` or `Q` to back out of bag screens where supported
- type the shown command during quick-hack prompts

## Persistence

The game stores local progression data inside the repo's `.kernelmon` folder, including things like:

- inventory
- parts
- builds
- credits
- history

That means the project behaves like a local game profile, not just a stateless demo.

## Why It Feels Different

A lot of "your PC as a character" projects stop at a joke stat card.

Kernelmon goes further:

- your machine has a class fantasy
- its hardware affects visuals and moves
- the game supports progression and buildcraft
- the UI is built like a terminal-native game, not just command output
- online play lets two very different rigs collide in the same system

It is meant to feel like your workstation has a battle form.

## Project Status

This is an actively evolving game prototype and playground. Features are already broad, but the project still has a "living game" feel:

- some branches may contain newer menu or combat work than others
- older naming may still appear in some files
- balancing and hardware heuristics are still being tuned

The best branch for the full launcher experience is the one that includes `bin/launcher.js` and the `npm run play` script.

## Development Notes

- Main launcher: `bin/launcher.js`
- Classic CLI: `bin/cli.js`
- Hardware profiling: `src/profiler.js`
- Turn battle renderer: `src/turnrenderer.js`
- Turn battle engine: `src/turnbattle.js`
- Items and progression: `src/items.js`
- Parts and workshop builds: `src/parts.js`
- Online relay client: `src/relay.js`
- Relay server: `relay/server.js`

## Short Pitch

If Steam had a weird little terminal battler where your GPU was a spell school, your NVMe drive affected initiative, your laptop chassis changed your class fantasy, and your friend's PC could challenge yours online, this would be that game.
