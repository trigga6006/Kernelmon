// ═══════════════════════════════════════════════════════════════
// CASINO — Gamble your credits in card games
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { colors, rgb, bgRgb } = require('./palette');
const { getBalance, spendCredits, addCredits } = require('./credits');

// ─── Card constants ───

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = {
  '♠': colors.white,
  '♥': rgb(240, 80, 80),
  '♦': rgb(240, 80, 80),
  '♣': colors.white,
};
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function makeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  // Shuffle (Fisher-Yates)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank, 10);
}

function handTotal(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card);
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function cardStr(card) {
  return `${card.rank}${card.suit}`;
}

// ─── Draw a card visually on screen ───

const CARD_W = 7;
const CARD_H = 5;

function drawCard(scr, x, y, card, faceDown) {
  const border = colors.dimmer;
  const bg = bgRgb(38, 38, 58);

  // Top border
  scr.text(x, y, '╭─────╮', border);

  if (faceDown) {
    scr.text(x, y + 1, '│░░░░░│', border);
    scr.text(x, y + 2, '│░░░░░│', border);
    scr.text(x, y + 3, '│░░░░░│', border);
  } else {
    const suitColor = SUIT_COLORS[card.suit];
    const rankDisplay = card.rank === '10' ? '10' : card.rank + ' ';
    const rankRight = card.rank === '10' ? '10' : ' ' + card.rank;

    scr.text(x, y + 1, '│', border);
    scr.text(x + 1, y + 1, rankDisplay, colors.white, bg, true);
    scr.text(x + 3, y + 1, '  ', null, bg);
    scr.text(x + 5, y + 1, card.suit, suitColor, bg);
    scr.text(x + 6, y + 1, '│', border);

    scr.text(x, y + 2, '│', border);
    scr.text(x + 1, y + 2, '  ', null, bg);
    scr.text(x + 3, y + 2, card.suit, suitColor, bg);
    scr.text(x + 4, y + 2, '  ', null, bg);
    scr.text(x + 6, y + 2, '│', border);

    scr.text(x, y + 3, '│', border);
    scr.text(x + 1, y + 3, card.suit, suitColor, bg);
    scr.text(x + 3, y + 3, '  ', null, bg);
    scr.text(x + 5, y + 3, rankRight, colors.white, bg, true);
    scr.text(x + 6, y + 3, '│', border);
  }

  // Bottom border
  scr.text(x, y + 4, '╰─────╯', border);
}

// ─── Casino lobby ───

const CASINO_GAMES = [
  { key: 'blackjack', label: 'BLACKJACK', desc: 'Beat the dealer to 21', icon: '♠' },
];

async function openCasino(scr) {
  return new Promise((resolve) => {
    const w = scr.width;
    const h = scr.height;
    let cursor = 0;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const casinoGold = rgb(255, 215, 0);
    const casinoGreen = rgb(30, 120, 60);

    function render() {
      scr.clear();

      // Title bar
      scr.hline(0, 0, w, '─', colors.dimmer);
      scr.centerText(0, ' CASINO ', casinoGold, null, true);

      // Balance
      const bal = getBalance();
      const balStr = `◆ ${bal.toLocaleString()}`;
      scr.text(w - balStr.length - 2, 0, balStr, colors.gold);

      // Subtitle
      scr.centerText(2, 'Choose your game', colors.dim);

      // Game list
      const listY = 4;
      for (let i = 0; i < CASINO_GAMES.length; i++) {
        const game = CASINO_GAMES[i];
        const selected = i === cursor;
        const prefix = selected ? ' ▸ ' : '   ';
        const labelColor = selected ? casinoGold : colors.white;
        const descColor = selected ? colors.white : colors.dim;

        const y = listY + i * 2;
        scr.text(4, y, prefix, selected ? casinoGold : colors.dim);
        scr.text(7, y, `${game.icon} ${game.label}`, labelColor, null, selected);
        scr.text(7 + game.icon.length + 1 + game.label.length + 2, y, game.desc, descColor);
      }

      // Footer
      scr.hline(0, h - 3, w, '─', colors.dimmer);
      scr.text(4, h - 2, '[ENTER] Play   [ESC] Back', colors.dim);

      scr.render();
    }

    async function onKey(key) {
      if (key === '\x1b' || key === 'q') {
        cleanup();
        resolve();
        return;
      }
      if (key === '\x1b[A' || key === 'w') {
        cursor = Math.max(0, cursor - 1);
      }
      if (key === '\x1b[B' || key === 's') {
        cursor = Math.min(CASINO_GAMES.length - 1, cursor + 1);
      }
      if (key === '\r' || key === '\n') {
        const game = CASINO_GAMES[cursor];
        if (game.key === 'blackjack') {
          cleanup();
          await playBlackjack(scr);
          // After blackjack, return to casino lobby
          stdin.setRawMode(true);
          stdin.resume();
          stdin.setEncoding('utf8');
          stdin.on('data', onKey);
          render();
          return;
        }
      }
      render();
    }

    function cleanup() {
      stdin.removeListener('data', onKey);
    }

    stdin.on('data', onKey);
    render();
  });
}

