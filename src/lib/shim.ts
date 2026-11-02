import type { SeloFile, SeloMeasurement, SeloRule } from '@guilhermesilveira/selo';
import * as tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';

/**
 * Options for `shimEslintRule()`. Wraps a single ESLint rule into a
 * SeloRule whose `measure()` runs ESLint on the file's source and emits
 * one `value: 1` measurement per produced violation.
 *
 * The wrapped rule is run in isolation: ESLint's Linter instance has
 * only that rule enabled (and only the supplied plugins, if any). The
 * project's own ESLint config is *not* loaded — selo and ESLint are
 * deliberately decoupled. This makes the shim deterministic and
 * independent of how the host project happens to configure things.
 */
export interface ShimOptions {
  /** The selo rule id, e.g. `eslint/no-empty`. */
  id: string;
  /** Short description shown in `selo packs`-style listings. */
  description: string;
  /** Histogram unit label (count rules don't really use it, but the contract requires one). */
  unitLabel: string;
  /**
   * Seal message template. `{{message}}` interpolates the underlying
   * ESLint message; `{{line}}` and `{{ruleId}}` are also available.
   */
  seal: string;
  /** ESLint rule id as it appears in eslint config (e.g. `no-empty`, `no-useless-catch`). */
  eslintRuleId: string;
  /** Default ESLint rule options, including the severity. */
  eslintRuleConfig?: unknown;
}

// Optional engine extension. Keep the pack buildable against older selo types.
type PreparedFile = SeloFile & {
  parserData?: { name: string; version: string; source: string; jsx: boolean; result: unknown };
};

const linter = new Linter();
const configurations = new WeakMap<SeloRule, ShimOptions>();

export function shimEslintRule(opts: ShimOptions): SeloRule {
  const ruleConfig = opts.eslintRuleConfig ?? 'error';
  const rule: SeloRule = {
    meta: {
      id: opts.id,
      description: opts.description,
      type: 'count',
      unitLabel: opts.unitLabel,
      seal: opts.seal,
    },
    measure(file: { path: string; source: string }): SeloMeasurement[] {
      const isJsx = file.path.endsWith('.tsx') || file.path.endsWith('.jsx');
      let messages;
      try {
        // We omit the filename argument from `linter.verify`: ESLint's
        // flat-config `files` globbing fails on bare filenames, and selo
        // doesn't need ESLint to know the path — `file.path` is already
        // in the measurement.
        messages = linter.verify(file.source, {
          languageOptions: {
            parser: tsParser as Linter.Parser,
            parserOptions: {
              ecmaVersion: 'latest',
              sourceType: 'module',
              ecmaFeatures: isJsx ? { jsx: true } : undefined,
            },
          },
          rules: {
            [opts.eslintRuleId]: ruleConfig as Linter.RuleEntry,
          },
        });
      } catch {
        return [];
      }
      return messages
        .filter((m) => m.ruleId === opts.eslintRuleId)
        .map((m) => ({
          value: 1,
          file: file.path,
          startLine: m.line,
          data: {
            line: m.line,
            message: m.message,
            ruleId: m.ruleId ?? opts.eslintRuleId,
          },
        }));
    },
  };
  configurations.set(rule, opts);
  return rule;
}

/** Conservative eligibility checks, never replacement violation detectors.
 * ESLint still owns options, comments/directives, locations and diagnostics.
 */
const candidatesCache = new WeakMap<object, { source: string; ast: unknown; candidates: Set<string> }>();
function candidatesFor(file: SeloFile): Set<string> | undefined {
  if (!file.ast || typeof file.ast !== 'object') return undefined;
  const root = file.ast as { type?: unknown; body?: unknown };
  if (root.type !== 'Program' || !Array.isArray(root.body)) return undefined;
  const cached = candidatesCache.get(file);
  if (cached?.source === file.source && cached.ast === file.ast) return cached.candidates;
  const candidates = new Set<string>();
  const visit = (value: unknown, parent?: Record<string, unknown>): void => {
    if (Array.isArray(value)) { for (const child of value) visit(child, parent); return; }
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    if (node.type === 'BlockStatement' && Array.isArray(node.body) && node.body.length === 0
      && !['FunctionExpression', 'FunctionDeclaration', 'ArrowFunctionExpression'].includes(String(parent?.type))) {
      candidates.add('no-empty');
    }
    if (node.type === 'SwitchStatement' && Array.isArray(node.cases) && node.cases.length === 0) candidates.add('no-empty');
    if (node.type === 'CatchClause') {
      const body = node.body as { body?: { type?: string }[] } | undefined;
      if (body?.body?.[0]?.type === 'ThrowStatement') candidates.add('no-useless-catch');
    }
    for (const key of Object.keys(node)) {
      if (['parent', 'loc', 'range', 'tokens', 'comments'].includes(key)) continue;
      visit(node[key], node);
    }
  };
  visit(file.ast);
  candidatesCache.set(file, { source: file.source, ast: file.ast, candidates });
  return candidates;
}

/** Batch the built-in, independent ESLint rules without retaining parsed ASTs.
 * The single-rule shim remains isolated for third-party consumers.
 */
export function batchEslintRules(rules: SeloRule[]): SeloRule[] {
  const options = rules.map((rule) => {
    const opts = configurations.get(rule);
    if (!opts) throw new Error(`Not an ESLint shim: ${rule.meta.id}`);
    return opts;
  });
  const entries = Object.fromEntries(options.map((opts) => [
    opts.eslintRuleId, opts.eslintRuleConfig ?? 'error',
  ]));
  if (Object.keys(entries).length !== rules.length) {
    throw new Error('Cannot batch duplicate ESLint rule ids');
  }
  const cache = new WeakMap<object, { source: string; path: string; messages: Linter.LintMessage[] }>();
  return rules.map((rule, index) => ({
    meta: rule.meta,
    measure(file: PreparedFile): SeloMeasurement[] {
      const opts = options[index]!;
      if ((opts.eslintRuleId === 'no-empty' || opts.eslintRuleId === 'no-useless-catch')
        && candidatesFor(file)?.has(opts.eslintRuleId) === false) return [];
      let cached = cache.get(file);
      if (!cached || cached.source !== file.source || cached.path !== file.path) {
        const isJsx = file.path.endsWith('.tsx') || file.path.endsWith('.jsx');
        // Use the same parser/options and filename omission as the isolated shim.
        const prepared = file.parserData;
        const canReuse = prepared?.name === '@typescript-eslint/parser'
          && prepared.version === tsParser.version && prepared.source === file.source && prepared.jsx === isJsx;
        const parser = canReuse
          ? { meta: tsParser.meta, parseForESLint: () => prepared.result as ReturnType<typeof tsParser.parseForESLint> }
          : tsParser;
        const messages = linter.verify(file.source, {
          languageOptions: {
            parser: parser as Linter.Parser,
            parserOptions: {
              ecmaVersion: 'latest',
              sourceType: 'module',
              ecmaFeatures: isJsx ? { jsx: true } : undefined,
            },
          },
          rules: entries as Record<string, Linter.RuleEntry>,
        });
        cached = { source: file.source, path: file.path, messages };
        cache.set(file, cached);
      }
      return cached.messages.filter((message) => message.ruleId === opts.eslintRuleId).map((message) => ({
        value: 1,
        file: file.path,
        startLine: message.line,
        data: { line: message.line, message: message.message, ruleId: message.ruleId ?? opts.eslintRuleId },
      }));
    },
  }));
}
