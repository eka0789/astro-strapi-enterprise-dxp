/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#030712',
          900: '#070c18',
          850: '#0d1527',
          800: '#141f36',
          750: '#1c2a47',
          700: '#253759',
          600: '#384d75',
        },
        nova: {
          cyan: '#06b6d4',
          'cyan-glow': '#22d3ee',
          indigo: '#6366f1',
          'indigo-glow': '#818cf8',
          violet: '#8b5cf6',
          'violet-glow': '#a78bfa',
          fuchsia: '#d946ef',
          emerald: '#10b981',
          'emerald-glow': '#34d399',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'float-slow': 'float 7s ease-in-out infinite',
        'float-delayed': 'float 8s ease-in-out 3.5s infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'spin-slow': 'spin 22s linear infinite',
        'shimmer': 'shimmer 2.2s infinite linear',
        'beam': 'beam 4s ease-in-out infinite',
        'meteor': 'meteor 6s linear infinite',
        'marquee': 'marquee 25s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-14px) rotate(1deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.05)' },
        },
        gradientShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        beam: {
          '0%, 100%': { transform: 'translateX(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        meteor: {
          '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { transform: 'rotate(215deg) translateX(-700px)', opacity: '0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      backgroundImage: {
        'radial-hero': 'radial-gradient(circle at 50% 15%, rgba(99, 102, 241, 0.22) 0%, rgba(6, 182, 212, 0.12) 35%, transparent 70%)',
        'radial-conic': 'conic-gradient(from 180deg at 50% 50%, #06b6d4 0deg, #6366f1 120deg, #d946ef 240deg, #06b6d4 360deg)',
      },
      boxShadow: {
        'glow-cyan': '0 0 35px -5px rgba(6, 182, 212, 0.35)',
        'glow-indigo': '0 0 35px -5px rgba(99, 102, 241, 0.35)',
        'glow-violet': '0 0 35px -5px rgba(139, 92, 246, 0.35)',
        'glow-card': '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px -5px rgba(99, 102, 241, 0.15)',
      }
    },
  },
  plugins: [],
};
