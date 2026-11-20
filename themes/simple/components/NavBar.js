import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useSimpleGlobal } from '..'
import { MenuList } from './MenuList'
import { PixelToggle } from './pixel-toggle/PixelToggle'
import useLiquidGlassNavigation from './useLiquidGlassNavigation'

/**
 * 菜单导航
 * @param {*} props
 * @returns
 */
export default function NavBar(props) {
  const [showSearchInput, changeShowSearchInput] = useState(false)
  const router = useRouter()
  const { searchModal } = useSimpleGlobal()
  const { isDarkMode, toggleDarkMode } = useGlobal()
  const { navRef, canvasRef } = useLiquidGlassNavigation(isDarkMode)

  const { navRef: appearanceRef, canvasRef: appearanceCanvasRef } =
    useLiquidGlassNavigation(isDarkMode, true)
  const transitionRef = useRef(null)

  const changeAppearance = dayMode => {
    if (dayMode !== isDarkMode) return

    const origin = appearanceRef.current?.getBoundingClientRect()
    if (
      !origin ||
      typeof document.startViewTransition !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      toggleDarkMode()
      return
    }

    const root = document.documentElement
    const x = origin.left + origin.width / 2
    const y = origin.top + origin.height / 2
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    transitionRef.current?.skipTransition()
    root.style.setProperty('--appearance-reveal-x', x + 'px')
    root.style.setProperty('--appearance-reveal-y', y + 'px')
    root.style.setProperty('--appearance-reveal-radius', Math.ceil(radius) + 'px')
    root.classList.add('simple-appearance-reveal')

    const transition = document.startViewTransition(() => {
      flushSync(toggleDarkMode)
    })
    transitionRef.current = transition

    const clearReveal = () => {
      if (transitionRef.current !== transition) return

      transitionRef.current = null
      root.classList.remove('simple-appearance-reveal')
      root.style.removeProperty('--appearance-reveal-x')
      root.style.removeProperty('--appearance-reveal-y')
      root.style.removeProperty('--appearance-reveal-radius')
    }
    // A skipped snapshot can reject ready while still applying the theme.
    void transition.ready.catch(() => {})
    void transition.finished.then(clearReveal, clearReveal)
  }

  // 展示搜索框
  const toggleShowSearchInput = () => {
    if (siteConfig('ALGOLIA_APP_ID')) {
      searchModal.current.openSearch()
    } else {
      changeShowSearchInput(!showSearchInput)
    }
  }

  const onKeyUp = e => {
    if (e.keyCode === 13) {
      const search = document.getElementById('simple-search').value
      if (search) {
        router.push({ pathname: '/search/' + search })
      }
    }
  }

  return (
    <>
      <div ref={appearanceRef} className='simple-appearance-toggle' data-liquid-glass-ignore>
        <canvas ref={appearanceCanvasRef} className='simple-optical-canvas' aria-hidden='true' />
        <PixelToggle
          className='simple-appearance-control'
          options={{
            checked: !isDarkMode,
            onCheckedChange: changeAppearance,
            sound: false,
            height: 360
          }}
        />
      </div>
      <nav ref={navRef} className='simple-glass-nav'>
        <canvas ref={canvasRef} className='simple-optical-canvas' aria-hidden='true' />
        <div
          id='nav-bar-inner'
          className='simple-nav-inner text-sm'>
          {/* 左侧菜单 */}
          <div className='simple-nav-menu flex items-center min-w-0'>
            {showSearchInput && (
              <input
                autoFocus
                id='simple-search'
                onKeyUp={onKeyUp}
                className='simple-nav-search'
                aria-label='搜索文章'
                type='search'
                name='s'
                autoComplete='off'
                placeholder='搜索文章，按 Enter 确认'
              />
            )}
            {!showSearchInput && <MenuList {...props} />}
          </div>

          <button
            type='button'
            className='simple-search-toggle'
            aria-label={showSearchInput ? '关闭搜索' : '搜索'}
            onClick={toggleShowSearchInput}>
            <i
              className={
                showSearchInput
                  ? 'fa-regular fa-circle-xmark'
                  : 'fa-solid fa-magnifying-glass' + ' align-middle'
              }
              aria-hidden='true' />
          </button>
        </div>
      </nav>
    </>
  )
}
