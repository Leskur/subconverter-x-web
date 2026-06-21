import { useMemo, useState } from 'react'
import { Copy, Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { RecentUpstreamInput } from '@/components/RecentUpstreamInput'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  buildSubscriptionUrl,
  previewSubscription,
  type SubPreviewResult,
  type SubTarget,
} from '@/lib/api'
import { pushRecentUpstream } from '@/lib/recent-upstream'

const CLIENT_FORMAT_OPTIONS: { value: SubTarget; label: string; hint: string }[] = [
  {
    value: '',
    label: '自动识别（推荐）',
    hint: '根据客户端请求自动判断，Clash 收到 YAML，Sing-box 收到 JSON',
  },
  { value: 'clash', label: 'Clash / Clash Meta', hint: '始终输出 Clash / Clash Meta 可用的 YAML' },
  { value: 'singbox', label: 'Sing-box', hint: '始终输出 Sing-box JSON 配置' },
  { value: 'surge', label: 'Surge', hint: '始终输出 Surge 配置' },
  { value: 'surfboard', label: 'Surfboard', hint: '始终输出 Surfboard 配置（Clash YAML 兼容）' },
  { value: 'loon', label: 'Loon', hint: '始终输出 Loon 配置' },
  { value: 'quanx', label: 'Quantumult X', hint: '始终输出 Quantumult X 配置' },
]

export function SubscriptionPage() {
  const [upstream, setUpstream] = useState('')
  const [target, setTarget] = useState<SubTarget>('')
  const [recentVersion, setRecentVersion] = useState(0)
  const [preview, setPreview] = useState<SubPreviewResult | null>(null)
  const [testing, setTesting] = useState(false)

  const subUrl = useMemo(
    () => buildSubscriptionUrl({ upstream: upstream || undefined, target }),
    [upstream, target],
  )

  const canUse = upstream.trim().length > 0 && !subUrl.includes('<upstream>')
  const selectedFormat =
    CLIENT_FORMAT_OPTIONS.find((opt) => opt.value === target) ?? CLIENT_FORMAT_OPTIONS[0]

  function rememberRecent(url: string) {
    pushRecentUpstream(url)
    setRecentVersion((v) => v + 1)
  }

  async function copyText(text: string, message: string) {
    await navigator.clipboard.writeText(text)
    toast.success(message)
  }

  async function handleCopy() {
    if (!canUse) return
    await copyText(subUrl, '订阅链接已复制')
    rememberRecent(upstream)
  }

  async function handleTest() {
    setTesting(true)
    setPreview(null)
    try {
      const result = await previewSubscription(upstream, target)
      setPreview(result)
      if (result.ok) {
        rememberRecent(upstream)
        toast.success('测试完成')
      } else {
        toast.error(result.error ?? '测试失败')
      }
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="text-base">转换设置</CardTitle>
          <CardDescription className="text-xs">
            填入机场订阅地址，生成可直接导入 Clash、Sing-box 等客户端的订阅链接
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="space-y-2">
            <Label htmlFor="upstream">机场订阅链接</Label>
            <RecentUpstreamInput
              id="upstream"
              value={upstream}
              onChange={setUpstream}
              recentVersion={recentVersion}
              placeholder="https://example.com/sub?token=..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client-format">客户端格式</Label>
            <Select
              value={target || 'auto'}
              onValueChange={(value) => setTarget(value === 'auto' ? '' : (value as SubTarget))}
            >
              <SelectTrigger id="client-format">
                <SelectValue>{selectedFormat.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CLIENT_FORMAT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || 'auto'} value={opt.value || 'auto'} className="py-2">
                    <div className="flex flex-col gap-0.5">
                      <span>{opt.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">{opt.hint}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-relaxed text-muted-foreground">{selectedFormat.hint}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <p className="mb-2 text-xs text-muted-foreground">生成的订阅链接</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={subUrl} className="font-mono text-xs" />
            <Button variant="default" className="shrink-0 sm:w-24" disabled={!canUse} onClick={() => handleCopy()}>
              <Copy />
              复制
            </Button>
            <Button variant="outline" className="shrink-0 sm:w-28" disabled={!canUse || testing} onClick={() => handleTest()}>
              {testing ? <Loader2 className="animate-spin" /> : <Play />}
              测试
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
            <CardTitle className="text-base">拉取结果</CardTitle>
            <CardDescription className="text-xs">模拟客户端请求，预览实际下发的配置内容</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
            {preview.ok ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-green-600">拉取成功</span>
                  {preview.format && preview.format !== 'unknown' && (
                    <Badge variant="outline" className="font-mono">{preview.format}</Badge>
                  )}
                  {preview.nodeCount !== undefined && (
                    <Badge variant="secondary">{preview.nodeCount} 个节点</Badge>
                  )}
                  {preview.groupCount !== undefined && (
                    <Badge variant="secondary">{preview.groupCount} 个代理组</Badge>
                  )}
                  {preview.ruleCount !== undefined && (
                    <Badge variant="secondary">{preview.ruleCount} 条规则</Badge>
                  )}
                </div>
                {preview.body && (
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={() => copyText(preview.body!, '结果已复制')}
                    >
                      <Copy />
                      复制结果
                    </Button>
                    <pre
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                          e.preventDefault()
                          const sel = window.getSelection()
                          const range = document.createRange()
                          range.selectNodeContents(e.currentTarget)
                          sel?.removeAllRanges()
                          sel?.addRange(range)
                        }
                      }}
                      className="scrollbar-custom max-h-[28rem] overflow-auto rounded-md border bg-muted/40 p-4 pt-10 font-mono text-sm leading-relaxed whitespace-pre-wrap break-all outline-none focus:ring-1 focus:ring-ring"
                    >
                      {preview.body}
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-destructive">{preview.error ?? '测试失败'}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="text-base">说明</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>
              输出 Clash 格式时会合并 <code className="text-xs">data/rules.yaml</code>；可在「规则」和「代理组」页配置与订阅自带内容的合并方式。
            </li>
            <li>在浏览器直接打开链接会请求机场原始地址，不经过转换；请通过客户端更新订阅或使用「测试拉取」验证。</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
