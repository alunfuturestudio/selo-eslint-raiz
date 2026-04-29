import { describe, expect, it } from 'vitest';
import { eslintNoEmpty } from '../src/rules/eslintNoEmpty.js';
import { fixtureFile } from './helpers.js';

describe('eslint/no-empty', () => {
  it('emits one count measurement per empty block', () => {
    const file = fixtureFile('if (true) {}\nfunction f() {}\n');
    const ms = eslintNoEmpty.measure(file, undefined);
    expect(ms.length).toBeGreaterThan(0);
    for (const m of ms) expect(m.value).toBe(1);
  });

  it('flags empty catch (allowEmptyCatch: false default)', () => {
    const file = fixtureFile('try { foo(); } catch (e) {}\n');
    const ms = eslintNoEmpty.measure(file, undefined);
    expect(ms.length).toBe(1);
  });

  it('does not flag a non-empty block', () => {
    const file = fixtureFile('if (true) { return 1; }\n');
    const ms = eslintNoEmpty.measure(file, undefined);
    expect(ms.length).toBe(0);
  });

  it('attaches line + message in measurement.data', () => {
    const file = fixtureFile('if (true) {}\n');
    const ms = eslintNoEmpty.measure(file, undefined);
    expect(ms[0]?.data?.line).toBe(1);
    expect(typeof ms[0]?.data?.message).toBe('string');
  });
});
