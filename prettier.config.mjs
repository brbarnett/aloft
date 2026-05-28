/** @type {import("prettier").Config} */
const config = {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 120,
    tabWidth: 4,
    plugins: ['@trivago/prettier-plugin-sort-imports'],
    importOrder: ['^react', '^@', '^[a-z]', '^[./]'],
    importOrderSeparation: false,
    importOrderSortSpecifiers: true,
};

export default config;
