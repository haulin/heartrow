import { render } from 'preact'
import { ErrorDialog } from './ErrorBoundary'

const asError = (reason: unknown): Error => (reason instanceof Error ? reason : new Error(String(reason)))

/** Errors from other origins (an extension, an ad script) reach the page as an empty "Script error." and are not ours to show. */
const isOurs = (source: string | undefined): boolean => source !== undefined && source.includes(window.location.origin)

/**
 * Shows a dialog with the error details when something throws outside drawing: at startup, in an event handler, in a timer or in a
 * promise. Drawing errors are caught by `ErrorBoundary`. Only the first error is shown, since later ones are usually its aftermath.
 * Install it before anything else runs, so an error while the app starts is shown instead of a blank page.
 */
export function installFatalErrorDialog(): void {
    let host: HTMLElement | null = null

    const show = (error: Error): void => {
        if (host) return
        host = document.createElement('div')
        document.body.append(host)
        render(<ErrorDialog error={error} />, host)
        // The app that failed cannot take a hot update, so the next one reloads the page like the boundary does.
        import.meta.hot?.on('vite:afterUpdate', () => window.location.reload())
    }

    window.addEventListener('error', (event) => {
        if (isOurs(event.filename)) show(asError(event.error ?? event.message))
    })
    window.addEventListener('unhandledrejection', (event) => {
        const error = asError(event.reason)
        if (isOurs(error.stack)) show(error)
    })
}
