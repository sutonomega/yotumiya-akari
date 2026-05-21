module.exports = [
  {
    files: ["**/*.js"],

    languageOptions: {
      ecmaVersion: 2022,

      sourceType: "commonjs",

      globals: {
        console: "readonly",
        process: "readonly",
        fetch: "readonly",
      },
    },

    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
    },
  },
];
