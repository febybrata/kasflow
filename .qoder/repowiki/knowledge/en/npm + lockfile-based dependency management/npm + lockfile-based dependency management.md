---
kind: dependency_management
name: npm + lockfile-based dependency management
category: dependency_management
scope:
    - '**'
source_files:
    - package.json
    - package-lock.json
    - skills-lock.json
---

KasFlow uses a single-root npm workspace with a flat `package.json` and a committed `package-lock.json` (lockfileVersion 3) to pin every transitive dependency. There is no monorepo tooling (no `pnpm-workspace.yaml`, no `lerna`, no `turbo`) — the entire Next.js app, shared libraries under `lib/`, and one-off data scripts all share one dependency graph.

Key characteristics:
- **Package manager**: npm (`.npmrc` not present; default public registry used). No private registry or proxy configuration was found.
- **Lockfile**: `package-lock.json` is committed alongside source, ensuring deterministic installs across CI and local dev.
- **Version ranges**: All runtime and dev dependencies use caret (`^`) ranges in `package.json`, so minor/patch upgrades are allowed at install time while the lockfile pins exact versions.
- **No vendoring / no submodules for code deps**: Dependencies are installed into `node_modules`; there is no `vendor/` directory or git-submodule strategy for third-party code.
- **Agent skills as a separate lockfile**: The `.agents/skills` directory is managed by an external skill installer that records fetched skill sources and hashes in `skills-lock.json` — this is independent from npm and tracks markdown-based agent skill definitions rather than code packages.
- **Build/runtime surface**: The only runtime entrypoint is `next dev` / `next build` / `next start`; TypeScript type-checking is exposed via `tsc --noEmit`. Dev tooling (ESLint, Tailwind, PostCSS, Autoprefixer, types) lives in `devDependencies`.
- **No workspace scripts or multi-package orchestration**: Scripts in `package.json` are thin wrappers around Next CLI commands; there are no custom publish, bootstrap, or upgrade scripts.