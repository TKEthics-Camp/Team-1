import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

// Catches mistakes, not style: unused code, undefined names, hooks called
// conditionally or with missing dependencies, and keys missing from lists.
// Formatting is left to the code's existing conventions.
export default [
  { ignores: ["dist/**", "ios/**", "node_modules/**", "supabase/**", "public/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: "18.3" } },
    plugins: { react, "react-hooks": reactHooks },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      // The app has no PropTypes; components document their props in comments.
      "react/prop-types": "off",
      // Apostrophes and quotes in copy are fine as typed.
      "react/no-unescaped-entities": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    // Tests and config run in Node.
    files: ["**/*.test.{js,jsx}", "*.config.js", "src/test/**"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
