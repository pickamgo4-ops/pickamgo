export type ThemeColorKey =
  | 'pageBackground'
  | 'surfaceBackground'
  | 'surfaceSecondary'
  | 'primaryBrand'
  | 'primaryHover'
  | 'secondaryBrand'
  | 'accent'
  | 'textColor'
  | 'secondaryText'
  | 'mutedText'
  | 'border'
  | 'inputBackground'
  | 'inputBorder'
  | 'buttonBackground'
  | 'buttonText'
  | 'linkColor'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'badgeBackground'
  | 'badgeText'
  | 'headerBackground'
  | 'footerBackground'
  | 'sidebarBackground'
  | 'sidebarText'
  | 'sidebarActive'
  | 'modalOverlay'

export type ThemeModeConfig = Record<ThemeColorKey, string>
export type PlatformTheme = { light: ThemeModeConfig; dark: ThemeModeConfig }

export const themeColorGroups: Array<{ label: string; keys: ThemeColorKey[] }> = [
  { label: 'Core surfaces', keys: ['pageBackground', 'surfaceBackground', 'surfaceSecondary', 'headerBackground', 'footerBackground', 'sidebarBackground', 'modalOverlay'] },
  { label: 'Brand and actions', keys: ['primaryBrand', 'primaryHover', 'secondaryBrand', 'accent', 'buttonBackground', 'buttonText', 'linkColor'] },
  { label: 'Typography and borders', keys: ['textColor', 'secondaryText', 'mutedText', 'border', 'inputBackground', 'inputBorder'] },
  { label: 'Feedback and badges', keys: ['success', 'warning', 'error', 'info', 'badgeBackground', 'badgeText'] },
  { label: 'Navigation', keys: ['sidebarText', 'sidebarActive'] },
]

export const themeColorLabels: Record<ThemeColorKey, string> = {
  pageBackground: 'Page background',
  surfaceBackground: 'Surface / card background',
  surfaceSecondary: 'Secondary surface',
  primaryBrand: 'Primary brand',
  primaryHover: 'Primary hover',
  secondaryBrand: 'Secondary brand',
  accent: 'Accent',
  textColor: 'Text color',
  secondaryText: 'Secondary text',
  mutedText: 'Muted text',
  border: 'Border',
  inputBackground: 'Input background',
  inputBorder: 'Input border',
  buttonBackground: 'Button background',
  buttonText: 'Button text',
  linkColor: 'Link color',
  success: 'Success',
  warning: 'Warning',
  error: 'Error / danger',
  info: 'Info',
  badgeBackground: 'Badge background',
  badgeText: 'Badge text',
  headerBackground: 'Header background',
  footerBackground: 'Footer background',
  sidebarBackground: 'Sidebar background',
  sidebarText: 'Sidebar text',
  sidebarActive: 'Sidebar active item',
  modalOverlay: 'Modal / overlay',
}

export const defaultPlatformTheme: PlatformTheme = {
  light: {
    pageBackground: '#F5F7FB',
    surfaceBackground: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    primaryBrand: '#155EEF',
    primaryHover: '#1D4ED8',
    secondaryBrand: '#4F46E5',
    accent: '#0EA5E9',
    textColor: '#0F172A',
    secondaryText: '#334155',
    mutedText: '#64748B',
    border: '#DFE7F2',
    inputBackground: '#FFFFFF',
    inputBorder: '#CBD5E1',
    buttonBackground: '#155EEF',
    buttonText: '#FFFFFF',
    linkColor: '#155EEF',
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    info: '#2563EB',
    badgeBackground: '#EEF6FF',
    badgeText: '#0F172A',
    headerBackground: '#FFFFFF',
    footerBackground: '#0F172A',
    sidebarBackground: '#FFFFFF',
    sidebarText: '#1F2937',
    sidebarActive: '#EEF6FF',
    modalOverlay: '#0F172A55',
  },
  dark: {
    pageBackground: '#0B1120',
    surfaceBackground: '#111827',
    surfaceSecondary: '#162033',
    primaryBrand: '#60A5FA',
    primaryHover: '#3B82F6',
    secondaryBrand: '#818CF8',
    accent: '#67E8F9',
    textColor: '#F8FAFC',
    secondaryText: '#D9E2F2',
    mutedText: '#94A3B8',
    border: 'rgba(148, 163, 184, 0.25)',
    inputBackground: '#0F172A',
    inputBorder: 'rgba(148, 163, 184, 0.3)',
    buttonBackground: '#60A5FA',
    buttonText: '#0F172A',
    linkColor: '#93C5FD',
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    badgeBackground: 'rgba(96, 165, 250, 0.12)',
    badgeText: '#E0F2FE',
    headerBackground: '#0F172A',
    footerBackground: '#020817',
    sidebarBackground: '#0F172A',
    sidebarText: '#D9E2F2',
    sidebarActive: 'rgba(96, 165, 250, 0.12)',
    modalOverlay: '#020617B3',
  },
}

