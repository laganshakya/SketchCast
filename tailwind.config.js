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
        ink: '#101313',
        paper: {
          DEFAULT: '#f5f0e9',
          card: '#fcf9f4',
          elevated: '#ffffff',
        },
        lime: '#d7ff2f',
        orange: {
          DEFAULT: '#ff6337',
          hover: '#e54f24',
          light: '#ff8663',
        },
        sky: '#a6e5ff',
        muted: '#65655f',
        hairline: {
          DEFAULT: 'rgba(16, 19, 19, 0.08)',
          strong: 'rgba(16, 19, 19, 0.16)',
        },
        obsidian: '#101313',
        chalk: '#f5f0e9',
        monolith: {
          canvas: '#101313',
          card: '#161919',
          elevated: '#202424',
          subtle: '#2b3030',
          border: 'rgba(255, 255, 255, 0.12)',
          'border-strong': 'rgba(255, 255, 255, 0.24)',
        },
        cobalt: {
          500: '#ff6337',
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
        'subtle': '0 1px 3px 0 rgba(16, 19, 19, 0.06)',
        'card': '0 2px 14px -3px rgba(16, 19, 19, 0.05)',
        'card-elevated': '0 10px 30px -4px rgba(16, 19, 19, 0.08)',
        'modal': '0 24px 60px -12px rgba(16, 19, 19, 0.25)',
        'glow-orange': '0 0 24px -4px rgba(255, 99, 55, 0.3)',
      },
    },
  },
  plugins: [],
}
