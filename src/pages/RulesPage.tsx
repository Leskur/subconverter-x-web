import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { RuleEditor, parseRules, stringifyRules, type Rule } from '@/components/RuleEditor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getRules, saveRules, type RulesMergeMode } from '@/lib/api'

const DEFAULT_RULES = `GEOIP,CN,DIRECT
MATCH,PROXY`

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
  const [rulesMerge, setRulesMerge] = useState<RulesMergeMode>('prepend')
  const [saving, setSaving] = useState(false)

  const ruleLineCount = useMemo(() => rules.length, [rules])

  const selectedMerge =
    RULES_MERGE_OPTIONS.find((opt) => opt.value === rulesMerge) ?? RULES_MERGE_OPTIONS[0]

  const fetchRules = useCallback(async () => {
    const config = await getRules()
    setRules(parseRules((config.rules ?? []).join('\n')))
    setRulesMerge(config.rulesMerge ?? 'replace')
  }, [])

  useEffect(() => {
    fetchRules().catch((error) => toast.error(error instanceof Error ? error.message : '加载失败'))
  }, [fetchRules])

  function handleReset() {
    setRules(parseRules(DEFAULT_RULES))
    setRulesMerge('replace')
    toast('已恢复初始状态，记得保存')
  }

  async function handleSave() {
    setSaving(true)
    try {
      await saveRules({
        rules: stringifyRules(rules).split('\n').filter(Boolean),
        rulesMerge,
      })
      toast.success('规则已保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 gap-3 p-4 sm:p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">分流规则</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {ruleLineCount} 条规则
              </Badge>
            </div>
            <CardDescription className="text-xs">
              拖拽调整顺序，直接编辑各字段；策略名称需与「代理组」页一致
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleReset()}>
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
            <Button size="sm" onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
              保存
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="space-y-2">
            <Label>订阅自带规则的处理方式</Label>
            <div className="flex rounded-md border overflow-hidden w-fit">
              {RULES_MERGE_OPTIONS.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRulesMerge(opt.value)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium transition-colors',
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
            <p className="text-xs leading-relaxed text-muted-foreground">{selectedMerge.hint}</p>
          </div>

          <RuleEditor rules={rules} onChange={setRules} mergeMode={rulesMerge} onMergeModeChange={setRulesMerge} />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        合并时自动去重，兜底规则（MATCH）始终置于末尾；保存后立即生效
      </p>
    </div>
  )
}
