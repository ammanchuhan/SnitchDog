/** Installs the TypeScript resolver hook for `node --test`. */
import { register } from 'node:module';

register('./resolve-ts.mjs', import.meta.url);
