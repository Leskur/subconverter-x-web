import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun, Server, Clock, Settings2, Save, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { BackendManager } from '@/components/BackendManager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  getSubscriptionConfig,
  saveSubscriptionConfig,
  getOutputSettings,
  saveOutputSettings,
  getOutputSettingsDefault,
  type UpdateIntervalMode,
  type OutputSettings,
} from '@/lib/api'

type ThemeMode = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '亮色', icon: Sun },
  { value: 'dark', label: '暗色', icon: Moon },
]

const EMPTY_OUTPUT: OutputSettings = {
  urlTestUrl: '',
  urlTestInterval: 300,
  skipProxy: '',
  dnsServer: '',
}

interface SettingsPageProps {
  theme: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
}

export function SettingsPage({ theme, onThemeChange }: SettingsPageProps) {
  const [updateInterval, setUpdateInterval] = useState<UpdateIntervalMode>('auto')
  const [savingInterval, setSavingInterval] = useState(false)

  const [outputDraft, setOutputDraft] = useState<OutputSettings>(EMPTY_OUTPUT)
  const [outputSaved, setOutputSaved] = useState<OutputSettings>(EMPTY_OUTPUT)
  const [loadingOutput, setLoadingOutput] = useState(true)
  const [savingOutput, setSavingOutput] = useState(false)

  const outputDirty =
    outputDraft.urlTestUrl !== outputSaved.urlTestUrl ||
    outputDraft.urlTestInterval !== outputSaved.urlTestInterval ||
    outputDraft.skipProxy !== outputSaved.skipProxy ||
    outputDraft.dnsServer !== outputSaved.dnsServer

  useEffect(() => {
    getSubscriptionConfig().then((c) => setUpdateInterval(c.updateInterval)).catch(() => {})
    getOutputSettings()
      .then((settings) => {
        setOutputDraft(settings)
        setOutputSaved(settings)
      })
      .catch(() => {})
      .finally(() => setLoadingOutput(false))
  }, [])

  async function handleIntervalSave(value: UpdateIntervalMode) {
    const previousValue = updateInterval
    setUpdateInterval(value)
    setSavingInterval(true)
    try {
      await saveSubscriptionConfig(value)
      toast.success('订阅设置已保存')
    } catch (error) {
      setUpdateInterval(previousValue)
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSavingInterval(false)
    }
  }

  function patchOutput<K extends keyof OutputSettings>(key: K, value: OutputSettings[K]) {
    setOutputDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function handleOutputSave() {
    setSavingOutput(true)
    try {
      const saved = await saveOutputSettings(outputDraft)
      setOutputDraft(saved)
      setOutputSaved(saved)
      toast.success('通用输出设置已保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSavingOutput(false)
    }
  }

  async function handleOutputResetToDefault() {
    try {
      const defaults = await getOutputSettingsDefault()
      setOutputDraft(defaults)
      toast.success('已恢复默认值，记得保存')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '恢复失败')
    }
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="text-base">主题</CardTitle>
          <CardDescription className="text-xs">界面亮暗模式</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="flex gap-2">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={theme === value ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => onThemeChange(value)}
                className="gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            后端管理
          </CardTitle>
          <CardDescription className="text-xs">添加、切换、删除后端服务地址</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
          <BackendManager />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            订阅设置
          </CardTitle>
          <CardDescription className="text-xs">客户端自动更新订阅的间隔时间</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="space-y-2">
            <Label className="text-xs">自动更新间隔</Label>
            <Select
              value={String(updateInterval)}
              disabled={savingInterval}
              onValueChange={(v) => {
                const value = v === 'auto' ? 'auto' : Number(v)
                setUpdateInterval(value)
                handleIntervalSave(value)
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">跟随订阅源</SelectItem>
                <SelectItem value="900">15 分钟</SelectItem>
                <SelectItem value="1800">30 分钟</SelectItem>
                <SelectItem value="3600">1 小时</SelectItem>
                <SelectItem value="21600">6 小时</SelectItem>
                <SelectItem value="43200">12 小时</SelectItem>
                <SelectItem value="86400">24 小时</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              对 Clash、Surfboard、Loon 生效，QuanX 由客户端自行管理
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            通用输出设置
          </CardTitle>
          <CardDescription className="text-xs">
            跨客户端共享：测速、DNS、绕过列表会按各客户端格式写入
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
          {loadingOutput ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中…
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs">DNS 服务器</Label>
                <Input
                  className="h-9 text-sm"
                  value={outputDraft.dnsServer}
                  onChange={(e) => patchOutput('dnsServer', e.target.value)}
                  placeholder="223.5.5.5, 119.29.29.29"
                />
                <p className="text-xs text-muted-foreground">
                  Clash / Surge / Surfboard / Loon / QuanX
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">测速地址</Label>
                <Input
                  className="h-9 text-sm"
                  value={outputDraft.urlTestUrl}
                  onChange={(e) => patchOutput('urlTestUrl', e.target.value)}
                  placeholder="http://cp.cloudflare.com/generate_204"
                />
                <p className="text-xs text-muted-foreground">
                  Clash / Surge / Surfboard / Loon / QuanX
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">测速间隔（秒）</Label>
                <Input
                  type="number"
                  min={60}
                  className="h-9 text-sm"
                  value={outputDraft.urlTestInterval}
                  onChange={(e) => patchOutput('urlTestInterval', Number(e.target.value) || 60)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">绕过列表（skip-proxy）</Label>
                <Input
                  className="h-9 text-sm"
                  value={outputDraft.skipProxy}
                  onChange={(e) => patchOutput('skipProxy', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Surge / Surfboard / Loon；QuanX 仅写入其中的 IP/CIDR
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={handleOutputResetToDefault}>
                  <RotateCcw className="h-4 w-4" />
                  恢复默认
                </Button>
                <Button
                  size="sm"
                  variant={outputDirty ? 'default' : 'outline'}
                  disabled={savingOutput || !outputDirty}
                  onClick={handleOutputSave}
                >
                  {savingOutput ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
