import { SignIn, SignUp, useUser, UserButton } from '@clerk/clerk-react'
import { Routes, Route, Navigate } from 'react-router-dom'

function App() {
  const { isSignedIn, user } = useUser()

  return (
    <Routes>
      {/* Sign In */}
      <Route
        path="/sign-in/*"
        element={
          isSignedIn ? (
            <Navigate to="/" replace />
          ) : (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
              <div className="w-full max-w-md">
                <SignIn
                  routing="path"
                  path="/sign-in"
                  signUpUrl="/sign-up"
                />
              </div>
            </div>
          )
        }
      />

      {/* Sign Up */}
      <Route
        path="/sign-up/*"
        element={
          isSignedIn ? (
            <Navigate to="/" replace />
          ) : (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
              <div className="w-full max-w-md">
                <SignUp
                  routing="path"
                  path="/sign-up"
                  signInUrl="/sign-in"
                />
              </div>
            </div>
          )
        }
      />

      {/* Home */}
      <Route
        path="/"
        element={
          isSignedIn ? (
            <div className="min-h-screen bg-gray-100">
              <header className="flex items-center justify-between bg-white px-6 py-4 shadow">
                <h1 className="text-2xl font-bold text-blue-600">
                  Cab Booking App 🚕
                </h1>

                <UserButton />
              </header>

              <main className="flex min-h-[calc(100vh-73px)] items-center justify-center">
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-gray-800">
                    Welcome, {user?.firstName || 'User'}! 👋
                  </h2>

                  <p className="mt-3 text-gray-600">
                    You are successfully signed in.
                  </p>
                </div>
              </main>
            </div>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      {/* Unknown route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App