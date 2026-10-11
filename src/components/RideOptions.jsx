
import { useState } from 'react'

const API_URL = (
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '')

const VEHICLES = [
    {
        id: 'bike',
        name: 'Bike',
        description: 'Affordable solo travel',
        icon: '🏍️',
        baseFare: 20,
        perKm: 8,
        minimumFare: 30,
        speedFactor: 0.85,
    },
    {
        id: 'auto',
        name: 'Auto',
        description: 'Convenient city travel',
        icon: '🛺',
        baseFare: 30,
        perKm: 13,
        minimumFare: 40,
        speedFactor: 1,
    },
    {
        id: 'cab',
        name: 'Cab',
        description: 'Comfortable private ride',
        icon: '🚕',
        baseFare: 50,
        perKm: 18,
        minimumFare: 70,
        speedFactor: 1.05,
    },
]

function estimateFare(vehicle, distanceKm) {
    return Math.ceil(
        Math.max(
            vehicle.minimumFare,
            vehicle.baseFare + distanceKm * vehicle.perKm
        )
    )
}

function estimateDuration(vehicle, durationMinutes) {
    return Math.max(1, Math.round(durationMinutes * vehicle.speedFactor))
}

export default function RideOptions({
    routeInfo,
    pickup,
    destination,
    clerkId,
    onRideBooked,
}) {
    const [selectedVehicle, setSelectedVehicle] = useState('bike')
    const [booking, setBooking] = useState(false)
    const [error, setError] = useState('')

    const vehicle = VEHICLES.find(item => item.id === selectedVehicle)

    async function handleBookRide() {
        if (!clerkId) {
            setError('Please sign in before booking a ride.')
            return
        }

        if (!routeInfo || !pickup.trim() || !destination.trim()) {
            setError('Please calculate your route before booking.')
            return
        }

        if (!vehicle) {
            setError('Please select a valid vehicle.')
            return
        }

        setBooking(true)
        setError('')

        try {
            const response = await fetch(`${API_URL}/rides`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clerk_id: clerkId,
                    pickup_location: pickup.trim(),
                    drop_location: destination.trim(),
                    ride_type: vehicle.id,
                    fare: estimateFare(vehicle, routeInfo.distanceKm),
                }),
            })

            const contentType = response.headers.get('content-type') || ''

            if (!contentType.includes('application/json')) {
                throw new Error(
                    `Booking failed (HTTP ${response.status}). Please try again.`
                )
            }

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Could not book your ride.')
            }

            onRideBooked?.(result.data)
        } catch (err) {
            setError(
                err.message || 'Unable to connect to the server. Please try again.'
            )
        } finally {
            setBooking(false)
        }
    }

    return (
        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Choose your ride
            </p>

            <h3 className="mt-2 text-xl font-bold text-slate-900">
                Find a ride that suits you
            </h3>

            <p className="mt-1 text-sm text-slate-500">
                {routeInfo
                    ? 'Select a vehicle to see its estimated fare.'
                    : 'Calculate your route on the map to compare ride options.'}
            </p>

            {!routeInfo ? (
                <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-5 text-center">
                    <span className="text-3xl">🚘</span>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                        Your ride options will appear here
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                        Enter your pickup and destination, then select Show route.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mt-5 space-y-3">
                        {VEHICLES.map(item => {
                            const selected = selectedVehicle === item.id

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedVehicle(item.id)
                                        setError('')
                                    }}
                                    aria-pressed={selected}
                                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                                        selected
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10'
                                            : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                                        {item.icon}
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block font-bold text-slate-900">
                                            {item.name}
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500">
                                            {item.description}
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500">
                                            Approx. {estimateDuration(
                                                item,
                                                routeInfo.durationMinutes
                                            )} min
                                        </span>
                                    </span>

                                    <span className="shrink-0 text-right">
                                        <span className="block text-lg font-bold text-slate-900">
                                            ₹{estimateFare(item, routeInfo.distanceKm)}
                                        </span>
                                        <span className={`block text-xs font-semibold ${
                                            selected ? 'text-blue-700' : 'text-slate-400'
                                        }`}>
                                            {selected ? 'Selected ✓' : 'Select'}
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                        Fares and ETAs are illustrative estimates. Actual prices,
                        availability and journey times may differ.
                    </div>

                    {error && (
                        <p role="alert" className="mt-4 break-words rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleBookRide}
                        disabled={booking || !clerkId}
                        className="mt-4 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {booking
                            ? 'Requesting your ride...'
                            : `Book ${vehicle?.name || 'Ride'} · ₹${
                                vehicle
                                    ? estimateFare(vehicle, routeInfo.distanceKm)
                                    : 0
                            }`}
                    </button>

                    {!clerkId && (
                        <p className="mt-2 text-xs text-amber-700">
                            Please sign in again to book a ride.
                        </p>
                    )}
                </>
            )}
        </section>
    )
}
