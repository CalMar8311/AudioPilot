/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          950: '#05060a',
          900: '#0a0c14',
          850: '#0f121d',
          800: '#141826',
          750: '#1a1f30',
          700: '#222840',
          600: '#2d3450',
          500: '#3a4366',
          400: '#525c82',
          300: '#7a85ad',
          200: '#a8b1d0',
          100: '#d4d9ee',
          50: '#eef0fb',
        },
        neon: {
          cyan: '#22e6ff',
          blue: '#3b82f6',
          magenta: '#ff3df0',
          lime: '#a3ff3d',
          amber: '#ffb547',
          rose: '#ff5d73',
        },
      },
      boxShadow: {
        glow: '0 0 18px rgba(34,230,255,0.35)',
        glowMagenta: '0 0 18px rgba(255,61,240,0.35)',
        panel: '0 10px 40px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        sheen: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        slideIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        floaty: 'floaty 5s ease-in-out infinite',
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
        sheen: 'sheen 1.2s ease-out',
        slideIn: 'slideIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
