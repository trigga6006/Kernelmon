# Kernelmon

Your PC is the party member.

Kernelmon is a terminal creature battler where your real hardware becomes the fighter. The game scans your CPU, GPU, RAM, storage, and chassis, turns that into stats and archetypes, and throws your machine into loud ASCII battles against AI opponents or your friends.

This repo is set up for a self-hosted multiplayer model:

- each player runs the game locally on their own machine
- one person in the group runs the lightweight relay server
- the relay can be hosted locally for testing or deployed to Fly.io for internet play

If you are releasing this for others to play, assume they should bring their own relay instead of depending on a shared public server.

## How Multiplayer Works

Kernelmon multiplayer has two pieces:

1. The game client
   This lives in the repo root and runs with `npm run play`.
2. The relay server
   This lives in [`relay/server.js`](./relay/server.js) and handles room codes plus turn exchange between two players.

The relay does not render the game and does not store player accounts. It is just the small matchmaking / battle bridge that lets two local clients find each other.

## Requirements

- Node.js 20 or newer
- npm
- a modern terminal with ANSI color support
- Windows Terminal + PowerShell is the most tested setup
- a Fly.io account only if you want to host the relay on the public internet

## 1. Clone The Repo

```bash
git clone https://github.com/YOUR_USERNAME/kernelmon.git
cd kernelmon
```

Replace the GitHub URL with your actual repo URL.

## 2. Install Dependencies

Install the main game dependencies from the repo root:

```bash
npm install
```

Install the relay dependencies too:

```bash
cd relay
npm install
cd ..
```

## 3. Run The Game Locally

From the repo root:

```bash
npm run play
```

That launches the full-screen Kernelmon app.

Useful scripts:

```bash
npm run play
npm start
npm run host
npm run join
npm run demo
```

`npm run play` is the recommended entry point. The other scripts are the older CLI flows.

## 4. Run The Relay Locally First

Before dealing with Fly.io, it is easiest to prove the multiplayer path locally.

In one terminal:

```bash
cd relay
npm start
```

The relay listens on `http://127.0.0.1:8080` by default.

You can confirm it is alive by opening:

```text
http://127.0.0.1:8080/health
```

You should get a small JSON response like:

```json
{"status":"ok","rooms":0}
```

Important:

- the game now defaults to `http://127.0.0.1:8080` if you do not set a relay URL
- that makes local testing easy
- for remote play, everyone must point at the same hosted relay

## 5. Point The Game At A Relay

Kernelmon reads the relay URL from `KERNELMON_RELAY_URL`.

If you do nothing, the game uses:

```text
http://127.0.0.1:8080
```

That is perfect for local relay testing on the same machine.

### PowerShell

```powershell
$env:KERNELMON_RELAY_URL="https://your-kernelmon-relay.fly.dev"
npm run play
```

### macOS / Linux

```bash
export KERNELMON_RELAY_URL="https://your-kernelmon-relay.fly.dev"
npm run play
```

All players in the same match need to use the same relay URL.

The classic CLI also supports an explicit flag:

```bash
npm run host -- --online --turns --relay https://your-kernelmon-relay.fly.dev
npm run join -- ABCD-EFGH --turns --relay https://your-kernelmon-relay.fly.dev
```

## 6. Deploy The Relay To Fly.io

Only one person in your friend group needs to do this.

### 6.1 Create A Fly.io Account

Install `flyctl` using the current official instructions:

- [Install flyctl](https://fly.io/docs/flyctl/install/)
- [Sign up](https://fly.io/docs/flyctl/auth-signup/)
- [Log in](https://fly.io/docs/flyctl/auth-login/)

Then authenticate in your terminal:

```bash
fly auth signup
```

If you already have an account:

```bash
fly auth login
```

### 6.2 Create The Fly App For The Relay

From the relay folder:

```bash
cd relay
fly launch
```

Recommended answers when Fly prompts you:

- choose a unique app name like `yourname-kernelmon-relay`
- keep the Dockerfile deployment flow
- choose the region closest to where you and your friends play
- do not attach Postgres, Redis, or volumes

This repo already includes a Fly config in [`relay/fly.toml`](./relay/fly.toml), so Fly should pick up the relay app shape from there.

### 6.3 Deploy

Still inside `relay/`:

```bash
fly deploy
```

After deploy, your relay URL will be:

```text
https://YOUR_FLY_APP_NAME.fly.dev
```

You can verify it with:

```bash
fly status
fly logs
```

And by opening:

```text
https://YOUR_FLY_APP_NAME.fly.dev/health
```

If that health endpoint returns JSON, your relay is up.

## 7. Launch And Play With Friends

Once the relay is running, every player does this from the repo root:

### Host

1. Set `KERNELMON_RELAY_URL` to the shared relay URL.
2. Run `npm run play`.
3. Choose `HOST GAME`.
4. Choose `ONLINE`.
5. Share the generated room code with your friend.

### Join

1. Set `KERNELMON_RELAY_URL` to the same shared relay URL.
2. Run `npm run play`.
3. Choose `JOIN BATTLE`.
4. Enter the room code from the host.

If both players are pointed at the same relay, the match should connect and start normally.

## 8. LAN / Private Network Option

If you do not want to deploy to Fly.io, you can still host the relay yourself on one machine and let other players point at it directly.

Example:

1. On the host machine, run the relay:

```bash
cd relay
npm start
```

2. Find that machine's LAN IP address, such as `192.168.1.50`.
3. On every player machine, set:

```powershell
$env:KERNELMON_RELAY_URL="http://192.168.1.50:8080"
```

4. Make sure port `8080` is reachable through the local firewall/router.
5. Launch the game and use `HOST GAME` / `JOIN BATTLE` normally.

## Persistence

Kernelmon stores local progression in the repo's `.kernelmon` folder, including things like:

- credits
- inventory
- parts
- builds
- battle history

That means each player keeps their own local save data on their own machine.

## Project Layout

- [`bin/launcher.js`](./bin/launcher.js): full-screen launcher
- [`bin/cli.js`](./bin/cli.js): classic CLI entry point
- [`src/profiler.js`](./src/profiler.js): hardware scanning
- [`src/relay.js`](./src/relay.js): relay client and room-code connection flow
- [`src/turnbattle.js`](./src/turnbattle.js): turn battle engine
- [`src/turnrenderer.js`](./src/turnrenderer.js): turn battle renderer
- [`relay/server.js`](./relay/server.js): multiplayer relay server
- [`relay/fly.toml`](./relay/fly.toml): Fly.io deployment config

## Troubleshooting

### I can launch the game, but online play fails immediately

Make sure:

- the relay is actually running
- `KERNELMON_RELAY_URL` points at the correct relay
- both players are using the same relay URL
- the relay health endpoint responds

### The host created a room, but the joiner cannot connect

Usually that means one of these is true:

- the host and joiner are pointed at different relays
- the relay URL is correct but the server is down
- a LAN relay is being blocked by firewall rules

### Fly deploy worked, but matches still do not connect

Check:

```bash
fly logs
```

Then test:

```text
https://YOUR_FLY_APP_NAME.fly.dev/health
```

If health works but matchmaking does not, double-check the exact value of `KERNELMON_RELAY_URL` on both machines.

## Short Pitch

If your CPU was a bruiser, your GPU was a spell school, your NVMe drive affected initiative, and your friend's workstation could challenge yours in a dramatic terminal boss fight, this is that game.
