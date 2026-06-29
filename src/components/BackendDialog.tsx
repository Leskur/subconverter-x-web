import { useState, useEffect } from 'react'
import { Trash2, Check, Server } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  type BackendConfig,
  getBackends,
  addBackend,
  updateBackend,
  removeBackend,
  getActiveBackendId,
  setActiveBackendId,
  backendUrl,
} from '@/lib/backends'

const emptyForm = { protocol: 'http' as 'http' | 'https', host: '', port: '', token: '' }

interface BackendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  autoOpenAdd?: boolean
}

export function BackendDialog({ open, onOpenChange, autoOpenAdd }: BackendDialogProps) {
  const [backends, setBackends] = useState<BackendConfig[]>(() => getBackends())
  const [activeId, setActiveId] = useState<string | null>(() => getActiveBackendId())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (autoOpenAdd && open) {
      setEditingId(null)
      setForm(emptyForm)
      setShowForm(true)
    }
  }, [autoOpenAdd, open])

  function refresh() {
    setBackends(getBackends())
    setActiveId(getActiveBackendId())
  }

  function openEdit(backend: BackendConfig) {
    setEditingId(backend.id)
    setForm({
      protocol: backend.protocol,
      host: backend.host,
      port: String(backend.port),
      token: backend.token,
    })
    setShowForm(true)
  }

  function handleSave() {
    if (!form.host.trim()) {
      toast.error('请填写后端地址')
      return
    }
    const data = {
      name: `${form.protocol}://${form.host.trim()}:${form.port}`,
      protocol: form.protocol,
      host: form.host.trim(),
      port: Number(form.port) || 15500,
      token: form.token.trim(),
    }
    if (editingId) {
      updateBackend(editingId, data)
      toast.success('后端已更新')
    } else {
      addBackend(data)
      toast.success('后端已添加')
    }
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(false)
    refresh()
  }

  function handleRemove(id: string) {
    removeBackend(id)
    refresh()
    toast.success('后端已删除')
  }

  function handleSwitch(id: string) {
    setActiveBackendId(id)
    refresh()
    toast.success('后端已切换')
  }

  const isFormMode = showForm

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setEditingId(null); setForm(emptyForm); setShowForm(false) } }}>
      <DialogContent className="max-w-lg w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            后端管理
          </DialogTitle>
          <DialogDescription>添加、切换、删除后端服务地址</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {backends.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">当前后端</Label>
              <select
                value={activeId ?? ''}
                onChange={(e) => handleSwitch(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {backends.map((b) => (
                  <option key={b.id} value={b.id}>
                    {backendUrl(b)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {backends.map((backend) => (
            <div
              key={backend.id}
              className="flex items-center gap-2 rounded-lg border p-2"
              data-active={activeId === backend.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {backendUrl(backend)}
                  </span>
                  {activeId === backend.id && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => openEdit(backend)}
              >
                编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-destructive"
                onClick={() => handleRemove(backend.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {isFormMode && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex gap-2">
                <div className="w-24 shrink-0 space-y-1.5">
                  <Label className="text-xs">协议</Label>
                  <select
                    value={form.protocol}
                    onChange={(e) => setForm({ ...form, protocol: e.target.value as 'http' | 'https' })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </select>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label className="text-xs">地址</Label>
                  <Input
                    value={form.host}
                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                    placeholder="127.0.0.1"
                  />
                </div>
                <div className="w-20 shrink-0 space-y-1.5">
                  <Label className="text-xs">端口</Label>
                  <Input
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: e.target.value })}
                    placeholder="15500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">授权 Token（可选）</Label>
                <Input
                  type="password"
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value })}
                  placeholder="留空表示无鉴权"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(false) }}>
                  取消
                </Button>
                <Button size="sm" onClick={handleSave}>
                  {editingId ? '保存' : '添加'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
