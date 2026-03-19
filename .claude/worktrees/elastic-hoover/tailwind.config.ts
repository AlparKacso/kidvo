import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        primary: {
          DEFAULT: '#523650',
          deep:    '#3D2840',
          lt:      'rgba(82,54,80,0.07)',
          border:  'rgba(82,54,80,0.15)',
        },
        gold: {
          DEFAULT: '#F0A500',
          deep:    '#C98A00',
          lt:      '#FEF3D0',
          text:    '#8A5C00',
        },
        // Neutrals
        bg:      '#F5F5F3',
        surface: '#EDEDEB',
        border: {
          DEFAULT: '#E4E4E0',
          mid:     '#CFCFCA',
        },
        // Text
        ink: {
          DEFAULT: '#1C1C1E',
          mid:     '#5C5C60',
          muted:   '#A8A8AD',
        },
        // Status
        success: {
          DEFAULT: '#1A7A4A',
          lt:      '#D6F5E5',
        },
        danger: {
          DEFAULT: '#C0392B',
          lt:      '#FDECEA',
        },
        info: {
          DEFAULT: '#2563EB',
          lt:      '#DBEAFE',
        },
        zinc: {
          DEFAULT: '#6B6B72',
          lt:      '#F0F0F2',
        },
        // Category accents
        cat: {
          sport:    '#523650',
          dance:    '#be123c',
          music:    '#0369a1',
          coding:   '#065f46',
          arts:     '#7c3aed',
          language: '#92400e',
          chess:    '#374151',
          gym:      '#b45309',
        },
        // Sidebar
        sidebar: {
          text:   'rgba(255,255,255,0.62)',
          hover:  'rgba(255,255,255,0.08)',
          muted:  'rgba(255,255,255,0.25)',
          active: 'rgba(255,255,255,0.11)',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['Instrument Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['12px', { lineHeight: '18px' }],
        'base':['13.5px', { lineHeight: '21px' }],
        'md':  ['15px', { lineHeight: '23px' }],
        'lg':  ['17px', { lineHeight: '25px' }],
        'xl':  ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
      },
      borderRadius: {
        DEFAULT: '8px',
        'lg':    '14px',
        'full':  '9999px',
      },
      width: {
        sidebar: '228px',
      },
      height: {
        topbar: '54px',
      },
      spacing: {
        'content-x': '28px',
        'content-y': '26px',
      },
      boxShadow: {
        'card-hover': '0 6px 24px rgba(82,54,80,0.10)',
        'focus':      '0 0 0 3px rgba(82,54,80,0.07)',
      },
      letterSpacing: {
        'label': '0.12em',
        'nav':   '0.16em',
      },
    },
  },
  plugins: [],
}

export default config
