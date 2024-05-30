declare const configuration: {
    rules: {
        "no-unused-classes": import("@typescript-eslint/utils/dist/ts-eslint/Rule").RuleModule<"markAsUsed" | "unusedCssClasses", readonly [{
            markAsUsed: string[];
        }], {
            ImportDeclaration(node: import("@typescript-eslint/types/dist/generated/ast-spec").ImportDeclaration): void;
            MemberExpression(node: import("@typescript-eslint/types/dist/generated/ast-spec").MemberExpression): void;
            "Program:exit"(): void;
        }>;
    };
    configs: {
        recommended: import("@typescript-eslint/utils/dist/ts-eslint/CLIEngine").CLIEngine.Options;
    };
};
export = configuration;
