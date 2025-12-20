import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ChatView } from '@/features/chat'
import { AgentsPage } from '@/features/agents'
import { KnowledgePage } from '@/features/knowledge'
import { IntegrationsPage } from '@/features/integrations'
import { TasksPage } from '@/features/tasks'
import { SpacesPage } from '@/features/spaces'
import { SettingsPage } from '@/features/settings'

// Auth components
import {
  AuthLayout,
  LoginForm,
  RegisterForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  VerifyEmailPage,
  AuthCallbackPage,
  ProtectedRoute,
} from '@/features/auth'

function App() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/verify-email-sent" element={<VerifyEmailPage />} />
        <Route path="/reset-password-sent" element={<ResetPasswordSentPage />} />
        <Route path="/auth/callback/:provider" element={<AuthCallbackPage />} />
      </Route>

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatView />} />
        <Route path="chat/:spaceId" element={<ChatView />} />
        <Route path="spaces" element={<SpacesPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

// Simple page for password reset email sent confirmation
function ResetPasswordSentPage() {
  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-indigo-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-white">Check your email</h2>
        <p className="text-slate-400 mt-2">
          If an account exists for that email, we've sent instructions to reset your password.
        </p>
      </div>
      <div className="text-slate-500 text-sm">
        <p>Didn't receive the email?</p>
        <p>Check your spam folder or try again.</p>
      </div>
      <a
        href="/login"
        className="inline-block px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
      >
        Back to sign in
      </a>
    </div>
  )
}

export default App
