/**
 * Studio Noma Theme Engine for SketchCast
 * Manages Light Mode ('Paper & Ink Studio'), Dark Mode ('Obsidian Monolith Studio'),
 * and automatic System Preference synchronization with zero layout shift or FOUC.
 */

import { useEffect, useSyncExternalStore } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'sketchcast_theme';
const listeners = new Set<() => void>();

function getSystemPreference(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'light';
}

export function getResolvedTheme(mode?: ThemeMode): ResolvedTheme {
  const current = mode ?? getStoredTheme();
  if (current === 'system') {
    return getSystemPreference();
  }
  return current;
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const resolved = getResolvedTheme(mode);
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }

  // Update mobile browser theme color meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#0c0f0f' : '#f5f0e9');
  }
}

export function setTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  applyTheme(mode);
  listeners.forEach((listener) => listener());
}

export function toggleTheme(): ResolvedTheme {
  const currentResolved = getResolvedTheme();
  const nextMode: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
  setTheme(nextMode);
  return nextMode;
}

export function onThemeChange(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// Global system preference change listener
if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMediaChange = () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
      listeners.forEach((listener) => listener());
    }
  };

  try {
    mediaQuery.addEventListener('change', handleMediaChange);
  } catch {
    // Fallback for older browsers
    mediaQuery.addListener(handleMediaChange);
  }
}

/**
 * React hook to read and mutate the active theme
 */
export function useTheme() {
  const theme = useSyncExternalStore(
    onThemeChange,
    getStoredTheme,
    () => 'light' as ThemeMode
  );

  const resolvedTheme = getResolvedTheme(theme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };
}
