import { Children, cloneElement, useId, useRef, useState } from 'react'

// Motion reference: LeiBox Staggered Radial Menu, design by Nitish Khagwal.
export default function RadialShareMenu({ children, accessory, onClose }) {
  const [open, setOpen] = useState(false)
  const toggleRef = useRef(null)
  const menuId = useId()
  const actions = Children.toArray(children)

  function close() {
    setOpen(false)
    onClose()
    toggleRef.current?.focus()
  }

  return (
    <div
      className='simple-radial-share'
      data-open={open}
      onKeyDown={event => {
        if (open && event.key === 'Escape') {
          event.stopPropagation()
          close()
        }
      }}>
      <div className='simple-radial-share-stage'>
        <button
          type='button'
          ref={toggleRef}
          className='simple-radial-share-toggle'
          aria-label={open ? '收起分享选项' : '分享文章'}
          aria-expanded={open}
          aria-controls={menuId}
          onClick={open ? close : () => setOpen(true)}>
          <i className={open ? 'fa-solid fa-xmark' : 'fa-solid fa-share-nodes'} aria-hidden='true' />
        </button>
        <ul id={menuId} aria-label='分享方式' aria-hidden={!open}>
          {actions.map((action, index) => {
            const innerCount = actions.length > 16 ? 8 : 0
            const inner = index < innerCount
            const count = inner ? innerCount : actions.length - innerCount
            const ringIndex = inner ? index : index - innerCount
            const angle = -Math.PI / 2 + ringIndex * 2 * Math.PI / count
            const radius = inner ? 22 : 41
            return (
              <li
                key={action.key}
                className='simple-radial-share-item'
                style={{
                  '--share-x': Math.cos(angle) * radius + '%',
                  '--share-y': Math.sin(angle) * radius + '%',
                  '--share-enter': index * 25 + 'ms',
                  '--share-exit': (actions.length - 1 - index) * 12 + 'ms'
                }}>
                {cloneElement(action, { tabIndex: open ? 0 : -1 })}
              </li>
            )
          })}
        </ul>
      </div>
      {open && accessory}
    </div>
  )
}
