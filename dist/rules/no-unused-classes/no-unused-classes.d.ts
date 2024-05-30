import { TSESTree } from "@typescript-eslint/utils";
type MarkAsUsedOptions = {
    markAsUsed: string[];
};
declare const noUnusedClasses: import("@typescript-eslint/utils/dist/ts-eslint/Rule").RuleModule<"markAsUsed" | "unusedCssClasses", readonly [MarkAsUsedOptions], {
    ImportDeclaration(node: TSESTree.ImportDeclaration): void;
    MemberExpression(node: TSESTree.MemberExpression): void;
    "Program:exit"(): void;
}>;
export default noUnusedClasses;
