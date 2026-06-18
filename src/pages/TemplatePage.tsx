import { useCallback, useEffect, useState } from 'react'
import { Loader2, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getTemplate, saveTemplate, type TemplateType } from '@/lib/api'

function TemplateEditor({ type }: { type: TemplateType }) {
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isDirty = content !== original

  const fetchTemplate = useCallback(async () => {
    setLoading(true)
    try {
      const text = await getTemplate(type)
      setContent(text)
      setOriginal(text)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    fetchTemplate()
  }, [fetchTemplate])

  async function handleSave() {
    setSaving(true)
    try {
      await saveTemplate(type, content)
      setOriginal(content)
      toast.success('模板已保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setContent(original)
    toast('已还原到上次保存的内容')
  }

  const lang = type === 'singbox' ? 'JSON' : 'YAML'
  const lineCount = content.split('\n').length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{lang}</Badge>
          {!loading && <Badge variant="secondary">{lineCount} 行</Badge>}
          {isDirty && <Badge>未保存</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={saving || !isDirty}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            还原
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            保存
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <textarea
          className="w-full rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          rows={28}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
        />
      )}
    </div>
  )
}

export function TemplatePage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">默认模板</h2>
        <p className="text-sm text-muted-foreground">
          当上游订阅仅提供节点列表（base64 / URI list）时，转换输出将使用此模板补充顶层配置。
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">输出模板</CardTitle>
          <CardDescription>
            模板中的 <code className="rounded bg-muted px-1 py-0.5 text-xs">proxies</code>、
            <code className="rounded bg-muted px-1 py-0.5 text-xs">proxy-groups</code>、
            <code className="rounded bg-muted px-1 py-0.5 text-xs">rules</code> 字段会被实际内容替换，其他顶层字段原样保留。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="clash">
            <TabsList className="mb-4">
              <TabsTrigger value="clash">Clash / Mihomo</TabsTrigger>
              <TabsTrigger value="singbox">sing-box</TabsTrigger>
            </TabsList>
            <TabsContent value="clash">
              <TemplateEditor type="clash" />
            </TabsContent>
            <TabsContent value="singbox">
              <TemplateEditor type="singbox" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
