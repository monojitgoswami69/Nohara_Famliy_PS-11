/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['JetBrains Mono', 'Fira Code', 'monospace'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        slate: {
          750: '#2d3748',
          850: '#1a202c',
          950: '#0b1120',
        },
        neo: {
          yellow: '#FFDC58',
          purple: '#D6C5FF',
          green: '#A3E635',
          pink: '#FF85A2',
          blue: '#80E5FF',
          orange: '#FF9F43',
          red: '#FF6B6B',
          bg: {
            light: '#FAF7F0',
            dark: '#12131C',
            card: '#1B1C28',
            cardLight: '#FFFFFF',
          },
        },
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px #000000',
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo-lg': '6px 6px 0px 0px #000000',
        'neo-xl': '8px 8px 0px 0px #000000',
        'neo-white': '4px 4px 0px 0px #FFFFFF',
        'neo-white-sm': '2px 2px 0px 0px #FFFFFF',
        'neo-purple': '4px 4px 0px 0px #D6C5FF',
        'neo-yellow': '4px 4px 0px 0px #FFDC58',
      },
      borderWidth: {
        '3': '3px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
        'slide-in': 'slideIn 0.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

