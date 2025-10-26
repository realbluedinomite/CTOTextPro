import tailwindPlugin from 'prettier-plugin-tailwindcss';

/** @type {import('prettier').Config} */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  plugins: [tailwindPlugin],
};

export default config;
