import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun, Server, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { BackendManager } from '@/components/BackendManager'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSubscriptionConfig, saveSubscriptionConfig, type UpdateIntervalMode } from '@/lib/api'

type ThemeMode = 'light' | 'dark' | 'system'

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: '跟随系统', icon: Monitor },
  { value: 'light', label: '亮色', icon: Sun },
  { value: 'dark', label: '暗色', icon: Moon },
]

interface SettingsPageProps {
  theme: ThemeMode
  onThemeChange: (mode: ThemeMode) => void
}

export function SettingsPage({ theme, onThemeChange }: SettingsPageProps) {
  const [updateInterval, setUpdateInterval] = useState<UpdateIntervalMode>('auto')
  const [savingInterval, setSavingInterval] = useState(false)

  useEffect(() => {
    getSubscriptionConfig().then((c) => setUpdateInterval(c.updateInterval)).catch(() => {})
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
    </div>
  )
}
