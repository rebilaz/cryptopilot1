/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: { center: true, padding: { DEFAULT: '1rem', sm: '1.25rem', lg: '2rem' } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: {
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': '1.25rem',
      },
      fontFamily: { sans: ["var(--font-inter)", 'system-ui', 'sans-serif'] },
      boxShadow: {
        soft: '0 4px 16px -4px rgba(0,0,0,0.4), 0 2px 6px -1px rgba(0,0,0,0.3)'
      },
      keyframes: {
        fade: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'fade-up': { '0%': { opacity:0, transform:'translateY(12px)' }, '100%': { opacity:1, transform:'translateY(0)' } },
        'slide-in': { '0%': { opacity:0, transform:'translateX(-12px)' }, '100%': { opacity:1, transform:'translateX(0)' } },
      },
      animation: {
        fade: 'fade .5s ease-out both',
        'fade-up': 'fade-up .6s cubic-bezier(.4,.14,.3,1) both',
        'slide-in': 'slide-in .6s cubic-bezier(.4,.14,.3,1) both'
      },
      transitionTimingFunction: { 'swift': 'cubic-bezier(.4,.14,.3,1)' }
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
