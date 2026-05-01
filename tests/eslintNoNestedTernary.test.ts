import { describe, expect, it } from 'vitest';
import { eslintNoNestedTernary } from '../src/rules/eslintNoNestedTernary.js';
import { fixtureFile } from './helpers.js';

describe('eslint/no-nested-ternary', () => {
  it('flags a nested ternary in the consequent', () => {
    const file = fixtureFile('const x = a ? (b ? 1 : 2) : 3;\n');
    const ms = eslintNoNestedTernary.measure(file, undefined);
    expect(ms.length).toBe(1);
    expect(ms[0]?.value).toBe(1);
  });

  it('flags a nested ternary in the alternate', () => {
    const file = fixtureFile('const x = a ? 1 : b ? 2 : 3;\n');
    const ms = eslintNoNestedTernary.measure(file, undefined);
    expect(ms.length).toBe(1);
  });

  it('does not flag a single ternary', () => {
    const file = fixtureFile('const x = a ? 1 : 2;\n');
    const ms = eslintNoNestedTernary.measure(file, undefined);
    expect(ms.length).toBe(0);
  });

  it('attaches line + message in measurement.data', () => {
    const file = fixtureFile('const x = a ? 1 : b ? 2 : 3;\n');
    const ms = eslintNoNestedTernary.measure(file, undefined);
    expect(ms[0]?.data?.line).toBe(1);
    expect(typeof ms[0]?.data?.message).toBe('string');
  });
});
