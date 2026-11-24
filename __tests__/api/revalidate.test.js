/** @jest-environment node */
jest.mock('@/blog.config', () => ({ REVALIDATION_TOKEN: '' }))
jest.mock('@/lib/cache/cache_manager', () => ({ clearDataCache: jest.fn() }))
import handler from '@/pages/api/revalidate'
import cacheHandler from '@/pages/api/cache'
import { clearDataCache } from '@/lib/cache/cache_manager'

function response() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn(), revalidate: jest.fn().mockResolvedValue(undefined) }
}
beforeEach(() => {
  jest.clearAllMocks()
  process.env.REVALIDATION_TOKEN = 'test-token'
  process.env.CACHE_REVALIDATION_TOKEN = 'cache-token'
})
afterAll(() => { delete process.env.REVALIDATION_TOKEN; delete process.env.CACHE_REVALIDATION_TOKEN })
const request = body => ({ method: 'POST', headers: { authorization: 'Bearer test-token' }, body })

test('clears source caches before generating fresh article and list pages', async () => {
  const res = response()
  res.revalidate.mockImplementation(() => { expect(clearDataCache).toHaveBeenCalledTimes(1); return Promise.resolve() })
  await handler(request({ paths: ['/', '/article/example', '/article/example/'] }), res)
  expect(res.revalidate.mock.calls).toEqual([['/'], ['/article/example']])
  expect(res.status).toHaveBeenCalledWith(200)
})
test('unauthenticated and invalid requests do not invalidate data', async () => {
  let res = response()
  await handler({ ...request({}), headers: {} }, res)
  expect(res.status).toHaveBeenCalledWith(401)
  res = response()
  await handler(request({ paths: ['https://example.com'] }), res)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(clearDataCache).not.toHaveBeenCalled()
})
test('all clears stores and revalidates homepage', async () => {
  const res = response()
  await handler(request({ all: true }), res)
  expect(clearDataCache).toHaveBeenCalledTimes(1)
  expect(res.revalidate).toHaveBeenCalledWith('/')
})
test('page refresh failure is reported as failure', async () => {
  const res = response()
  res.revalidate.mockRejectedValueOnce(new Error('Notion unavailable'))
  await handler(request({ path: '/' }), res)
  expect(res.status).toHaveBeenCalledWith(500)
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: false }))
})
test('legacy cache endpoint fails closed when token is missing', async () => {
  delete process.env.CACHE_REVALIDATION_TOKEN
  const res = response()
  await cacheHandler({ method: 'POST', headers: {} }, res)
  expect(res.status).toHaveBeenCalledWith(503)
  expect(clearDataCache).not.toHaveBeenCalled()
})
test('legacy endpoint also invalidates every store after authentication', async () => {
  const res = response()
  await cacheHandler({ method: 'POST', headers: { authorization: 'Bearer cache-token' } }, res)
  expect(clearDataCache).toHaveBeenCalledTimes(1)
  expect(res.status).toHaveBeenCalledWith(200)
})
