/** @jest-environment node */
jest.mock('@/blog.config', () => ({ REDIS_URL: 'redis://test', NOTION_PAGE_ID: 'site-one', NEXT_REVALIDATE_SECOND: 60 }))
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({
  get: jest.fn(), set: jest.fn(), del: jest.fn(), scan: jest.fn()
})))
import { redisClient, getCache, setCache, cleanCache } from '@/lib/cache/redis_cache'

beforeEach(() => jest.clearAllMocks())
test('uses site-specific keys with finite expiration', async () => {
  await setCache('article', { title: 'new' })
  expect(redisClient.set).toHaveBeenCalledWith('notionnext:v2:site-one:article', '{"title":"new"}', 'EX', 60)
  redisClient.get.mockResolvedValueOnce('{"title":"new"}')
  expect(await getCache('article')).toEqual({ title: 'new' })
  expect(redisClient.get).toHaveBeenCalledWith('notionnext:v2:site-one:article')
})
test('scans only this site namespace and handles multiple scan batches', async () => {
  redisClient.scan.mockResolvedValueOnce(['12', ['notionnext:v2:site-one:a']]).mockResolvedValueOnce(['0', ['notionnext:v2:site-one:b']])
  await cleanCache()
  expect(redisClient.scan.mock.calls).toEqual([
    ['0', 'MATCH', 'notionnext:v2:site-one:*', 'COUNT', 100],
    ['12', 'MATCH', 'notionnext:v2:site-one:*', 'COUNT', 100]
  ])
  expect(redisClient.del.mock.calls).toEqual([['notionnext:v2:site-one:a'], ['notionnext:v2:site-one:b']])
})
test('propagates write errors so the cache manager can fall back', async () => {
  redisClient.set.mockRejectedValueOnce(new Error('offline'))
  await expect(setCache('article', 'value')).rejects.toThrow('offline')
})
