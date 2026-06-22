import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Save, RotateCcw, ListPlus, Check, Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import { RuleEditor, parseRules, stringifyRules, type Rule } from '@/components/RuleEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getRules, saveRules, resetRules, getCustomRulesets, saveCustomRulesets, type RulesMergeMode, type CustomRuleset } from '@/lib/api'

const PRESET_RULESETS: { label: string; desc: string; url: string; policy: string }[] = [
  {
    label: '🇨🇳 国内直连',
    desc: 'Loyalsoldier · 国内域名直连',
    url: 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/direct.txt',
    policy: 'DIRECT',
  },
  {
    label: '🚀 代理域名',
    desc: 'Loyalsoldier · 需要代理的域名',
    url: 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/proxy.txt',
    policy: 'PROXY',
  },
  {
    label: '🛡️ 广告拦截',
    desc: 'Loyalsoldier · 广告/隐私追踪域名',
    url: 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/reject.txt',
    policy: 'REJECT',
  },
  {
    label: '📺 流媒体',
    desc: 'ACL4SSR · 国际流媒体服务',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/Netflix.list',
    policy: 'PROXY',
  },
  {
    label: '🤖 AI 服务',
    desc: 'ACL4SSR · OpenAI / Claude 等',
    url: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/OpenAi.list',
    policy: 'PROXY',
  },
  {
    label: '🐙 GitHub',
    desc: 'Loyalsoldier · GitHub 相关域名',
    url: 'https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/github.txt',
    policy: 'PROXY',
  },
]

const RULES_MERGE_OPTIONS: { value: RulesMergeMode; label: string; hint: string }[] = [
  {
    value: 'prepend',
    label: '自定义优先',
    hint: '先匹配自定义规则，再匹配订阅自带规则（适合优先直连或屏蔽特定域名）',
  },
  {
    value: 'append',
    label: '订阅优先',
    hint: '先匹配订阅自带规则，再匹配自定义规则',
  },
  {
    value: 'replace',
    label: '仅自定义',
    hint: '只使用下方规则，忽略订阅中自带的规则',
  },
]

