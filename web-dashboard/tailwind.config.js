/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        midnight: '#050816',
        'midnight-secondary': '#070C1F',
        ocean: {
          900: '#0B1224',
          800: '#101A31',
          700: '#15213F'
        },
        card: '#121E39',
        accent: {
          100: '#D6E4FF',
          200: '#A9C0FF',
          300: '#7EA0FF',
          400: '#5382FF',
          500: '#3369FF'
        },
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        muted: {
          300: '#B3C1E1',
          400: '#8FA1C6',
          500: '#6F80AA'
        }
      },
      backgroundImage: {
        'night-sky':
          'radial-gradient(circle at 20% 20%, rgba(83,130,255,0.28), transparent 55%), radial-gradient(circle at 80% 0%, rgba(53,105,255,0.22), transparent 50%), radial-gradient(circle at 50% 100%, rgba(29,78,216,0.18), transparent 55%), linear-gradient(180deg, #030712 0%, #050816 100%)'
      },
      boxShadow: {
        card: '0px 24px 60px rgba(8, 15, 40, 0.55)',
        glow: '0 0 0 1px rgba(83, 130, 255, 0.35), 0px 30px 80px rgba(49, 107, 255, 0.35)'
      },
      borderRadius: {
        '3xl': '1.75rem',
        '4xl': '2.25rem'
      },
      spacing: {
        13: '3.25rem'
      }
    }
  },
  plugins: []
}

