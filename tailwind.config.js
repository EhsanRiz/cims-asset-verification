/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        '4d-blue': '#0088c4',
        '4d-green': '#8cc63f',
        '4d-brown': '#8b6914',
        '4d-gray': '#333333',
        '4d-light': '#f5f7fa',
      },
      fontFamily: {
        sans: ['Inter', 'Open Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
