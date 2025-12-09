/**
 * RegisterForm - Registration page component
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useRegister } from '@/api/hooks'
import { useAuthError, useAuthLoading } from '@/store/authStore'
import { Eye, EyeOff, Loader2, AlertCircle, Check } from 'lucide-react'
import { OAuthButtons } from './OAuthButtons'

export function RegisterForm() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState('')

  const registerMutation = useRegister()
  const authError = useAuthError()
  const authLoading = useAuthLoading()

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

    registerMutation.mutate({
      username,
      email,
      password,
      full_name: fullName || undefined,
    })
  }

  const isLoading = registerMutation.isPending || authLoading
  const error = localError || authError

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-white">Create your account</h2>
        <p className="text-slate-400 mt-1">Start your AI journey with Cleo</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* OAuth buttons */}
      <OAuthButtons />

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-slate-800/50 text-slate-400">or register with email</span>
        </div>
      </div>

      {/* Registration form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-1">
            Full Name (optional)
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="Your name"
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            placeholder="Choose a username"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
            Email
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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
            Password
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
          disabled={isLoading || !isPasswordValid}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating account...</span>
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="text-center text-slate-400 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Sign in
        </Link>
      </p>

      <p className="text-center text-slate-500 text-xs">
        By creating an account, you agree to our{' '}
        <a href="#" className="text-slate-400 hover:text-slate-300">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="#" className="text-slate-400 hover:text-slate-300">
          Privacy Policy
        </a>
      </p>
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

export default RegisterForm
