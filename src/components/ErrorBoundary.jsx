import React from 'react'

/**
 * ErrorBoundary — catch render-time exceptions from any child tree and
 * show a recoverable error screen instead of letting the entire app go
 * black. The Electron renderer has no built-in fallback; without this
 * wrapper, a single thrown JSX in a deeply-nested modal would blank the
 * whole window. We recover by remounting on the user's click.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) {
      const message = this.state.error?.message || String(this.state.error)
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-bg0 text-fg p-8">
          <div className="max-w-md rounded-xl bg-bg1 border border-error/40 ring-1 ring-error/20 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-errorsoft ring-1 ring-error/40 flex items-center justify-center text-error font-bold">
                !
              </div>
              <div>
                <h1 className="text-lg font-bold">Đã xảy ra lỗi</h1>
                <p className="text-xs text-fgdim">Một phần của giao diện bị lỗi. Bạn có thể thử lại.</p>
              </div>
            </div>
            <pre className="text-[11px] text-fgdim bg-bg0 ring-1 ring-line rounded-lg p-3 mb-4 overflow-auto max-h-40 whitespace-pre-wrap break-words font-mono">
              {message}
            </pre>
            <button
              onClick={this.reset}
              className="w-full px-4 py-2 rounded-lg bg-accent hover:bg-accentstrong text-bg-0 font-semibold transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}