import { useGlobal } from '@/lib/global'
import { Frost } from './Frost'

export default function FrostBackground() {
  const { isDarkMode } = useGlobal()

  return (
    <div aria-hidden='true' className='simple-frost-background'>
      <Frost
        className='simple-frost-pane'
        opacity={isDarkMode ? 0.28 : 0.46}
        tintThin={isDarkMode ? [0.18, 0.28, 0.44] : [0.76, 0.86, 0.97]}
        tintThick={isDarkMode ? [0.42, 0.56, 0.77] : [0.94, 0.97, 1]}
        tintStrength={0.72}
        brightness={1}
        haze={0.16}
        frost={0.12}
        strength={0.75}
        highlight={0.15}
        highlightStrength={isDarkMode ? 0.25 : 0.55}
        refraction={0.6}
        meltRadius={0.19}
        refreeze={1.5}
        quality={0.5}
        introDuration={0}>
        <div className='simple-frost-color' />
      </Frost>
    </div>
  )
}
