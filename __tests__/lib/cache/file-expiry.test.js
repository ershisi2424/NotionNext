/** @jest-environment node */
import fs from 'fs'
import os from 'os'
import path from 'path'
jest.mock('@/blog.config', () => ({ NEXT_REVALIDATE_SECOND: 60 }))
jest.mock('@/lib/cache/build_session', () => ({ getNotionCacheRoot: () => process.env.TEST_NOTION_CACHE_ROOT }))

let root
let cache
beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'notion-expiry-test-'))
  process.env.TEST_NOTION_CACHE_ROOT = root
  cache = require('@/lib/cache/local_file_cache')
})
afterAll(() => { fs.rmSync(root, { recursive: true, force: true }); delete process.env.TEST_NOTION_CACHE_ROOT })
afterEach(() => jest.restoreAllMocks())

test('default file entry expires so a Notion edit can be fetched', () => {
  const now = Date.now()
  jest.spyOn(Date, 'now').mockReturnValue(now)
  cache.setCache('article', { title: 'old' })
  expect(cache.getCache('article')).toEqual({ title: 'old' })
  Date.now.mockReturnValue(now + 61000)
  expect(cache.getCache('article')).toBeNull()
})

test('honors explicit TTL and discards legacy entries with no expiry', () => {
  cache.setCache('custom', 'value', 5)
  const files = fs.readdirSync(path.join(root, 'data'))
  const file = files.map(name => path.join(root, 'data', name)).find(name => JSON.parse(fs.readFileSync(name)).key === 'custom')
  const entry = JSON.parse(fs.readFileSync(file))
  expect(entry.expireTime - entry.updatedAt).toBeLessThanOrEqual(5000)
  entry.expireTime = null
  fs.writeFileSync(file, JSON.stringify(entry))
  expect(cache.getCache('custom')).toBeNull()
})
