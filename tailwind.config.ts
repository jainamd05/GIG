import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F6F4EE',
        ink: '#1C2B22',
        surface: '#FFFFFF',
        border: '#DAD5C7',
        primary: '#235347',
        'primary-dark': '#173A31',
        accent: '#C98A2C',
        muted: '#6B7568',
        danger: '#B3432D',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