// ─── Blackjack ───

const MIN_BET = 10;
const BET_STEP = 10;

async function playBlackjack(scr) {
  return new Promise((resolve) => {
    const w = scr.width;
    const h = scr.height;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    const casinoGold = rgb(255, 215, 0);
    const feltGreen = rgb(30, 100, 50);
    const feltBg = bgRgb(20, 60, 35);

    // Game state
    let phase = 'bet'; // 'bet' | 'play' | 'result'
    let bet = MIN_BET;
    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let resultMsg = '';
    let resultColor = colors.white;
    let message = '';

    function render() {
      scr.clear();
      const bal = getBalance();

      // Title bar
      scr.hline(0, 0, w, '─', colors.dimmer);
      scr.centerText(0, ' BLACKJACK ', casinoGold, null, true);

      const balStr = `◆ ${bal.toLocaleString()}`;
      scr.text(w - balStr.length - 2, 0, balStr, colors.gold);

      if (phase === 'bet') {
        renderBetPhase(bal);
      } else if (phase === 'play') {
        renderPlayPhase();
      } else if (phase === 'result') {
        renderResultPhase();
      }

      scr.render();
    }

    function renderBetPhase(bal) {
      scr.centerText(4, 'Place your bet', colors.white, null, true);

      // Bet amount
      const betY = Math.floor(h / 2) - 2;
      scr.centerText(betY - 1, '◄  BET  ►', colors.dim);
      const betStr = `◆ ${bet}`;
      scr.centerText(betY + 1, betStr, casinoGold, null, true);

      if (bet > bal) {
        scr.centerText(betY + 3, 'Not enough credits!', colors.rose);
      }

      scr.centerText(betY + 5, `Min: ${MIN_BET}`, colors.dim);

      // Footer
      scr.hline(0, h - 3, w, '─', colors.dimmer);
      scr.text(4, h - 2, '[LEFT/RIGHT] Adjust   [ENTER] Deal   [ESC] Back', colors.dim);
    }

    function renderPlayPhase() {
      const betStr = `Bet: ◆ ${bet}`;
      scr.text(4, 2, betStr, colors.gold);

      // Dealer section
      const dealerY = 4;
      scr.text(4, dealerY, 'DEALER', colors.dim, null, true);
      const dealerTotal = handTotal(dealerHand);
      // Show '?' for total when second card is face down
      const dealerTotalStr = `  (${cardValue(dealerHand[0])})`;
      scr.text(11, dealerY, dealerTotalStr, colors.dim);

      // Draw dealer cards - first face up, second face down
      let cardX = 4;
      for (let i = 0; i < dealerHand.length; i++) {
        drawCard(scr, cardX, dealerY + 1, dealerHand[i], i === 1);
        cardX += CARD_W + 1;
      }

      // Player section
      const playerY = dealerY + CARD_H + 3;
      const playerTotal = handTotal(playerHand);
      scr.text(4, playerY, 'YOU', colors.cyan, null, true);
      scr.text(8, playerY, `  (${playerTotal})`, playerTotal > 21 ? colors.rose : colors.cyan);

      cardX = 4;
      for (let i = 0; i < playerHand.length; i++) {
        drawCard(scr, cardX, playerY + 1, playerHand[i], false);
        cardX += CARD_W + 1;
      }

      if (message) {
        scr.centerText(h - 5, message, colors.gold);
      }

      // Footer
      scr.hline(0, h - 3, w, '─', colors.dimmer);
      scr.text(4, h - 2, '[H] Hit   [S] Stand   [ESC] Forfeit', colors.dim);
    }

    function renderResultPhase() {
      const betStr = `Bet: ◆ ${bet}`;
      scr.text(4, 2, betStr, colors.gold);

      // Dealer section - all face up now
      const dealerY = 4;
      const dealerTotal = handTotal(dealerHand);
      scr.text(4, dealerY, 'DEALER', colors.dim, null, true);
      scr.text(11, dealerY, `  (${dealerTotal})`, dealerTotal > 21 ? colors.rose : colors.dim);

      let cardX = 4;
      for (let i = 0; i < dealerHand.length; i++) {
        drawCard(scr, cardX, dealerY + 1, dealerHand[i], false);
        cardX += CARD_W + 1;
      }

      // Player section
      const playerY = dealerY + CARD_H + 3;
      const playerTotal = handTotal(playerHand);
      scr.text(4, playerY, 'YOU', colors.cyan, null, true);
      scr.text(8, playerY, `  (${playerTotal})`, playerTotal > 21 ? colors.rose : colors.cyan);

      cardX = 4;
      for (let i = 0; i < playerHand.length; i++) {
        drawCard(scr, cardX, playerY + 1, playerHand[i], false);
        cardX += CARD_W + 1;
      }

      // Result message
      scr.centerText(h - 6, resultMsg, resultColor, null, true);

      // Footer
      scr.hline(0, h - 3, w, '─', colors.dimmer);
      scr.text(4, h - 2, '[ENTER] Play again   [ESC] Back to Casino', colors.dim);
    }

    function startDeal() {
      const bal = getBalance();
      if (bet > bal) {
        message = 'Not enough credits!';
        render();
        return false;
      }
      // Deduct bet
      spendCredits(bet);

      // Fresh deck and deal
      deck = makeDeck();
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop(), deck.pop()];
      message = '';

      // Check for natural blackjack
      if (handTotal(playerHand) === 21) {
        phase = 'result';
        // Blackjack pays 1.5x
        const winnings = Math.floor(bet * 2.5);
        addCredits(winnings);
        resultMsg = `BLACKJACK! +◆ ${winnings - bet}`;
        resultColor = casinoGold;
        render();
        return true;
      }

      phase = 'play';
      render();
      return true;
    }

    function playerHit() {
      playerHand.push(deck.pop());
      const total = handTotal(playerHand);
      if (total > 21) {
        // Bust
        phase = 'result';
        resultMsg = `BUST! You lose ◆ ${bet}`;
        resultColor = colors.rose;
      } else if (total === 21) {
        // Auto-stand on 21
        dealerPlay();
      }
      render();
    }

    function playerStand() {
      dealerPlay();
      render();
    }

    function dealerPlay() {
      // Dealer hits on 16 or less, stands on 17+
      while (handTotal(dealerHand) < 17) {
        dealerHand.push(deck.pop());
      }

      const playerTotal = handTotal(playerHand);
      const dealerTotal = handTotal(dealerHand);

      phase = 'result';

      if (dealerTotal > 21) {
        // Dealer busts
        const winnings = bet * 2;
        addCredits(winnings);
        resultMsg = `Dealer busts! +◆ ${bet}`;
        resultColor = colors.mint;
      } else if (playerTotal > dealerTotal) {
        const winnings = bet * 2;
        addCredits(winnings);
        resultMsg = `You win! +◆ ${bet}`;
        resultColor = colors.mint;
      } else if (playerTotal === dealerTotal) {
        // Push - return bet
        addCredits(bet);
        resultMsg = `Push — bet returned`;
        resultColor = colors.gold;
      } else {
        resultMsg = `Dealer wins. You lose ◆ ${bet}`;
        resultColor = colors.rose;
      }
    }

    function onKey(key) {
      if (key === '\x1b') {
        if (phase === 'play') {
          // Forfeit - lose the bet
          phase = 'result';
          resultMsg = `Forfeit. You lose ◆ ${bet}`;
          resultColor = colors.rose;
          render();
          return;
        }
        cleanup();
        resolve();
        return;
      }

      if (phase === 'bet') {
        if (key === '\x1b[D' || key === 'a') {
          bet = Math.max(MIN_BET, bet - BET_STEP);
        } else if (key === '\x1b[C' || key === 'd') {
          bet = Math.min(getBalance(), bet + BET_STEP);
          if (bet < MIN_BET) bet = MIN_BET;
        } else if (key === '\r' || key === '\n') {
          startDeal();
          return;
        }
        render();
        return;
      }

      if (phase === 'play') {
        if (key === 'h' || key === 'H') {
          playerHit();
        } else if (key === 's' || key === 'S') {
          playerStand();
        }
        return;
      }

      if (phase === 'result') {
        if (key === '\r' || key === '\n') {
          // Play again
          phase = 'bet';
          playerHand = [];
          dealerHand = [];
          resultMsg = '';
          message = '';
          render();
        }
        return;
      }
    }

    function cleanup() {
      stdin.removeListener('data', onKey);
    }

    stdin.on('data', onKey);
    render();
  });
}

module.exports = { openCasino };
