import allColors from 'tailwindcss/colors'

// tailwindcss/colors ships a few renamed/deprecated aliases that just log warnings; drop them.
const { lightBlue, warmGray, trueGray, coolGray, blueGray, ...colors } = allColors

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    // Top-level (not `extend`) so slate/white resolve through CSS variables that flip between
    // themes defined in index.css — every existing `bg-slate-900`, `text-white` etc. across the
    // app becomes theme-aware without touching component files. The 200/300/400 shades of the
    // brand accent colors get the same treatment (darkened on light-surface themes for text
    // contrast) — only those three, since 500+ are used for filled button/badge backgrounds and
    // gradients that already pair with their own contrasting foreground and don't need to change.
    colors: {
      ...colors,
      white: 'rgb(var(--color-white) / <alpha-value>)',
      slate: {
        50: 'rgb(var(--color-slate-50) / <alpha-value>)',
        100: 'rgb(var(--color-slate-100) / <alpha-value>)',
        200: 'rgb(var(--color-slate-200) / <alpha-value>)',
        300: 'rgb(var(--color-slate-300) / <alpha-value>)',
        400: 'rgb(var(--color-slate-400) / <alpha-value>)',
        500: 'rgb(var(--color-slate-500) / <alpha-value>)',
        600: 'rgb(var(--color-slate-600) / <alpha-value>)',
        700: 'rgb(var(--color-slate-700) / <alpha-value>)',
        800: 'rgb(var(--color-slate-800) / <alpha-value>)',
        900: 'rgb(var(--color-slate-900) / <alpha-value>)',
        950: 'rgb(var(--color-slate-950) / <alpha-value>)',
      },
      cyan: { ...colors.cyan, 200: 'rgb(var(--color-cyan-200) / <alpha-value>)', 300: 'rgb(var(--color-cyan-300) / <alpha-value>)', 400: 'rgb(var(--color-cyan-400) / <alpha-value>)' },
      violet: { ...colors.violet, 200: 'rgb(var(--color-violet-200) / <alpha-value>)', 300: 'rgb(var(--color-violet-300) / <alpha-value>)', 400: 'rgb(var(--color-violet-400) / <alpha-value>)' },
      emerald: { ...colors.emerald, 200: 'rgb(var(--color-emerald-200) / <alpha-value>)', 300: 'rgb(var(--color-emerald-300) / <alpha-value>)', 400: 'rgb(var(--color-emerald-400) / <alpha-value>)' },
      rose: { ...colors.rose, 200: 'rgb(var(--color-rose-200) / <alpha-value>)', 300: 'rgb(var(--color-rose-300) / <alpha-value>)', 400: 'rgb(var(--color-rose-400) / <alpha-value>)' },
      amber: { ...colors.amber, 200: 'rgb(var(--color-amber-200) / <alpha-value>)', 300: 'rgb(var(--color-amber-300) / <alpha-value>)', 400: 'rgb(var(--color-amber-400) / <alpha-value>)' },
    },
    extend: {
      colors: {
        background: '#0B0F19',
        card: 'rgba(30, 41, 59, 0.65)',
        border: 'rgba(255, 255, 255, 0.1)',
        cyanAccent: 'rgb(var(--color-cyanAccent) / <alpha-value>)',
        violetAccent: 'rgb(var(--color-violetAccent) / <alpha-value>)',
        emeraldAccent: 'rgb(var(--color-emeraldAccent) / <alpha-value>)',
        roseAccent: 'rgb(var(--color-roseAccent) / <alpha-value>)',
        amberAccent: 'rgb(var(--color-amberAccent) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'sans-serif'],
      },
      backdropBlur: {
        glass: '16px',
      }
    },
  },
  plugins: [],
}
