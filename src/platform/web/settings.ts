import type { AppStorage } from './storage'

export const THEMES = ['system', 'light', 'dark'] as const
export const ANIM_SPEEDS = ['off', 'fast', 'normal'] as const

export type Theme = (typeof THEMES)[number]
export type AnimSpeed = (typeof ANIM_SPEEDS)[number]

export interface Settings {
  theme: Theme
  anim: AnimSpeed
  skin: string
}

export const DEFAULT_SETTINGS: Settings = { theme: 'system', anim: 'normal', skin: 'default' }

const KEY = 'settings'

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback

export function loadSettings(store: AppStorage, skinIds: readonly string[] = [DEFAULT_SETTINGS.skin]): Settings {
  const raw = store.get<Record<string, unknown> | null>(KEY, null)
  const o = raw !== null && typeof raw === 'object' ? raw : {}
  return {
    theme: pick(o.theme, THEMES, DEFAULT_SETTINGS.theme),
    anim: pick(o.anim, ANIM_SPEEDS, DEFAULT_SETTINGS.anim),
    skin: pick(o.skin, skinIds, DEFAULT_SETTINGS.skin),
  }
}

export function saveSettings(store: AppStorage, settings: Settings): void {
  store.set(KEY, settings)
}

export function nextTheme(theme: Theme): Theme {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!
}

export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.dataset.theme = theme
}
