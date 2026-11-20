/* eslint-disable react/no-unknown-property */
import CONFIG from './config'
import { themeConsoleStyle } from '@/lib/themeConsoleStyle'
/**
 * 此处样式只对当前主题生效
 * 此处不支持tailwindCSS的 @apply 语法
 * @returns
 */
const Style = () => {
  return <style jsx global>{`

  .forbid-copy {
    user-select: none;
    -webkit-user-select: none;
  }

  #theme-simple {
    isolation: isolate;
    --glass-ink: #172638;
    --glass-muted: #475a70;
    --glass-accent: #275f98;
    --glass-fill: rgba(255, 255, 255, 0.73);
    --glass-solid: #f7faff;
    --glass-edge: rgba(255, 255, 255, 0.94);
    --glass-shadow: 0 12px 32px rgba(36, 56, 87, 0.09);
    --glass-highlight: rgba(255, 255, 255, 0.55);
    --glass-frost: rgba(114, 143, 185, 0.14);
    --glass-glint: rgba(255, 255, 255, 0.96);
    --glass-reflection: rgba(156, 191, 240, 0.24);
    background: radial-gradient(ellipse 55% 28rem at 16% 0%, #dbe8fc, transparent),
      radial-gradient(ellipse 65% 32rem at 90% 5%, #e3e6fa, transparent),
      #f2f5fb;
    color: var(--glass-ink);
  }

  .dark #theme-simple {
    --glass-ink: #eff4fd;
    --glass-muted: #b0bdd2;
    --glass-accent: #a8cbff;
    --glass-fill: rgba(26, 36, 55, 0.76);
    --glass-solid: #202c40;
    --glass-edge: rgba(218, 233, 255, 0.2);
    --glass-shadow: 0 12px 32px rgba(0, 0, 0, 0.26);
    --glass-highlight: rgba(218, 233, 255, 0.14);
    --glass-frost: rgba(144, 176, 222, 0.19);
    --glass-glint: rgba(220, 235, 255, 0.46);
    --glass-reflection: rgba(147, 188, 255, 0.18);
    background: radial-gradient(ellipse 55% 28rem at 16% 0%, #1e3655, transparent),
      radial-gradient(ellipse 65% 32rem at 90% 5%, #2e304a, transparent),
      #101824;
  }

  #theme-simple .simple-frost-background {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }

  #theme-simple .simple-frost-pane,
  #theme-simple .simple-frost-color {
    width: 100%;
    height: 100%;
  }

  #theme-simple .simple-frost-color {
    background: radial-gradient(ellipse at 12% 12%, #d4e7fc, transparent 62%),
      radial-gradient(ellipse at 88% 24%, #e1e3fa, transparent 58%),
      linear-gradient(145deg, #eaf1fb, #f5f8fd);
  }

  .dark #theme-simple .simple-frost-color {
    background: radial-gradient(ellipse at 12% 12%, #223955, transparent 62%),
      radial-gradient(ellipse at 88% 24%, #292b48, transparent 58%),
      linear-gradient(145deg, #131e2e, #101724);
  }

  #theme-simple .simple-hero {
    padding: clamp(2.75rem, 8vw, 6rem) 1rem clamp(1.75rem, 5vw, 3.5rem);
  }

  #theme-simple .simple-hero-content {
    max-width: 42rem;
    margin: auto;
    animation: simple-glass-enter 420ms ease-out both;
  }

  #theme-simple .simple-brand {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: clamp(0.75rem, 3vw, 1.5rem);
    margin-bottom: 0.75rem;
  }

  #theme-simple .simple-brand-icon {
    flex: none;
    padding: 4px;
    border: 1px solid var(--glass-edge);
    border-radius: 50%;
    background: var(--glass-fill);
    box-shadow: var(--glass-shadow);
  }

  #theme-simple .simple-brand-title {
    font-size: clamp(1.75rem, 5vw, 3rem);
    font-weight: 650;
    letter-spacing: -0.04em;
    line-height: 1.15;
  }

  #theme-simple .simple-brand-subtitle {
    margin-top: 0.4rem;
    color: var(--glass-muted);
  }

  #theme-simple .simple-glass-nav,
  #theme-simple .simple-card {
    border: 1px solid var(--glass-edge);
    box-shadow: inset 0 1px 0 var(--glass-highlight), var(--glass-shadow);
  }

  /* Keep the lit rim separate from the glass fill and clickable content. */
  #theme-simple :is(.simple-glass-nav, .simple-card)::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: inset 0 0 5px var(--glass-frost),
      inset 0 1px 2px var(--glass-glint),
      inset 0 -1px 2px var(--glass-frost);
  }

  #theme-simple .simple-glass-nav {
    position: sticky;
    top: calc(4.9rem + env(safe-area-inset-top, 0px));
    z-index: 20;
    width: 90%;
    max-width: 88rem;
    margin-inline: auto;
    border-radius: 1.65rem;
    background: var(--glass-solid);
  }

  @supports ((backdrop-filter: blur(18px)) or (-webkit-backdrop-filter: blur(18px))) {
    #theme-simple .simple-glass-nav {
      background: var(--glass-fill);
      -webkit-backdrop-filter: blur(18px) saturate(145%);
      backdrop-filter: blur(18px) saturate(145%);
    }
  }

  #theme-simple .simple-glass-nav[data-optical-glass] {
    background: transparent;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  #theme-simple .simple-optical-canvas {
    visibility: hidden;
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 140%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  #theme-simple .simple-glass-nav[data-optical-glass] .simple-optical-canvas {
    visibility: visible;
  }

  #theme-simple .simple-glass-nav[data-optical-glass] .simple-nav-inner {
    position: relative;
    z-index: 1;
  }

  #theme-simple .simple-nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    min-height: 3.25rem;
    padding-inline: clamp(0.65rem, 2vw, 1.35rem);
  }

  #theme-simple .simple-appearance-toggle {
    position: fixed;
    top: max(0.65rem, env(safe-area-inset-top, 0px));
    right: max(0.75rem, env(safe-area-inset-right, 0px));
    z-index: 21;
    width: clamp(104px, 17vw, 122px);
    box-shadow: var(--glass-shadow);
    overflow: hidden;
    border: 1px solid var(--glass-edge);
    border-radius: 1rem;
  }

  html.simple-appearance-reveal::view-transition-old(root),
  html.simple-appearance-reveal::view-transition-new(root) {
    animation: none;
    mix-blend-mode: normal;
  }

  html.simple-appearance-reveal::view-transition-new(root) {
    z-index: 1;
    animation: simple-appearance-reveal 520ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
  }

  @keyframes simple-appearance-reveal {
    from {
      clip-path: circle(0 at var(--appearance-reveal-x) var(--appearance-reveal-y));
    }
    to {
      clip-path: circle(var(--appearance-reveal-radius) at var(--appearance-reveal-x) var(--appearance-reveal-y));
    }
  }

  #theme-simple .simple-nav-menu {
    flex: 1;
  }

  #theme-simple .simple-mobile-menu {
    top: calc(100% + 0.4rem);
  }

  #theme-simple #menu-wrap {
    border: 1px solid var(--glass-edge);
    border-radius: 1.25rem;
    background: var(--glass-solid);
    box-shadow: var(--glass-shadow);
  }

  #theme-simple .simple-nav-search,
  #theme-simple .simple-search-toggle,
  #theme-simple .simple-card-link {
    border-radius: 999px;
    border: 1px solid var(--glass-edge);
    color: var(--glass-accent);
    box-shadow: inset 0 1px 0 var(--glass-highlight);
    transition: background-color 180ms ease, transform 180ms ease;
  }

  #theme-simple .simple-nav-search {
    width: 100%;
    min-width: 0;
    padding: 0.45rem 0.85rem;
    background: var(--glass-solid);
    color: var(--glass-ink);
  }

  #theme-simple .simple-search-toggle {
    display: grid;
    flex: none;
    width: 2.75rem;
    height: 2.75rem;
    place-items: center;
    background: var(--glass-fill);
  }

  #theme-simple #container-wrapper {
    max-width: min(90%, 88rem);
    padding-top: clamp(1.25rem, 4vw, 2.75rem);
  }

  #theme-simple #container-inner {
    min-width: 0;
  }

  #theme-simple .simple-card {
    position: relative;
    isolation: isolate;
    margin-bottom: 1rem;
    padding: clamp(1rem, 3vw, 1.75rem);
    border-radius: clamp(1.15rem, 3vw, 1.65rem);
    background: var(--glass-fill);
    transition: transform 200ms ease, background-color 200ms ease, box-shadow 200ms ease;
  }

  #theme-simple .simple-radial-share {
    width: min(100%, 18rem);
    margin: 0.75rem auto;
    container-type: inline-size;
  }

  #theme-simple .simple-radial-share-stage {
    position: relative;
    overflow: hidden;
    height: 3.25rem;
    transition: height 260ms ease 420ms;
  }

  #theme-simple .simple-radial-share[data-open='true'] .simple-radial-share-stage {
    height: 18rem;
    height: 100cqw;
    transition-delay: 0ms;
  }

  #theme-simple .simple-radial-share-toggle,
  #theme-simple .simple-radial-share-item {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
  }

  #theme-simple .simple-radial-share-toggle {
    z-index: 2;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border: 1px solid var(--glass-edge);
    border-radius: 50%;
    color: var(--glass-accent);
    background: var(--glass-solid);
    box-shadow: inset 0 1px 0 var(--glass-highlight), var(--glass-shadow);
  }

  #theme-simple .simple-radial-share-item {
    pointer-events: none;
    opacity: 0;
    filter: blur(7px);
    transform: translate(calc(var(--share-x) * 3.3), calc(var(--share-y) * 3.3)) scale(0.72);
    left: calc(50% + var(--share-x));
    top: calc(50% + var(--share-y));
  }

  #theme-simple .simple-radial-share[data-open='true'] .simple-radial-share-item {
    pointer-events: auto;
    opacity: 1;
    filter: none;
    transform: none;
    transition: transform 420ms cubic-bezier(0.2, 1.42, 0.35, 1) var(--share-enter),
      opacity 150ms ease var(--share-enter), filter 200ms ease var(--share-enter);
  }

  #theme-simple .simple-radial-share[data-open='false'] .simple-radial-share-item {
    transition: transform 260ms ease-in var(--share-exit),
      opacity 180ms ease var(--share-exit), filter 200ms ease var(--share-exit);
  }

  #theme-simple .simple-radial-share-item button {
    margin: 0;
    min-width: 2.25rem;
    min-height: 2.25rem;
    display: grid;
    place-items: center;
  }

  #theme-simple .simple-radial-share button:focus-visible {
    outline: 2px solid var(--glass-accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    #theme-simple .simple-radial-share[data-open] .simple-radial-share-stage,
    #theme-simple .simple-radial-share[data-open] .simple-radial-share-item {
      transition: none;
    }
  }

  #theme-simple .simple-card-content {
    display: flex;
    align-items: flex-start;
  }

  #theme-simple .simple-card-cover {
    width: clamp(8rem, 17vw, 13rem);
    aspect-ratio: 16 / 10;
    margin-right: clamp(0.85rem, 2vw, 1.5rem);
    overflow: hidden;
    border-radius: 0.9rem;
  }

  #theme-simple .simple-card .article-info {
    min-width: 0;
  }

  #theme-simple .blog-item-title {
    color: var(--glass-ink);
    font-size: clamp(1.2rem, 2.2vw, 1.55rem);
    font-weight: 650;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  #theme-simple .simple-card-meta,
  #theme-simple .simple-card-summary {
    color: var(--glass-muted);
    overflow-wrap: anywhere;
  }

  #theme-simple .simple-card-meta {
    font-size: 0.875rem;
    margin-bottom: 0.6rem;
  }

  #theme-simple .simple-card-summary {
    line-height: 1.65;
  }

  #theme-simple .simple-section-link {
    color: var(--glass-accent);
  }

  #theme-simple #article-wrapper .notion-header-anchor:target {
    scroll-margin-top: 6rem;
  }

  #theme-simple .simple-card-link {
    display: inline-flex;
    gap: 0.45rem;
    align-items: center;
    min-height: 2.5rem;
    padding-inline: 0.85rem;
    margin-top: 0.9rem;
    background: var(--glass-fill);
    font-size: 0.85rem;
    font-weight: 600;
  }

  #theme-simple :is(.simple-glass-nav, .simple-hero, .simple-card) :focus-visible {
    outline: 2px solid var(--glass-accent);
    outline-offset: 2px;
  }

  #theme-simple .simple-card:focus-within {
    background: var(--glass-solid);
  }

  @media (hover: hover) {
    #theme-simple .simple-card:hover {
      transform: translateY(-3px);
      background: var(--glass-solid);
    }

    #theme-simple :is(.simple-card-link, .simple-search-toggle):hover {
      background: var(--glass-solid);
      transform: scale(1.04);
    }
  }

  @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
    #theme-simple .simple-card::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      border-radius: inherit;
      pointer-events: none;
      opacity: 0;
      background: radial-gradient(
        11rem circle at var(--glass-pointer-x, 50%) var(--glass-pointer-y, 50%),
        var(--glass-glint),
        var(--glass-reflection) 36%,
        transparent 76%
      );
      transition: opacity 220ms ease-out;
    }

    #theme-simple .simple-card[data-glass-reflecting]::after {
      opacity: 0.82;
    }
  }

  #theme-simple :is(.simple-card-link, .simple-search-toggle):active {
    transform: scale(0.96);
  }

  @media (max-width: 40rem) {
    #theme-simple .simple-card-content {
      flex-direction: column;
    }

    #theme-simple .simple-card .article-cover {
      width: 100%;
    }

    #theme-simple .simple-card-cover {
      width: 100%;
      margin: 0 0 0.85rem;
    }
  }

  @keyframes simple-glass-enter {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (prefers-reduced-motion: reduce) {
    #theme-simple .simple-hero-content {
      animation: none;
    }

    #theme-simple :is(.simple-card, .simple-card-link, .simple-search-toggle) {
      transition: none;
      transform: none !important;
    }
  }


  #theme-simple .simple-pet {
    display: grid;
    place-items: center;
    width: 100%;
    min-height: 200px;
    border-radius: 1rem;
    cursor: pointer;
  }

  #theme-simple .simple-pet:focus-visible {
    outline: 2px solid var(--glass-accent);
    outline-offset: 2px;
  }

  #theme-simple .simple-pet-sprite {
    width: 144px;
    height: 156px;
    background: url('/pets/deepseek-girl.webp') no-repeat 0 0 / 1152px 1716px;
    animation: simple-pet-loop 1.75s steps(7, end) infinite;
  }

  #theme-simple .simple-pet-sprite[data-looking] {
    background-position: var(--look-x) var(--look-y);
    animation: none;
  }

  #theme-simple .simple-pet-sprite[data-action] {
    background-position-y: var(--action-y);
    animation: simple-pet-action var(--action-duration) steps(var(--action-steps), end);
  }

  @keyframes simple-pet-loop {
    to { background-position-x: -1008px; }
  }

  @keyframes simple-pet-action {
    to { background-position-x: var(--action-end); }
  }

  @media (prefers-reduced-motion: reduce) {
    #theme-simple .simple-pet-sprite,
    #theme-simple .simple-pet-sprite[data-looking],
    #theme-simple .simple-pet-sprite[data-action] {
      background-position: 0 0;
      animation: none;
    }
  }

  .notion {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
  }


  /*  菜单下划线动画 */
  #theme-simple .menu-link {
      text-decoration: none;
      background-image: linear-gradient(#dd3333, #dd3333);
      background-repeat: no-repeat;
      background-position: bottom center;
      background-size: 0 2px;
      transition: background-size 100ms ease-in-out;
  }

  #theme-simple .menu-link:hover {
      background-size: 100% 2px;
      color: #dd3333;
      cursor: pointer;
  }




      ${themeConsoleStyle('simple', CONFIG)}
  `}</style>
}

export { Style }
