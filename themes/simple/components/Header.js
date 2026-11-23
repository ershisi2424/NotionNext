import LazyImage from '@/components/LazyImage'
import { siteConfig } from '@/lib/config'
import SmartLink from '@/components/SmartLink'
import { useRouter } from 'next/router'
import CONFIG from '../config'
import SocialButton from './SocialButton'

/**
 * 网站顶部
 * @returns
 */
export default function Header(props) {
  const { siteInfo } = props
  const isHome = useRouter().pathname === '/'
  const BrandTitle = isHome ? 'h1' : 'div'

  return (
    <header className='simple-hero text-center relative'>
      <div className='simple-hero-content'>
        <SmartLink href='/'>
          {/* 可使用一张单图作为logo */}
          <div className='simple-brand'>
            <div className='simple-brand-icon'>
              <LazyImage
                priority={true}
                src={siteInfo?.icon}
                className='rounded-full'
                width={72}
                height={72}
                alt={siteConfig('AUTHOR')}
              />
            </div>

            <div className='flex-col flex justify-center'>
              <BrandTitle className='simple-brand-title'>
                {isHome ? siteInfo?.title || siteConfig('TITLE') : siteConfig('AUTHOR')}
              </BrandTitle>
              <div
                className='simple-brand-subtitle'
                dangerouslySetInnerHTML={{
                  __html: siteConfig('SIMPLE_LOGO_DESCRIPTION', null, CONFIG)
                }}
              />
            </div>
          </div>
        </SmartLink>

        <div className='flex justify-center'>
          <SocialButton />
        </div>
        <div className='text-xs mt-4 text-gray-500 dark:text-gray-300'>
          {siteConfig('DESCRIPTION')}
        </div>
      </div>
    </header>
  )
}
