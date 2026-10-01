import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── MI 007 Institutional Dark Palette (exact Android match) ───
        'bg-midnight': '#0A1A33',
        'surface-card': '#0F2549',
        'surface-variant': '#15305C',
        'border-navy': '#1C3C6E',
        'mint-green': '#00E676',
        'crimson-red': '#FF1744',
        'accent-cyan': '#00B0FF',
        'cyber-gold': '#FFD600',
        'chart-bg': '#131722',
        'text-primary': '#FFFFFF',
        'text-secondary': '#CBD5E1',
        'text-muted': '#64748B',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #0A1A33 0%, #0F2549 40%, #15305C 100%)',
        'card-gradient': 'linear-gradient(180deg, #0F2549 0%, #0A1A33 100%)',
        'falcon-glow': 'radial-gradient(ellipse at 50% 0%, rgba(0,230,118,0.12) 0%, transparent 60%)',
      },
      animation: {
        'ticker': 'ticker 30s linear infinite',
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'price-flash-up': 'price-flash-up 0.5s ease-out',
        'price-flash-down': 'price-flash-down 0.5s ease-out',
        'radar-ping': 'radar-ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
        'fade-in': 'fade-in 0.6s ease-out',
        'slide-up': 'slide-up 0.7s ease-out',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'pulse-green': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'price-flash-up': {
          '0%': { backgroundColor: 'rgba(0,230,118,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'price-flash-down': {
          '0%': { backgroundColor: 'rgba(255,23,68,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'radar-ping': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '75%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(28,60,110,0.8)',
        'glow-green': '0 0 12px rgba(0,230,118,0.4)',
        'glow-gold': '0 0 20px rgba(255,214,0,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
