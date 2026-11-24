import BLOG from '@/blog.config'
import Redis from 'ioredis'

export const redisClient = BLOG.REDIS_URL ? new Redis(BLOG.REDIS_URL) : {}

const cacheTime = Number(BLOG.NEXT_REVALIDATE_SECOND) > 0 ? Number(BLOG.NEXT_REVALIDATE_SECOND) : 60
const prefix = `notionnext:v2:${encodeURIComponent(BLOG.NOTION_PAGE_ID || 'default')}:`

export async function getCache(key) {
  try {
    const data = await redisClient.get(prefix + key)
    return data ? JSON.parse(data) : null
  } catch (e) {
    console.error(`redisClient读取失败 ${String(e)}`)
  }
}

export async function setCache(key, data, customCacheTime) {
  try {
    await redisClient.set(
      prefix + key,
      JSON.stringify(data),
      'EX',
      customCacheTime || cacheTime
    )
  } catch (e) {
    throw e
  }
}

export async function delCache(key) {
  try {
    await redisClient.del(prefix + key)
  } catch (e) {
    throw e
  }
}

export async function cleanCache() {
  let cursor = '0'
  do {
    const result = await redisClient.scan(cursor, 'MATCH', prefix + '*', 'COUNT', 100)
    cursor = result[0]
    if (result[1].length) await redisClient.del(...result[1])
  } while (cursor !== '0')
}

const RedisCache = { getCache, setCache, delCache, cleanCache }
export default RedisCache
