import * as path from "path";
import { RuleTester } from "@typescript-eslint/utils/dist/eslint-utils";

import noUnusedClasses from "./no-unused-classes";

const ruleTester = new RuleTester({
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: path.resolve(__dirname, "../../fixtures"),
    project: "./tsconfig.json",
  },
});

ruleTester.run("no-unused-classes", noUnusedClasses, {
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
      settings: {
        markAsUsed: ["not-used"],
      },
    },
  ],
  invalid: [
    {
      code: 'import styles from "./component01.module.css";',
      errors: [{ messageId: "unusedCssClass" }],
    },
    {
      code: `
        import styles from "./component01.module.css";

        const unused = styles;
      `,
      errors: [{ messageId: "unusedCssClass" }],
    },
    {
      code: 'import styles from "./folder/component02.module.css";',
      errors: [{ messageId: "unusedCssClass" }],
    },
    {
      code: `
        import styles from "./folder/component02.module.css";

        const unused = styles;
      `,
      errors: [{ messageId: "unusedCssClass" }],
    },
    {
      code: `
        import styles from "./component03.module.css";

        const used = styles['main'];
      `,
      errors: [{ messageId: "unusedCssClass" }],
    },
  ],
});
