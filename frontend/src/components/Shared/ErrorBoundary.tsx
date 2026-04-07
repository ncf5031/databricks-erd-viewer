/**
 * ERD Viewer - Error Boundary
 *
 * Catches React rendering errors and displays a user-friendly fallback.
 */

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ERD Viewer error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-white dark:bg-black">
          <div className="text-center max-w-md p-6">
            <AlertTriangle size={48} className="mx-auto mb-4 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred while rendering the diagram.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw size={14} />
              Reload App
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
