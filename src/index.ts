import type { SeloRulePack } from '@guilhermesilveira/selo';
import { eslintNoEmpty as isolatedeslintNoEmpty } from './rules/eslintNoEmpty.js';
import { eslintNoUselessCatch as isolatedeslintNoUselessCatch } from './rules/eslintNoUselessCatch.js';
import { eslintObjectCurlyNewline as isolatedeslintObjectCurlyNewline } from './rules/eslintObjectCurlyNewline.js';

import { batchEslintRules } from './lib/shim.js';

const [eslintNoEmpty, eslintNoUselessCatch, eslintObjectCurlyNewline] = batchEslintRules([
  isolatedeslintNoEmpty, isolatedeslintNoUselessCatch, isolatedeslintObjectCurlyNewline,
]) as [typeof isolatedeslintNoEmpty, typeof isolatedeslintNoUselessCatch, typeof isolatedeslintObjectCurlyNewline];

export const seloEslintRaiz: SeloRulePack = {
  name: 'selo-eslint-raiz',
  version: '0.0.1',
  rules: {
    'eslint/no-empty': eslintNoEmpty,
    'eslint/no-useless-catch': eslintNoUselessCatch,
    'eslint/object-curly-newline-imports': eslintObjectCurlyNewline,
  },
};

export default seloEslintRaiz;

export { eslintNoEmpty, eslintNoUselessCatch, eslintObjectCurlyNewline };
export { shimEslintRule } from './lib/shim.js';
export type { ShimOptions } from './lib/shim.js';
