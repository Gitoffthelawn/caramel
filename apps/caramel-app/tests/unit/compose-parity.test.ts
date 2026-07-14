import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// F-016 one-root-compose parity gate. The migration's durable invariants: ONE
// root compose runs the real prod service graph (web + postgres, nothing
// else), pinned (never :latest), the in-container app reaches postgres by
// service DNS, the root `dev` command IS `docker compose up --build`, and the
// old local-dev/ Postgres+Redis stack is gone. Each assertion reads the real
// tracked files, so it fails again the moment any of them drifts — not just
// today.
//
// The compose file is parsed with small, purpose-built readers rather than a
// YAML dependency: `yaml` is only a transitive package here (not resolvable
// under pnpm's isolated node_modules), and this repo's other structural gates
// (repo-integrity, prisma-schema-secrecy) are likewise fs/string-based. The
// file is prettier-formatted block YAML, so these readers are deterministic.

const REPO_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../..',
)
const COMPOSE_PATH = path.join(REPO_ROOT, 'docker-compose.yml')
const DOCKERFILE_PATH = path.join(REPO_ROOT, 'Dockerfile')

function readCompose(): string {
    return fs.readFileSync(COMPOSE_PATH, 'utf8')
}

// Top-level service names: keys indented exactly two spaces inside the
// `services:` block, up to the next top-level (zero-indent) key.
function composeServiceNames(compose: string): string[] {
    const names: string[] = []
    let inServices = false
    for (const line of compose.split('\n')) {
        if (/^services:\s*$/.test(line)) {
            inServices = true
            continue
        }
        if (!inServices) continue
        if (/^\S/.test(line)) break // next top-level key ends the block
        const match = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line)
        if (match) names.push(match[1])
    }
    return names
}

function gitIsIgnored(relPath: string): boolean {
    // `git check-ignore --quiet` exits 0 when the path is ignored, 1 when it
    // is not. spawnSync (not execFileSync) so a non-zero exit is data, not a
    // thrown error to swallow.
    const res = spawnSync('git', ['check-ignore', '--quiet', relPath], {
        cwd: REPO_ROOT,
    })
    return res.status === 0
}

function gitIsTracked(relPath: string): boolean {
    const res = spawnSync('git', ['ls-files', '--', relPath], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
    })
    return res.status === 0 && res.stdout.trim().length > 0
}

describe('one-root-compose parity (F-016)', () => {
    it('a root docker-compose.yml exists', () => {
        expect(fs.existsSync(COMPOSE_PATH)).toBe(true)
    })

    it('the service set is exactly { web, postgres }', () => {
        expect(composeServiceNames(readCompose()).sort()).toEqual([
            'postgres',
            'web',
        ])
    })

    it('web builds from a committed root Dockerfile', () => {
        expect(fs.existsSync(DOCKERFILE_PATH)).toBe(true)
        expect(readCompose()).toMatch(/dockerfile:\s*Dockerfile\b/)
    })

    it('no :latest tag anywhere in compose or Dockerfile', () => {
        expect(readCompose()).not.toContain(':latest')
        expect(fs.readFileSync(DOCKERFILE_PATH, 'utf8')).not.toContain(
            ':latest',
        )
    })

    it('postgres pins exactly postgres:18.4', () => {
        expect(readCompose()).toMatch(/^\s*image:\s*postgres:18\.4\s*$/m)
    })

    it('the in-file DATABASE_URL reaches postgres by service DNS (@postgres:5432)', () => {
        expect(readCompose()).toMatch(/DATABASE_URL:.*@postgres:5432\//)
    })

    it('the root `dev` script is `docker compose up --build`', () => {
        const pkg = JSON.parse(
            fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
        ) as { scripts?: Record<string, string> }
        expect(pkg.scripts?.dev).toBe('docker compose up --build')
    })

    it('apps/caramel-app/.env is gitignored and .env.example is tracked', () => {
        expect(gitIsIgnored('apps/caramel-app/.env')).toBe(true)
        expect(gitIsTracked('apps/caramel-app/.env.example')).toBe(true)
    })

    it('the old local-dev/ stack no longer exists', () => {
        expect(fs.existsSync(path.join(REPO_ROOT, 'local-dev'))).toBe(false)
    })
})
