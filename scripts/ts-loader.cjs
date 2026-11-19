const { registerHooks } = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL, fileURLToPath } = require('node:url');
const ts = require(path.resolve(process.cwd(), 'node_modules/typescript'));

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      specifier = path.resolve(process.cwd(), specifier.slice(2));
    }
    if (specifier.startsWith('.') || path.isAbsolute(specifier)) {
      const base = context.parentURL
        ? path.dirname(fileURLToPath(context.parentURL))
        : process.cwd();
      const full = path.resolve(base, specifier);
      if (fs.existsSync(full) && fs.statSync(full).isFile()) {
        return { shortCircuit: true, url: pathToFileURL(full).href };
      }
      if (fs.existsSync(full + '.ts')) {
        return { shortCircuit: true, url: pathToFileURL(full + '.ts').href };
      }
      if (fs.existsSync(full + '.tsx')) {
        return { shortCircuit: true, url: pathToFileURL(full + '.tsx').href };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
      const src = fs.readFileSync(fileURLToPath(url), 'utf8');
      const out = ts.transpileModule(src, {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
          resolveJsonModule: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      });
      return { format: 'commonjs', shortCircuit: true, source: out.outputText };
    }
    return nextLoad(url, context);
  },
});
