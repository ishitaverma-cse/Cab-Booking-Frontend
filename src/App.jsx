import { SignIn, SignUp, useUser } from '@clerk/clerk-react'
import { Routes, Route, Navigate } from 'react-router-dom'
import UserDashboard from './components/UserDashboard'

function App() {
  const { isSignedIn } = useUser()

  return (
    <Routes>
      {/* Sign In */}
      <Route
        path="/sign-in/*"
        element={
          isSignedIn ? (
            <Navigate to="/" replace />
          ) : (
            <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
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
            <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
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

      {/* User Dashboard */}
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

      {/* Unknown Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App