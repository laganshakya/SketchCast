import type { SlideDeck } from '../../types';
import { getStarterSlideDecks } from './slideTemplates';

const DECKS_PREFIX = 'sketchcast_slide_decks_';
const ACTIVE_DECK_PREFIX = 'sketchcast_active_deck_';

export function getDecksStorageKey(roomCode: string): string {
  return `${DECKS_PREFIX}${(roomCode || 'SKT-789').toUpperCase().trim()}`;
}

export function getActiveDeckStorageKey(roomCode: string): string {
  return `${ACTIVE_DECK_PREFIX}${(roomCode || 'SKT-789').toUpperCase().trim()}`;
}

export function loadStoredDecks(roomCode: string): SlideDeck[] {
  if (typeof window === 'undefined') return getStarterSlideDecks(roomCode);
  try {
    const raw = localStorage.getItem(getDecksStorageKey(roomCode));
    if (raw) {
      const parsed: SlideDeck[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  const defaults = getStarterSlideDecks(roomCode);
  saveStoredDecks(roomCode, defaults);
  return defaults;
}

export function saveStoredDecks(roomCode: string, decks: SlideDeck[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getDecksStorageKey(roomCode), JSON.stringify(decks));
  } catch {
    // ignore
  }
}

export function getStoredActiveDeckId(roomCode: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(getActiveDeckStorageKey(roomCode));
  } catch {
    return null;
  }
}

export function setStoredActiveDeckId(roomCode: string, deckId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getActiveDeckStorageKey(roomCode), deckId);
  } catch {
    // ignore
  }
}

export function exportDeckToJSON(deck: SlideDeck): string {
  return JSON.stringify(deck, null, 2);
}

export function importDeckFromJSON(jsonText: string): SlideDeck {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.slides)) {
    throw new Error('Invalid Slide Deck file format: Missing slides array.');
  }

  const deck: SlideDeck = {
    id: `deck-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: String(parsed.title || 'Imported Presentation'),
    subtitle: parsed.subtitle ? String(parsed.subtitle) : undefined,
    description: parsed.description ? String(parsed.description) : undefined,
    category: String(parsed.category || 'General'),
    authorName: String(parsed.authorName || 'Anonymous'),
    slides: parsed.slides.map((s: any, idx: number) => ({
      id: s.id || `slide-${Date.now()}-${idx}`,
      type: s.type || 'content',
      title: s.title || `Slide ${idx + 1}`,
      subtitle: s.subtitle,
      badge: s.badge,
      bullets: Array.isArray(s.bullets) ? s.bullets : undefined,
      markdown: s.markdown,
      codeSnippet: s.codeSnippet,
      codeLanguage: s.codeLanguage || 'typescript',
      codeExplanation: s.codeExplanation,
      statValue: s.statValue,
      statLabel: s.statLabel,
      statTrend: s.statTrend,
      quoteText: s.quoteText,
      quoteAuthor: s.quoteAuthor,
      quoteRole: s.quoteRole,
      embeddedQuizQuestionId: s.embeddedQuizQuestionId,
      embeddedPollId: s.embeddedPollId,
      speakerNotes: s.speakerNotes,
      durationSeconds: s.durationSeconds,
      backgroundColor: s.backgroundColor,
    })),
    currentSlideIndex: 0,
    isPresenting: false,
    theme: parsed.theme || 'neo-brutalist',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return deck;
}

export function downloadDeckCartridge(deck: SlideDeck): void {
  const json = exportDeckToJSON(deck);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = deck.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  link.href = url;
  link.download = `sketchcast-deck-${safeTitle || 'presentation'}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
