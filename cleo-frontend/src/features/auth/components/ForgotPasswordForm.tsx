/**
 * ForgotPasswordForm - Request password reset
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForgotPassword } from '@/api/hooks'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')

  const forgotMutation = useForgotPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    forgotMutation.mutate({ email })
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">Reset your password</h2>
        <p className="text-slate-400 mt-1">
          Enter your email and we'll send you instructions to reset your password.
        </p>
      </div>

      {/* Error message */}
      {forgotMutation.isError && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{forgotMutation.error?.message || 'Failed to send reset email'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="your@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={forgotMutation.isPending}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {forgotMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            'Send reset instructions'
          )}
        </button>
      </form>

      <Link
        to="/login"
        className="flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to sign in</span>
      </Link>
    </div>
  )
}

export default ForgotPasswordForm
