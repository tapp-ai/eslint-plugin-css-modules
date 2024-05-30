"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const eslint_utils_1 = require("@typescript-eslint/utils/dist/eslint-utils");
const no_unused_classes_1 = require("./no-unused-classes");
const ruleTester = new eslint_utils_1.RuleTester({
    parser: "@typescript-eslint/parser",
    parserOptions: {
        tsconfigRootDir: path.resolve(__dirname, "../../fixtures"),
        project: "./tsconfig.json",
    },
});
ruleTester.run("no-unused-classes", no_unused_classes_1.default, {
    valid: [
        `
      import styles from "./component01.module.css";

      const used = styles.main;
    `,
        `
      import styles from "./folder/component02.module.css";

      const used = styles.main;
    `,
        `
      import styles from "./folder/component02.module.css";

      const used = styles['main'];
    `,
        {
            code: `
        import styles from "./component03.module.css";
  
        const used = styles['main'];
      `,
            options: [
                {
                    markAsUsed: ["not-used"],
                },
            ],
        },
    ],
    invalid: [
        {
            code: 'import styles from "./component01.module.css";',
            errors: [{ messageId: "unusedCssClasses" }],
        },
        {
            code: `
        import styles from "./component01.module.css";

        const unused = styles;
      `,
            errors: [{ messageId: "unusedCssClasses" }],
        },
        {
            code: 'import styles from "./folder/component02.module.css";',
            errors: [{ messageId: "unusedCssClasses" }],
        },
        {
            code: `
        import styles from "./folder/component02.module.css";

        const unused = styles;
      `,
            errors: [{ messageId: "unusedCssClasses" }],
        },
        {
            code: `
        import styles from "./component03.module.css";

        const used = styles['main'];
      `,
            errors: [{ messageId: "unusedCssClasses" }],
        },
    ],
});
