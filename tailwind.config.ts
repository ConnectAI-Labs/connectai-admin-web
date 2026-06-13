import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#8b5cf6',
          strong: '#7c3aed',
          soft: '#a78bfa',
          dark: '#4c1d95',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      boxShadow: {
        panel: '0 24px 80px rgba(0,0,0,0.36)',
        brand: '0 14px 32px rgba(124,58,237,0.28)',
        'brand-mark': '0 16px 40px rgba(124,58,237,0.38)',
      },
    },
  },
  plugins: [],
}

export default config
