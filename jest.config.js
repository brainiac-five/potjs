// This file exists to fix a real failure in `make jest_test` (and CI's
// "Installation Tests" workflow, which runs it): `npx jest --config
// test/jest.json ...` throws
//
//   Error: Could not find a config file based on provided values:
//   path: "<repo root>"
//   cwd: "<repo root>"
//
// even though test/jest.json is right there and gets read correctly. Traced
// with a debug print into jest-config's own resolveConfigPath(): the crash
// is a *second*, unrelated resolution — jest-config's readConfigs(), with no
// --projects given, always treats process.cwd() as an implicit project root
// in addition to the one --config points at, and checks whether that root's
// *own* default-named config (jest.config.js / .json / package.json#jest —
// not whatever --config says) happens to match the one already resolved.
// That check calls resolveConfigPath(root, cwd, ...) directly, ignoring
// --config entirely, and doesn't catch what it throws. If cwd has no
// default-named config of its own — true here, ours lives at
// test/jest.json — resolveConfigPath's directory-traversal search finds
// nothing anywhere above the repo either, and throws, uncaught, aborting
// the whole run before a single test file is even discovered.
//
// This project's own --config/--testRegex flags don't need to change: once
// there's a standard-named config file to find at cwd, that internal check
// resolves successfully (to this file, which is simply != the configPath
// from --config, a harmless false rather than an exception) and the run
// proceeds normally. Content here is intentionally empty — test/jest.json
// (read directly by the test files themselves, not just by Jest) remains
// the actual source of truth for jest settings.
module.exports = {}
