import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

const API_URL = (
    import.meta.env.VITE_API_URL || 'https://cab-booking-backend-exx6.onrender.com/api'
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
    const { getToken } = useAuth()

    const [selectedVehicle, setSelectedVehicle] = useState('bike')
    const [booking, setBooking] = useState(false)
    const [error, setError] = useState('')

    const vehicle = VEHICLES.find(item => item.id === selectedVehicle)


    async function handleBookRide(selectedItem = vehicle) {
        if (!clerkId) {
            setError('Please sign in before booking a ride.')
            return
        }

        if (!routeInfo || !pickup.trim() || !destination.trim()) {
            setError('Please calculate your route before booking.')
            return
        }

        if (!selectedItem) {
            setError('Please select a valid vehicle.')
            return
        }

        if (booking) return

        setBooking(true)
        setError('')

        try {
            const token = await getToken()

            if (!token) {
                throw new Error('Your session has expired. Please sign in again.')
            }

            const response = await fetch(`${API_URL}/rides`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    pickup_location: pickup.trim(),
                    drop_location: destination.trim(),
                    ride_type: selectedItem.id,
                    fare: estimateFare(selectedItem, routeInfo.distanceKm),
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
        <section className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm sm:p-6.5">
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
                <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-5 text-center">
                    <span className="text-3xl">🚘</span>
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                        Your ride options will appear here
                    </p>
                </div>
            ) : (
                <>


                    {/* Compact vehicle tiles */}
                    <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                        {VEHICLES.map(item => {
                            const selected = selectedVehicle === item.id

                            return (
                                <div
                                    key={item.id}
                                    role="button"
                                    tabIndex={booking || !clerkId ? -1 : 0}
                                    aria-pressed={selected}
                                    onClick={() => {
                                        if (booking || !clerkId) return

                                        setSelectedVehicle(item.id)
                                        setError('')
                                    }}
                                    onKeyDown={event => {
                                        if (
                                            (event.key === 'Enter' || event.key === ' ') &&
                                            !booking &&
                                            clerkId
                                        ) {
                                            event.preventDefault()
                                            setSelectedVehicle(item.id)
                                            setError('')
                                        }
                                    }}
                                    className={`flex min-w-0 cursor-pointer flex-col items-center justify-center rounded-2xl border px-1.5 py-3 text-center transition duration-200 sm:px-2 sm:py-4 ${selected
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/10 shadow-sm'
                                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'
                                        } ${booking || !clerkId
                                            ? 'cursor-not-allowed opacity-70'
                                            : ''
                                        }`}
                                >
                                    <span
                                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-3xl ${selected ? 'bg-white shadow-sm' : 'bg-slate-50'
                                            }`}
                                    >
                                        {item.icon}
                                    </span>

                                    <span className="mt-2 block text-sm font-bold text-slate-900">
                                        {item.name}
                                    </span>

                                    <span className="mt-1 text-base font-bold text-slate-900 sm:text-lg">
                                        ₹{estimateFare(item, routeInfo.distanceKm)}
                                    </span>

                                    <span className="mt-1 text-[10px] font-medium leading-4 text-slate-500 sm:text-xs">
                                        {estimateDuration(
                                            item,
                                            routeInfo.durationMinutes
                                        )} min
                                    </span>

                                    {selected && (
                                        <button
                                            type="button"
                                            disabled={booking || !clerkId}
                                            onClick={event => {
                                                event.stopPropagation()
                                                handleBookRide(item)
                                            }}
                                            className="mt-3 w-full rounded-lg bg-blue-600 px-1 py-2 text-[10px] font-bold leading-tight text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                                        >
                                            {booking ? 'Booking...' : `Book ${item.name}`}
                                        </button>
                                    )}

                                    {!selected && (
                                        <span className="mt-3 rounded-full px-2 py-2 text-[10px] font-semibold text-slate-400 sm:text-xs">
                                            Tap to select
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>



                    {/* Fare disclaimer */}
                    <p className="mt-3 text-[11px] leading-4 text-slate-500">
                        Fares and ETAs are illustrative estimates. Actual prices,
                        availability and journey times may differ.
                    </p>

                    {error && (
                        <p
                            role="alert"
                            className="mt-3 break-words rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
                        >
                            {error}
                        </p>
                    )}

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
