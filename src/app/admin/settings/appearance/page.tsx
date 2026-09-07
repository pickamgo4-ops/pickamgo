'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Eye, Palette, RotateCcw, Save, Sun, Moon, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { defaultPlatformTheme, contrastRatio, PlatformTheme, ThemeColorKey, themeColorGroups, themeColorLabels, themePresets } from '@/lib/platform-theme'

type ThemeMode = 'light' | 'dark'

const mergeTheme = (value: any): PlatformTheme => ({
  light: { ...defaultPlatformTheme.light, ...(value?.light || {}) },
  dark: { ...defaultPlatformTheme.dark, ...(value?.dark || {}) },
})

export default function AppearanceSettingsPage() {
  const [theme, setTheme] = useState<PlatformTheme>(defaultPlatformTheme)
  const [mode, setMode] = useState<ThemeMode>('light')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<{ theme?: PlatformTheme }>('/admin/settings/theme').then(response => {
      if (response.success) setTheme(mergeTheme(response.data?.theme))
      else setError(response.error || 'Could not load theme settings')
      setLoading(false)
    }).catch(() => {
      setError('Could not load theme settings')
      setLoading(false)
    })
  }, [])

  const colors = theme[mode]
  const contrastWarnings = useMemo(() => {
    const pairs: Array<[string, string, string]> = [
      ['Text on page', colors.textColor, colors.pageBackground],
      ['Text on surface', colors.textColor, colors.surfaceBackground],
      ['Button text', colors.buttonText, colors.buttonBackground],
      ['Sidebar text', colors.sidebarText, colors.sidebarBackground],
    ]
    return pairs.filter(([, foreground, background]) => contrastRatio(foreground, background) < 4.5).map(([label]) => label)
  }, [colors])

  const updateColor = (key: ThemeColorKey, value: string) => {
    setTheme(current => ({ ...current, [mode]: { ...current[mode], [key]: value } }))
    setMessage('')
  }

  const resetMode = (target: ThemeMode) => {
    if (!window.confirm(`Reset ${target} mode to the PickAmGo default?`)) return
    setTheme(current => ({ ...current, [target]: { ...defaultPlatformTheme[target] } }))
  }

  const resetEntireTheme = () => {
    if (!window.confirm('Reset both light and dark platform themes to the default?')) return
    setTheme(defaultPlatformTheme)
  }

  const applyPreset = (preset: typeof themePresets[number]) => {
    if (!window.confirm(`Apply the ${preset.name} preset to both modes? Your current unsaved colors will be replaced.`)) return
    setTheme(mergeTheme(preset.theme))
    setMessage(`${preset.name} preset loaded. Review it, then save changes.`)
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    setError('')
    const response = await api.patch('/admin/settings/theme', { theme })
    if (response.success) setMessage('Theme published. All users will receive it on their next refresh.')
    else setError(response.error || 'Failed to publish theme')
    setSaving(false)
  }

  if (loading) return <div className="py-20 text-center text-warm-800/60">Loading appearance settings...</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Palette size={22} /></div>
            <div>
              <h1 className="font-display text-2xl font-bold text-warm-900">Appearance &amp; Theme</h1>
              <p className="text-sm text-warm-800/60">Control the platform identity without changing seller shop branding.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => resetMode(mode)} icon={<RotateCcw size={16} />}>Reset {mode === 'light' ? 'Light' : 'Dark'}</Button>
          <Button onClick={save} disabled={saving} icon={<Save size={16} />}>{saving ? 'Publishing...' : 'Publish Theme'}</Button>
        </div>
      </div>

      {message && <Card className="border-green-200 bg-green-50 p-4 text-sm text-green-700"><div className="flex items-center gap-2"><Check size={16} />{message}</div></Card>}
      {error && <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <Card className="p-2">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode('light')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${mode === 'light' ? 'bg-primary text-white' : 'text-warm-800 hover:bg-warm-100'}`}><Sun size={17} />Light Mode</button>
              <button onClick={() => setMode('dark')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${mode === 'dark' ? 'bg-primary text-white' : 'text-warm-800 hover:bg-warm-100'}`}><Moon size={17} />Dark Mode</button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 className="font-semibold text-warm-900">Presets</h2><p className="text-xs text-warm-800/60">Load a starting point, then customize individual tokens.</p></div>
              <Button variant="outline" size="sm" onClick={resetEntireTheme} icon={<RotateCcw size={14} />}>Reset Entire Theme</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {themePresets.map(preset => <button key={preset.name} onClick={() => applyPreset(preset)} className="rounded-xl border border-warm-200 p-3 text-left transition hover:border-primary hover:bg-primary/5"><span className="block text-sm font-semibold text-warm-900">{preset.name}</span><span className="mt-2 flex gap-1">{[preset.theme[mode].primaryBrand, preset.theme[mode].secondaryBrand, preset.theme[mode].pageBackground].map(color => <i key={color} className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />)}</span></button>)}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-5"><h2 className="font-semibold text-warm-900">{mode === 'light' ? 'Light mode colors' : 'Dark mode colors'}</h2><p className="text-xs text-warm-800/60">Each mode is independently controlled. HEX and 8-digit HEX alpha values are supported.</p></div>
            <div className="space-y-6">
              {themeColorGroups.map(group => <section key={group.label}><h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-warm-800/50">{group.label}</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{group.keys.map(key => <label key={key} className="block"><span className="mb-1 block text-xs font-medium text-warm-800">{themeColorLabels[key]}</span><div className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white p-2 dark:bg-warm-900"><input aria-label={`${themeColorLabels[key]} color`} type="color" value={colors[key].slice(0, 7)} onChange={event => updateColor(key, event.target.value)} className="h-9 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0" /><input value={colors[key]} onChange={event => updateColor(key, event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-mono text-warm-900 outline-none" spellCheck={false} /></div></label>)}</div></section>)}
            </div>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-warm-200 p-4"><div><h2 className="font-semibold text-warm-900">Live Preview</h2><p className="text-xs text-warm-800/60">Unsaved changes apply here immediately.</p></div><Eye size={19} className="text-primary" /></div>
            <div className="p-4" style={{ backgroundColor: colors.pageBackground, color: colors.textColor }}>
              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: colors.border, backgroundColor: colors.surfaceBackground }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: colors.headerBackground }}><strong style={{ color: colors.primaryBrand }}>PickAmGo</strong><span className="text-xs" style={{ color: colors.secondaryText }}>Explore &nbsp; Orders &nbsp; Account</span></div>
                <div className="border-t p-3" style={{ borderColor: colors.border, backgroundColor: colors.surfaceSecondary }}><div className="rounded-xl border px-3 py-2 text-xs" style={{ borderColor: colors.inputBorder, backgroundColor: colors.inputBackground, color: colors.mutedText }}>Search products, shops and services</div></div>
                <div className="grid gap-3 p-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-3" style={{ borderColor: colors.border, backgroundColor: colors.surfaceBackground }}><div className="mb-3 h-20 rounded-lg" style={{ backgroundColor: colors.surfaceSecondary }} /><p className="text-sm font-semibold">Handmade tote bag</p><p className="mt-1 font-bold" style={{ color: colors.primaryBrand }}>GH₵120.00</p><span className="mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold" style={{ backgroundColor: colors.badgeBackground, color: colors.badgeText }}>Verified shop</span></div>
                  <div className="space-y-2"><button className="w-full rounded-xl px-3 py-2 text-sm font-semibold" style={{ backgroundColor: colors.buttonBackground, color: colors.buttonText }}>Add to cart</button><button className="w-full rounded-xl border px-3 py-2 text-sm font-semibold" style={{ borderColor: colors.border, color: colors.secondaryText }}>View shop</button><div className="rounded-xl border p-3 text-xs" style={{ borderColor: colors.success, color: colors.success, backgroundColor: colors.surfaceSecondary }}>Order ready for delivery</div></div>
                </div>
                <div className="p-3" style={{ backgroundColor: colors.sidebarBackground, color: colors.sidebarText }}><div className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: colors.sidebarActive }}>Dashboard</div><div className="mt-1 px-3 py-2 text-xs">Messages</div></div>
                <div className="p-3 text-center text-xs" style={{ backgroundColor: colors.footerBackground, color: colors.surfaceBackground }}>PickAmGo marketplace footer</div>
              </div>
            </div>
          </Card>
          <Card className="p-4"><h2 className="mb-2 font-semibold text-warm-900">Accessibility</h2>{contrastWarnings.length ? <div className="space-y-2 text-xs text-amber-700"><div className="flex items-start gap-2"><AlertTriangle size={15} className="mt-0.5 shrink-0" /><span>Poor contrast may make these combinations difficult to read:</span></div><ul className="list-disc pl-6">{contrastWarnings.map(item => <li key={item}>{item}</li>)}</ul></div> : <p className="text-xs text-green-700">Core text and action combinations meet the WCAG AA contrast target.</p>}</Card>
        </div>
      </div>
    </div>
  )
}
