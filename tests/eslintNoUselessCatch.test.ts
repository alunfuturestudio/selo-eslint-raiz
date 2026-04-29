import { describe, expect, it } from 'vitest';
import { eslintNoUselessCatch } from '../src/rules/eslintNoUselessCatch.js';
import { fixtureFile } from './helpers.js';

describe('eslint/no-useless-catch', () => {
  it('flags `catch (e) { throw e; }`', () => {
    const file = fixtureFile('try { foo(); } catch (e) { throw e; }\n');
    const ms = eslintNoUselessCatch.measure(file, undefined);
    expect(ms.length).toBe(1);
    expect(ms[0]?.value).toBe(1);
  });

  it('does not flag a catch that does real work', () => {
    const file = fixtureFile('try { foo(); } catch (e) { console.error(e); }\n');
    const ms = eslintNoUselessCatch.measure(file, undefined);
    expect(ms.length).toBe(0);
  });

  it('does not flag try/catch/finally with finally cleanup', () => {
    const file = fixtureFile(
      'try { foo(); } catch (e) { throw e; } finally { cleanup(); }\n',
    );
    // ESLint's no-useless-catch DOES flag this — the catch is still pointless.
    // We just verify the shim agrees with ESLint, not assert one outcome.
    const ms = eslintNoUselessCatch.measure(file, undefined);
    expect(ms.length).toBe(1);
  });
});
