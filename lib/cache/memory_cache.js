import cache from 'memory-cache'
import BLOG from '@/blog.config'

const cacheTime = Number(BLOG.NEXT_REVALIDATE_SECOND) > 0 ? Number(BLOG.NEXT_REVALIDATE_SECOND) : 60 // 120 minutes for dev,10 minutes for prod

export async function getCache(key, options) {
  return await cache.get(key)
}

export async function setCache(key, data, customCacheTime) {
  await cache.put(key, data, (customCacheTime || cacheTime) * 1000)
}

export async function delCache(key) {
  await cache.del(key)
}

export function cleanCache() {
  cache.clear()
}

const MemoryCache = { getCache, setCache, delCache, cleanCache }
export default MemoryCache
