import { describe, expect, it } from 'vitest';
import { eslintObjectCurlyNewline } from '../src/rules/eslintObjectCurlyNewline.js';
import { fixtureFile } from './helpers.js';

describe('eslint/object-curly-newline-imports', () => {
  it('flags multi-line imports', () => {
    const file = fixtureFile(
      "import {\n  a,\n  b,\n  c,\n} from 'x';\n",
    );
    const ms = eslintObjectCurlyNewline.measure(file, undefined);
    expect(ms.length).toBeGreaterThanOrEqual(1);
  });

  it('does not flag single-line imports', () => {
    const file = fixtureFile("import { a, b, c } from 'x';\n");
    const ms = eslintObjectCurlyNewline.measure(file, undefined);
    expect(ms.length).toBe(0);
  });
});
