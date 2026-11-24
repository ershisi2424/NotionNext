/** @jest-environment node */
jest.mock('@/blog.config', () => ({ ENABLE_CACHE: true, isProd: false, NEXT_REVALIDATE_SECOND: 60, REDIS_URL: 'redis://test' }))
jest.mock('@/lib/cache/local_file_cache', () => ({ __esModule: true, default: { getCache: jest.fn(), setCache: jest.fn(), cleanCache: jest.fn() } }))
jest.mock('@/lib/cache/memory_cache', () => ({ __esModule: true, default: { getCache: jest.fn(), setCache: jest.fn(), cleanCache: jest.fn() } }))
jest.mock('@/lib/cache/redis_cache', () => ({ __esModule: true, default: { getCache: jest.fn(), setCache: jest.fn(), cleanCache: jest.fn() } }))
import FileCache from '@/lib/cache/local_file_cache'
import MemoryCache from '@/lib/cache/memory_cache'
import RedisCache from '@/lib/cache/redis_cache'
import { clearDataCache, getOrSetDataWithCache } from '@/lib/cache/cache_manager'

beforeEach(() => jest.clearAllMocks())

test('clears every data store before subsequent reads fetch fresh content', async () => {
  RedisCache.getCache.mockResolvedValueOnce({ title: 'old' })
  expect(await getOrSetDataWithCache('page', jest.fn())).toEqual({ title: 'old' })
  await clearDataCache()
  for (const store of [FileCache, MemoryCache, RedisCache]) expect(store.cleanCache).toHaveBeenCalledTimes(1)
  expect(await getOrSetDataWithCache('page', () => Promise.resolve({ title: 'new' }))).toEqual({ title: 'new' })
})

test('request started before invalidation cannot repopulate the cache', async () => {
  let finish
  const load = jest.fn(() => new Promise(resolve => { finish = resolve }))
  const pending = getOrSetDataWithCache('pending', load)
  while (!finish) await Promise.resolve()
  await clearDataCache()
  const fresh = await getOrSetDataWithCache('pending', () => Promise.resolve('new'))
  expect(fresh).toBe('new')
  RedisCache.setCache.mockClear()
  finish('old')
  await pending
  expect(RedisCache.setCache).not.toHaveBeenCalled()
})

test('reports Redis invalidation failure instead of claiming success', async () => {
  RedisCache.cleanCache.mockRejectedValueOnce(new Error('offline'))
  await expect(clearDataCache()).rejects.toThrow('offline')
  expect(FileCache.cleanCache).toHaveBeenCalled()
  expect(MemoryCache.cleanCache).toHaveBeenCalled()
})
