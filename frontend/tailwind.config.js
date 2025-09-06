/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        // Design System Colors
        background: '#0B0F12',
        surface: '#0F1720',
        'text-primary': '#EAEAEA',
        'text-secondary': '#A1A1A1',
        accent: '#FF5252',
        border: '#1F2937',
        success: '#22C55E',
        // Additional semantic colors
        error: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
        // Hover states
        'accent-hover': '#e53e3e',
        'surface-hover': '#1A1D23',
      },
      borderRadius: {
        'default': '12px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      boxShadow: {
        'default': '0 6px 18px rgba(0,0,0,0.6)',
        'card': '0 4px 12px rgba(0,0,0,0.4)',
        'modal': '0 20px 40px rgba(0,0,0,0.8)',
        'accent': '0 0 20px rgba(255, 82, 82, 0.3)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'slide-up': {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          'from': { transform: 'scale(0.95)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
