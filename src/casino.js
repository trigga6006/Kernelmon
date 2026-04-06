// ═══════════════════════════════════════════════════════════════
// CASINO — Gamble your credits in card games
// ═══════════════════════════════════════════════════════════════

const { Screen } = require('./screen');
const { colors, rgb, bgRgb } = require('./palette');
const { getBalance, spendCredits, addCredits } = require('./credits');

// ─── Theme colors ───

const neonCyan   = rgb(0, 255, 200);
const neonPink   = rgb(255, 50, 120);
const neonGold   = rgb(255, 215, 0);
const feltGreen  = rgb(30, 100, 50);
const feltBg     = bgRgb(12, 35, 22);
const tableBorder = rgb(0, 180, 130);
const dimGreen   = rgb(20, 70, 40);
const darkBg     = bgRgb(8, 10, 16);
const panelBg    = bgRgb(14, 18, 26);

// ─── Card constants ───

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = {
  '♠': colors.white,
  '♥': neonPink,
  '♦': neonPink,
  '♣': colors.white,
};
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const CODE_GLYPHS = [
  '0x', 'ff', '&&', '||', '>>', '<<', '::',  '//', '!=', '**',
  '~$', '#!', '%d', '0b', '=>', '{}', '[]', ';;', '++', '--',
];

function makeDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
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

// ─── Draw a card on screen ───

const CARD_W = 7;
const CARD_H = 5;

function drawCard(scr, x, y, card, faceDown) {
  const border = faceDown ? dimGreen : rgb(60, 80, 70);
  const cardBg = faceDown ? bgRgb(10, 25, 16) : bgRgb(22, 28, 38);

  scr.text(x, y, '╭─────╮', border);

  if (faceDown) {
    const hashClr = rgb(25, 55, 35);
    scr.text(x, y + 1, '│', border);
    scr.text(x + 1, y + 1, '▓▒▓▒▓', hashClr, bgRgb(10, 25, 16));
    scr.text(x + 6, y + 1, '│', border);
    scr.text(x, y + 2, '│', border);
    scr.text(x + 1, y + 2, '▒▓▒▓▒', hashClr, bgRgb(10, 25, 16));
    scr.text(x + 6, y + 2, '│', border);
    scr.text(x, y + 3, '│', border);
    scr.text(x + 1, y + 3, '▓▒▓▒▓', hashClr, bgRgb(10, 25, 16));
    scr.text(x + 6, y + 3, '│', border);
  } else {
    const suitColor = SUIT_COLORS[card.suit];
    const rankDisplay = card.rank === '10' ? '10' : card.rank + ' ';
    const rankRight  = card.rank === '10' ? '10' : ' ' + card.rank;

    scr.text(x, y + 1, '│', border);
    scr.text(x + 1, y + 1, rankDisplay, colors.white, cardBg, true);
    scr.text(x + 3, y + 1, '  ', null, cardBg);
    scr.text(x + 5, y + 1, card.suit, suitColor, cardBg);
    scr.text(x + 6, y + 1, '│', border);

    scr.text(x, y + 2, '│', border);
    scr.text(x + 1, y + 2, '  ', null, cardBg);
    scr.text(x + 3, y + 2, card.suit, suitColor, cardBg);
    scr.text(x + 4, y + 2, '  ', null, cardBg);
    scr.text(x + 6, y + 2, '│', border);

    scr.text(x, y + 3, '│', border);
    scr.text(x + 1, y + 3, card.suit, suitColor, cardBg);
    scr.text(x + 3, y + 3, '  ', null, cardBg);
    scr.text(x + 5, y + 3, rankRight, colors.white, cardBg, true);
    scr.text(x + 6, y + 3, '│', border);
  }

  scr.text(x, y + 4, '╰─────╯', border);
}

// ─── Table rendering helpers ───

function drawFeltBackground(scr, tx, ty, tw, th) {
  for (let y = ty + 1; y < ty + th - 1; y++) {
    for (let x = tx + 1; x < tx + tw - 1; x++) {
      scr.set(x, y, ' ', null, feltBg);
    }
  }
}

function drawTableBorder(scr, tx, ty, tw, th) {
  // Corners
  scr.set(tx, ty, '╔', tableBorder);
  scr.set(tx + tw - 1, ty, '╗', tableBorder);
  scr.set(tx, ty + th - 1, '╚', tableBorder);
  scr.set(tx + tw - 1, ty + th - 1, '╝', tableBorder);
  // Top/bottom
  for (let x = 1; x < tw - 1; x++) {
    scr.set(tx + x, ty, '═', tableBorder);
    scr.set(tx + x, ty + th - 1, '═', tableBorder);
  }
  // Sides
  for (let y = 1; y < th - 1; y++) {
    scr.set(tx, ty + y, '║', tableBorder);
    scr.set(tx + tw - 1, ty + y, '║', tableBorder);
  }
}

