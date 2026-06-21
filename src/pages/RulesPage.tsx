import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Save, RotateCcw, Plus } from 'lucide-react'
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
  const [rulesMerge, setRulesMerge] = useState<RulesMergeMode>('prepend')
  const [saving, setSaving] = useState(false)

  function insertRuleset(url: string, policy: string) {
    const newRule: Rule = {
      id: crypto.randomUUID(),
      type: 'RULE-SET',
      content: url,
      policy,
    }
    setRules((prev) => {
      const matchIdx = prev.findIndex((r) => r.type === 'MATCH')
      if (matchIdx === -1) return [...prev, newRule]
      return [...prev.slice(0, matchIdx), newRule, ...prev.slice(matchIdx)]
    })
    toast('已添加规则集，记得保存')
  }

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

      <Card>
        <CardHeader className="p-4 sm:p-5 pb-2 sm:pb-2">
          <CardTitle className="text-base">常用规则集</CardTitle>
          <CardDescription className="text-xs">点击添加到规则列表，转换时后端自动拉取并展开</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_RULESETS.map((preset) => (
              <button
                key={preset.url}
                type="button"
                onClick={() => insertRuleset(preset.url, preset.policy)}
                className="flex items-start gap-3 rounded-lg border p-3 text-left hover:bg-accent/50 transition-colors"
              >
                <Plus className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{preset.label}</div>
                  <div className="text-xs text-muted-foreground truncate">{preset.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        合并时自动去重，兜底规则（MATCH）始终置于末尾；保存后立即生效
      </p>
    </div>
  )
}
