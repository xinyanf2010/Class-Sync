// Metro config for the monorepo: lets Metro resolve and transpile the shared
// `@classsync/common` package (which ships raw TypeScript source).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch ONLY the app and the shared `packages/` dir — not the whole monorepo.
// Watching the workspace root drags in other apps' node_modules and build
// output (`.next`, `dist`), which trips `EMFILE: too many open files` on a
// macOS shell whose fd soft limit is 256.
config.watchFolders = [
  projectRoot,
  path.resolve(workspaceRoot, 'packages'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;