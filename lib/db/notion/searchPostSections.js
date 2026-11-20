import { getPostBlocks } from '@/lib/db/SiteDataApi'
import { formatNotionBlock } from '@/lib/db/notion/getPostBlocks'
import { getPageTableOfContents } from '@/lib/db/notion/getPageTableOfContents'
import { adapterNotionBlockMap } from '@/lib/utils/notion.util'
import { getTextContent, uuidToId } from 'notion-utils'

const excerptTypes = new Set(['text', 'bulleted_list', 'numbered_list', 'to_do', 'quote'])

async function findSections(post, query) {
  if (post.password || !post.id || !post.href?.startsWith('/')) return []

  const raw = await getPostBlocks(post.id, 'section-search', {
    cacheVersion: post.lastEditedDate
  })
  if (!raw?.block) return []

  const recordMap = adapterNotionBlockMap(raw)
  recordMap.block = formatNotionBlock(recordMap.block)
  const blocks = recordMap.block
  const content = blocks[post.id]?.value?.content ?? []
  const headings = getPageTableOfContents({ id: post.id, content }, recordMap)
  const headingIds = new Set(headings.map(heading => heading.id))
  const matches = []

  for (const heading of headings) {
    if (!heading.text?.toLowerCase().includes(query)) continue

    const parent = blocks[heading.id]?.value?.parent_id
    const siblings = blocks[parent]?.value?.content ?? []
    const position = siblings.indexOf(heading.id)
    let excerpt = ''
    if (position >= 0) {
      for (const id of siblings.slice(position + 1)) {
        if (headingIds.has(id)) break
        const block = blocks[id]?.value
        if (!excerptTypes.has(block?.type)) continue
        const text = getTextContent(block.properties?.title).trim()
        if (!text) continue
        excerpt = text.length > 120 ? text.slice(0, 120) + '…' : text
        break
      }
    }
    matches.push({ id: uuidToId(heading.id), title: heading.text, excerpt })
    if (matches.length === 3) break
  }
  return matches
}

export async function addSectionMatches(posts, existingResults, keyword) {
  const query = keyword?.trim().toLowerCase()
  if (!query) return existingResults

  const hits = await Promise.all(posts.map(async post => {
    try {
      return [post.id, await findSections(post, query)]
    } catch (error) {
      console.warn('[section-search] Unable to read article headings:', post.id, error)
      return [post.id, []]
    }
  }))
  const sections = new Map(hits.filter(([, matches]) => matches.length))
  const existing = new Map(existingResults.map(post => [post.id, post]))

  return posts.flatMap(post => {
    const result = existing.get(post.id)
    const sectionMatches = sections.get(post.id)
    if (!sectionMatches) return result ? [result] : []
    return [{ ...(result || post), sectionMatches }]
  })
}
