/**
 * AuthCallbackPage - OAuth callback handler
 */

import { useEffect } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { useOAuthCallback } from '@/api/hooks'
import { Loader2, AlertCircle } from 'lucide-react'

export function AuthCallbackPage() {
  const { provider } = useParams<{ provider: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const callbackMutation = useOAuthCallback()

  // Handle OAuth callback
  useEffect(() => {
    if (error) {
      // OAuth provider returned an error
      return
    }

    if (code && provider && !callbackMutation.isPending && !callbackMutation.isSuccess && !callbackMutation.isError) {
      callbackMutation.mutate({ provider, code, state: state || undefined })
    }
  }, [code, provider, state, error])

  // Error from OAuth provider
  if (error) {
    return (
      <div className="space-y-6 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-red-400" />
        <div>
          <h2 className="text-2xl font-semibold text-white">Authentication failed</h2>
          <p className="text-slate-400 mt-2">
            {errorDescription || 'The authentication request was denied or failed.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  // No code - invalid callback
  if (!code) {
    return (
      <div className="space-y-6 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-red-400" />
        <div>
          <h2 className="text-2xl font-semibold text-white">Invalid callback</h2>
          <p className="text-slate-400 mt-2">
            The authentication callback is missing required parameters.
          </p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
        >
          Back to sign in
        </button>
      </div>
    )
  }

  // Processing
  if (callbackMutation.isPending) {
    return (
      <div className="space-y-6 text-center">
        <Loader2 className="w-16 h-16 mx-auto text-indigo-400 animate-spin" />
        <div>
          <h2 className="text-2xl font-semibold text-white">Completing sign in</h2>
          <p className="text-slate-400 mt-2">Please wait while we complete your authentication...</p>
        </div>
      </div>
    )
  }

  // Error from our server
  if (callbackMutation.isError) {
    return (
      <div className="space-y-6 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-red-400" />
        <div>
          <h2 className="text-2xl font-semibold text-white">Sign in failed</h2>
          <p className="text-slate-400 mt-2">
            {callbackMutation.error?.message || 'Failed to complete authentication.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  // Success - useOAuthCallback will redirect, but show loading state
  return (
    <div className="space-y-6 text-center">
      <Loader2 className="w-16 h-16 mx-auto text-indigo-400 animate-spin" />
      <div>
        <h2 className="text-2xl font-semibold text-white">Success!</h2>
        <p className="text-slate-400 mt-2">Redirecting you to the app...</p>
      </div>
    </div>
  )
}

export default AuthCallbackPage
