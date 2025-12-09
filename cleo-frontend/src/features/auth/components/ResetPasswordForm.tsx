/**
 * ResetPasswordForm - Reset password with token
 */

import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useResetPassword } from '@/api/hooks'
import { Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react'

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const resetMutation = useResetPassword()

  // Password validation
  const passwordChecks = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasUpper: /[A-Z]/.test(password),
  }
  const isPasswordValid = Object.values(passwordChecks).every(Boolean)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match')
      return
    }

    if (!isPasswordValid) {
      setLocalError('Password does not meet requirements')
      return
    }

    resetMutation.mutate({ token, password })
  }

  const error = localError || (resetMutation.isError ? resetMutation.error?.message : null)

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-red-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Invalid Reset Link</h2>
          <p className="text-slate-400 mt-2">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <Link
          to="/forgot-password"
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
        >
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">Set new password</h2>
        <p className="text-slate-400 mt-1">Create a strong password for your account.</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              placeholder="Create a strong password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password requirements */}
          {password && (
            <div className="mt-2 space-y-1">
              <PasswordCheck passed={passwordChecks.minLength} text="At least 8 characters" />
              <PasswordCheck passed={passwordChecks.hasUpper} text="One uppercase letter" />
              <PasswordCheck passed={passwordChecks.hasNumber} text="One number" />
              <PasswordCheck passed={passwordChecks.hasSpecial} text="One special character" />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
              confirmPassword && password !== confirmPassword
                ? 'border-red-500'
                : 'border-slate-600'
            }`}
            placeholder="Confirm your password"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-sm text-red-400">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={resetMutation.isPending || !isPasswordValid}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {resetMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Resetting password...</span>
            </>
          ) : (
            'Reset password'
          )}
        </button>
      </form>
    </div>
  )
}

function PasswordCheck({ passed, text }: { passed: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${passed ? 'text-green-400' : 'text-slate-500'}`}>
      <Check className={`w-3 h-3 ${passed ? 'opacity-100' : 'opacity-30'}`} />
      <span>{text}</span>
    </div>
  )
}

export default ResetPasswordForm
