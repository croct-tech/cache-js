import {defineConfig} from 'tsup';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const packageJson = JSON.parse(
    await readFile(fileURLToPath(import.meta.resolve('./package.json')), 'utf-8')
);

// Dependencies that will be included on the module tree of any dependent package
// Can, and should, be externalized to ensure no dependency state is broken
const requiredDependencies = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
];

// Dependencies that are not visible to dependents and must be bundled.
const bundledDependencies = Object.keys(packageJson.devDependencies || {});

export default defineConfig({
    entry: ['src/index.ts'],
    bundle: true,
    skipNodeModulesBundle: true,
    external: requiredDependencies,
    noExternal: bundledDependencies,
    splitting: true,
    treeshake: true,
    target: 'es2023',
    platform: 'neutral',
    format: ['esm', 'cjs'],
    minify: true,
    metafile: true,
    sourcemap: true,
    outDir: 'build',
    clean: true,
});
