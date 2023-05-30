import * as path from "path";
import * as fs from "fs";

import { ESLintUtils, TSESTree, ASTUtils } from "@typescript-eslint/utils";
import * as cssTree from "css-tree";

const createRule = ESLintUtils.RuleCreator(() => "");

/** Checks whether the provided file path ends with .module.css */
function isCssFile(importFilePath: string): boolean {
  // https://regex101.com/r/o0RtYT/1
  return /.+\.module\.(scss|css)$/i.test(importFilePath);
}

function resolvePhysicalCssFilePath(
  sourceFilePath: string,
  importFilePath: string,
  basePath = ""
): string {
  if (importFilePath.startsWith(".")) {
    const dirname = path.dirname(sourceFilePath);
    return path.resolve(dirname, importFilePath);
  }

  return path.resolve(basePath, importFilePath);
}

function fileExists(physicalFilePath: string): boolean {
  return fs.existsSync(physicalFilePath);
}

function parseCssAst(css: string): cssTree.CssNode {
  return cssTree.parse(css);
}

/** Creates an AST of the CSS file */
function parseCssFileAst(physicalCssFilePath: string): cssTree.CssNode {
  const contents = fs.readFileSync(physicalCssFilePath, "utf8");

  const ast = parseCssAst(contents);

  return ast;
}

/** Collects class names from CSS file's AST */
function getCssFileClassNames(cssAst: cssTree.CssNode): Set<string> {
  const classNames: Set<string> = new Set();

  cssTree.walk(cssAst, {
    visit: "ClassSelector",
    enter(node) {
      classNames.add(node.name);
    },
  });

  return classNames;
}

function getBasePathSetting(settings: unknown): string | undefined {
  const { basePath } = (settings as { basePath: string }) ?? {};

  if (typeof basePath === "string" && basePath) {
    return basePath;
  }

  return undefined;
}

function getMarkAsUsedSetting(settings: unknown): Set<string> {
  const markAsUsedClassNames: Set<string> = new Set();

  if (Array.isArray((settings as { markAsUsed: string[] })?.markAsUsed)) {
    (settings as { markAsUsed: string[] }).markAsUsed?.forEach(
      markAsUsedClassNames.add,
      markAsUsedClassNames
    );
  }

  return markAsUsedClassNames;
}

const rule = createRule({
  name: "no-unused-classes",
  defaultOptions: [],
  meta: {
    type: "problem",
    schema: [
      {
        type: "object",
        properties: {
          markAsUsed: {
            type: "array",
            items: {
              title: "class name",
              type: "string",
            },
          },
        },
      },
    ],
    docs: {
      description: "Check for any unused classes in imported CSS modules",
      recommended: "error",
    },
    messages: {
      unusedCssClass:
        "Unused CSS class `.{{ className }}` in `{{ cssFilePath }}`",
    },
  },
  create(context) {
    type SourceFilePath = string;
    type ClassName = string;

    const files: Map<
      SourceFilePath,
      {
        availableClassNames: Set<string>;
        usedClassNames: Set<string>;
        meta?: Map<
          ClassName,
          {
            importNode: TSESTree.ImportDeclaration;
            cssFilePath: string;
          }
        >;
      }
    > = new Map();

    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        const sourceFilePath: string = context.getFilename();
        const importFilePath: string = node.source.value;

        if (isCssFile(importFilePath)) {
          const basePath: string | undefined = getBasePathSetting(
            context.settings
          );
          const cssFilePath = resolvePhysicalCssFilePath(
            sourceFilePath,
            importFilePath,
            basePath
          );

          if (fileExists(cssFilePath)) {
            const cssAst = parseCssFileAst(cssFilePath);

            /** Classes declared in CSS file */
            const classNames = getCssFileClassNames(cssAst);

            if (classNames.size > 0) {
              const file = files.get(sourceFilePath);

              const meta = file?.meta ?? new Map();
              const availableClassNames =
                file?.availableClassNames ?? new Set();

              if (!files.has(sourceFilePath)) {
                files.set(sourceFilePath, {
                  availableClassNames,
                  usedClassNames: new Set(),
                  meta,
                });
              }

              // Iterate over the classes from the CSS file
              classNames.forEach((className) => {
                // Add the class to available classes
                availableClassNames.add(className);

                // Save the AST node and CSS file path for ESLint error use
                meta.set(className, {
                  importNode: node,
                  cssFilePath,
                });
              });
            }
          }
        }
      },
      MemberExpression(node: TSESTree.MemberExpression) {
        /**
         * Accessed property's name, for example `main` in `styles.main`.
         * We check if this property name is one of the CSS class names later.
         */
        const propertyName: string | null = ASTUtils.getPropertyName(
          node,
          context.getScope()
        );

        if (propertyName) {
          const sourceFilePath: string = context.getFilename();

          const usedClassNames =
            files.get(sourceFilePath)?.usedClassNames ?? new Set();

          // Create the file map entry if needed
          if (!files.has(sourceFilePath)) {
            files.set(sourceFilePath, {
              availableClassNames: new Set(),
              usedClassNames,
            });
          }

          // Add the property name to used class names
          usedClassNames.add(propertyName);
        }
      },
      "Program:exit"() {
        const markAsUsedClassNames =
          files.size > 0
            ? getMarkAsUsedSetting(context.settings)
            : new Set<string>();

        // Iterate over the files map
        files.forEach(({ availableClassNames, usedClassNames, meta }) => {
          /**
           * Array of unused CSS classes. Available classes, filtered by used classes and "mark as used" classes.
           */
          const unusedClassNames = [...availableClassNames.values()].filter(
            (className) =>
              !usedClassNames.has(className) &&
              !markAsUsedClassNames.has(className)
          );

          // Iterate over the unused class names and create an error report for each of them
          unusedClassNames.forEach((className) => {
            const { importNode, cssFilePath } = meta?.get(className) ?? {};

            if (importNode) {
              context.report({
                node: importNode, // The AST node
                messageId: "unusedCssClass", // The error message ID
                // Used for string interpolation in the error message
                data: {
                  className, // The unused CSS class name
                  cssFilePath, // The CSS file path
                },
              });
            }
          });
        });
      },
    };
  },
});

const noUnusedClasses = rule;

export default noUnusedClasses;
