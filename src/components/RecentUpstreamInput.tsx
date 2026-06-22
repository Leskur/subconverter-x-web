import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  clearRecentUpstream,
  loadRecentUpstream,
  removeRecentUpstream,
} from '@/lib/recent-upstream'

interface RecentUpstreamInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 父组件写入新记录后递增，用于刷新列表 */
  recentVersion?: number
}

export function RecentUpstreamInput({
  id,
  value,
  onChange,
  placeholder,
  recentVersion = 0,
}: RecentUpstreamInputProps) {
  const [open, setOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => loadRecentUpstream())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRecent(loadRecentUpstream())
  }, [recentVersion])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const filteredRecent = useMemo(() => {
    const query = value.trim().toLowerCase()
    if (!query) return recent
    return recent.filter((item) => item.toLowerCase().includes(query))
  }, [recent, value])

  function pick(url: string) {
    onChange(url)
    setOpen(false)
  }

  function remove(url: string, event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()
    setRecent(removeRecentUpstream(url))
  }

  function clearAll() {
    setRecent(clearRecentUpstream())
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          if (recent.length > 0) setOpen(true)
        }}
        onFocus={() => {
          if (recent.length > 0) setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder={placeholder}
        className="font-mono text-sm pr-8"
        autoComplete="off"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          title="清空"
          onClick={() => onChange('')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}

      {open && recent.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          {filteredRecent.length > 0 ? (
            <ul className="max-h-56 overflow-auto py-1">
              {filteredRecent.map((item) => (
                <li key={item}>
                  <div className="group flex items-center gap-1 pr-1">
                    <button
                      type="button"
                      className="min-w-0 flex-1 px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => pick(item)}
                      title={item}
                    >
                      <span className="block truncate text-sm">{item}</span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100"
                      title="移除"
                      onClick={(e) => remove(item, e)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">无匹配记录</p>
          )}
          <div className="border-t px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-full text-xs text-muted-foreground"
              onClick={clearAll}
            >
              清除全部记录
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
