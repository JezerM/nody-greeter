module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 13,
  },
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    "prettier/prettier": "error",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/explicit-member-accessibility": "error",
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: [
          "variable",
          "function",
          "parameter",
          "parameterProperty",
          "classProperty",
          "classMethod",
          "accessor",
          "enumMember",
        ],
        format: ["camelCase", "UPPER_CASE"],
        filter: {
          regex:
            "^(LightDM|greeter_config|theme_utils|greeter_comm|_ready_event)\\w*",
          match: false,
        },
        leadingUnderscore: "allowSingleOrDouble",
      },
      {
        selector: ["class", "interface", "enum", "typeAlias"],
        format: ["PascalCase"],
      },
      {
        selector: ["typeProperty", "typeParameter", "typeMethod"],
        format: ["camelCase", "PascalCase"],
      },
      {
        selector: ["objectLiteralProperty", "objectLiteralMethod"],
        format: ["camelCase", "PascalCase", "snake_case"],
      },
    ],
  },
  ignorePatterns: ["*.gyp", "*.cc"],
};
