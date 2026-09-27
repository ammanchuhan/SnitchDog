/** Lets `node --test` load the server's modules unchanged.
 *
 * Next resolves extensionless relative imports ('./coach'); Node's ESM loader does not. Rather
 * than rewrite every import in the app to suit the test runner, this hook fills the gap — so the
 * tests exercise exactly the code that ships.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const EXTENSIONS = ['.ts', '.tsx', '/index.ts'];

export async function resolve(specifier, context, next) {
  const relative = specifier.startsWith('./') || specifier.startsWith('../');
  if (relative && !/\.[cm]?[jt]sx?$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL).href;
    for (const ext of EXTENSIONS) {
      if (existsSync(fileURLToPath(new URL(base + ext)))) return next(base + ext, context);
    }
  }
  return next(specifier, context);
}
