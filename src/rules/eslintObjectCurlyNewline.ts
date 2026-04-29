import type { SeloRule } from '@guilhermesilveira/selo';
import { shimEslintRule } from '../lib/shim.js';

/**
 * Wraps core ESLint rule `object-curly-newline` configured to require
 * single-line `import { ... }` declarations.
 *
 * Multi-line import groups are easy to drop alphabetisation on and tend
 * to gather noise (one extra import per PR review round). Forcing one
 * line per import keeps the source diffs clean.
 */
export const eslintObjectCurlyNewline: SeloRule = shimEslintRule({
  id: 'eslint/object-curly-newline-imports',
  description: 'Require single-line `import { … }` declarations.',
  unitLabel: 'multiline-imports',
  seal:
    'Multi-line import at line {{line}}. {{message}} ' +
    'Collapse to one line (or split into two import statements) to keep diffs clean.',
  eslintRuleId: 'object-curly-newline',
  eslintRuleConfig: ['error', { ImportDeclaration: 'never' }],
});
