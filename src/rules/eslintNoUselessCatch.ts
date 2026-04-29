import type { SeloRule } from '@guilhermesilveira/selo';
import { shimEslintRule } from '../lib/shim.js';

/**
 * Wraps core ESLint rule `no-useless-catch`.
 *
 * Flags `catch (e) { throw e; }` patterns where the catch adds nothing.
 * If you can't add real handling (logging, recovery, transformation),
 * remove the try/catch entirely — letting the exception propagate is
 * almost always better than catching it just to re-throw.
 */
export const eslintNoUselessCatch: SeloRule = shimEslintRule({
  id: 'eslint/no-useless-catch',
  description: 'Forbid `catch (e) { throw e; }` — pointless re-throw that hides the original stack.',
  unitLabel: 'useless-catches',
  seal:
    'Useless catch at line {{line}}. {{message}} ' +
    'Remove the try/catch and let the exception propagate, or add real handling (log, recover, transform).',
  eslintRuleId: 'no-useless-catch',
});
