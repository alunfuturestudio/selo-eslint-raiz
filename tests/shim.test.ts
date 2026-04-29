import { describe, expect, it } from 'vitest';
import { shimEslintRule } from '../src/lib/shim.js';
import { fixtureFile } from './helpers.js';

describe('shimEslintRule', () => {
  it('produces a SeloRule with the supplied meta', () => {
    const rule = shimEslintRule({
      id: 'eslint/no-debugger',
      description: 'Forbid `debugger` statements.',
      unitLabel: 'debuggers',
      seal: 'debugger statement at line {{line}}',
      eslintRuleId: 'no-debugger',
    });
    expect(rule.meta.id).toBe('eslint/no-debugger');
    expect(rule.meta.type).toBe('count');
  });

  it('emits one measurement per ESLint violation', () => {
    const rule = shimEslintRule({
      id: 'eslint/no-debugger',
      description: 'Forbid `debugger` statements.',
      unitLabel: 'debuggers',
      seal: '{{message}}',
      eslintRuleId: 'no-debugger',
    });
    const file = fixtureFile('function f() { debugger; debugger; }');
    const ms = rule.measure(file, undefined);
    expect(ms.length).toBe(2);
    expect(ms[0]?.value).toBe(1);
  });

  it('returns no measurements when the file is clean', () => {
    const rule = shimEslintRule({
      id: 'eslint/no-debugger',
      description: '',
      unitLabel: 'debuggers',
      seal: '{{message}}',
      eslintRuleId: 'no-debugger',
    });
    const file = fixtureFile('function f() { return 1; }');
    expect(rule.measure(file, undefined)).toEqual([]);
  });
});
