/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Fira Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        success: 'var(--green)',
        danger: 'var(--red)',
        warning: 'var(--amber)',
      },
    },
  },
  plugins: [],
}
