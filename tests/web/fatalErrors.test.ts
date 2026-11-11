// @vitest-environment happy-dom
import { act } from 'preact/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import { installFatalErrorDialog } from '../../src/platform/web/fatalErrors'

const dialogText = (): string | undefined => document.body.querySelector('dialog')?.textContent ?? undefined

const fire = (init: ErrorEventInit): void =>
    void act(() => {
        window.dispatchEvent(new ErrorEvent('error', init))
    })

describe('fatal error dialog', () => {
    it('shows the details of the first error of our own scripts, and ignores the rest', () => {
        installFatalErrorDialog()

        fire({ message: 'Script error.', filename: '' })
        expect(dialogText()).toBeUndefined()

        const here = `${window.location.origin}/assets/index.js`
        fire({ message: 'x', filename: here, error: new Error('createMemoryStorage is not defined') })
        expect(dialogText()).toContain('Something went wrong')
        expect(dialogText()).toContain('Error: createMemoryStorage is not defined')
        expect(dialogText()).toContain('Heartrow')

        fire({ message: 'x', filename: here, error: new Error('aftermath') })
        expect(dialogText()).not.toContain('aftermath')
    })
})
