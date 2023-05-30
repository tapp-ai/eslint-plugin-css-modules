import { TSESLint } from "@typescript-eslint/utils";

const recommended: TSESLint.CLIEngine.Options = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    extraFileExtensions: [".css"],
  },
  plugins: ["@jespers/css-modules"],
  rules: {
    "@jespers/css-modules/no-unused-classes": "error",
  },
};

export default recommended;
