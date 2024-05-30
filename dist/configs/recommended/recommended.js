"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recommended = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        sourceType: "module",
    },
    plugins: ["@jespers/css-modules"],
    rules: {
        "@jespers/css-modules/no-unused-classes": "error",
    },
};
exports.default = recommended;