export function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [savedRules, setSavedRules] = useState<Rule[]>([])
  const [rulesMerge, setRulesMerge] = useState<RulesMergeMode>('prepend')
  const [savedMerge, setSavedMerge] = useState<RulesMergeMode>('prepend')
  const [saving, setSaving] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)
  const presetRef = useRef<HTMLDivElement>(null)
  const [customRulesets, setCustomRulesets] = useState<CustomRuleset[]>([])
  const [savingName, setSavingName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  const isDirty = useMemo(() => {
    if (rulesMerge !== savedMerge) return true
    if (rules.length !== savedRules.length) return true
    return stringifyRules(rules) !== stringifyRules(savedRules)
  }, [rules, savedRules, rulesMerge, savedMerge])

  const addedUrls = useMemo(
    () => new Set(rules.filter((r) => r.type === 'RULE-SET').map((r) => r.content)),
    [rules],
  )

  function insertCustomRuleset(preset: CustomRuleset) {
    setRules((prev) => {
      const existing = new Set(prev.map((r) => `${r.type}:${r.content}`))
      const toAdd = preset.rules
        .filter((r) => !existing.has(`${r.type}:${r.content}`))
        .map((r) => ({ ...r, id: crypto.randomUUID() }))
      const matchIdx = prev.findIndex((r) => r.type === 'MATCH')
      if (matchIdx === -1) return [...prev, ...toAdd]
      return [...prev.slice(0, matchIdx), ...toAdd, ...prev.slice(matchIdx)]
    })
    setPresetOpen(false)
  }

  async function handleSaveAsRuleset() {
    const name = savingName.trim()
    if (!name) return
    const newEntry: CustomRuleset = {
      id: crypto.randomUUID(),
      name,
      rules: rules.filter((r) => r.type !== 'MATCH').map(({ type, content, policy }) => ({ type, content, policy })),
      createdAt: Date.now(),
    }
    const updated = [...customRulesets, newEntry]
    try {
      await saveCustomRulesets(updated)
      setCustomRulesets(updated)
      setSavingName('')
      setShowSaveInput(false)
      toast.success(`已保存「${name}」`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  async function deleteCustomRuleset(id: string) {
    const updated = customRulesets.filter((r) => r.id !== id)
    try {
      await saveCustomRulesets(updated)
      setCustomRulesets(updated)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  function insertRuleset(url: string, policy: string) {
    if (addedUrls.has(url)) return
    const newRule: Rule = { id: crypto.randomUUID(), type: 'RULE-SET', content: url, policy }
    setRules((prev) => {
      const matchIdx = prev.findIndex((r) => r.type === 'MATCH')
      if (matchIdx === -1) return [...prev, newRule]
      return [...prev.slice(0, matchIdx), newRule, ...prev.slice(matchIdx)]
    })
  }

  const ruleLineCount = useMemo(() => rules.length, [rules])

  const selectedMerge =
    RULES_MERGE_OPTIONS.find((opt) => opt.value === rulesMerge) ?? RULES_MERGE_OPTIONS[0]

  const fetchRules = useCallback(async () => {
    const [config, rulesets] = await Promise.all([getRules(), getCustomRulesets()])
    const parsed = parseRules((config.rules ?? []).join('\n'))
    const merge = config.rulesMerge ?? 'replace'
    setRules(parsed)
    setSavedRules(parsed)
    setRulesMerge(merge)
    setSavedMerge(merge)
    setCustomRulesets(rulesets)
  }, [])

  useEffect(() => {
    fetchRules().catch((error) => toast.error(error instanceof Error ? error.message : '加载失败'))
  }, [fetchRules])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetOpen(false)
      }
    }
    if (presetOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [presetOpen])

  function handleRevert() {
    setRules(savedRules)
    setRulesMerge(savedMerge)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveRules({
        rules: stringifyRules(rules).split('\n').filter(Boolean),
        rulesMerge,
      })
      toast.success('规则已保存')
      setSavedRules(rules)
      setSavedMerge(rulesMerge)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetToDefault() {
    try {
      const config = await resetRules()
      const parsed = parseRules((config.rules ?? []).join('\n'))
      setRules(parsed)
      setSavedRules(parsed)
      setRulesMerge(config.rulesMerge ?? 'replace')
      setSavedMerge(config.rulesMerge ?? 'replace')
      toast.success('已恢复默认规则')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '恢复失败')
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 gap-3 p-4 sm:p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">分流规则</CardTitle>
              <Badge variant="secondary" className="text-xs">{ruleLineCount} 条</Badge>
              {isDirty && <Badge variant="outline" className="text-xs text-amber-600 border-amber-400">未保存</Badge>}
            </div>
            <CardDescription className="text-xs">
              拖拽调整顺序，直接编辑各字段；策略名称需与代理组名称一致
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {/* 常用规则集 popover */}
            <div className="relative" ref={presetRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPresetOpen((v) => !v)}
              >
                <ListPlus className="h-4 w-4" />
                规则集
              </Button>
              {presetOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border bg-popover shadow-lg">
                  <div className="p-3 border-b">
                    <p className="text-sm font-medium">常用规则集</p>
                    <p className="text-xs text-muted-foreground mt-0.5">转换时自动拉取展开</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {PRESET_RULESETS.map((preset) => {
                      const added = addedUrls.has(preset.url)
                      return (
                        <button
                          key={preset.url}
                          type="button"
                          disabled={added}
                          onClick={() => { insertRuleset(preset.url, preset.policy); setPresetOpen(false) }}
                          className={cn(
                            'flex items-center gap-3 w-full rounded-md px-3 py-2 text-left transition-colors',
                            added
                              ? 'opacity-40 cursor-default'
                              : 'cursor-pointer hover:bg-accent active:scale-[0.98]',
                          )}
                        >
                          <span className="text-base leading-none">{preset.label.split(' ')[0]}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{preset.label.split(' ').slice(1).join(' ')}</div>
                            <div className="text-xs text-muted-foreground">{preset.desc}</div>
                          </div>
                          {added && <Check className="h-4 w-4 shrink-0 text-green-500" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* 自定义规则集 */}
                  {customRulesets.length > 0 && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-t">我的规则集</div>
                      <div className="p-2 pt-0 space-y-1">
                        {customRulesets.map((preset) => (
                          <div key={preset.id} className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => insertCustomRuleset(preset)}
                              className="flex-1 flex items-center gap-2 rounded-md px-3 py-2 text-left cursor-pointer hover:bg-accent transition-colors active:scale-[0.98]"
                            >
                              <Bookmark className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{preset.name}</div>
                                <div className="text-xs text-muted-foreground">{preset.rules.length} 条规则</div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCustomRuleset(preset.id)}
                              className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <span className="text-xs">✕</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                </div>
              )}
            </div>
            <Button variant="outline" size="sm" title="保存为规则集" onClick={() => setShowSaveInput((v) => !v)}>
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" title="还原修改" disabled={!isDirty} onClick={handleRevert}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" title="恢复默认规则" onClick={handleResetToDefault}>
              恢复默认
            </Button>
            <Button
              size="sm"
              variant={isDirty ? 'default' : 'outline'}
              onClick={() => handleSave()}
              disabled={saving || !isDirty}
            >
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
              保存
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
          <Dialog open={showSaveInput} onOpenChange={(v) => { setShowSaveInput(v); if (!v) setSavingName('') }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>保存为规则集</DialogTitle>
                <DialogDescription>保存后可在「规则集」面板中一键插入</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  autoFocus
                  value={savingName}
                  onChange={(e) => setSavingName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAsRuleset() }}
                  placeholder="规则集名称"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowSaveInput(false); setSavingName('') }}>取消</Button>
                  <Button size="sm" disabled={!savingName.trim()} onClick={handleSaveAsRuleset}>保存</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-3">
            <Label className="shrink-0 text-xs text-muted-foreground">订阅自带规则</Label>
            <div className="flex rounded-md border overflow-hidden">
              {RULES_MERGE_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.hint}
                  onClick={() => setRulesMerge(opt.value)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium transition-colors',
                    i > 0 && 'border-l',
                    rulesMerge === opt.value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">{selectedMerge.hint}</p>
          </div>

          <RuleEditor rules={rules} onChange={setRules} mergeMode={rulesMerge} onMergeModeChange={setRulesMerge} />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        合并时自动去重，兜底规则（MATCH）始终置于末尾
      </p>
    </div>
  )
}
