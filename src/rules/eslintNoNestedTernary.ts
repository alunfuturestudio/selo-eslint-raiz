import type { SeloRule } from '@guilhermesilveira/selo';
import { shimEslintRule } from '../lib/shim.js';

/**
 * Wraps core ESLint rule `no-nested-ternary`.
 *
 * Nested ternaries collapse multi-step branching into a single dense
 * expression that reads worse than the if/else it replaces. Extract the
 * inner branch to a named const or refactor to if/else.
 *
 * Equivalent to Biome's `noNestedTernary`. Wrapping core ESLint here
 * keeps the AST walk in one place and avoids reimplementing it in
 * `selo-solid`.
 */
export const eslintNoNestedTernary: SeloRule = shimEslintRule({
  id: 'eslint/no-nested-ternary',
  description: 'Forbid nested ternary expressions; extract or use if/else.',
  unitLabel: 'nested ternaries',
  seal: 'Nested ternary at line {{line}}. Extract the inner branch to a named const or refactor to if/else.',
  eslintRuleId: 'no-nested-ternary',
});
