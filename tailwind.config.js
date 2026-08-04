module.exports = {
  /** @type {import('tailwindcss').Config} */
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        sc: {
          cream: '#FFFCF8',
          forest: '#163317',
          darkforest: '#0A180A',
          periwinkle: '#4571CB',
          beige: '#EDE8E1',
          beigeLight: 'rgba(237,232,225,0.6)',
          tan: '#FEF7EE',
          muted: '#6B6B6B',
          border: '#D1C7B8',
          green: '#1E5D1E',
          pink: '#e91e8c',
          pinkLight: '#ff69b4',
          pinkPale: '#fff0f5',
          pinkBorder: '#ffd6e8',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['DM Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.03em',
        tight: '-0.02em',
      },
      borderRadius: {
        pill: '32px',
        card: '16px',
        badge: '16px',
        sm2: '8px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'marquee': 'marquee 30s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