export function normalizeLightPlatformTheme(theme: PlatformTheme): PlatformTheme {
  const light = { ...theme.light }
  const whiteSurfaceKeys: ThemeColorKey[] = ['pageBackground', 'surfaceBackground', 'surfaceSecondary', 'inputBackground', 'headerBackground', 'sidebarBackground', 'badgeBackground', 'sidebarActive']
  whiteSurfaceKeys.forEach(key => { light[key] = '#FFFFFF' })
  light.border = '#CBD5E1'
  light.inputBorder = '#94A3B8'
  return { ...theme, light }
}

export const themePresets: Array<{ name: string; theme: PlatformTheme }> = [
  { name: 'PickAmGo Default', theme: defaultPlatformTheme },
  { name: 'Ocean', theme: { light: { ...defaultPlatformTheme.light, primaryBrand: '#087E8B', primaryHover: '#05636D', secondaryBrand: '#5BC0BE', accent: '#0B4F6C', buttonBackground: '#087E8B', linkColor: '#05636D' }, dark: { ...defaultPlatformTheme.dark, primaryBrand: '#4FD1C5', primaryHover: '#81E6D9', secondaryBrand: '#63B3ED', accent: '#90CDF4', buttonBackground: '#319795', buttonText: '#102A43', linkColor: '#90CDF4' } } },
  { name: 'Fresh', theme: { light: { ...defaultPlatformTheme.light, pageBackground: '#F3FAF6', surfaceSecondary: '#E3F5EA', primaryBrand: '#2F855A', primaryHover: '#276749', secondaryBrand: '#68D391', accent: '#38A169', buttonBackground: '#2F855A', linkColor: '#276749' }, dark: { ...defaultPlatformTheme.dark, primaryBrand: '#68D391', primaryHover: '#9AE6B4', secondaryBrand: '#48BB78', accent: '#38A169', buttonBackground: '#48BB78', buttonText: '#102A1D', linkColor: '#9AE6B4' } } },
  { name: 'Midnight', theme: { light: { ...defaultPlatformTheme.light, pageBackground: '#EEF2FF', surfaceBackground: '#FFFFFF', surfaceSecondary: '#E0E7FF', primaryBrand: '#4338CA', primaryHover: '#3730A3', secondaryBrand: '#6366F1', accent: '#818CF8', buttonBackground: '#4338CA', linkColor: '#3730A3' }, dark: { ...defaultPlatformTheme.dark, pageBackground: '#111827', surfaceBackground: '#1F2937', surfaceSecondary: '#273449', primaryBrand: '#818CF8', primaryHover: '#A5B4FC', secondaryBrand: '#60A5FA', accent: '#C4B5FD', buttonBackground: '#6366F1', buttonText: '#FFFFFF', linkColor: '#A5B4FC' } } },
  { name: 'Minimal', theme: { light: { ...defaultPlatformTheme.light, pageBackground: '#F8FAFC', surfaceBackground: '#FFFFFF', surfaceSecondary: '#F1F5F9', primaryBrand: '#334155', primaryHover: '#1E293B', secondaryBrand: '#64748B', accent: '#94A3B8', buttonBackground: '#334155', linkColor: '#1E293B' }, dark: { ...defaultPlatformTheme.dark, pageBackground: '#0F172A', surfaceBackground: '#1E293B', surfaceSecondary: '#273449', primaryBrand: '#CBD5E1', primaryHover: '#F8FAFC', secondaryBrand: '#94A3B8', accent: '#64748B', buttonBackground: '#CBD5E1', buttonText: '#0F172A', linkColor: '#F8FAFC' } } },
  { name: 'Vibrant', theme: { light: { ...defaultPlatformTheme.light, pageBackground: '#FFF7ED', surfaceSecondary: '#FFEDD5', primaryBrand: '#EA580C', primaryHover: '#C2410C', secondaryBrand: '#F59E0B', accent: '#DB2777', buttonBackground: '#EA580C', linkColor: '#C2410C' }, dark: { ...defaultPlatformTheme.dark, primaryBrand: '#FB923C', primaryHover: '#FDBA74', secondaryBrand: '#FBBF24', accent: '#F472B6', buttonBackground: '#F97316', buttonText: '#211208', linkColor: '#FDBA74' } } },
  { name: 'Professional', theme: { light: { ...defaultPlatformTheme.light, pageBackground: '#F4F7FA', surfaceSecondary: '#E8EEF4', primaryBrand: '#1F4E79', primaryHover: '#163A5C', secondaryBrand: '#3B82A0', accent: '#D97706', buttonBackground: '#1F4E79', linkColor: '#163A5C' }, dark: { ...defaultPlatformTheme.dark, primaryBrand: '#60A5C8', primaryHover: '#93C5FD', secondaryBrand: '#7DD3FC', accent: '#FBBF24', buttonBackground: '#2563EB', buttonText: '#FFFFFF', linkColor: '#93C5FD' } } },
]

