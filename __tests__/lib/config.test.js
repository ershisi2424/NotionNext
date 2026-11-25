/**
 * @jest-environment node
 */
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'

describe('siteConfig', () => {
  const originalPostListStyle = BLOG.POST_LIST_STYLE
  const originalSiteUrlOverride = process.env.NEXT_PUBLIC_SITE_URL_OVERRIDE

  afterEach(() => {
    BLOG.POST_LIST_STYLE = originalPostListStyle
    if (originalSiteUrlOverride === undefined) delete process.env.NEXT_PUBLIC_SITE_URL_OVERRIDE
    else process.env.NEXT_PUBLIC_SITE_URL_OVERRIDE = originalSiteUrlOverride
  })

  it('uses BLOG/env config before caller default for server-only keys', () => {
    BLOG.POST_LIST_STYLE = 'scroll'

    expect(siteConfig('POST_LIST_STYLE', 'page', {})).toBe('scroll')
  })

  it('keeps extend config higher priority than BLOG/env config', () => {
    BLOG.POST_LIST_STYLE = 'scroll'

    expect(siteConfig('POST_LIST_STYLE', 'page', { POST_LIST_STYLE: 'page' })).toBe(
      'page'
    )
  })

  it('reads inner page parent path toggle from Notion Config', () => {
    expect(
      siteConfig('INNER_PAGE_URL_PARENT_PATH', false, {
        INNER_PAGE_URL_PARENT_PATH: 'true'
      })
    ).toBe(true)
  })

  it('allows a second host to share Notion without changing the original LINK', () => {
    const sharedConfig = { LINK: 'https://242424.help/blog' }
    process.env.NEXT_PUBLIC_SITE_URL_OVERRIDE = 'https://242424.art/blog/'
    expect(siteConfig('LINK', null, sharedConfig)).toBe('https://242424.art/blog')
    expect(sharedConfig.LINK).toBe('https://242424.help/blog')
    delete process.env.NEXT_PUBLIC_SITE_URL_OVERRIDE
    expect(siteConfig('LINK', null, sharedConfig)).toBe('https://242424.help/blog')
  })
})
