import { parse } from '@typescript-eslint/parser';
import type { SeloFile } from '@guilhermesilveira/selo';

export function fixtureFile(source: string, path = 'test.ts'): SeloFile {
  const ast = parse(source, {
    loc: true,
    range: true,
    comment: true,
    ecmaVersion: 'latest',
    sourceType: 'module',
  });
  setParents(ast, null);
  return { path, source, ast };
}

function setParents(node: unknown, parent: unknown): void {
  if (Array.isArray(node)) {
    for (const c of node) setParents(c, parent);
    return;
  }
  if (!node || typeof node !== 'object') return;
  (node as { parent?: unknown }).parent = parent;
  const obj = node as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (k === 'parent' || k === 'loc' || k === 'range') continue;
    setParents(obj[k], node);
  }
}
