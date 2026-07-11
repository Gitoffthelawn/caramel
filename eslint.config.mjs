import next from 'eslint-config-next'

export default [
    ...next,
    {
        rules: {
            'react-hooks/exhaustive-deps': 'off',
            'react-hooks/set-state-in-effect': 'off',
            'react-hooks/refs': 'off',
            'react-hooks/immutability': 'off',
            'no-console': 'off',
            'import/no-anonymous-default-export': 'off',
            '@next/next/no-img-element': 'off',
            'react/no-unescaped-entities': 'off',
        },
    },
    {
        // F-011 — global-error.tsx is a deliberate, permanent exception: it
        // replaces the root layout on last-resort failures and must stay
        // dependency-free, so its one internal link is a raw <a> rather
        // than next/link's <Link> (which needs client router context that
        // may not survive whatever broke the root layout). A file-scoped
        // override instead of an inline eslint-disable comment because the
        // lint-staged autofix chain (oxlint -> eslint --fix -> prettier)
        // was observed stripping inline disable comments near this JSX
        // during pre-commit.
        // `**/` prefix (not a repo-root-relative path) because this array
        // is loaded from two different `files`-glob bases depending on
        // invocation: apps/caramel-app/eslint.config.mjs re-exports it
        // verbatim, so `pnpm lint`/CI (cwd apps/caramel-app) resolve these
        // globs relative to that file, while the root-run husky pre-commit
        // hook (cwd repo root) resolves them relative to this file instead.
        files: ['**/src/app/global-error.tsx'],
        rules: {
            '@next/next/no-html-link-for-pages': 'off',
        },
    },
]
