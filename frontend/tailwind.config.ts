import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ERD Viewer custom tokens — dark mode matches Databricks workspace
        erd: {
          // Backgrounds
          'bg-primary-light': '#FFFFFF',
          'bg-primary-dark': '#000000',
          'bg-sidebar-light': '#F8FAFC',
          'bg-sidebar-dark': '#1e1e1e',
          'bg-node-light': '#FFFFFF',
          'bg-node-dark': '#222',

          // Borders
          'border-node-light': '#E2E8F0',
          'border-node-dark': '#333',

          // Text
          'text-primary-light': '#1E293B',
          'text-primary-dark': '#E2E8F0',
          'text-secondary-light': '#64748B',
          'text-secondary-dark': '#94A3B8',

          // Accents
          'pk-light': '#F59E0B',
          'pk-dark': '#FBBF24',
          'fk-light': '#3B82F6',
          'fk-dark': '#60A5FA',
          'inferred-light': '#D97706',
          'inferred-dark': '#FCD34D',

          // Edges
          'edge-explicit-light': '#3B82F6',
          'edge-explicit-dark': '#60A5FA',
          'edge-inferred-light': '#D97706',
          'edge-inferred-dark': '#FCD34D',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
