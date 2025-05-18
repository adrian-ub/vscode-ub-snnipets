import fs from 'node:fs'
import path from 'node:path'
import fg from 'fast-glob'
import matter from 'gray-matter'
import { x } from 'tinyexec'

const snippetsRoute = 'src/snippets'

export function extractBlocks(md: string): { firstCode: string[], description: string } {
  const codeBlockRegex = /```[a-z]*\n([\s\S]*?)```/
  const firstMatch = codeBlockRegex.exec(md)

  let firstCode: string[] = []
  let description = md

  if (firstMatch) {
    const fullMatch = firstMatch[0]
    const content = firstMatch[1].trimEnd()

    firstCode = content
      .split('\n')
      .map(line =>
        line.replace(/^( {2})+/g, match => '\t'.repeat(match.length / 2)),
      )

    const remaining = md.slice(firstMatch.index + fullMatch.length)
    description = remaining
  }

  description = description.replace(/^---$/m, '').trim()
  description = description.trim()

  return { firstCode, description }
}

async function main() {
  const files = await fg(`${snippetsRoute}/**/*.md`)
  const snippets: Record<string, any> = {}

  const tableRows: string[] = []

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const { data, content } = matter(raw)

    const prefixes = data.prefixes
    const scopes = data.scopes

    if (!prefixes || !Array.isArray(prefixes)) {
      continue
    }

    if (!scopes || !Array.isArray(scopes)) {
      continue
    }

    const { firstCode, description } = extractBlocks(content)

    if (!firstCode.length) {
      continue
    }

    const relPath = path.relative(snippetsRoute, file)
    const parts = relPath.split(path.sep)
    const baseName = path.parse(parts.pop()!).name
    const snippetName = [...parts, baseName].join('-')

    snippets[snippetName] = {
      prefix: prefixes,
      body: firstCode,
      description: description.trim(),
      scope: scopes.join(','),
    }

    const triggerDisplay = prefixes.map((p: string) => `\`${p}→\``).join(', ')
    const descFirstLine = description.trim().split('\n')[0] || ''

    tableRows.push(`| ${triggerDisplay} | ${descFirstLine} |`)
  }

  fs.mkdirSync('dist', { recursive: true })
  fs.writeFileSync('dist/snippets.code-snippets', JSON.stringify(snippets, null, 2))

  const readmePath = 'README.md'
  let readmeContent = fs.readFileSync(readmePath, 'utf8')

  const startTag = '<!-- SNIPPETS-START -->'
  const endTag = '<!-- SNIPPETS-END -->'

  const groupedTables = new Map<string, string[]>()

  for (const file of files) {
    const raw = fs.readFileSync(file, 'utf8')
    const { data, content } = matter(raw)

    const prefixes = data.prefixes
    const scopes = data.scopes

    if (!prefixes || !Array.isArray(prefixes))
      continue
    if (!scopes || !Array.isArray(scopes))
      continue

    const { firstCode, description } = extractBlocks(content)
    if (!firstCode.length)
      continue

    const relPath = path.relative(snippetsRoute, file)
    const parts = relPath.split(path.sep)
    const baseName = path.parse(parts.pop()!).name
    const group = parts.join('/') || 'root'
    const snippetName = [...parts, baseName].join('-')

    snippets[snippetName] = {
      prefix: prefixes,
      body: firstCode,
      description: description.trim(),
      scope: scopes.join(','),
    }

    const triggerDisplay = prefixes.map((p: string) => `\`${p}→\``).join(', ')
    const descFirstLine = description.trim().split('\n')[0] || ''
    const row = `| ${triggerDisplay} | ${descFirstLine} |`

    if (!groupedTables.has(group))
      groupedTables.set(group, [])
    groupedTables.get(group)!.push(row)
  }

  let finalTable = ''
  for (const [group, rows] of groupedTables) {
    finalTable += `\n### ${group}\n\n| Trigger  | Content |\n| -------: | ------- |\n${rows.join('\n')}\n`
  }

  if (readmeContent.includes(startTag) && readmeContent.includes(endTag)) {
    const regex = new RegExp(`(${startTag})([\\s\\S]*?)(${endTag})`)
    readmeContent = readmeContent.replace(regex, `$1\n${finalTable}\n$3`)
    fs.writeFileSync(readmePath, readmeContent)
    await x('eslint', [readmePath, '--fix'])
  }
}

main().catch(console.error)
