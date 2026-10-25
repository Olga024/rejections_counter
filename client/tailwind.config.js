/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                cream: '#fcf9f3',
            },
            fontFamily: {
                serif: ['STIX Two Text', 'Georgia', 'serif'],
            },
        },
    },
    plugins: [],
};