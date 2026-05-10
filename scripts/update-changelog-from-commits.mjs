#!/usr/bin/env node
import {execSync} from 'node:child_process'
import {readFileSync, writeFileSync} from 'node:fs'
import path from 'node:path'

function run(cmd) {
  return execSync(cmd, {encoding: 'utf8'}).trim()
}

function escapeSingleQuotes(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function formatItalianDate(date = new Date()) {
  const months = [
    'gennaio',
    'febbraio',
    'marzo',
    'aprile',
    'maggio',
    'giugno',
    'luglio',
    'agosto',
    'settembre',
    'ottobre',
    'novembre',
    'dicembre',
  ]
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function parseCommitRecord(record) {
  const [subject = '', ...rest] = record.split('\n')
  return {
    subject: subject.trim(),
    body: rest.join('\n').trim(),
  }
}

function getOutgoingCommits(remoteRef = 'origin/main') {
  let records = []
  try {
    const output = run(`git log --no-merges --pretty=format:%s%n%b%x1e ${remoteRef}..HEAD`)
    records = output
      ? output
          .split('\x1e')
          .map((r) => r.trim())
          .filter(Boolean)
      : []
  } catch {
    return []
  }

  return records
    .map(parseCommitRecord)
    .filter((c) => c.subject && !/^chore:\s*update changelog/i.test(c.subject))
}

function cleanSubjectForChangelog(subject) {
  return subject.replace(
    /^(feat|fix|chore|refactor|style|docs|test|perf|build|ci)(\([^)]*\))?!?:\s*/i,
    '',
  )
}

function getBumpType(commits) {
  const hasBreaking = commits.some(
    (c) =>
      /(BREAKING CHANGE|BREAKING-CHANGE)/i.test(c.body) ||
      /^(feat|fix|chore|refactor|style|docs|test|perf|build|ci)(\([^)]*\))?!:/i.test(c.subject),
  )

  if (hasBreaking) return 'major'
  if (commits.some((c) => /^feat(\([^)]*\))?:/i.test(c.subject))) return 'minor'
  return 'patch'
}

function getCurrentVersion(fileText) {
  const match = fileText.match(/version:\s*'(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)'/)
  if (!match?.groups) return '1.0.0'

  return `${match.groups.major}.${match.groups.minor}.${match.groups.patch}`
}

function bumpVersion(currentVersion, bumpType) {
  const [majorRaw, minorRaw, patchRaw] = currentVersion.split('.')
  const major = Number.parseInt(majorRaw, 10)
  const minor = Number.parseInt(minorRaw, 10)
  const patch = Number.parseInt(patchRaw, 10)

  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) {
    return '1.0.0'
  }

  if (bumpType === 'major') return `${major + 1}.0.0`
  if (bumpType === 'minor') return `${major}.${minor + 1}.0`

  return `${major}.${minor}.${patch + 1}`
}

function buildEntry({version, date, changes}) {
  const lines = changes.map((c) => `      '${escapeSingleQuotes(c)}',`)
  return [
    '  {',
    `    version: '${version}',`,
    `    date: '${date}',`,
    "    label: 'Auto',",
    '    changes: [',
    ...lines,
    '    ],',
    '  },',
  ].join('\n')
}

function main() {
  const repoRoot = run('git rev-parse --show-toplevel')
  const changelogPath = path.join(repoRoot, 'src/app/changelog/page.js')

  const outgoingCommits = getOutgoingCommits('origin/main')
  if (outgoingCommits.length === 0) {
    process.exit(0)
  }

  const fileText = readFileSync(changelogPath, 'utf8')
  const marker = 'const CHANGELOG = ['
  const markerIndex = fileText.indexOf(marker)

  if (markerIndex === -1) {
    console.error('Unable to find CHANGELOG array marker in src/app/changelog/page.js')
    process.exit(2)
  }

  const date = formatItalianDate(new Date())
  const bumpType = getBumpType(outgoingCommits)
  const currentVersion = getCurrentVersion(fileText)
  const nextVersion = bumpVersion(currentVersion, bumpType)
  const outgoingSubjects = outgoingCommits.map((c) => cleanSubjectForChangelog(c.subject))
  const entry = buildEntry({version: nextVersion, date, changes: outgoingSubjects.slice(0, 12)})

  const insertAt = markerIndex + marker.length
  const nextText = `${fileText.slice(0, insertAt)}\n${entry}\n${fileText.slice(insertAt)}`

  writeFileSync(changelogPath, nextText)
  console.log(
    `Updated changelog with v${nextVersion} (${outgoingCommits.length} changes, bump: ${bumpType})`,
  )
}

main()
