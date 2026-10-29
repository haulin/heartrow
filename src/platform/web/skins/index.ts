import { defaultSkin } from './default/skin'
import type { CardSkin } from './types'

export const SKINS: readonly CardSkin[] = [defaultSkin]

export const SKIN_IDS: readonly string[] = SKINS.map((s) => s.id)

export function getSkin(id: string): CardSkin {
  return SKINS.find((s) => s.id === id) ?? defaultSkin
}

export type { CardSkin, CardSkinProps } from './types'
