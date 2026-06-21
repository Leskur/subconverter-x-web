import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Save, RotateCcw, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parse as parseYaml } from 'yaml'
import { getTemplate, getTemplateDefault, saveTemplate, type TemplateType } from '@/lib/api'

function TemplateEditor({ type, onDirtyChange }: { type: TemplateType; onDirtyChange?: (dirty: boolean) => void }) {
  const [content, setContent] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isDirty = content !== original

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  function adjustHeight() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(el.scrollHeight, 300)}px`
  }

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

  useEffect(() => {
    if (!loading) adjustHeight()
  }, [loading])

  async function handleSave() {
    if (type === 'singbox') {
      try { JSON.parse(content) } catch {
        toast.error('JSON 格式错误，请检查后保存')
        return
      }
    } else {
      try { parseYaml(content) } catch {
        toast.error('YAML 格式错误，请检查后保存')
        return
      }
    }
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

  function handleRevert() {
    setContent(original)
    toast('已还原到上次保存的内容')
  }

  async function handleResetDefault() {
    setResetting(true)
    try {
      const text = await getTemplateDefault(type)
      setContent(text)
      toast('已加载内置默认模板，保存后生效')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载失败')
    } finally {
      setResetting(false)
    }
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
          <Button variant="outline" size="sm" onClick={handleResetDefault} disabled={saving || resetting}>
            {resetting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
            恢复默认
          </Button>
          <Button variant="outline" size="sm" onClick={handleRevert} disabled={saving || !isDirty}>
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
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
          ref={textareaRef}
          className="w-full resize-none rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          style={{ minHeight: 300 }}
          value={content}
          onChange={(e) => { setContent(e.target.value); adjustHeight() }}
          onInput={adjustHeight}
          spellCheck={false}
        />
      )}
    </div>
  )
}

export function TemplatePage() {
  const [activeTab, setActiveTab] = useState<string>('clash')
  const dirtyRef = useRef<Record<string, boolean>>({})

  function handleTabChange(value: string) {
    if (dirtyRef.current[activeTab]) {
      toast('当前标签有未保存的改动')
    }
    setActiveTab(value)
  }

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
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="clash">Clash / Mihomo</TabsTrigger>
              <TabsTrigger value="singbox">sing-box</TabsTrigger>
            </TabsList>
            <TabsContent value="clash">
              <TemplateEditor type="clash" onDirtyChange={(d) => { dirtyRef.current['clash'] = d }} />
            </TabsContent>
            <TabsContent value="singbox">
              <TemplateEditor type="singbox" onDirtyChange={(d) => { dirtyRef.current['singbox'] = d }} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
