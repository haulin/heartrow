import type { ComponentType } from 'preact'
import type { CardView } from '../view/cardView'

export interface CardSkinProps {
  view: CardView
  /** Absent for non-interactive cards such as the pile dialog. */
  onActivate?: (() => void) | undefined
}

/**
 * A skin renders one card inside a box that the layout sizes. The root element must:
 * - fill 100% of the width and height of its parent,
 * - size its insides from the inherited `--cw` custom property (the card width),
 * - carry `data-card-id={view.id}` so the animation module can find it.
 */
export interface CardSkin {
  id: string
  name: string
  Card: ComponentType<CardSkinProps>
}
