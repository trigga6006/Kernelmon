# Kernelmon

Your PC is the party member.

Kernelmon is a terminal creature battler where your real hardware becomes the fighter. The game scans your CPU, GPU, RAM, storage, and chassis, turns that into stats and archetypes, and throws your machine into loud ASCII battles against AI opponents or your friends.

---

## ◆ ╸ BEFORE YOU START ╺

- Node.js 20+
- npm
- A terminal with ANSI color support (Windows Terminal + PowerShell recommended)
- A free [Fly.io](https://fly.io) account (for hosting the relay)

---

## ⚔ ╸ 1. CLONE AND INSTALL ╺

Grab the repo and install everything — game and relay — in one shot:

```bash
git clone https://github.com/trigga6006/Kernelmon.git
cd kernelmon
npm install
cd relay && npm install && cd ..
```

---

## ◆ ╸ 2. DEPLOY THE RELAY ╺

The relay is the lightweight server that connects players. Only one person in your group needs to deploy it.

Install the Fly CLI and log in:

```bash
fly auth signup    # first time
fly auth login     # returning
```

Launch and deploy from the relay folder:

```bash
cd relay
fly launch         # pick a name like yourname-kernelmon-relay
fly deploy
```

Once deployed, your relay URL is:

```
https://YOUR_APP_NAME.fly.dev
```

Confirm it's live:

```
https://YOUR_APP_NAME.fly.dev/health
# should return: {"status":"ok","rooms":0}
```

---

## » ╸ 3. SET YOUR RELAY AND LAUNCH ╺

Point the game at your deployed relay, then start it:

**PowerShell**
```powershell
$env:KERNELMON_RELAY_URL="https://YOUR_APP_NAME.fly.dev"
npm run play
```

**Bash / macOS / Linux**
```bash
export KERNELMON_RELAY_URL="https://YOUR_APP_NAME.fly.dev"
npm run play
```

**CMD**
```cmd
set KERNELMON_RELAY_URL=https://YOUR_APP_NAME.fly.dev
npm run play
```

---

## ★ ╸ 4. HOST A MATCH ╺

1. In the menu, choose **HOST GAME** → **ONLINE**
2. You'll get a room code — send it to your friend

---

## ★ ╸ 5. YOUR FRIEND JOINS ╺

Your friend does the same clone + install, sets the same relay URL, then:

**PowerShell**
```powershell
$env:KERNELMON_RELAY_URL="https://YOUR_APP_NAME.fly.dev"
npm run play
```

**Bash / macOS / Linux**
```bash
export KERNELMON_RELAY_URL="https://YOUR_APP_NAME.fly.dev"
npm run play
```

**CMD**
```cmd
set KERNELMON_RELAY_URL=https://YOUR_APP_NAME.fly.dev
npm run play
```

1. Choose **JOIN BATTLE**
2. Enter the room code from the host
3. Fight.

---

## » ╸ SOLO PLAY ╺

Don't need multiplayer? Skip the relay entirely:

```bash
npm run play      # full game menu
npm run demo      # quick AI battle
```

---

## ◆ ╸ YOUR SAVE DATA ╺

Progression is stored locally in `.kernelmon/` — credits, inventory, parts, builds, and battle history. Each player keeps their own save.

---

## ◆ ╸ TROUBLESHOOTING ╺

**Match won't connect?**

- Both players must use the exact same relay URL
- Check `https://YOUR_APP_NAME.fly.dev/health` returns OK
- Run `fly logs` to see relay-side errors
- Make sure `KERNELMON_RELAY_URL` is set before launching the game

---

## Short Pitch

If your CPU was a bruiser, your GPU was a spell school, your NVMe drive affected initiative, and your friend's workstation could challenge yours in a dramatic terminal boss fight, this is that game.