function cssVariableName(key: ThemeColorKey): string {
  return `--color-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`
}

export function applyPlatformTheme(theme: PlatformTheme, mode: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const selected = theme[mode]
  Object.entries(selected).forEach(([key, value]) => root.style.setProperty(cssVariableName(key as ThemeColorKey), value))
  const aliases: Record<string, string> = {
    pageBackground: '--background', surfaceBackground: '--card', surfaceSecondary: '--warm-100', primaryBrand: '--primary', primaryHover: '--primary-dark', secondaryBrand: '--secondary', accent: '--primary-light', textColor: '--foreground', secondaryText: '--warm-800', mutedText: '--muted', border: '--border', inputBackground: '--input-background', inputBorder: '--input-border', buttonBackground: '--button-background', buttonText: '--button-text', linkColor: '--link-color', success: '--success', warning: '--warning', error: '--danger', info: '--info', badgeBackground: '--badge-background', badgeText: '--badge-text', headerBackground: '--header-background', footerBackground: '--footer-background', sidebarBackground: '--sidebar-background', sidebarText: '--sidebar-text', sidebarActive: '--sidebar-active', modalOverlay: '--modal-overlay',
  }
  Object.entries(aliases).forEach(([key, variable]) => root.style.setProperty(variable, selected[key as ThemeColorKey]))
}

export function contrastRatio(first: string, second: string): number {
  const parse = (value: string) => {
    const hex = value.replace('#', '').slice(0, 6)
    const rgb = [0, 1, 2].map(index => parseInt(hex.slice(index * 2, index * 2 + 2), 16) / 255)
    return rgb.map(channel => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  }
  const a = parse(first)
  const b = parse(second)
  const luminance = (rgb: number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
  const light = Math.max(luminance(a), luminance(b))
  const dark = Math.min(luminance(a), luminance(b))
  return (light + 0.05) / (dark + 0.05)
}
