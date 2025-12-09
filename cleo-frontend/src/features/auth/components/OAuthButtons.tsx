/**
 * OAuthButtons - Social login buttons for Google and Microsoft
 */

import { useOAuthAuthorize, useOAuthProviders } from '@/api/hooks'
import { Loader2 } from 'lucide-react'

export function OAuthButtons() {
  const { data: providersData, isLoading: isLoadingProviders } = useOAuthProviders()
  const oauthMutation = useOAuthAuthorize()

  const handleOAuthLogin = (provider: string) => {
    oauthMutation.mutate({ provider })
  }

  if (isLoadingProviders) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    )
  }

  const providers = providersData?.providers || []
  const enabledProviders = providers.filter((p) => p.enabled)

  if (enabledProviders.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      {enabledProviders.map((provider) => (
        <button
          key={provider.name}
          type="button"
          onClick={() => handleOAuthLogin(provider.name)}
          disabled={oauthMutation.isPending}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-600 rounded-lg text-white hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {oauthMutation.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {provider.name === 'google' && <GoogleIcon />}
              {provider.name === 'microsoft' && <MicrosoftIcon />}
              <span>Continue with {provider.name === 'google' ? 'Google' : 'Microsoft'}</span>
            </>
          )}
        </button>
      ))}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

export default OAuthButtons
