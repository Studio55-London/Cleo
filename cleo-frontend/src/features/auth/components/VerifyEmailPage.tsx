/**
 * VerifyEmailPage - Email verification page
 */

import { useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useVerifyEmail } from '@/api/hooks'
import { Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const verifyMutation = useVerifyEmail()

  // Auto-verify when token is present
  useEffect(() => {
    if (token && !verifyMutation.isSuccess && !verifyMutation.isPending && !verifyMutation.isError) {
      verifyMutation.mutate({ token })
    }
  }, [token])

  // No token - show instructions
  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <Mail className="w-16 h-16 mx-auto text-indigo-400" />
        <div>
          <h2 className="text-2xl font-semibold text-white">Check your email</h2>
          <p className="text-slate-400 mt-2">
            We've sent a verification link to your email address.
            Please click the link to verify your account.
          </p>
        </div>
        <div className="text-slate-500 text-sm">
          <p>Didn't receive the email?</p>
          <p>Check your spam folder or contact support.</p>
        </div>
        <Link
          to="/login"
          className="inline-block px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  // Verifying
  if (verifyMutation.isPending) {
    return (
      <div className="space-y-6 text-center">
        <Loader2 className="w-16 h-16 mx-auto text-indigo-400 animate-spin" />
        <div>
          <h2 className="text-2xl font-semibold text-white">Verifying your email</h2>
          <p className="text-slate-400 mt-2">Please wait while we verify your email address...</p>
        </div>
      </div>
    )
  }

  // Error
  if (verifyMutation.isError) {
    return (
      <div className="space-y-6 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-red-400" />
        <div>
          <h2 className="text-2xl font-semibold text-white">Verification failed</h2>
          <p className="text-slate-400 mt-2">
            {verifyMutation.error?.message || 'This verification link is invalid or has expired.'}
          </p>
        </div>
        <div className="space-y-3">
          <Link
            to="/login"
            className="block w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Sign in instead
          </Link>
          <p className="text-slate-500 text-sm">
            Need a new verification link? Sign in and we'll send you another.
          </p>
        </div>
      </div>
    )
  }

  // Success - useVerifyEmail will redirect, but show success state
  return (
    <div className="space-y-6 text-center">
      <CheckCircle className="w-16 h-16 mx-auto text-green-400" />
      <div>
        <h2 className="text-2xl font-semibold text-white">Email verified!</h2>
        <p className="text-slate-400 mt-2">
          Your email has been verified. Redirecting to sign in...
        </p>
      </div>
      <Link
        to="/login?verified=true"
        className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
      >
        Continue to sign in
      </Link>
    </div>
  )
}

export default VerifyEmailPage
