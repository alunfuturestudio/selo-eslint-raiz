import type { SeloRulePack } from '@guilhermesilveira/selo';
import { eslintNoEmpty } from './rules/eslintNoEmpty.js';
import { eslintNoNestedTernary } from './rules/eslintNoNestedTernary.js';
import { eslintNoUselessCatch } from './rules/eslintNoUselessCatch.js';
import { eslintObjectCurlyNewline } from './rules/eslintObjectCurlyNewline.js';

export const seloEslintRaiz: SeloRulePack = {
  name: 'selo-eslint-raiz',
  version: '0.0.1',
  rules: {
    'eslint/no-empty': eslintNoEmpty,
    'eslint/no-nested-ternary': eslintNoNestedTernary,
    'eslint/no-useless-catch': eslintNoUselessCatch,
    'eslint/object-curly-newline-imports': eslintObjectCurlyNewline,
  },
};

export default seloEslintRaiz;

export { eslintNoEmpty, eslintNoNestedTernary, eslintNoUselessCatch, eslintObjectCurlyNewline };
export { shimEslintRule } from './lib/shim.js';
export type { ShimOptions } from './lib/shim.js';
