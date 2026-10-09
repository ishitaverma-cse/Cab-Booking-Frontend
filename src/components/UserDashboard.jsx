import { useState } from 'react'
import { UserButton, useUser } from '@clerk/clerk-react'
import ProfileEditor from './ProfileEditor'

function UserDashboard() {
    const { user } = useUser()
    const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false)
    const firstName = user?.firstName || 'there'

    return (
        <div className="min-h-screen bg-[#f5f8ff] text-slate-800">
            {/* Navbar */}
            <header className="sticky top-0 z-10 border-b border-blue-100 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                    <a href="/" className="text-xl font-extrabold tracking-tight text-slate-900">
                        RideFlow<span className="text-blue-600">.</span>
                    </a>

                    <div className="flex items-center gap-4">
                        <span className="hidden text-sm text-slate-500 sm:block">
                            Welcome back, {firstName}
                        </span>
                        <UserButton />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
                {/* Welcome */}
                <section className="mb-8">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                        YOUR PERSONAL TRAVEL SPACE
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Hey, {firstName}! <span className="text-blue-400">✳</span>
                    </h1>

                    <p className="mt-3 text-slate-500">
                        Where would you like to go today? Your next ride starts here.
                    </p>
                </section>

                {/* Hero Banner */}
                <section className="relative isolate overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-[#edf4ff] to-[#e2edff] p-7 shadow-xl shadow-blue-900/[0.04] sm:p-10 lg:p-12">
                    <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-80 w-80 rounded-full border-[55px] border-blue-500/[0.06]" />
                    <div className="pointer-events-none absolute -bottom-28 right-24 -z-10 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />

                    <div className="relative max-w-2xl">
                        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                            YOUR JOURNEY, YOUR WAY
                        </span>

                        <h2 className="mt-6 max-w-xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                            Every great journey starts with a{' '}
                            <span className="text-blue-600">ride.</span>
                        </h2>

                        <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">
                            Get ready to travel comfortably. Your dashboard keeps your ride
                            experience organized in one place.
                        </p>

                        <div className="mt-8 flex items-center gap-3 text-sm text-slate-600">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-100 bg-white text-lg text-blue-600">
                                ↗
                            </span>
                            <span>Made for smoother journeys.</span>
                        </div>
                    </div>
                </section>

                {/* Main Dashboard Cards */}
                <section className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                    {/* Ride Planner */}
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/[0.03] sm:p-8">
                        <div className="mb-7">
                            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                                PLAN A JOURNEY
                            </p>
                            <h2 className="mt-2 text-xl font-bold text-slate-900">
                                Plan your next ride
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Your next destination is just around the corner.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="flex gap-4">
                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                                    ●
                                </div>

                                <div className="flex-1">
                                    <label htmlFor="pickup" className="mb-2 block text-sm font-medium text-slate-700">
                                        Pickup location
                                    </label>
                                    <input
                                        id="pickup"
                                        type="text"
                                        placeholder="Enter your pickup location"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>
                            </div>

                            <div className="ml-5 h-5 border-l-2 border-dashed border-slate-300" />

                            <div className="flex gap-4">
                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                                    ◆
                                </div>

                                <div className="flex-1">
                                    <label htmlFor="destination" className="mb-2 block text-sm font-medium text-slate-700">
                                        Destination
                                    </label>
                                    <input
                                        id="destination"
                                        type="text"
                                        placeholder="Where are you heading?"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>
                            </div>

                            <p className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-700">
                                Your ride-booking functionality is coming up in a later step.
                            </p>
                        </div>
                    </div>

                    {/* Account Card */}
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/[0.03] sm:p-8">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-xl font-bold text-slate-900">
                                Your account
                            </h2>
                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                Signed in
                            </span>
                        </div>

                        <div className="mt-7 flex items-center gap-4">
                            <img
                                src={user?.imageUrl || 'https://placehold.co/96x96/eaf1ff/2563eb?text=User'}
                                alt="Profile"
                                className="h-16 w-16 rounded-2xl border border-blue-100 object-cover"
                            />

                            <div className="min-w-0">
                                <h3 className="truncate font-bold text-slate-900">
                                    {user?.fullName || firstName}
                                </h3>
                                <p className="mt-1 truncate text-sm text-slate-500">
                                    {user?.primaryEmailAddress?.emailAddress || 'No email available'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-7 space-y-4 border-t border-slate-100 pt-5">
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-500">Account type</span>
                                <span className="font-medium text-slate-700">Personal</span>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="text-slate-500">Session</span>
                                <span className="font-medium text-emerald-600">Active</span>
                            </div>
                        </div>

                        <p className="mt-7 text-sm leading-6 text-slate-500">
                            Manage your profile and account settings through your profile menu.
                        </p>

                        <button
                            type="button"
                            onClick={() => setIsProfileEditorOpen(true)}
                            className="mt-6 w-full rounded-xl bg-blue-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                            Edit profile
                        </button>
                    </div>
                </section>

                {/* Ride History */}
                <section className="mt-8 rounded-3xl border border-dashed border-blue-200 bg-white/70 px-6 py-10 text-center sm:py-12">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-2xl">
                        🚕
                    </div>

                    <h2 className="mt-4 text-lg font-bold text-slate-900">
                        Your ride history starts here
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Once ride booking is implemented, your upcoming and completed
                        journeys will appear here.
                    </p>
                </section>
            </main>

            <footer className="border-t border-blue-100 bg-white px-5 py-6 text-center text-sm text-slate-500">
                © {new Date().getFullYear()} RideFlow. Made for smoother journeys.
            </footer>

            {isProfileEditorOpen && (
                <ProfileEditor
                    onClose={() => setIsProfileEditorOpen(false)}
                />
            )}
        </div>
    )
}

export default UserDashboard
