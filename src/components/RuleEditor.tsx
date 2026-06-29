import { GripVertical, Plus, Trash2, Link } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { uuid } from '@/lib/uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { RulesMergeMode } from '@/lib/api'

export interface Rule {
  id: string
  type: string
  content: string
  policy: string
}

const RULE_TYPES = [
  { value: 'DOMAIN-SUFFIX', label: '域名后缀', placeholder: 'google.com' },
  { value: 'DOMAIN', label: '域名', placeholder: 'example.com' },
  { value: 'DOMAIN-KEYWORD', label: '域名关键词', placeholder: 'google' },
  { value: 'GEOIP', label: '国家/地区', placeholder: 'CN' },
  { value: 'IP-CIDR', label: 'IP 段', placeholder: '192.168.1.0/24' },
  { value: 'RULE-SET', label: '远端规则集', placeholder: 'https://example.com/rules.list' },
  { value: 'MATCH', label: '默认策略', placeholder: '' },
]

const POLICIES = [
  { value: 'DIRECT', label: 'DIRECT', active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', inactive: 'text-muted-foreground hover:text-foreground' },
  { value: 'REJECT', label: 'REJECT', active: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', inactive: 'text-muted-foreground hover:text-foreground' },
  { value: 'PROXY', label: 'PROXY', active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400', inactive: 'text-muted-foreground hover:text-foreground' },
]

// 上游规则占位项标记
const UPSTREAM_MARKER = '__upstream__'

interface RuleEditorProps {
  rules: Rule[]
  onChange: (rules: Rule[]) => void
  mergeMode?: RulesMergeMode
  onMergeModeChange?: (mode: RulesMergeMode) => void
}

const UPSTREAM_RULE: Rule = { id: UPSTREAM_MARKER, type: UPSTREAM_MARKER, content: '', policy: '' }

function buildDisplayList(rules: Rule[], mergeMode: RulesMergeMode): Rule[] {
  if (mergeMode === 'prepend') return [...rules, UPSTREAM_RULE]
  if (mergeMode === 'append') return [UPSTREAM_RULE, ...rules]
  return rules
}

export function RuleEditor({ rules, onChange, mergeMode = 'replace', onMergeModeChange }: RuleEditorProps) {
  // dragList: 拖拽中的临时列表，null 时从 props 计算
  const [dragList, setDragList] = useState<Rule[] | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const displayRules = dragList ?? buildDisplayList(rules, mergeMode)

  function updateRule(ruleId: string, updates: Partial<Rule>) {
    const next = rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r))
    onChange(next)
  }

  function deleteRule(ruleId: string) {
    onChange(rules.filter((r) => r.id !== ruleId))
  }

  function handleDragStart(id: string) {
    setDraggedId(id)
    setDragList(buildDisplayList(rules, mergeMode))
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!draggedId || draggedId === targetId || !dragList) return
    const from = dragList.findIndex((r) => r.id === draggedId)
    const to = dragList.findIndex((r) => r.id === targetId)
    if (from === -1 || to === -1) return
    const next = [...dragList]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setDragList(next)
  }

  function handleDragEnd() {
    if (dragList) {
      const upstreamIdx = dragList.findIndex((r) => r.id === UPSTREAM_MARKER)
      const newRules = dragList.filter((r) => r.id !== UPSTREAM_MARKER)
      onChange(newRules)
      if (upstreamIdx !== -1 && onMergeModeChange) {
        onMergeModeChange(upstreamIdx === 0 ? 'append' : 'prepend')
      }
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
      <div className="grid grid-cols-[32px_110px_1fr_160px_40px] gap-2 px-3 py-2 bg-muted text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div></div>
        <div>类型</div>
        <div>匹配内容</div>
        <div>策略</div>
        <div></div>
      </div>

      {/* 规则行 */}
      {displayRules.map((rule) => {
        const isUpstream = rule.id === UPSTREAM_MARKER
        const typeInfo = RULE_TYPES.find((t) => t.value === rule.type)
        const isMatch = rule.type === 'MATCH'

        if (isUpstream) {
          return (
            <div
              key={rule.id}
              draggable
              onDragStart={() => handleDragStart(rule.id)}
              onDragOver={(e) => handleDragOver(e, rule.id)}
              onDragEnd={handleDragEnd}
              className={`grid grid-cols-[32px_110px_1fr_160px_40px] gap-2 px-3 py-2.5 border-t items-center bg-muted/40 cursor-move min-h-[52px] ${draggedId ? '[&>*]:pointer-events-none' : ''}`}
            >
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">订阅自带规则</span>
              <span className="text-xs text-muted-foreground italic">来自订阅，不可编辑</span>
              <div></div>
              <div></div>
            </div>
          )
        }

        const isRuleSet = rule.type === 'RULE-SET'

        if (isRuleSet) {
          return (
            <div
              key={rule.id}
              draggable
              onDragStart={() => handleDragStart(rule.id)}
              onDragOver={(e) => handleDragOver(e, rule.id)}
              onDragEnd={handleDragEnd}
              className={`grid grid-cols-[32px_1fr_120px_40px] gap-2 px-3 py-2.5 border-t items-center hover:bg-accent/20 cursor-move min-h-[52px] ${draggedId ? '[&>*]:pointer-events-none' : ''}`}
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
              <div className="flex justify-center">
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
            className={`grid grid-cols-[32px_110px_1fr_160px_40px] gap-2 px-3 py-2.5 border-t items-center hover:bg-accent/20 cursor-move min-h-[52px] ${draggedId ? '[&>*]:pointer-events-none' : ''}`}
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

            {isMatch ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              <Input
                ref={rule.id === lastAddedId ? focusRef : undefined}
                value={rule.content}
                onChange={(e) => updateRule(rule.id, { content: e.target.value })}
                placeholder={typeInfo?.placeholder}
                className="h-8 text-xs"
              />
            )}

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

            <div className="flex justify-center">
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
      if (line.startsWith('rule-set:')) {
        const rest = line.slice('rule-set:'.length)
        const commaIdx = rest.lastIndexOf(',')
        const url = commaIdx === -1 ? rest : rest.slice(0, commaIdx)
        const policy = commaIdx === -1 ? 'PROXY' : rest.slice(commaIdx + 1)
        return { id: String(index), type: 'RULE-SET', content: url, policy }
      }
      const parts = line.split(',')
      if (parts.length === 2 && parts[0] === 'MATCH') {
        return { id: String(index), type: 'MATCH', content: '', policy: parts[1] }
      }
      if (parts.length >= 3) {
        return {
          id: String(index),
          type: parts[0],
          content: parts[1],
          policy: parts[2],
        }
      }
      return { id: String(index), type: 'DOMAIN-SUFFIX', content: line, policy: 'PROXY' }
    })
}

export function stringifyRules(rules: Rule[]): string {
  return rules
    .map((r) => {
      if (r.type === 'MATCH') return `MATCH,${r.policy}`
      if (r.type === 'RULE-SET') return `rule-set:${r.content},${r.policy}`
      return `${r.type},${r.content},${r.policy}`
    })
    .join('\n')
}
