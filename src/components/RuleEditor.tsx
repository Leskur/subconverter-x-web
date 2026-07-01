import { GripVertical, Plus, Trash2, Link } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { uuid } from '@/lib/uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface Rule {
  id: string
  type: string
  content: string
  policy: string
  enabled: boolean
}

const RULE_TYPES = [
  { value: 'DOMAIN-SUFFIX', label: '域名后缀', placeholder: 'google.com' },
  { value: 'DOMAIN', label: '域名', placeholder: 'example.com' },
  { value: 'DOMAIN-KEYWORD', label: '域名关键词', placeholder: 'google' },
  { value: 'GEOIP', label: '国家/地区', placeholder: 'CN' },
  { value: 'IP-CIDR', label: 'IP 段', placeholder: '192.168.1.0/24' },
  { value: 'RULE-SET', label: '远端规则集', placeholder: 'https://example.com/rules.list' },
]

const POLICIES = [
  { value: 'DIRECT', label: 'DIRECT', active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', inactive: 'text-muted-foreground hover:text-foreground' },
  { value: 'REJECT', label: 'REJECT', active: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', inactive: 'text-muted-foreground hover:text-foreground' },
  { value: 'PROXY', label: 'PROXY', active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', inactive: 'text-muted-foreground hover:text-foreground' },
]

interface RuleEditorProps {
  rules: Rule[]
  onChange: (rules: Rule[]) => void
  showUpstream: boolean
  onToggleUpstream: (show: boolean) => void
}

export function RuleEditor({ rules, onChange, showUpstream, onToggleUpstream }: RuleEditorProps) {
  const [dragList, setDragList] = useState<Rule[] | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const allRules = dragList ?? rules
  const displayRules = allRules.filter((r) => r.type !== 'MATCH')
  const matchRule = allRules.find((r) => r.type === 'MATCH')

  function updateRule(ruleId: string, updates: Partial<Rule>) {
    const next = rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r))
    onChange(next)
  }

  function deleteRule(ruleId: string) {
    onChange(rules.filter((r) => r.id !== ruleId))
  }

  function handleDragStart(id: string) {
    setDraggedId(id)
    setDragList(rules)
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!draggedId || draggedId === targetId || !dragList) return
    const from = dragList.findIndex((r) => r.id === draggedId)
    let to = dragList.findIndex((r) => r.id === targetId)
    if (from === -1 || to === -1) return
    // MATCH is fixed at bottom - don't allow dropping after it
    const matchIdx = dragList.findIndex((r) => r.type === 'MATCH')
    if (matchIdx !== -1 && to >= matchIdx && from < matchIdx) to = matchIdx - 1
    if (to < 0) to = 0
    if (from === to) return
    const next = [...dragList]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDragList(next)
  }

  function handleDragEnd() {
    if (dragList) {
      onChange(dragList)
    }
    setDragList(null)
    setDraggedId(null)
  }

  const [lastAddedId, setLastAddedId] = useState<string | null>(null)
  const focusRef = useRef<HTMLInputElement>(null)

  function addRule() {
    const newRule: Rule = {
      id: uuid(),
      type: 'DOMAIN-SUFFIX',
      content: '',
      policy: 'PROXY',
      enabled: true,
    }
    onChange([...rules, newRule])
    setLastAddedId(newRule.id)
  }

  useEffect(() => {
    if (lastAddedId && focusRef.current) {
      focusRef.current.focus()
      setLastAddedId(null)
    }
  }, [lastAddedId, rules])

  return (
    <div className="rounded-md border overflow-hidden">
      {/* 表头 */}
      <div className="grid grid-cols-[32px_110px_1fr_160px_56px] gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div></div>
        <div>类型</div>
        <div>匹配内容</div>
        <div>策略</div>
        <div></div>
      </div>

      {/* 规则行 */}
      {displayRules.map((rule) => {
        const typeInfo = RULE_TYPES.find((t) => t.value === rule.type)

        const isRuleSet = rule.type === 'RULE-SET'

        if (isRuleSet) {
          return (
            <div
              key={rule.id}
              draggable
              onDragStart={() => handleDragStart(rule.id)}
              onDragOver={(e) => handleDragOver(e, rule.id)}
              onDragEnd={handleDragEnd}
              className={`grid grid-cols-[32px_1fr_120px_56px] gap-2 px-3 py-2.5 border-t items-center hover:bg-accent/20 cursor-move min-h-[52px] ${rule.enabled === false ? 'opacity-40' : ''} ${draggedId ? '[&>*]:pointer-events-none' : ''}`}
            >
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400 flex items-center gap-1">
                  <Link className="h-3 w-3" />
                  远端规则集
                </span>
                <Input
                  value={rule.content}
                  onChange={(e) => updateRule(rule.id, { content: e.target.value })}
                  placeholder="https://example.com/rules.list"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <Input
                value={rule.policy}
                onChange={(e) => updateRule(rule.id, { policy: e.target.value })}
                placeholder="PROXY"
                className="h-8 text-xs"
              />
              <div className="flex justify-center gap-0.5">
                <Switch
                  checked={rule.enabled !== false}
                  onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                  title={rule.enabled === false ? '启用' : '禁用'}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 hover:text-destructive"
                  onClick={() => deleteRule(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        }

        return (
          <div
            key={rule.id}
            draggable
            onDragStart={() => handleDragStart(rule.id)}
            onDragOver={(e) => handleDragOver(e, rule.id)}
            onDragEnd={handleDragEnd}
            className={`grid grid-cols-[32px_110px_1fr_160px_56px] gap-2 px-3 py-2.5 border-t items-center hover:bg-accent/20 cursor-move min-h-[52px] ${rule.enabled === false ? 'opacity-40' : ''} ${draggedId ? '[&>*]:pointer-events-none' : ''}`}
          >
            <div className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            <Select
                value={rule.type}
                onValueChange={(v) => updateRule(rule.id, { type: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            <Input
              ref={rule.id === lastAddedId ? focusRef : undefined}
              value={rule.content}
              onChange={(e) => updateRule(rule.id, { content: e.target.value })}
              placeholder={typeInfo?.placeholder}
              className="h-8 text-xs"
            />

            <div className="flex gap-1">
              {POLICIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => updateRule(rule.id, { policy: p.value })}
                  className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                    rule.policy === p.value ? p.active : p.inactive
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex justify-center gap-1.5 items-center">
              <Switch
                checked={rule.enabled !== false}
                onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                title={rule.enabled === false ? '启用' : '禁用'}
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:text-destructive"
                onClick={() => deleteRule(rule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )
      })}

      {/* 订阅源规则占位块（固定底部） */}
      <div
        className={`grid grid-cols-[32px_110px_1fr_160px_56px] gap-2 px-3 py-2.5 border-t items-center min-h-[52px] transition-colors ${
          showUpstream ? 'bg-muted/40' : 'bg-muted/20 opacity-50'
        }`}
      >
        <div></div>
        <span className="text-xs font-medium text-muted-foreground">订阅源规则</span>
        <span className="text-xs text-muted-foreground italic">
          {showUpstream ? '已启用' : '已禁用'}
        </span>
        <div></div>
        <div className="flex justify-center">
          <Switch
            checked={showUpstream}
            onCheckedChange={(checked) => onToggleUpstream(checked)}
            title={showUpstream ? '禁用订阅源规则' : '启用订阅源规则'}
            className="mr-7"
          />
        </div>
      </div>

      {/* MATCH 默认策略（固定最底部） */}
      {matchRule && (
        <div
          key={matchRule.id}
          className="grid grid-cols-[32px_110px_1fr_160px_56px] gap-2 px-3 py-2.5 border-t items-center bg-muted/30 min-h-[52px]"
        >
          <div></div>
          <span className="text-xs font-medium text-muted-foreground">默认策略</span>
          <div></div>
          <div className="flex gap-1">
            {POLICIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => updateRule(matchRule.id, { policy: p.value })}
                className={`rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                  matchRule.policy === p.value ? p.active : p.inactive
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div></div>
        </div>
      )}

      {/* 空状态 */}
      {displayRules.length === 0 && (
        <div className="border-t px-3 py-8 text-center">
          <p className="text-sm text-muted-foreground">还没有规则</p>
          <p className="text-xs text-muted-foreground mt-1">点击「添加规则」手动输入，或从「规则集」快速导入</p>
        </div>
      )}

      {/* 添加行 */}
      <div className="border-t px-3 py-2 bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-muted-foreground hover:text-foreground"
          onClick={addRule}
        >
          <Plus className="h-4 w-4 mr-1" />
          添加规则
        </Button>
      </div>
    </div>
  )
}

// 工具函数：文本规则 <-> 结构化规则 互转
export function parseRules(text: string): Rule[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const enabled = !line.startsWith('#')
      const raw = enabled ? line : line.slice(1).trim()
      if (raw.startsWith('rule-set:')) {
        const rest = raw.slice('rule-set:'.length)
        const commaIdx = rest.lastIndexOf(',')
        const url = commaIdx === -1 ? rest : rest.slice(0, commaIdx)
        const policy = commaIdx === -1 ? 'PROXY' : rest.slice(commaIdx + 1)
        return { id: String(index), type: 'RULE-SET', content: url, policy, enabled }
      }
      const parts = raw.split(',')
      if (parts.length === 2 && parts[0] === 'MATCH') {
        return { id: String(index), type: 'MATCH', content: '', policy: parts[1], enabled }
      }
      if (parts.length >= 3) {
        return {
          id: String(index),
          type: parts[0],
          content: parts[1],
          policy: parts[2],
          enabled,
        }
      }
      return { id: String(index), type: 'DOMAIN-SUFFIX', content: raw, policy: 'PROXY', enabled }
    })
}

export function stringifyRules(rules: Rule[]): string {
  return rules
    .map((r) => {
      const prefix = r.enabled === false ? '#' : ''
      if (r.type === 'MATCH') return `${prefix}MATCH,${r.policy}`
      if (r.type === 'RULE-SET') return `${prefix}rule-set:${r.content},${r.policy}`
      return `${prefix}${r.type},${r.content},${r.policy}`
    })
    .join('\n')
}
