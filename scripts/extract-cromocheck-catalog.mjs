import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const htmlPath = process.argv[2]
const outputPath = process.argv[3] ?? 'src/data/worldCup2026Stickers.ts'
const markdownPath = process.argv[4]

if (!htmlPath) {
  console.error('Usage: node scripts/extract-cromocheck-catalog.mjs <html-file> [output-file]')
  process.exit(1)
}

const html = readFileSync(resolve(htmlPath), 'utf8')
const marker = '\\"initialItems\\":'
const markerIndex = html.indexOf(marker)

if (markerIndex === -1) {
  console.error('Could not find initialItems in the HTML payload.')
  process.exit(1)
}

const arrayStart = html.indexOf('[', markerIndex)

if (arrayStart === -1) {
  console.error('Could not find initialItems array start.')
  process.exit(1)
}

let depth = 0
let arrayEnd = -1

for (let index = arrayStart; index < html.length; index += 1) {
  const character = html[index]

  if (character === '[') {
    depth += 1
  }

  if (character === ']') {
    depth -= 1

    if (depth === 0) {
      arrayEnd = index + 1
      break
    }
  }
}

if (arrayEnd === -1) {
  console.error('Could not find initialItems array end.')
  process.exit(1)
}

const rawArray = html.slice(arrayStart, arrayEnd)
const json = rawArray.replaceAll('\\"', '"')
const parsedItems = JSON.parse(json)
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

const markdownSectionOrder = markdownPath
  ? readFileSync(resolve(markdownPath), 'utf8')
      .split('\n')
      .filter((line) => line.startsWith('## '))
      .map((line) => line.replace(/^## /, '').trim())
  : []

const sectionOrderByName = new Map(
  markdownSectionOrder.map((sectionName, index) => [sectionName, index + 1]),
)

const stickers = parsedItems.map((item, index) => ({
  id: String(item.id),
  section: String(item.categoria),
  number: String(item.numero),
  name: String(item.nombre),
  team: String(item.equipo),
  sortOrder: index + 1,
}))

const stickersBySection = new Map()

for (const sticker of stickers) {
  const sectionStickers = stickersBySection.get(sticker.section) ?? []
  sectionStickers.push(sticker)
  stickersBySection.set(sticker.section, sectionStickers)
}

for (const sectionStickers of stickersBySection.values()) {
  sectionStickers.sort((left, right) => collator.compare(left.number, right.number))
}

const sections = Array.from(
  stickers.reduce((sectionMap, sticker) => {
    const existing = sectionMap.get(sticker.section)

    if (existing) {
      return sectionMap
    }

    sectionMap.set(sticker.section, {
      id: sticker.section,
      name: sticker.section,
      stickerIds: [],
    })

    return sectionMap
  }, new Map()).values(),
)
  .map((section, index) => ({
    ...section,
    stickerIds: (stickersBySection.get(section.id) ?? []).map((sticker) => sticker.id),
    sortOrder: sectionOrderByName.get(section.id) ?? markdownSectionOrder.length + index + 1,
  }))
  .sort((left, right) => left.sortOrder - right.sortOrder)

const sortedStickers = sections.flatMap((section) => stickersBySection.get(section.id) ?? [])

const generated = `// Generated from CromoCheck public collection page for local MVP prototyping.
// Review and correct this catalog before treating it as canonical app data.

export type StickerCatalogItem = {
  id: string
  section: string
  number: string
  name: string
  team: string
  sortOrder: number
}

export type StickerCatalogSection = {
  id: string
  name: string
  stickerIds: string[]
  sortOrder: number
}

export const worldCup2026Catalog = {
  id: 'world-cup-2026',
  name: 'World Cup 2026 Stickers',
  sourceUrl: 'https://cromocheck.com/collections/world-cup-2026-stickers-panini',
  totalStickers: ${stickers.length},
  sections: ${JSON.stringify(sections, null, 2)},
  stickers: ${JSON.stringify(sortedStickers, null, 2)},
} as const
`

mkdirSync(dirname(resolve(outputPath)), { recursive: true })
writeFileSync(resolve(outputPath), generated)

console.log(`Extracted ${stickers.length} stickers in ${sections.length} sections.`)
console.log(`Generated ${outputPath}`)
