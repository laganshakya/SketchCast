/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        paper: {
          DEFAULT: 'var(--paper)',
          card: 'var(--paper-card)',
          surface: 'var(--paper-surface)',
          elevated: 'var(--paper-elevated)',
        },
        lime: 'var(--lime)',
        orange: {
          DEFAULT: 'var(--orange)',
          hover: '#e54f24',
          light: '#ff8663',
        },
        sky: 'var(--sky)',
        muted: 'var(--muted)',
        hairline: {
          DEFAULT: 'var(--hairline)',
          strong: 'var(--hairline-strong)',
        },
        obsidian: '#101313',
        chalk: '#f5f0e9',
        monolith: {
          canvas: 'var(--paper)',
          card: 'var(--paper-card)',
          elevated: 'var(--paper-elevated)',
          subtle: '#2b3030',
          border: 'var(--hairline)',
          'border-strong': 'var(--hairline-strong)',
        },
        cobalt: {
          500: 'var(--orange)',
          600: '#e54f24',
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        display: ['"DM Serif Display"', 'Manrope', 'sans-serif'],
        mono: ['"DM Mono"', '"JetBrains Mono"', 'Menlo', 'monospace'],
        question: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': 'var(--shadow-subtle, 0 1px 3px 0 rgba(16, 19, 19, 0.06))',
        'card': 'var(--shadow-card, 0 2px 14px -3px rgba(16, 19, 19, 0.05))',
        'card-elevated': 'var(--shadow-elevated, 0 10px 30px -4px rgba(16, 19, 19, 0.08))',
        'modal': '0 24px 60px -12px rgba(0, 0, 0, 0.35)',
        'glow-orange': '0 0 24px -4px rgba(255, 99, 55, 0.35)',
      },
    },
  },
  plugins: [],
}
