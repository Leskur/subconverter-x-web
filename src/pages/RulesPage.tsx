import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, RotateCcw, ListPlus, Bookmark, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { uuid } from '@/lib/uuid'
import { RuleEditor, parseRules, stringifyRules, type Rule } from '@/components/RuleEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getRules, saveRules, getRulesDefault, getCustomRulesets, saveCustomRulesets, type RulesConfig, type RulesMergeMode, type CustomRuleset } from '@/lib/api'

function deriveMergeMode(showUpstream: boolean): RulesMergeMode {
  return showUpstream ? 'prepend' : 'replace'
}

export function RulesPage() {
  const queryClient = useQueryClient()

  const cached = queryClient.getQueryData<{ config: RulesConfig; rulesets: CustomRuleset[] }>(['rules'])
  const cachedParsed = cached ? parseRules((cached.config.rules ?? []).join('\n')) : []
  const cachedMerge = cached?.config.rulesMerge ?? 'replace'

  const [rules, setRules] = useState<Rule[]>(cachedParsed)
  const [savedRules, setSavedRules] = useState<Rule[]>(cachedParsed)
  const [showUpstream, setShowUpstream] = useState(cachedMerge !== 'replace')
  const [savedShowUpstream, setSavedShowUpstream] = useState(cachedMerge !== 'replace')
  const [saving, setSaving] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)
  const presetRef = useRef<HTMLDivElement>(null)
  const [customRulesets, setCustomRulesets] = useState<CustomRuleset[]>(cached?.rulesets ?? [])
  const [savingName, setSavingName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: async () => {
      const [config, rulesets] = await Promise.all([getRules(), getCustomRulesets()])
      return { config, rulesets }
    },
    staleTime: 0,
  })

  useEffect(() => {
    if (!data) return
    const parsed = parseRules((data.config.rules ?? []).join('\n'))
    const merge = data.config.rulesMerge ?? 'replace'
    setRules(parsed)
    setSavedRules(parsed)
    setShowUpstream(merge !== 'replace')
    setSavedShowUpstream(merge !== 'replace')
    setCustomRulesets(data.rulesets)
  }, [data])

  const rulesMerge = deriveMergeMode(showUpstream)

  const isDirty = useMemo(() => {
    if (showUpstream !== savedShowUpstream) return true
    if (rules.length !== savedRules.length) return true
    return stringifyRules(rules) !== stringifyRules(savedRules)
  }, [rules, savedRules, showUpstream, savedShowUpstream])

  function insertCustomRuleset(preset: CustomRuleset) {
    setRules((prev) => {
      const existing = new Set(prev.map((r) => `${r.type}:${r.content}`))
      const toAdd = preset.rules
        .filter((r) => !existing.has(`${r.type}:${r.content}`))
        .map((r) => ({ ...r, id: uuid() }))
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
      id: uuid(),
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

  const ruleLineCount = useMemo(() => rules.length, [rules])

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
    setShowUpstream(savedShowUpstream)
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
      setSavedShowUpstream(showUpstream)
      queryClient.invalidateQueries({ queryKey: ['rules'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleResetToDefault() {
    try {
      const config = await getRulesDefault()
      const parsed = parseRules((config.rules ?? []).join('\n'))
      const merge = config.rulesMerge ?? 'replace'
      setRules(parsed)
      setShowUpstream(merge !== 'replace')
      toast.success('已恢复默认规则，记得保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '恢复失败')
    }
  }

  return (
    <div className="space-y-4">
      {isLoading && !cached && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {(!isLoading || cached) && (
        <>
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
          <div className="flex items-center gap-2">
            <div className="flex gap-2">
              {/* 规则集 popover */}
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
                  {customRulesets.length > 0 ? (
                    <div className="p-2 space-y-1">
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
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">还没有保存过规则集</p>
                      <p className="text-xs text-muted-foreground mt-1">编辑规则后点击书签图标保存</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSaveInput((v) => !v)}>
              <Bookmark className="h-4 w-4" />
              保存规则集
            </Button>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!isDirty} onClick={handleRevert}>
              <RotateCcw className="h-4 w-4" />
              还原
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetToDefault}>
              <FileText className="h-4 w-4" />
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

          <RuleEditor
            rules={rules}
            onChange={setRules}
            showUpstream={showUpstream}
            onToggleUpstream={setShowUpstream}
          />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        合并时自动去重，兜底规则（MATCH）始终置于末尾
      </p>
        </>
      )}
    </div>
  )
}
