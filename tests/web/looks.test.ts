import { describe, expect, it } from 'vite-plus/test'
import { CUSTOM_PRESETS } from '../../src/core'
import { PRESET_LOOKS, challengeList } from '../../src/platform/web/challenges'
import { DEFAULT_CUSTOM } from '../../src/core'
import { glyphNames } from '../../src/platform/web/Glyph'

describe('mode looks', () => {
    it('gives every preset a look, and every look an icon file', () => {
        const icons = glyphNames()
        for (const preset of CUSTOM_PRESETS) {
            const look = PRESET_LOOKS[preset.id]
            expect(look, `no look for the preset ${preset.id}`).toBeDefined()
            expect(icons, `no glyphs/${look?.icon}.svg for ${preset.id}`).toContain(look!.icon)
        }
    })

    it('has an icon file for every card, including Custom', () => {
        const icons = glyphNames()
        for (const challenge of challengeList(DEFAULT_CUSTOM)) expect(icons).toContain(challenge.icon)
        for (const needed of ['back', 'close', 'check', 'info', 'chevron', 'star', 'star-outline']) expect(icons).toContain(needed)
    })
})
