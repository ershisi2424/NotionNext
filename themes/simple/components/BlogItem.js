import LazyImage from '@/components/LazyImage'
import NotionIcon from '@/components/NotionIcon'
import NotionPage from '@/components/NotionPage'
import TwikooCommentCount from '@/components/TwikooCommentCount'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { formatDateFmt } from '@/lib/utils/formatDate'
import SmartLink from '@/components/SmartLink'
import CONFIG from '../config'

function moveGlassReflection(event) {
  if (event.pointerType !== 'mouse') return

  const card = event.currentTarget
  const { left, top } = card.getBoundingClientRect()
  card.style.setProperty('--glass-pointer-x', `${event.clientX - left}px`)
  card.style.setProperty('--glass-pointer-y', `${event.clientY - top}px`)
  card.setAttribute('data-glass-reflecting', '')
}

function hideGlassReflection(event) {
  event.currentTarget.removeAttribute('data-glass-reflecting')
}

export const BlogItem = props => {
  const { post } = props
  const { NOTION_CONFIG } = useGlobal()
  const showPageCover = siteConfig('SIMPLE_POST_COVER_ENABLE', false, CONFIG)
  const showPreview =
    siteConfig('POST_LIST_PREVIEW', false, NOTION_CONFIG) && post.blockMap

  return (
    <div
      key={post.id}
      className='simple-card'
      onPointerMove={moveGlassReflection}
      onPointerLeave={hideGlassReflection}
      onPointerCancel={hideGlassReflection}>
      {/* 文章标题 */}

      <div className='simple-card-content'>
        <div className='article-cover h-full'>
          {/* 图片封面 */}
          {showPageCover && (
            <div className='simple-card-cover'>
              <SmartLink href={post.href} passHref legacyBehavior>
                <LazyImage
                  src={post?.pageCoverThumbnail}
                  className='w-full h-full object-cover object-center'
                />
              </SmartLink>
            </div>
          )}
        </div>

        <article className='article-info'>
          <h2 className='mb-2'>
            <SmartLink
              href={post.href}
              className='blog-item-title'>
              {siteConfig('POST_TITLE_ICON') && (
                <NotionIcon icon={post.pageIcon} />
              )}
              {post.title}
            </SmartLink>
          </h2>

          {/* 文章信息 */}
          <header className='simple-card-meta flex-wrap flex leading-6'>
            <div className='space-x-2'>
              <span>
                {' '}
                <a
                  href={siteConfig('SIMPLE_AUTHOR_LINK', null, CONFIG)}
                  className='p-1 hover:text-red-400 transition-all duration-200'>
                  <i className='fa-regular fa-user'></i> {siteConfig('AUTHOR')}
                </a>
              </span>
              <span>
                <SmartLink
                  className='p-1 hover:text-red-400 transition-all duration-200'
                  href={`/archive#${formatDateFmt(post?.publishDate, 'yyyy-MM')}`}>
                  <i className='fa-regular fa-clock' />{' '}
                  {post.date?.start_date || post.createdTime}
                </SmartLink>
              </span>
              <span>
                <TwikooCommentCount post={post} />
              </span>
            </div>

            <div>
              {post.category && (
                <SmartLink href={`/category/${post.category}`} className='p-1'>
                  {' '}
                  <span className='hover:text-red-400 transition-all duration-200'>
                    <i className='fa-regular fa-folder mr-0.5' />
                    {post.category}
                  </span>
                </SmartLink>
              )}
              {post?.tags &&
                post?.tags?.length > 0 &&
                post?.tags.map(t => (
                  <SmartLink
                    key={t}
                    href={`/tag/${t}`}
                    className=' hover:text-red-400 transition-all duration-200'>
                    <span> /{t}</span>
                  </SmartLink>
                ))}
            </div>
          </header>

          <main className='simple-card-summary'>
            {!showPreview && (
              <>
                {post.summary}
                {post.summary && <span>...</span>}
              </>
            )}
            {showPreview && post?.blockMap && (
              <div className='overflow-ellipsis truncate'>
                <NotionPage post={post} />
                <hr className='border-dashed py-4' />
              </div>
            )}
          </main>
        </article>
      </div>

      {!!post.sectionMatches?.length && (
        <ul className='mt-3 space-y-2 text-sm'>
          {post.sectionMatches.map(section => (
            <li key={section.id}>
              <SmartLink
                href={post.href + '#' + section.id}
                className='simple-section-link inline-block font-medium underline underline-offset-4'>
                <span aria-hidden='true' className='mr-1'>§</span>
                {section.title}
              </SmartLink>
              {section.excerpt && (
                <p className='simple-card-summary mt-0.5'>{section.excerpt}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className='block'>
        <SmartLink
          href={post.href}
          className='simple-card-link'>
          点击访问{' '}
          <i className='fa-solid fa-angle-right align-middle'></i>
        </SmartLink>
      </div>
    </div>
  )
}
