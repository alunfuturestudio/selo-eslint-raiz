import { shimEslintRule } from '../lib/shim.js';

/**
 * Wraps core ESLint rule `no-empty`.
 *
 * Default ESLint behavior: flags empty block statements (functions, if/else,
 * for/while bodies). Empty `catch` is the most common form — usually a sign
 * the error is being swallowed. We pass `allowEmptyCatch: false` to keep
 * that behavior strict.
 */
export const eslintNoEmpty = shimEslintRule({
  id: 'eslint/no-empty',
  description: 'Forbid empty block statements (functions, if/else, for/while bodies, catch).',
  unitLabel: 'empty-blocks',
  seal:
    'Empty block at line {{line}}. {{message}} ' +
    'If the block is intentionally empty, add a comment explaining why or restructure the code so the empty branch goes away.',
  eslintRuleId: 'no-empty',
  eslintRuleConfig: ['error', { allowEmptyCatch: false }],
});
