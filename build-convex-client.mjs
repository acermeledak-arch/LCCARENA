import esbuild from 'esbuild';

esbuild.buildSync({
  stdin: {
    contents: 'export { ConvexClient } from "convex/browser";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: 'esm',
  outfile: 'public/convex-client.js',
  minify: true,
  target: ['es2022'],
});

console.log('Bundled public/convex-client.js successfully');

