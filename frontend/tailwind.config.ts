import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark base palette
        base: '#0a0a0f',
        surface: '#111118',
        elevated: '#1a1a24',
        card: '#16161f',
        'border-subtle': '#1e1e2e',
        'border-default': '#252535',

        // Accent — violet/purple
        accent: {
          DEFAULT: '#7c3aed',
          hover: '#6d28d9',
          light: '#a78bfa',
          muted: 'rgba(124, 58, 237, 0.12)',
        },

        // Status colors
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',

        // Typography
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'text-muted': '#64748b',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-hero':
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.25) 0%, transparent 70%)',
        'gradient-card':
          'linear-gradient(145deg, rgba(26,26,36,0.9) 0%, rgba(22,22,31,0.95) 100%)',
        'shimmer':
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'fade-up': 'fadeUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        shimmer: 'shimmer 1.8s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      boxShadow: {
        glow: '0 0 20px rgba(124, 58, 237, 0.2)',
        'glow-lg': '0 0 40px rgba(124, 58, 237, 0.25)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
        modal: '0 20px 60px rgba(0, 0, 0, 0.6)',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
};

export default config;
