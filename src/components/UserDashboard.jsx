import { useEffect, useState } from 'react'
import { UserButton, useUser } from '@clerk/clerk-react'
import ProfileEditor from './ProfileEditor'
import LocationPicker from '../components/LocationPicker'
import RideOptions from '../components/RideOptions'

function UserDashboard() {
    const { user } = useUser()

    const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false)
    const firstName = user?.firstName || 'there'

    const [pickup, setPickup] = useState('')
    const [destination, setDestination] = useState('')
    const [pickupCoordinates, setPickupCoordinates] = useState(null)
    const [destinationCoordinates, setDestinationCoordinates] = useState(null)
    const [routeInfo, setRouteInfo] = useState(null)

    const API_URL = (
        import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    ).replace(/\/+$/, '')

    const [rides, setRides] = useState([])
    const [ridesLoading, setRidesLoading] = useState(true)
    const [ridesError, setRidesError] = useState('')
    const [currentRidePage, setCurrentRidePage] = useState(1)
    const RIDES_PER_PAGE = 3

    const totalRidePages = Math.ceil(rides.length / RIDES_PER_PAGE)

    const startIndex = (currentRidePage - 1) * RIDES_PER_PAGE

    const paginatedRides = rides.slice(
        startIndex,
        startIndex + RIDES_PER_PAGE
    )
    const [toast, setToast] = useState('')

    useEffect(() => {
        if (!toast) return

        const timer = setTimeout(() => setToast(''), 3500)
        return () => clearTimeout(timer)
    }, [toast])

    useEffect(() => {
        if (!user?.id) {
            setRidesLoading(false)
            return
        }

        let cancelled = false

        async function fetchRides() {
            setRidesLoading(true)
            setRidesError('')

            try {
                const response = await fetch(
                    `${API_URL}/rides?clerk_id=${encodeURIComponent(user.id)}`
                )

                const contentType = response.headers.get('content-type') || ''

                if (!contentType.includes('application/json')) {
                    throw new Error(
                        `Could not load ride history (HTTP ${response.status}).`
                    )
                }

                const result = await response.json()

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || 'Could not load ride history.'
                    )
                }

                if (!cancelled) {
                    setRides(result.data || [])
                    setCurrentRidePage(1)
                }
            } catch (error) {
                if (!cancelled) setRidesError(error.message)
            } finally {
                if (!cancelled) setRidesLoading(false)
            }
        }

        fetchRides()

        return () => {
            cancelled = true
        }
    }, [user?.id])

    function handleRideBooked(ride) {
        if (!ride) return

        setRides(previousRides => [
            ride,
            ...previousRides.filter(item => item.id !== ride.id),
        ])

        setCurrentRidePage(1)
        setToast('Ride requested successfully!')
    }

    return (
        <div className="min-h-screen bg-[#f5f8ff] text-slate-800">
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed right-5 top-20 z-[1000] flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-5 py-4 shadow-xl shadow-slate-900/10"
                >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        ✓
                    </span>
                    <div>
                        <p className="font-semibold text-slate-900">
                            {toast}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Your booking has been saved.
                        </p>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <header className="sticky top-0 z-10 border-b border-blue-100 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                    <a
                        href="/"
                        className="text-xl font-extrabold tracking-tight text-slate-900"
                    >
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
                        Hey, {firstName}!{' '}
                        <span className="text-blue-400">✳</span>
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

                {/* Main Dashboard */}
                <section className="mt-8 grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
                    {/* Left Column: Ride Planner and Map */}
                    <div className="min-w-0 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-lg shadow-slate-900/[0.03] sm:p-8">
                        <div className="mb-7">
                            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                                PLAN A JOURNEY
                            </p>
                            <h2 className="mt-2 text-xl font-bold text-slate-900">
                                Plan your next ride
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Enter your locations and view your route on the map.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="flex gap-4">
                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                                    ●
                                </div>

                                <div className="flex-1">
                                    <label
                                        htmlFor="pickup"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                    >
                                        Pickup location
                                    </label>
                                    <input
                                        id="pickup"
                                        type="text"
                                        value={pickup}
                                        onChange={event => {
                                            setPickup(event.target.value)
                                            setRouteInfo(null)
                                        }}
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
                                    <label
                                        htmlFor="destination"
                                        className="mb-2 block text-sm font-medium text-slate-700"
                                    >
                                        Destination
                                    </label>
                                    <input
                                        id="destination"
                                        type="text"
                                        value={destination}
                                        onChange={event => {
                                            setDestination(event.target.value)
                                            setRouteInfo(null)
                                        }}
                                        placeholder="Where are you heading?"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                    />
                                </div>
                            </div>

                            <LocationPicker
                                pickup={pickup}
                                destination={destination}
                                onCoordinatesChange={({ pickup, destination }) => {
                                    setPickupCoordinates(pickup)
                                    setDestinationCoordinates(destination)
                                }}
                                onRouteInfoChange={setRouteInfo}
                            />
                        </div>
                    </div>

                    {/* Right Column: Account + Ride Options */}
                    <div className="min-w-0 space-y-6">
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
                                    src={
                                        user?.imageUrl ||
                                        'https://placehold.co/96x96/eaf1ff/2563eb?text=User'
                                    }
                                    alt="Profile"
                                    className="h-16 w-16 rounded-2xl border border-blue-100 object-cover"
                                />

                                <div className="min-w-0">
                                    <h3 className="truncate font-bold text-slate-900">
                                        {user?.fullName || firstName}
                                    </h3>
                                    <p className="mt-1 truncate text-sm text-slate-500">
                                        {user?.primaryEmailAddress?.emailAddress ||
                                            'No email available'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-7 space-y-4 border-t border-slate-100 pt-5">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="text-slate-500">Account type</span>
                                    <span className="font-medium text-slate-700">
                                        Personal
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <span className="text-slate-500">Session</span>
                                    <span className="font-medium text-emerald-600">
                                        Active
                                    </span>
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

                        {/* Ride Options */}
                        <RideOptions
                            routeInfo={routeInfo}
                            pickup={pickup}
                            destination={destination}
                            clerkId={user?.id}
                            onRideBooked={handleRideBooked}
                        />
                    </div>
                </section>

                {/* Ride History */}
                <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/[0.03] sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                                YOUR JOURNEYS
                            </p>
                            <h2 className="mt-2 text-2xl font-bold text-slate-900">
                                Ride history
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Keep track of your requested and previous rides.
                            </p>
                        </div>

                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                            {rides.length} {rides.length === 1 ? 'ride' : 'rides'}
                        </span>
                    </div>

                    {ridesLoading ? (
                        <p className="py-10 text-center text-sm text-slate-500">
                            Loading your rides...
                        </p>
                    ) : ridesError ? (
                        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                            {ridesError}
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="ml-2 font-semibold underline"
                            >
                                Retry
                            </button>
                        </div>
                    ) : rides.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                                🚕
                            </div>
                            <h3 className="mt-4 font-bold text-slate-900">
                                No rides yet
                            </h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Your booked rides will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-7 space-y-4">
                            {paginatedRides.map(ride => (
                                <article
                                    key={ride.id}
                                    className="rounded-2xl border border-slate-200 p-4 transition hover:border-blue-200 sm:p-5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                                                {ride.ride_type === 'bike'
                                                    ? '🏍️'
                                                    : ride.ride_type === 'auto'
                                                        ? '🛺'
                                                        : '🚕'}
                                            </div>

                                            <div>
                                                <h3 className="font-bold capitalize text-slate-900">
                                                    {ride.ride_type || 'Ride'}
                                                </h3>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {ride.created_at
                                                        ? new Date(
                                                            ride.created_at
                                                        ).toLocaleString()
                                                        : 'Booking date unavailable'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-900">
                                                ₹{Number(ride.fare || 0).toFixed(0)}
                                            </p>
                                            <span className="mt-1 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold capitalize text-amber-700">
                                                {(ride.status || 'requested').replaceAll(
                                                    '_',
                                                    ' '
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                                        <div className="flex gap-3">
                                            <span className="mt-1 text-sm text-blue-600">
                                                ●
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-400">
                                                    PICKUP
                                                </p>
                                                <p className="break-words text-sm font-medium text-slate-700">
                                                    {ride.pickup_location}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <span className="mt-1 text-sm text-indigo-600">
                                                ◆
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-xs text-slate-400">
                                                    DESTINATION
                                                </p>
                                                <p className="break-words text-sm font-medium text-slate-700">
                                                    {ride.drop_location}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="mt-4 break-all text-xs text-slate-400">
                                        Booking ID: {ride.id}
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}

                    {totalRidePages > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-3 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentRidePage((page) => Math.max(1, page - 1))
                                }
                                disabled={currentRidePage === 1}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>

                            <span className="whitespace-nowrap text-sm font-medium text-slate-600">
                                {currentRidePage} / {totalRidePages}
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentRidePage((page) =>
                                        Math.min(totalRidePages, page + 1)
                                    )
                                }
                                disabled={currentRidePage === totalRidePages}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    )}
                    
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