function drawDivider(scr, tx, ty, tw, y) {
  scr.set(tx, y, '╠', dimGreen);
  scr.set(tx + tw - 1, y, '╣', dimGreen);
  for (let x = 1; x < tw - 1; x++) {
    scr.set(tx + x, y, '─', dimGreen, feltBg);
  }
}

function drawCodeGlyphs(scr, w, h) {
  // Scatter code glyphs around the edges (outside the table)
  const glyphColor = rgb(20, 50, 35);
  const positions = [
    [2, 2], [w - 5, 2], [2, h - 3], [w - 5, h - 3],
    [1, Math.floor(h / 2)], [w - 4, Math.floor(h / 2)],
    [Math.floor(w / 4), 1], [Math.floor(w * 3 / 4), 1],
    [Math.floor(w / 4), h - 2], [Math.floor(w * 3 / 4), h - 2],
  ];
  for (let i = 0; i < positions.length; i++) {
    const glyph = CODE_GLYPHS[(i + Math.floor(Date.now() / 800)) % CODE_GLYPHS.length];
    scr.text(positions[i][0], positions[i][1], glyph, glyphColor);
  }
}

function centerTextOnFelt(scr, tx, tw, y, str, fg, bold) {
  const x = tx + Math.floor((tw - str.length) / 2);
  scr.text(x, y, str, fg, feltBg, bold);
}

// ─── Helpers to draw hands centered in a zone ───

function drawHandCentered(scr, tx, tw, y, hand, faceDownIdx) {
  const totalCardsW = hand.length * CARD_W + (hand.length - 1) * 1;
  let cardX = tx + Math.floor((tw - totalCardsW) / 2);
  for (let i = 0; i < hand.length; i++) {
    drawCard(scr, cardX, y, hand[i], i === faceDownIdx);
    cardX += CARD_W + 1;
  }
}

// ─── Casino lobby ───

