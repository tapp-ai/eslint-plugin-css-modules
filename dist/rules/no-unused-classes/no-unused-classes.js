"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const utils_1 = require("@typescript-eslint/utils");
const cssTree = require("css-tree");
const createRule = utils_1.ESLintUtils.RuleCreator(() => "");
/** Checks whether the provided file path ends with .module.css */
function isCssFile(importFilePath) {
    // https://regex101.com/r/o0RtYT/1
    return /.+\.module\.(scss|css)$/i.test(importFilePath);
}
function resolvePhysicalCssFilePath(sourceFilePath, importFilePath, basePath = "") {
    if (importFilePath.startsWith(".")) {
        const dirname = path.dirname(sourceFilePath);
        return path.resolve(dirname, importFilePath);
    }
    return path.resolve(basePath, importFilePath);
}
function fileExists(physicalFilePath) {
    return fs.existsSync(physicalFilePath);
}
function parseCssAst(css) {
    return cssTree.parse(css);
}
/** Creates an AST of the CSS file */
function parseCssFileAst(physicalCssFilePath) {
    const contents = fs.readFileSync(physicalCssFilePath, "utf8");
    const ast = parseCssAst(contents);
    return ast;
}
/** Collects class names from CSS file's AST */
function getCssFileClassNames(cssAst) {
    const classNames = new Set();
    cssTree.walk(cssAst, {
        visit: "ClassSelector",
        enter(node) {
            classNames.add(node.name);
        },
    });
    return classNames;
}
function getBasePathSetting(settings) {
    const pluginSettings = (settings ?? {})["@jespers/css-modules"];
    const { basePath } = pluginSettings ?? {};
    if (typeof basePath === "string" && basePath) {
        return basePath;
    }
    return undefined;
}
function getMarkAsUsedOption(options) {
    const markAsUsedClassNames = new Set();
    if (Array.isArray(options)) {
        options[0]?.markAsUsed?.forEach(markAsUsedClassNames.add, markAsUsedClassNames);
    }
    return markAsUsedClassNames;
}
function getPrettyUnusedClassNames(unusedClassNames) {
    const base = unusedClassNames
        .slice(0, 3)
        .map((className) => `'${className}'`)
        .join(", ");
    if (unusedClassNames.length <= 3) {
        return base;
    }
    return `${base}... (+${Math.max(0, unusedClassNames.length - 3)} more)`;
}
function getFixPayloadClassNames(unusedClassNames) {
    return unusedClassNames.map((className) => `'${className}'`).join(", ");
}
const rule = createRule({
    name: "no-unused-classes",
    defaultOptions: [
        {
            markAsUsed: [],
        },
    ],
    meta: {
        type: "problem",
        schema: [
            {
                type: "object",
                properties: {
                    markAsUsed: {
                        type: "array",
                    },
                },
            },
        ],
        docs: {
            description: "Check for any unused classes in imported CSS modules",
            recommended: "error",
            suggestion: true,
        },
        messages: {
            unusedCssClasses: "Unused CSS classes {{ classNames }} in '{{ cssFilePath }}'",
            markAsUsed: "Mark {{ classNames }} as used",
        },
        hasSuggestions: true,
        fixable: "code",
    },
    create(context) {
        const files = new Map();
        return {
            ImportDeclaration(node) {
                const sourceFilePath = context.getFilename();
                const importFilePath = node.source.value;
                if (isCssFile(importFilePath)) {
                    const basePath = getBasePathSetting(context.settings);
                    const cssFilePath = resolvePhysicalCssFilePath(sourceFilePath, importFilePath, basePath);
                    if (fileExists(cssFilePath)) {
                        const cssAst = parseCssFileAst(cssFilePath);
                        /** Classes declared in CSS file */
                        const classNames = getCssFileClassNames(cssAst);
                        if (classNames.size > 0) {
                            const file = files.get(sourceFilePath);
                            const meta = file?.meta ?? {
                                importNode: node,
                                cssFilePath,
                            };
                            const availableClassNames = file?.availableClassNames ?? new Set();
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
                            });
                        }
                    }
                }
            },
            MemberExpression(node) {
                /**
                 * Accessed property's name, for example `main` in `styles.main`.
                 * We check if this property name is one of the CSS class names later.
                 */
                const propertyName = utils_1.ASTUtils.getPropertyName(node, context.getScope());
                if (propertyName) {
                    const sourceFilePath = context.getFilename();
                    const usedClassNames = files.get(sourceFilePath)?.usedClassNames ?? new Set();
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
                const markAsUsedClassNames = files.size > 0
                    ? getMarkAsUsedOption(context.options)
                    : new Set();
                // Iterate over the files map
                files.forEach(({ availableClassNames, usedClassNames, meta }) => {
                    /**
                     * Array of unused CSS classes. Available classes, filtered by used classes and "mark as used" classes.
                     */
                    const unusedClassNames = [...availableClassNames.values()].filter((className) => !usedClassNames.has(className) &&
                        !markAsUsedClassNames.has(className));
                    if (unusedClassNames.length > 0) {
                        const { importNode, cssFilePath } = meta ?? {};
                        if (importNode && cssFilePath) {
                            const prettyClassNames = getPrettyUnusedClassNames(unusedClassNames);
                            const fixPayloadClassNames = getFixPayloadClassNames(unusedClassNames);
                            context.report({
                                node: importNode,
                                messageId: "unusedCssClasses",
                                // Used for string interpolation in the error message
                                data: {
                                    classNames: prettyClassNames,
                                    cssFilePath, // The CSS file path
                                },
                                suggest: [
                                    {
                                        fix: (val) => {
                                            return val.insertTextBeforeRange(importNode.range, `/* eslint @jespers/css-modules/no-unused-classes: [2, { markAsUsed: [${fixPayloadClassNames}] }] */\n`);
                                        },
                                        messageId: "markAsUsed",
                                        data: { classNames: fixPayloadClassNames },
                                    },
                                ],
                            });
                        }
                    }
                });
            },
        };
    },
});
const noUnusedClasses = rule;
exports.default = noUnusedClasses;
