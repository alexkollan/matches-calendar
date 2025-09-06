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
        // Design System Colors - matching CSS custom properties
        background: '#0B0F12',
        surface: '#0F1720',
        'surface-elevated': '#1A1D23',
        border: '#1F2937',
        'border-subtle': '#374151',
        'text-primary': '#EAEAEA',
        'text-secondary': '#A1A1A1',
        'text-tertiary': '#6B7280',
        'text-inverse': '#111827',
        accent: '#FF5252',
        'accent-hover': '#e53e3e',
        'accent-soft': '#ffebee',
        success: '#22C55E',
        'success-hover': '#16A34A',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Alias for primary
        primary: {
          DEFAULT: '#FF5252',
          hover: '#e53e3e',
          50: '#ffebee',
          500: '#FF5252',
          600: '#e53e3e',
          700: '#c53030',
        },
      },
      spacing: {
        '16': '4rem',   // 64px for sidebar closed
        '64': '16rem',  // 256px for sidebar open
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(255, 82, 82, 0.3)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '350ms',
      },
      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      }
    },
  },
  plugins: [],
}
        '88': '22rem',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
