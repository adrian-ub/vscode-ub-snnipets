/* eslint-disable no-template-curly-in-string */
import { describe, expect, it } from 'vitest'
import { extractBlocks } from '../scripts/generate'

describe('extractBlocks', () => {
  it('extracts the first code block and a simple description', () => {
    const md = `
\`\`\`ts
console.log('hello')
\`\`\`

This snippet prints "hello".
    `.trim()

    const result = extractBlocks(md)

    expect(result.firstCode).toEqual([`console.log('hello')`])
    expect(result.description).toBe('This snippet prints "hello".')
  })

  it('skips "---" separators and trims leading empty lines in description', () => {
    const md = `
\`\`\`js
alert('ok')
\`\`\`

---

This is the description after the separator.
    `.trim()

    const result = extractBlocks(md)

    expect(result.firstCode).toEqual([`alert('ok')`])
    expect(result.description).toBe('This is the description after the separator.')
  })

  it('removes leading and trailing blank lines from the description', () => {
    const md = `
\`\`\`ts
console.log('test')
\`\`\`


  Trimmed description with extra spacing


    `.trim()

    const result = extractBlocks(md)

    expect(result.description).toBe('Trimmed description with extra spacing')
  })

  it('supports multiline code blocks', () => {
    const md = `
\`\`\`ts
const a = 1
const b = 2
\`\`\`

This code defines two constants.
    `.trim()

    const result = extractBlocks(md)

    expect(result.firstCode).toEqual([
      'const a = 1',
      'const b = 2',
    ])
    expect(result.description).toBe('This code defines two constants.')
  })

  it('returns an empty code block if none is found', () => {
    const md = `This is a snippet with no code block.`

    const result = extractBlocks(md)

    expect(result.firstCode).toEqual([])
    expect(result.description).toBe('This is a snippet with no code block.')
  })

  it('converts 2-space indentation to tabs in the code block', () => {
    const md = `
\`\`\`ts
@Component({
  selector: '\${1:selector}',
  templateUrl: '\${2:template}.html',
})
export class \${3:ClassName} {}
\`\`\`

An Angular component snippet.
    `.trim()

    const result = extractBlocks(md)

    expect(result.firstCode).toEqual([
      '@Component({',
      '\tselector: \'${1:selector}\',',
      '\ttemplateUrl: \'${2:template}.html\',',
      '})',
      'export class ${3:ClassName} {}',
    ])
    expect(result.description).toBe('An Angular component snippet.')
  })

  it('converts 4-space indentation to two tabs in the code block', () => {
    const md = `
\`\`\`ts
function test() {
    if (true) {
      console.log('deeply indented')
    }
}
\`\`\`

A function with nested indentation.
    `.trim()

    const result = extractBlocks(md)

    expect(result.firstCode).toEqual([
      'function test() {',
      '\t\tif (true) {',
      '\t\t\tconsole.log(\'deeply indented\')',
      '\t\t}',
      '}',
    ])
    expect(result.description).toBe('A function with nested indentation.')
  })
})