const CASINO_GAMES = [
  { key: 'blackjack', label: 'BLACKJACK', desc: 'Beat the dealer to 21', icon: '♠' },
  { key: 'baccarat', label: 'BACCARAT', desc: 'Bet on player, banker, or tie', icon: '♣' },
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

    function render() {
      scr.clear();

      // Dim background
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          scr.set(x, y, ' ', null, darkBg);
        }
      }

      drawCodeGlyphs(scr, w, h);

      // Title
      scr.hline(0, 0, w, '═', dimGreen);
      scr.centerText(0, ' C A S I N O ', neonGold, null, true);

      // Balance
      const bal = getBalance();
      const balStr = `◆ ${bal.toLocaleString()}`;
      scr.text(w - balStr.length - 2, 0, balStr, colors.gold);

      // Subtitle
      scr.centerText(3, '[ SELECT GAME ]', neonCyan);

      // Game list centered
      const listY = Math.floor(h / 2) - CASINO_GAMES.length;
      for (let i = 0; i < CASINO_GAMES.length; i++) {
        const game = CASINO_GAMES[i];
        const selected = i === cursor;
        const line = `${game.icon}  ${game.label}  ─  ${game.desc}`;
        const x = Math.floor((w - line.length) / 2);
        const y = listY + i * 2;

        if (selected) {
          const prefix = '▸ ';
          scr.text(x - 3, y, prefix, neonCyan, null, true);
          scr.text(x, y, line, neonGold, null, true);
        } else {
          scr.text(x, y, line, colors.dim);
        }
      }

      // Footer
      scr.hline(0, h - 3, w, '═', dimGreen);
      const footer = '[ENTER] Play   [ESC] Back';
      scr.text(Math.floor((w - footer.length) / 2), h - 2, footer, colors.dim);

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
        if (game.key === 'blackjack' || game.key === 'baccarat') {
          cleanup();
          if (game.key === 'blackjack') await playBlackjack(scr);
          else await playBaccarat(scr);
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
const TABLE_W = 56;
const TABLE_H = 22;

async function playBlackjack(scr) {
  return new Promise((resolve) => {
    const w = scr.width;
    const h = scr.height;

    // Center the table
    const tw = Math.min(TABLE_W, w - 4);
    const th = Math.min(TABLE_H, h - 4);
    const tx = Math.floor((w - tw) / 2);
    const ty = Math.floor((h - th) / 2);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    // Game state
    let phase = 'bet';       // 'bet' | 'play' | 'result'
    let bet = MIN_BET;
    let deck = [];
    let dealerHand = [];
    let hands = [[]];        // array of player hands (split creates two)
    let handBets = [];       // bet per hand
    let activeHand = 0;      // which hand is being played
    let doubled = [];         // whether each hand was doubled down
    let resultMsgs = [];     // result message per hand
    let resultColors = [];   // result color per hand
    let totalWinLoss = 0;    // net result across all hands
    let message = '';

    function canSplit() {
      return hands.length === 1
        && hands[0].length === 2
        && hands[0][0].rank === hands[0][1].rank
        && getBalance() >= handBets[0];
    }

    function canDouble() {
      return hands[activeHand].length === 2
        && getBalance() >= handBets[activeHand];
    }

    function render() {
      scr.clear();
      const bal = getBalance();

      // Dark background fill
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          scr.set(x, y, ' ', null, darkBg);
        }
      }

      drawCodeGlyphs(scr, w, h);

      // Top header line
      scr.hline(0, 0, w, '═', dimGreen);
      scr.centerText(0, ' B L A C K J A C K ', neonGold, null, true);

      // Balance top-right
      const balStr = `◆ ${bal.toLocaleString()}`;
      scr.text(w - balStr.length - 2, 0, balStr, colors.gold);

      // Draw the table
      drawFeltBackground(scr, tx, ty, tw, th);
      drawTableBorder(scr, tx, ty, tw, th);

      if (phase === 'bet') {
        renderBetPhase(bal);
      } else if (phase === 'play') {
        renderPlayPhase();
      } else if (phase === 'result') {
        renderResultPhase();
      }

      // Footer
      scr.hline(0, h - 1, w, '═', dimGreen);

      scr.render();
    }

    function renderBetPhase(bal) {
      centerTextOnFelt(scr, tx, tw, ty + 2, '╸ PLACE YOUR BET ╺', neonCyan, true);

      // Decorative scanlines on felt
      for (let y = ty + 4; y < ty + th - 4; y += 2) {
        for (let x = tx + 2; x < tx + tw - 2; x++) {
          scr.set(x, y, '·', dimGreen, feltBg);
        }
      }

      const midY = ty + Math.floor(th / 2);
      centerTextOnFelt(scr, tx, tw, midY - 2, '◄ ─────── ►', colors.dim, false);
      const betStr = `◆  ${bet}`;
      centerTextOnFelt(scr, tx, tw, midY, betStr, neonGold, true);
      centerTextOnFelt(scr, tx, tw, midY + 2, `min ${MIN_BET}  ·  balance ${bal.toLocaleString()}`, colors.dim, false);

      if (bet > bal) {
        centerTextOnFelt(scr, tx, tw, midY + 4, '!! NOT ENOUGH CREDITS !!', neonPink, true);
      }

      const ctrl = '[LEFT/RIGHT] Adjust   [ENTER] Deal   [ESC] Back';
      scr.text(Math.floor((w - ctrl.length) / 2), h - 2, ctrl, colors.dim);
    }

    function renderPlayPhase() {
      // Total bet across hands
      const totalBet = handBets.reduce((s, b) => s + b, 0);
      const betStr = `BET ◆ ${totalBet}`;
      scr.text(tx + 3, ty + 1, betStr, neonGold, feltBg, true);

      if (hands.length > 1) {
        const handLabel = `Hand ${activeHand + 1}/${hands.length}`;
        scr.text(tx + tw - handLabel.length - 3, ty + 1, handLabel, neonCyan, feltBg, true);
      }

      // Dealer zone
      const dealerLabelY = ty + 3;
      const dealerCardsY = ty + 4;
      const dealerVal = cardValue(dealerHand[0]);

      centerTextOnFelt(scr, tx, tw, dealerLabelY, `D E A L E R   (${dealerVal})`, colors.dim, false);
      drawHandCentered(scr, tx, tw, dealerCardsY, dealerHand, 1);

      // Divider
      const divY = ty + Math.floor(th / 2);
      drawDivider(scr, tx, ty, tw, divY);
      const divLabel = ' 21 ';
      scr.text(tx + Math.floor((tw - divLabel.length) / 2), divY, divLabel, tableBorder, feltBg, true);

      // Player zone
      if (hands.length === 1) {
        // Single hand ─ centered
        const hand = hands[0];
        const total = handTotal(hand);
        const totalColor = total > 21 ? neonPink : neonCyan;
        const label = doubled[0] ? `Y O U   (${total})  ×2` : `Y O U   (${total})`;
        centerTextOnFelt(scr, tx, tw, divY + 1, label, totalColor, true);
        drawHandCentered(scr, tx, tw, divY + 2, hand, -1);
      } else {
        // Split hands ─ side by side
        const halfW = Math.floor((tw - 2) / 2);
        for (let hi = 0; hi < hands.length; hi++) {
          const hand = hands[hi];
          const total = handTotal(hand);
          const isActive = hi === activeHand;
          const zoneX = tx + 1 + hi * (halfW + 1);

          // Hand label
          const labelColor = isActive ? neonCyan : colors.dim;
          const marker = isActive ? '▸ ' : '  ';
          const dblTag = doubled[hi] ? ' ×2' : '';
          const label = `${marker}Hand ${hi + 1} (${total})${dblTag}`;
          scr.text(zoneX + Math.floor((halfW - label.length) / 2), divY + 1, label, labelColor, feltBg, isActive);

          // Bet per hand
          const hBet = `◆${handBets[hi]}`;
          scr.text(zoneX + Math.floor((halfW - hBet.length) / 2), divY + 2, hBet, colors.gold, feltBg, false);

          // Cards
          const cardsW = hand.length * CARD_W + (hand.length - 1);
          let cardX = zoneX + Math.floor((halfW - cardsW) / 2);
          for (let i = 0; i < hand.length; i++) {
            drawCard(scr, cardX, divY + 3, hand[i], false);
            cardX += CARD_W + 1;
          }
        }
      }

      if (message) {
        centerTextOnFelt(scr, tx, tw, ty + th - 2, message, neonGold, false);
      }

      // Build controls string based on available actions
      let ctrls = '[H] Hit   [S] Stand';
      if (canDouble()) ctrls += '   [D] Double';
      if (canSplit()) ctrls += '   [P] Split';
      ctrls += '   [ESC] Forfeit';
      scr.text(Math.floor((w - ctrls.length) / 2), h - 2, ctrls, colors.dim);
    }

    function renderResultPhase() {
      const totalBet = handBets.reduce((s, b) => s + b, 0);
      const betStr = `BET ◆ ${totalBet}`;
      scr.text(tx + 3, ty + 1, betStr, neonGold, feltBg, true);

      // Dealer zone ─ all face up
      const dealerTotal = handTotal(dealerHand);
      const dealerLabelY = ty + 3;
      const dealerCardsY = ty + 4;
      const dealerColor = dealerTotal > 21 ? neonPink : colors.dim;

      centerTextOnFelt(scr, tx, tw, dealerLabelY, `D E A L E R   (${dealerTotal})`, dealerColor, false);
      drawHandCentered(scr, tx, tw, dealerCardsY, dealerHand, -1);

      // Divider with net result
      const divY = ty + Math.floor(th / 2);
      drawDivider(scr, tx, ty, tw, divY);

      if (hands.length === 1) {
        const padResult = ` ${resultMsgs[0]} `;
        scr.text(tx + Math.floor((tw - padResult.length) / 2), divY, padResult, resultColors[0], feltBg, true);
      } else {
        // Show net result on divider
        const net = totalWinLoss >= 0 ? `NET: +◆ ${totalWinLoss}` : `NET: -◆ ${Math.abs(totalWinLoss)}`;
        const netColor = totalWinLoss > 0 ? colors.mint : totalWinLoss < 0 ? neonPink : neonGold;
        const padNet = ` ${net} `;
        scr.text(tx + Math.floor((tw - padNet.length) / 2), divY, padNet, netColor, feltBg, true);
      }

      // Player zone
      if (hands.length === 1) {
        const hand = hands[0];
        const total = handTotal(hand);
        const totalColor = total > 21 ? neonPink : neonCyan;
        const label = doubled[0] ? `Y O U   (${total})  ×2` : `Y O U   (${total})`;
        centerTextOnFelt(scr, tx, tw, divY + 1, label, totalColor, true);
        drawHandCentered(scr, tx, tw, divY + 2, hand, -1);
      } else {
        // Split hands ─ side by side with individual results
        const halfW = Math.floor((tw - 2) / 2);
        for (let hi = 0; hi < hands.length; hi++) {
          const hand = hands[hi];
          const total = handTotal(hand);
          const zoneX = tx + 1 + hi * (halfW + 1);
          const dblTag = doubled[hi] ? ' ×2' : '';

          // Result label per hand
          const rMsg = resultMsgs[hi] || '';
          scr.text(zoneX + Math.floor((halfW - rMsg.length) / 2), divY + 1, rMsg, resultColors[hi] || colors.dim, feltBg, true);

          // Hand total
          const totalLabel = `(${total})${dblTag}`;
          scr.text(zoneX + Math.floor((halfW - totalLabel.length) / 2), divY + 2, totalLabel, total > 21 ? neonPink : neonCyan, feltBg, false);

          // Cards
          const cardsW = hand.length * CARD_W + (hand.length - 1);
          let cardX = zoneX + Math.floor((halfW - cardsW) / 2);
          for (let i = 0; i < hand.length; i++) {
            drawCard(scr, cardX, divY + 3, hand[i], false);
            cardX += CARD_W + 1;
          }
        }
      }

      const ctrl = '[ENTER] Play again   [ESC] Back to Casino';
      scr.text(Math.floor((w - ctrl.length) / 2), h - 2, ctrl, colors.dim);
    }

    function startDeal() {
      const bal = getBalance();
      if (bet > bal) {
        message = 'NOT ENOUGH CREDITS';
        render();
        return false;
      }
      spendCredits(bet);

      deck = makeDeck();
      hands = [[deck.pop(), deck.pop()]];
      handBets = [bet];
      doubled = [false];
      dealerHand = [deck.pop(), deck.pop()];
      activeHand = 0;
      resultMsgs = [];
      resultColors = [];
      totalWinLoss = 0;
      message = '';

      // Natural blackjack (only on non-split single hand)
      if (handTotal(hands[0]) === 21) {
        phase = 'result';
        const winnings = Math.floor(bet * 2.5);
        addCredits(winnings);
        totalWinLoss = winnings - bet;
        resultMsgs = [`BLACKJACK! +◆ ${totalWinLoss}`];
        resultColors = [neonGold];
        render();
        return true;
      }

      phase = 'play';
      render();
      return true;
    }

    function playerHit() {
      const hand = hands[activeHand];
      hand.push(deck.pop());
      const total = handTotal(hand);
      if (total > 21) {
        // Bust this hand
        advanceHand();
      } else if (total === 21) {
        advanceHand();
      } else {
        render();
      }
    }

    function playerStand() {
      advanceHand();
    }

    function playerDouble() {
      if (!canDouble()) return;
      // Deduct additional bet
      spendCredits(handBets[activeHand]);
      handBets[activeHand] *= 2;
      doubled[activeHand] = true;
      // Deal exactly one card then auto-stand
      hands[activeHand].push(deck.pop());
      advanceHand();
    }

    function playerSplit() {
      if (!canSplit()) return;
      const hand = hands[0];
      // Deduct additional bet for second hand
      spendCredits(bet);
      // Split into two hands
      hands = [[hand[0], deck.pop()], [hand[1], deck.pop()]];
      handBets = [bet, bet];
      doubled = [false, false];
      activeHand = 0;
      render();
    }

    function advanceHand() {
      // Move to next hand, or to dealer if all hands done
      if (activeHand < hands.length - 1) {
        activeHand++;
        render();
      } else {
        dealerPlay();
        render();
      }
    }

    function dealerPlay() {
      // Dealer draws
      while (handTotal(dealerHand) < 17) {
        dealerHand.push(deck.pop());
      }
      const dealerTotal = handTotal(dealerHand);

      phase = 'result';
      resultMsgs = [];
      resultColors = [];
      totalWinLoss = 0;

      for (let hi = 0; hi < hands.length; hi++) {
        const pTotal = handTotal(hands[hi]);
        const hBet = handBets[hi];

        if (pTotal > 21) {
          resultMsgs.push(`BUST ─ -◆${hBet}`);
          resultColors.push(neonPink);
          totalWinLoss -= hBet;
        } else if (dealerTotal > 21) {
          addCredits(hBet * 2);
          resultMsgs.push(`Dealer busts ─ +◆${hBet}`);
          resultColors.push(colors.mint);
          totalWinLoss += hBet;
        } else if (pTotal > dealerTotal) {
          addCredits(hBet * 2);
          resultMsgs.push(`Win ─ +◆${hBet}`);
          resultColors.push(colors.mint);
          totalWinLoss += hBet;
        } else if (pTotal === dealerTotal) {
          addCredits(hBet);
          resultMsgs.push(`Push ─ returned`);
          resultColors.push(neonGold);
        } else {
          resultMsgs.push(`Lose ─ -◆${hBet}`);
          resultColors.push(neonPink);
          totalWinLoss -= hBet;
        }
      }
    }

    function onKey(key) {
      if (key === '\x1b') {
        if (phase === 'play') {
          // Forfeit all hands
          phase = 'result';
          resultMsgs = [];
          resultColors = [];
          totalWinLoss = 0;
          for (let hi = 0; hi < hands.length; hi++) {
            resultMsgs.push(`Forfeit`);
            resultColors.push(neonPink);
            totalWinLoss -= handBets[hi];
          }
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
        } else if (key === 'd' || key === 'D') {
          playerDouble();
        } else if (key === 'p' || key === 'P') {
          playerSplit();
        }
        return;
      }

      if (phase === 'result') {
        if (key === '\r' || key === '\n') {
          phase = 'bet';
          hands = [[]];
          handBets = [];
          doubled = [];
          dealerHand = [];
          resultMsgs = [];
          resultColors = [];
          totalWinLoss = 0;
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

// ─── Baccarat ───

function baccaratCardValue(card) {
  if (['10', 'J', 'Q', 'K'].includes(card.rank)) return 0;
  if (card.rank === 'A') return 1;
  return parseInt(card.rank, 10);
}

function baccaratTotal(hand) {
  let total = 0;
  for (const card of hand) total += baccaratCardValue(card);
  return total % 10;
}

function baccaratDeal(deck) {
  // Deal two cards each: Player, Banker alternating
  const playerHand = [deck.pop(), deck.pop()];
  const bankerHand = [deck.pop(), deck.pop()];

  const pTotal = baccaratTotal(playerHand);
  const bTotal = baccaratTotal(bankerHand);

  // Natural — 8 or 9 on either hand, no more cards
  if (pTotal >= 8 || bTotal >= 8) {
    return { playerHand, bankerHand, natural: true };
  }

  // Player third card rule
  let playerThird = null;
  if (pTotal <= 5) {
    playerThird = deck.pop();
    playerHand.push(playerThird);
  }

  // Banker third card rule
  if (playerThird === null) {
    // Player stood — banker draws on 0-5
    if (bTotal <= 5) bankerHand.push(deck.pop());
  } else {
    const p3 = baccaratCardValue(playerThird);
    if (bTotal <= 2) {
      bankerHand.push(deck.pop());
    } else if (bTotal === 3 && p3 !== 8) {
      bankerHand.push(deck.pop());
    } else if (bTotal === 4 && p3 >= 2 && p3 <= 7) {
      bankerHand.push(deck.pop());
    } else if (bTotal === 5 && p3 >= 4 && p3 <= 7) {
      bankerHand.push(deck.pop());
    } else if (bTotal === 6 && (p3 === 6 || p3 === 7)) {
      bankerHand.push(deck.pop());
    }
    // bTotal 7: banker stands
  }

  return { playerHand, bankerHand, natural: false };
}

const BACC_TABLE_W = 58;
const BACC_TABLE_H = 24;

async function playBaccarat(scr) {
  return new Promise((resolve) => {
    const w = scr.width;
    const h = scr.height;

    const tw = Math.min(BACC_TABLE_W, w - 4);
    const th = Math.min(BACC_TABLE_H, h - 4);
    const tx = Math.floor((w - tw) / 2);
    const ty = Math.floor((h - th) / 2);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    // Bet types
    const BET_SLOTS = ['player', 'tie', 'banker'];
    const BET_LABELS = { player: 'PLAYER', tie: 'TIE', banker: 'BANKER' };
    const BET_PAYOUTS = { player: '1:1', tie: '8:1', banker: '0.95:1' };
    const BET_ICONS = { player: '◇', tie: '◈', banker: '◆' };

    // Game state
    let phase = 'bet';  // 'bet' | 'result'
    let bets = { player: 0, tie: 0, banker: 0 };
    let betCursor = 0;  // index into BET_SLOTS
    let playerHand = [];
    let bankerHand = [];
    let resultMsg = '';
    let resultColor = neonGold;
    let winnings = 0;
    let wasNatural = false;

    function totalBet() {
      return bets.player + bets.tie + bets.banker;
    }

    function render() {
      scr.clear();
      const bal = getBalance();

      // Dark background
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          scr.set(x, y, ' ', null, darkBg);
        }
      }

      drawCodeGlyphs(scr, w, h);

      // Header
      scr.hline(0, 0, w, '═', dimGreen);
      scr.centerText(0, ' B A C C A R A T ', neonGold, null, true);

      const balStr = `◆ ${bal.toLocaleString()}`;
      scr.text(w - balStr.length - 2, 0, balStr, colors.gold);

      // Table
      drawFeltBackground(scr, tx, ty, tw, th);
      drawTableBorder(scr, tx, ty, tw, th);

      if (phase === 'bet') {
        renderBaccaratBet(bal);
      } else if (phase === 'result') {
        renderBaccaratResult();
      }

      scr.hline(0, h - 1, w, '═', dimGreen);
      scr.render();
    }

    function renderBaccaratBet(bal) {
      centerTextOnFelt(scr, tx, tw, ty + 2, '╸ PLACE YOUR BETS ╺', neonCyan, true);

      // Payout reference
      centerTextOnFelt(scr, tx, tw, ty + 4, 'Player 1:1    Tie 8:1    Banker 0.95:1', colors.dim, false);

      // Divider
      const divY = ty + 6;
      drawDivider(scr, tx, ty, tw, divY);

      // Three bet columns
      const colW = Math.floor((tw - 4) / 3);
      for (let i = 0; i < 3; i++) {
        const slot = BET_SLOTS[i];
        const label = BET_LABELS[slot];
        const icon = BET_ICONS[slot];
        const payout = BET_PAYOUTS[slot];
        const selected = i === betCursor;
        const colX = tx + 2 + i * (colW + 1);
        const centerX = colX + Math.floor(colW / 2);

        const labelY = divY + 2;
        const iconY = divY + 4;
        const betY = divY + 6;
        const payY = divY + 8;

        // Highlight selected column
        if (selected) {
          for (let row = divY + 1; row < divY + 10; row++) {
            for (let col = colX; col < colX + colW; col++) {
              scr.set(col, row, ' ', null, bgRgb(18, 50, 32));
            }
          }
          // Selection arrows
          scr.text(centerX - 1, betY - 1, '▲', neonCyan, bgRgb(18, 50, 32));
          scr.text(centerX - 1, betY + 1, '▼', neonCyan, bgRgb(18, 50, 32));
        }

        const bg = selected ? bgRgb(18, 50, 32) : feltBg;

        // Label
        const lx = centerX - Math.floor(label.length / 2);
        scr.text(lx, labelY, label, selected ? neonGold : colors.dim, bg, selected);

        // Icon
        scr.text(centerX - 1, iconY, icon, selected ? neonCyan : dimGreen, bg);

        // Bet amount
        const betStr = bets[slot] > 0 ? `◆ ${bets[slot]}` : '─ ─';
        const bx = centerX - Math.floor(betStr.length / 2);
        const betColor = bets[slot] > 0 ? neonGold : colors.dim;
        scr.text(bx, betY, betStr, betColor, bg, bets[slot] > 0);

        // Payout label
        const px = centerX - Math.floor(payout.length / 2);
        scr.text(px, payY, payout, colors.dim, bg);
      }

      // Total bet
      const tot = totalBet();
      if (tot > 0) {
        const totStr = `TOTAL BET: ◆ ${tot}`;
        centerTextOnFelt(scr, tx, tw, ty + th - 4, totStr, neonGold, true);
      }

      if (tot > bal + tot) {
        centerTextOnFelt(scr, tx, tw, ty + th - 3, '!! NOT ENOUGH CREDITS !!', neonPink, true);
      }

      // Controls
      const ctrl = '[LEFT/RIGHT] Select   [UP/DOWN] Adjust   [ENTER] Deal   [ESC] Back';
      scr.text(Math.max(0, Math.floor((w - ctrl.length) / 2)), h - 2, ctrl, colors.dim);
    }

    function renderBaccaratResult() {
      // Show bet amounts at top
      const betParts = [];
      if (bets.player > 0) betParts.push(`Player ◆${bets.player}`);
      if (bets.tie > 0) betParts.push(`Tie ◆${bets.tie}`);
      if (bets.banker > 0) betParts.push(`Banker ◆${bets.banker}`);
      const betLine = betParts.join('   ');
      scr.text(tx + Math.floor((tw - betLine.length) / 2), ty + 1, betLine, neonGold, feltBg, true);

      // Player hand — left side
      const halfW = Math.floor((tw - 2) / 2);
      const pZoneX = tx + 1;
      const bZoneX = tx + 1 + halfW + 1;

      // Player label
      const pTotal = baccaratTotal(playerHand);
      const pLabel = `P L A Y E R   (${pTotal})`;
      const pLabelX = pZoneX + Math.floor((halfW - pLabel.length) / 2);
      const pWin = resultMsg.includes('PLAYER');
      scr.text(pLabelX, ty + 3, pLabel, pWin ? neonCyan : colors.dim, feltBg, pWin);

      // Player cards
      const pCardsW = playerHand.length * CARD_W + (playerHand.length - 1);
      let pCardX = pZoneX + Math.floor((halfW - pCardsW) / 2);
      for (let i = 0; i < playerHand.length; i++) {
        drawCard(scr, pCardX, ty + 5, playerHand[i], false);
        pCardX += CARD_W + 1;
      }

      // Banker label
      const bTotal = baccaratTotal(bankerHand);
      const bLabel = `B A N K E R   (${bTotal})`;
      const bLabelX = bZoneX + Math.floor((halfW - bLabel.length) / 2);
      const bWin = resultMsg.includes('BANKER');
      scr.text(bLabelX, ty + 3, bLabel, bWin ? neonCyan : colors.dim, feltBg, bWin);

      // Banker cards
      const bCardsW = bankerHand.length * CARD_W + (bankerHand.length - 1);
      let bCardX = bZoneX + Math.floor((halfW - bCardsW) / 2);
      for (let i = 0; i < bankerHand.length; i++) {
        drawCard(scr, bCardX, ty + 5, bankerHand[i], false);
        bCardX += CARD_W + 1;
      }

      // Divider with result
      const divY = ty + 11;
      drawDivider(scr, tx, ty, tw, divY);

      // Natural badge
      if (wasNatural) {
        const natStr = ' ★ NATURAL ★ ';
        scr.text(tx + Math.floor((tw - natStr.length) / 2), divY - 1, natStr, neonGold, feltBg, true);
      }

      // Result message on divider
      const padResult = ` ${resultMsg} `;
      scr.text(tx + Math.floor((tw - padResult.length) / 2), divY, padResult, resultColor, feltBg, true);

      // Winnings/loss line
      const winLine = winnings > 0 ? `+◆ ${winnings}` : winnings < 0 ? `-◆ ${Math.abs(winnings)}` : '◆ 0 (push)';
      const winColor = winnings > 0 ? colors.mint : winnings < 0 ? neonPink : neonGold;
      centerTextOnFelt(scr, tx, tw, divY + 2, winLine, winColor, true);

      // Per-bet breakdown
      let breakdownY = divY + 4;
      if (bets.player > 0) {
        const pResult = pTotal > bTotal ? `Player: +◆${bets.player}` : pTotal === bTotal ? `Player: push` : `Player: -◆${bets.player}`;
        centerTextOnFelt(scr, tx, tw, breakdownY, pResult, pTotal > bTotal ? colors.mint : pTotal === bTotal ? neonGold : neonPink, false);
        breakdownY++;
      }
      if (bets.banker > 0) {
        const bResult = bTotal > pTotal ? `Banker: +◆${Math.floor(bets.banker * 0.95)}  (5% comm.)` : bTotal === pTotal ? `Banker: push` : `Banker: -◆${bets.banker}`;
        centerTextOnFelt(scr, tx, tw, breakdownY, bResult, bTotal > pTotal ? colors.mint : bTotal === pTotal ? neonGold : neonPink, false);
        breakdownY++;
      }
      if (bets.tie > 0) {
        const tResult = pTotal === bTotal ? `Tie: +◆${bets.tie * 8}` : `Tie: -◆${bets.tie}`;
        centerTextOnFelt(scr, tx, tw, breakdownY, tResult, pTotal === bTotal ? colors.mint : neonPink, false);
        breakdownY++;
      }

      const ctrl = '[ENTER] Play again   [ESC] Back to Casino';
      scr.text(Math.floor((w - ctrl.length) / 2), h - 2, ctrl, colors.dim);
    }

    function startDeal() {
      const tot = totalBet();
      if (tot === 0) return false;
      if (tot > getBalance()) return false;

      spendCredits(tot);

      const deck = makeDeck();
      const result = baccaratDeal(deck);
      playerHand = result.playerHand;
      bankerHand = result.bankerHand;
      wasNatural = result.natural;

      const pTotal = baccaratTotal(playerHand);
      const bTotal = baccaratTotal(bankerHand);

      // Determine winner
      let winner;
      if (pTotal > bTotal) winner = 'player';
      else if (bTotal > pTotal) winner = 'banker';
      else winner = 'tie';

      // Calculate winnings
      winnings = 0;

      // Player bet
      if (bets.player > 0) {
        if (winner === 'player') {
          winnings += bets.player * 2;      // return + 1:1
        } else if (winner === 'tie') {
          winnings += bets.player;           // push on tie
        }
        // loss: already spent
      }

      // Banker bet (5% commission on wins)
      if (bets.banker > 0) {
        if (winner === 'banker') {
          winnings += bets.banker + Math.floor(bets.banker * 0.95); // return + 0.95:1
        } else if (winner === 'tie') {
          winnings += bets.banker;           // push on tie
        }
      }

      // Tie bet
      if (bets.tie > 0) {
        if (winner === 'tie') {
          winnings += bets.tie * 9;          // return + 8:1
        }
        // loss: already spent
      }

      if (winnings > 0) addCredits(winnings);

      // Net result (winnings minus what was bet)
      winnings = winnings - tot;

      // Result message
      if (winner === 'player') {
        resultMsg = `PLAYER WINS (${pTotal} vs ${bTotal})`;
        resultColor = bets.player > 0 ? colors.mint : neonPink;
      } else if (winner === 'banker') {
        resultMsg = `BANKER WINS (${bTotal} vs ${pTotal})`;
        resultColor = bets.banker > 0 ? colors.mint : neonPink;
      } else {
        resultMsg = `TIE (${pTotal})`;
        resultColor = bets.tie > 0 ? colors.mint : neonGold;
      }

      phase = 'result';
      render();
      return true;
    }

    function onKey(key) {
      if (key === '\x1b') {
        cleanup();
        resolve();
        return;
      }

      if (phase === 'bet') {
        const slot = BET_SLOTS[betCursor];
        if (key === '\x1b[D' || key === 'a') {
          betCursor = Math.max(0, betCursor - 1);
        } else if (key === '\x1b[C' || key === 'd') {
          betCursor = Math.min(BET_SLOTS.length - 1, betCursor + 1);
        } else if (key === '\x1b[A' || key === 'w') {
          const maxAdd = getBalance() - totalBet();
          if (maxAdd >= BET_STEP) {
            bets[slot] += BET_STEP;
          }
        } else if (key === '\x1b[B' || key === 's') {
          bets[slot] = Math.max(0, bets[slot] - BET_STEP);
        } else if (key === '\r' || key === '\n') {
          if (totalBet() > 0) startDeal();
        }
        render();
        return;
      }

      if (phase === 'result') {
        if (key === '\r' || key === '\n') {
          phase = 'bet';
          bets = { player: 0, tie: 0, banker: 0 };
          playerHand = [];
          bankerHand = [];
          resultMsg = '';
          winnings = 0;
          wasNatural = false;
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
