import { describe, expect, it } from 'vite-plus/test'
import { GAME_DESCRIPTION } from '../../src/platform/web/Home'

const pages = import.meta.glob<string>('../../src/platform/web/index.html', { eager: true, query: '?raw', import: 'default' })
const page = Object.values(pages)[0]!.replace(/\s+/g, ' ')

const packages = import.meta.glob<{ homepage: string }>('../../package.json', { eager: true, import: 'default' })

describe('link preview address', () => {
    it('is filled in from the homepage in package.json, an absolute address that ends in a slash', () => {
        const { homepage } = Object.values(packages)[0]!
        expect(homepage).toMatch(/^https:\/\/.+\/$/)
        expect(page).toContain('property="og:image" content="__SITE_URL__heartrow_meta.png"')
        expect(page).toContain('property="og:url" content="__SITE_URL__"')
    })
})

describe('page description', () => {
    it('is the home screen sentence in the description and in the link preview', () => {
        expect(page).toContain(`name="description" content="${GAME_DESCRIPTION}"`)
        expect(page).toContain(`property="og:description" content="${GAME_DESCRIPTION}"`)
    })
})
