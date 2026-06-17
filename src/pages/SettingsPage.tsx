import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getPublicApiUrl } from '@/lib/api'

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
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin_token') ?? '')

  function saveToken() {
    if (adminToken.trim()) {
      localStorage.setItem('admin_token', adminToken.trim())
    } else {
      localStorage.removeItem('admin_token')
    }
    toast.success('Token 已保存到本地')
  }

  return (
    <div className="space-y-4">
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
          <CardTitle className="text-base">Admin Token</CardTitle>
          <CardDescription className="text-xs">
            对应服务端的 <code className="text-[11px]">ADMIN_TOKEN</code>，仅存在浏览器本地，不上传到任何地方
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="admin-token"
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="留空表示未配置鉴权"
              className="min-w-0 flex-1"
            />
            <Button variant="secondary" className="shrink-0 sm:w-28" onClick={saveToken}>
              保存
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-3">
          <CardTitle className="text-base">连接信息</CardTitle>
          <CardDescription className="text-xs">当前端和后端分开部署时，需要配置以下环境变量</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0 text-xs sm:p-5 sm:pt-0">
          <code className="block break-all rounded-md bg-muted px-2.5 py-2">{getPublicApiUrl()}</code>
          <div className="text-muted-foreground space-y-0.5">
            <p>
              <code className="text-[11px]">VITE_API_BASE</code> — 后端 API 地址（留空时使用当前页面 origin）
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
