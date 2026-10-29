import { render } from 'preact'

export function App() {
  return (
    <main data-theme="dark">
      <h1>Heartrow</h1>
    </main>
  )
}

const root = document.getElementById('app')
if (root) render(<App />, root)
