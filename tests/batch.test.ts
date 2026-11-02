import { describe, expect, it, vi } from 'vitest';
import { Linter } from 'eslint';
import { parseForESLint } from '@typescript-eslint/parser';
import { seloEslintRaiz } from '../src/index.js';
import { eslintNoEmpty } from '../src/rules/eslintNoEmpty.js';
import { eslintNoUselessCatch } from '../src/rules/eslintNoUselessCatch.js';
import { eslintObjectCurlyNewline } from '../src/rules/eslintObjectCurlyNewline.js';

const isolated = [eslintNoEmpty, eslintNoUselessCatch, eslintObjectCurlyNewline];
const fixtures = [
  'if (true) {}\ntry { work(); } catch (e) { throw e; }',
  'try { work(); } catch (e) {}',
  'try { work(); } catch (e) { /* intentional */ }',
  'try { work(); } catch (e) { throw e; } finally { cleanup(); }',
  'import {\n a,\n b\n} from "x";',
  'export function Component<T>(p: T) { return <div>{String(p)}</div>; }',
  '/* eslint-disable no-empty */\nif (true) {}\ntry { f(); } catch (e) { throw e; }',
  '// eslint-disable-next-line\nif (true) {}\ntry { f(); } catch (e) { throw e; }',
  '/* eslint no-empty: ["error", {"allowEmptyCatch":true}] */\ntry { f(); } catch (e) {}',
  '/* eslint-disable */\nif (true) {}\n/* eslint-enable */\nif (true) {}',
  'const invalid = ;',
  '#!/usr/bin/env node\nif (true) {}',
  'const clean = 1;',
  'switch (x) {}',
  'switch (x) { /* intentional */ }',
  'if (x) { /* intentional */ } else {}',
  'function empty() {} const arrow = () => {}; class X { method() {} }',
  'try { f(); } catch { throw error; }',
  'try { f(); } catch ({ error }) { throw error; }',
  '/* eslint object-curly-newline: ["error", "always"] */ const x = {a:1};',
];

describe('built-in ESLint batching', () => {
  it.each(fixtures)('matches each isolated rule for %s', (source) => {
    const file = { path: 'fixture.tsx', source, ast: null };
    for (const original of isolated) {
      expect(seloEslintRaiz.rules[original.meta.id]!.measure(file, undefined)).toEqual(original.measure(file, undefined));
    }
  });

  it.each(fixtures.filter((source) => source !== 'const invalid = ;'))('matches isolated rules with AST eligibility checks for %s', (source) => {
    const file = { path: 'fixture.tsx', source, ast: parseForESLint(source, { jsx: true, sourceType: 'module' }).ast };
    for (const original of isolated) {
      expect(seloEslintRaiz.rules[original.meta.id]!.measure(file, undefined)).toEqual(original.measure(file, undefined));
    }
  });

  it('verifies once per file across all built-ins and invalidates changed sources', () => {
    const verify = vi.spyOn(Linter.prototype, 'verify');
    try {
      const file = { path: 'fixture.ts', source: 'if (true) {}', ast: null };
      for (const rule of Object.values(seloEslintRaiz.rules)) rule.measure(file, undefined);
      expect(verify).toHaveBeenCalledTimes(1);
      file.source = 'try { f(); } catch (e) { throw e; }';
      expect(seloEslintRaiz.rules['eslint/no-useless-catch']!.measure(file, undefined)).toHaveLength(1);
      expect(verify).toHaveBeenCalledTimes(2);
      file.path = 'fixture.jsx';
      seloEslintRaiz.rules['eslint/no-empty']!.measure(file, undefined);
      expect(verify).toHaveBeenCalledTimes(3);
    } finally {
      verify.mockRestore();
    }
  });
});

// Reuse the engine's optional parse result while preserving fallback on older
// engine/parser versions and on files whose source or JSX mode has changed.
it('reuses matching prepared data and falls back for incompatible metadata', async () => {
  const parser = await import('@typescript-eslint/parser');
  const source = 'if (true) {}\ntry { work(); } catch (e) { throw e; }';
  const parsed = parser.parseForESLint(source, { ecmaVersion: 'latest', sourceType: 'module', jsx: false });
  let reads = 0;
  const parserData = {
    name: '@typescript-eslint/parser', version: parser.version, source, jsx: false,
    get result() { reads++; return parsed; },
  };
  const file = { path: 'fixture.ts', source, ast: parsed.ast, parserData };
  for (const rule of isolated) {
    expect(seloEslintRaiz.rules[rule.meta.id]!.measure(file, undefined)).toEqual(rule.measure(file, undefined));
  }
  expect(reads).toBe(1);
  for (const mismatch of [{ version: '0.0.0' }, { source: 'different' }, { jsx: true }, { name: 'other-parser' }]) {
    const fallback = { ...file, parserData: { ...parserData, ...mismatch, get result(): never { throw new Error('incompatible data must not be read'); } } };
    for (const rule of isolated) {
      expect(seloEslintRaiz.rules[rule.meta.id]!.measure(fallback, undefined)).toEqual(rule.measure(fallback, undefined));
    }
  }
});

it('falls back when an older caller supplies no recognizable AST', () => {
  const file = { path: 'fixture.ts', source: 'if (true) {}', ast: {} };
  expect(seloEslintRaiz.rules['eslint/no-empty']!.measure(file, undefined)).toEqual(eslintNoEmpty.measure(file, undefined));
});
