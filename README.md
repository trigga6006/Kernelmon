# Kernelmon

Your PC is the party member.

Kernelmon is a terminal creature battler where your real hardware becomes the fighter. The game scans your CPU, GPU, RAM, storage, and chassis, turns that into stats and archetypes, and throws your machine into loud ASCII battles against AI opponents or your friends.

---

## ◆ ╸ BEFORE YOU START ╺

- Node.js 20+
- npm
- A terminal with ANSI color support (Windows Terminal + PowerShell recommended)

---

## ⚔ ╸ 1. CLONE AND INSTALL ╺

Grab the repo and install everything in one shot:

```bash
git clone https://github.com/trigga6006/Kernelmon.git
cd Kernelmon
npm install
```

---

## » ╸ 2. PLAY ╺

```bash
npm run play
```

That's it. The full game launches — solo modes, AI battles, rogue mode, and more. No server needed for solo play.

---

## ★ ╸ 3. PLAY WITH FRIENDS ╺

Multiplayer works out of the box. The game connects to a shared relay server automatically.

**Host a match:**

1. Run `npm run play`
2. Choose **HOST GAME** → **ONLINE**
3. Send the room code to your friend

**Your friend joins:**

1. Run `npm run play`
2. Choose **JOIN BATTLE**
3. Enter the room code
4. Fight.

Both players need an internet connection. That's the only requirement.

---

## » ╸ SOLO PLAY ╺

Don't need multiplayer? These work offline:

```bash
npm run play      # full game menu
npm run demo      # quick AI battle
```

---

## ◆ ╸ YOUR SAVE DATA ╺

Progression is stored locally in `.kernelmon/` — credits, inventory, parts, builds, and battle history. Each player keeps their own save.

---

## ◆ ╸ SELF-HOSTING THE RELAY (OPTIONAL) ╺

Want to run your own relay instead of using the default? The relay is a zero-dependency Node server that brokers room codes and turn exchange between two players.

**Run it locally:**

```bash
cd relay
npm install
npm start
```

**Point the game at it:**

```powershell
# PowerShell
$env:KERNELMON_RELAY_URL="http://127.0.0.1:8080"
npm run play
```

```bash
# Bash / macOS / Linux
export KERNELMON_RELAY_URL="http://127.0.0.1:8080"
npm run play
```

**Deploy to Fly.io:**

```bash
cd relay
fly auth login
fly launch         # pick a name like yourname-kernelmon-relay
fly deploy
```

Your relay URL will be `https://YOUR_APP_NAME.fly.dev`. Set `KERNELMON_RELAY_URL` to that URL on every player's machine.

---

## ◆ ╸ TROUBLESHOOTING ╺

**Match won't connect?**

- Make sure both players have an internet connection
- If self-hosting: both players must use the exact same relay URL
- If self-hosting: check `https://YOUR_APP_NAME.fly.dev/health` returns OK
- Make sure `KERNELMON_RELAY_URL` is set *before* launching the game

---

## Short Pitch

If your CPU was a bruiser, your GPU was a spell school, your NVMe drive affected initiative, and your friend's workstation could challenge yours in a dramatic terminal boss fight, this is that game.
