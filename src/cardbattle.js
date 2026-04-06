// ═══════════════════════════════════════════════════════════════
// CARD BATTLE MODE — Orchestrates the full card battle flow
// Opponent select → card draft → turn battle (card mode) → rewards
// ═══════════════════════════════════════════════════════════════

const {
  getOwnedCards, grantStarterPack, addCard, rollCardDrop, selectAICards,
  CARD_RARITY_COLORS, CARD_RARITY_ICONS, CARDS,
} = require('./cards');
const { selectCards } = require('./cardselect');
const { openCardCollection } = require('./cardcollection');

// AI difficulty based on opponent tier
function getAIDifficulty(opponentTier) {
  const map = { flagship: 'boss', high: 'elite', mid: 'hard', low: 'mid' };
  return map[opponentTier] || 'mid';
}

module.exports = {
  getOwnedCards,
  grantStarterPack,
  addCard,
  rollCardDrop,
  selectAICards,
  selectCards,
  openCardCollection,
  getAIDifficulty,
};
