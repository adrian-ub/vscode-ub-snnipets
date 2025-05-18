import fs from 'node:fs'
import fg from 'fast-glob'
import matter from 'gray-matter'

export function extractBlocks(md: string): { firstCode: string[], description: string } {
  const codeBlockRegex = /```[a-z]*\n([\s\S]*?)```/
  const firstMatch = codeBlockRegex.exec(md)

  let firstCode: string[] = []
  let description = md

  if (firstMatch) {
    const fullMatch = firstMatch[0]
    const content = firstMatch[1].trimEnd()

    firstCode = content.split('\n')

    const remaining = md.slice(firstMatch.index + fullMatch.length)
    description = remaining
  }

  description = description.replace(/^---$/m, '').trim()

  description = description.trim()

  return { firstCode, description }
}

async function main() {
  const files = await fg('src/snippets/**/*.md')
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

    const baseName = file.split('/').pop()!.split('.')[0]
    const snippetName = baseName[0].toUpperCase() + baseName.slice(1)

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

  const table = `\n| Trigger  | Content |
| -------: | ------- |
${tableRows.join('\n')}
`

  if (readmeContent.includes(startTag) && readmeContent.includes(endTag)) {
    const regex = new RegExp(`(${startTag})([\\s\\S]*?)(${endTag})`)
    readmeContent = readmeContent.replace(regex, `$1\n${table}\n$3`)
    fs.writeFileSync(readmePath, readmeContent)
  }
}

main().catch(console.error)
