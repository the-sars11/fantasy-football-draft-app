import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dev helper script (Node.js CommonJS)
    "_dev.js",
  ]),
  // Hard rule: no em-dashes or en-dashes in string literals, JSX text, or template
  // strings (use a hyphen or restructure). Catches user-facing copy; comments are exempt.
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/[\\u2013\\u2014]/]",
          message: "No en-dashes or em-dashes. Use a hyphen (-) or restructure.",
        },
        {
          selector: "JSXText[value=/[\\u2013\\u2014]/]",
          message: "No en-dashes or em-dashes. Use a hyphen (-) or restructure.",
        },
        {
          selector: "TemplateElement[value.raw=/[\\u2013\\u2014]/]",
          message: "No en-dashes or em-dashes. Use a hyphen (-) or restructure.",
        },
      ],
    },
  },
]);

export default eslintConfig;
