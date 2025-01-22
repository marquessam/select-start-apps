/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ra-blue': '#17254A',
        'ra-dark': '#2a3a6a',
        'ra-purple': '#5c3391',
      },
    },
  },
  plugins: [],
}
