import { SignIn, SignUp, useUser } from '@clerk/clerk-react'
import { Routes, Route, Navigate } from 'react-router-dom'
import UserDashboard from './components/UserDashboard'

const travelImage =
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=85'

function AuthLayout({ children, mode }) {
  return (
    <main className="flex h-dvh overflow-hidden bg-white lg:grid lg:grid-cols-2">
      {/* Premium travel visual */}
      <section className="relative hidden h-dvh overflow-hidden bg-slate-950 lg:block">
        <img
          src={travelImage}
          alt="Premium car on the road"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/15 to-slate-950/30" />

        {/* Brand */}
        <a
          href="/sign-in"
          className="absolute left-10 top-9 z-10 flex items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-extrabold text-blue-600 shadow-lg">
            R
          </span>

          <span className="text-2xl font-extrabold tracking-tight text-white">
            RideFlow<span className="text-blue-300">.</span>
          </span>
        </a>

        {/* Headline */}
        <div className="absolute bottom-16 left-12 right-12 z-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-blue-200">
            Your journey starts here
          </p>

          <h1 className="max-w-lg text-5xl font-bold leading-tight tracking-tight text-white xl:text-6xl">
            Your ride.
            <br />
            Your way.
          </h1>

          <div className="mt-6 h-1 w-14 rounded-full bg-blue-400" />

          <p className="mt-5 max-w-sm text-sm leading-6 text-slate-200">
            Every journey feels better when it starts with RideFlow.
          </p>
        </div>
      </section>

      {/* Authentication panel */}
      <section
        className={`relative flex h-dvh min-h-0 flex-1 flex-col items-center px-4 py-3 sm:px-8 lg:bg-white lg:px-10 xl:px-14 ${mode === 'sign-up'
          ? 'justify-start overflow-y-auto'
          : 'justify-center overflow-hidden bg-slate-50'
          }`}
      >
        {/* Compact mobile branding */}
        <a
          href="/sign-in"
          className="absolute left-5 top-4 flex items-center gap-2 lg:hidden"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg font-extrabold text-white shadow-md shadow-blue-200">
            R
          </span>

          <span className="text-xl font-extrabold tracking-tight text-slate-900">
            RideFlow<span className="text-blue-600">.</span>
          </span>
        </a>

        <div
          className={`w-full max-w-[390px] ${mode === 'sign-up'
            ? 'mt-14 mb-6 shrink-0 lg:mt-6'
            : 'shrink-0'
            }`}
        >
          {/* Welcome heading */}
          <div className="mb-4 text-center lg:mb-5">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
            </h2>

            <p className="mt-1.5 text-sm leading-5 text-slate-500">
              {mode === 'sign-in'
                ? 'Sign in and get back on the road.'
                : 'Your next journey starts with RideFlow.'}
            </p>
          </div>

          {/* Clean authentication form */}
          <div className="w-full bg-transparent p-0">
            {children}
          </div>
        </div>
      </section>
    </main>
  )
}

const clerkAppearance = {
  variables: {
    colorPrimary: '#2563eb',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBackground: '#ffffff',
    colorInputBackground: '#ffffff',
    colorInputText: '#0f172a',
    borderRadius: '0.75rem',
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: '13px',
    spacingUnit: '0.85rem',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full border-0 bg-transparent p-0 shadow-none',
    card: 'w-full border-0 bg-transparent p-0 shadow-none',

    header: 'hidden',
    main: 'gap-3',
    socialButtons: 'gap-2',
    socialButtonsBlockButton:
      'min-h-10 rounded-xl border border-slate-200 bg-white font-semibold shadow-sm transition hover:border-blue-200 hover:bg-blue-50',
    socialButtonsBlockButtonText: 'text-sm font-semibold',
    socialButtonsIconButton: 'rounded-xl',

    dividerRow: 'my-3',
    dividerLine: 'bg-slate-200',
    dividerText: 'text-xs text-slate-400',

    form: 'gap-3',
    formFieldRow: 'gap-1',
    formFieldLabel: 'mb-1 text-xs font-semibold text-slate-700',
    formFieldInput:
      'min-h-10 rounded-xl border-slate-200 bg-white text-sm shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
    formFieldInputShowPasswordButton: 'text-slate-500',
    formFieldAction: 'text-xs font-semibold text-blue-600',

    formButtonPrimary:
      'min-h-10 rounded-xl bg-blue-600 text-sm font-bold shadow-md shadow-blue-100 transition hover:bg-blue-700',

    footer: 'mt-3',
    footerAction: 'text-xs',
    footerActionText: 'text-slate-500',
    footerActionLink: 'font-bold text-blue-600 hover:text-blue-700',

    identityPreview: 'rounded-xl border border-slate-200',
    identityPreviewEditButton: 'text-blue-600',
    alert: 'rounded-xl text-sm',
    otpCodeFieldInput: 'rounded-lg',
  },
}

function App() {
  const { isSignedIn } = useUser()

  return (
    <Routes>
      <Route
        path="/sign-in/*"
        element={
          isSignedIn ? (
            <Navigate to="/" replace />
          ) : (
            <AuthLayout mode="sign-in">
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                appearance={clerkAppearance}
              />
            </AuthLayout>
          )
        }
      />

      <Route
        path="/sign-up/*"
        element={
          isSignedIn ? (
            <Navigate to="/" replace />
          ) : (
            <AuthLayout mode="sign-up">
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                appearance={clerkAppearance}
              />
            </AuthLayout>
          )
        }
      />

      <Route
        path="/"
        element={
          isSignedIn ? (
            <UserDashboard />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App