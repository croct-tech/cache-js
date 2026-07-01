import {execFile} from 'node:child_process';
import {mkdtemp, mkdir, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {promisify} from 'node:util';

const exec = promisify(execFile);
const require = createRequire(import.meta.url);
const root = process.cwd();

await import('@croct/cache');
await import('@croct/cache/inMemory');
require('@croct/cache');
require('@croct/cache/inMemory');

const workspace = await mkdtemp(join(tmpdir(), 'cache-package-'));

try {
    await mkdir(join(workspace, 'node_modules', '@croct'), {recursive: true});
    await symlink(root, join(workspace, 'node_modules', '@croct', 'cache'), 'dir');
    await writeFile(join(workspace, 'package.json'), '{"type":"module"}\n');
    await writeFile(
        join(workspace, 'index.ts'),
        "import '@croct/cache';\nimport '@croct/cache/inMemory';\n"
    );

    await exec(
        join(root, 'node_modules', '.bin', 'tsc'),
        [
            '--noEmit',
            '--target',
            'ES2023',
            '--module',
            'NodeNext',
            '--moduleResolution',
            'NodeNext',
            '--skipLibCheck',
            'index.ts',
        ],
        {cwd: workspace}
    );

    await exec('npm', ['pack', '--dry-run'], {cwd: root});
} finally {
    await rm(workspace, {recursive: true, force: true});
}
