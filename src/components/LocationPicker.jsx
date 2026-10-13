
import { useCallback, useEffect, useState } from 'react'
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
    useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'

import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

// Search an address without restricting it to Mohali.
async function geocodeAddress(address) {
    const url = new URL(
        'https://nominatim.openstreetmap.org/search'
    )

    url.search = new URLSearchParams({
        q: address,
        format: 'jsonv2',
        limit: '5',
        countrycodes: 'in',
    }).toString()

    const response = await fetch(url)

    if (!response.ok) {
        throw new Error(
            'Address search is temporarily unavailable. Please select the location on the map.'
        )
    }

    const results = await response.json()

    if (!results.length) {
        throw new Error(
            'Address not found. Select the pickup or destination directly on the map.'
        )
    }

    // Use the first search result; the user can correct it with the map.
    return {
        point: L.latLng(
            Number(results[0].lat),
            Number(results[0].lon)
        ),
        label: results[0].display_name,
    }
}

// Resolve a map point to a readable address when possible.
async function reverseGeocode(point) {
    try {
        const url = new URL(
            'https://nominatim.openstreetmap.org/reverse'
        )

        url.search = new URLSearchParams({
            lat: String(point.lat),
            lon: String(point.lng),
            format: 'jsonv2',
            zoom: '18',
            addressdetails: '1',
        }).toString()

        const response = await fetch(url)

        if (!response.ok) return null

        const result = await response.json()
        return result.display_name || null
    } catch {
        return null
    }
}

function MapClickHandler({ enabled, onLocationSelected }) {
    useMapEvents({
        click(event) {
            if (enabled) {
                onLocationSelected(event.latlng)
            }
        },
    })

    return null
}

function MapFocus({ point }) {
    const map = useMap()

    useEffect(() => {
        if (point) {
            map.flyTo(point, 16, { duration: 0.8 })
        }
    }, [map, point])

    return null
}

function RouteLayer({ routePoints, onRouteFound, onRouteError }) {
    const map = useMap()

    useEffect(() => {
        if (!routePoints) return

        let active = true

        const routingControl = L.Routing.control({
            waypoints: routePoints,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false,
            lineOptions: {
                styles: [
                    {
                        color: '#2563eb',
                        weight: 6,
                        opacity: 0.8,
                    },
                ],
            },
            createMarker: (index, waypoint) =>
                L.marker(waypoint.latLng, {
                    icon: DefaultIcon,
                }).bindPopup(
                    index === 0 ? 'Pickup location' : 'Destination'
                ),
        })

        routingControl.on('routesfound', event => {
            if (!active) return

            const route = event.routes[0]

            if (!route) {
                onRouteError('No road route was found for these locations.')
                return
            }

            onRouteFound({
                distanceKm: route.summary.totalDistance / 1000,
                durationMinutes: route.summary.totalTime / 60,
            })
        })

        routingControl.on('routingerror', () => {
            if (active) {
                onRouteError(
                    'Unable to calculate a road route. Try moving either pin.'
                )
            }
        })

        routingControl.addTo(map)

        return () => {
            active = false
            routingControl.off()

            try {
                map.removeControl(routingControl)
            } catch {
                // The map may already have removed the control.
            }
        }
    }, [map, routePoints, onRouteFound, onRouteError])

    return null
}

export default function LocationPicker({
    pickup,
    destination,
    onPickupChange,
    onDestinationChange,
    onCoordinatesChange,
    onRouteInfoChange,
}) {
    const [pickupPoint, setPickupPoint] = useState(null)
    const [destinationPoint, setDestinationPoint] = useState(null)
    const [routePoints, setRoutePoints] = useState(null)
    const [selectionMode, setSelectionMode] = useState('pickup')
    const [loading, setLoading] = useState(false)
    const [pinLoading, setPinLoading] = useState(false)
    const [error, setError] = useState('')
    const [routeInfo, setRouteInfo] = useState(null)

    const handleRouteFound = useCallback(info => {
        setRouteInfo(info)
        onRouteInfoChange?.(info)
        setError('')
    }, [onRouteInfoChange])

    const handleRouteError = useCallback(message => {
        setRouteInfo(null)
        onRouteInfoChange?.(null)
        setError(message)
    }, [onRouteInfoChange])

    function updateCoordinates(nextPickup, nextDestination) {
        onCoordinatesChange?.({
            pickup: nextPickup
                ? {
                    latitude: nextPickup.lat,
                    longitude: nextPickup.lng,
                }
                : null,
            destination: nextDestination
                ? {
                    latitude: nextDestination.lat,
                    longitude: nextDestination.lng,
                }
                : null,
        })
    }

    async function handleMapClick(point) {
        setPinLoading(true)
        setError('')
        setRouteInfo(null)
        onRouteInfoChange?.(null)
        setRoutePoints(null)

        const label = await reverseGeocode(point)
        const readableAddress =
            label ||
            `Pinned location (${point.lat.toFixed(6)}, ${point.lng.toFixed(6)})`

        if (selectionMode === 'pickup') {
            setPickupPoint(point)
            onPickupChange?.(readableAddress)
            updateCoordinates(point, destinationPoint)
            setSelectionMode('destination')
        } else {
            setDestinationPoint(point)
            onDestinationChange?.(readableAddress)
            updateCoordinates(pickupPoint, point)
        }

        setPinLoading(false)
    }

    async function handleShowRoute() {
        if (!pickup.trim() || !destination.trim()) {
            setError('Enter both addresses or select both points on the map.')
            return
        }

        setLoading(true)
        setError('')
        setRouteInfo(null)
        onRouteInfoChange?.(null)
        setRoutePoints(null)

        try {
            let nextPickup = pickupPoint
            let nextDestination = destinationPoint


            if (!nextPickup || !nextDestination) {
                const pickupResult = nextPickup
                    ? null
                    : await geocodeAddress(pickup.trim())

                nextPickup = nextPickup || pickupResult.point

                if (!nextDestination) {
                    await new Promise(resolve => setTimeout(resolve, 1100))

                    const destinationResult = await geocodeAddress(
                        destination.trim()
                    )

                    nextDestination = destinationResult.point
                }

                setPickupPoint(nextPickup)
                setDestinationPoint(nextDestination)

                updateCoordinates(nextPickup, nextDestination)
            }


            if (nextPickup.distanceTo(nextDestination) < 10) {
                throw new Error(
                    'Pickup and destination must be at different locations.'
                )
            }

            setRoutePoints([nextPickup, nextDestination])
        } catch (err) {
            setError(
                err.message ||
                'Could not locate these addresses. Select both points on the map.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mt-6 space-y-5">
            <div>
                <h3 className="font-semibold text-slate-800">
                    Your route
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                    Search addresses or select your pickup and destination on the map.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    onClick={() => setSelectionMode('pickup')}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold ${selectionMode === 'pickup'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                >
                    1. Select pickup
                </button>

                <button
                    type="button"
                    onClick={() => setSelectionMode('destination')}
                    className={`rounded-xl border px-4 py-3 text-sm font-semibold ${selectionMode === 'destination'
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                >
                    2. Select destination
                </button>
            </div>

            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                Map mode: {selectionMode === 'pickup' ? 'Pickup' : 'Destination'}.
                Click the map to place the selected pin.
            </p>

            {pinLoading && (
                <p className="text-sm text-slate-500">
                    Looking up the selected map point...
                </p>
            )}

            <button
                type="button"
                onClick={handleShowRoute}
                disabled={loading || pinLoading}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
                {loading ? 'Locating addresses...' : 'Show route'}
            </button>

            {error && (
                <div
                    role="alert"
                    className="break-words rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
                >
                    <p>{error}</p>
                    <p className="mt-1">
                        You can select the location directly on the map instead.
                    </p>
                </div>
            )}

            {routeInfo && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-medium text-blue-600">
                                TOTAL DISTANCE
                            </p>
                            <p className="mt-1 text-xl font-bold text-slate-900">
                                {routeInfo.distanceKm.toFixed(1)} km
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-blue-600">
                                ROUTE ETA
                            </p>
                            <p className="mt-1 text-xl font-bold text-slate-900">
                                {Math.round(routeInfo.durationMinutes)} min
                            </p>
                        </div>
                    </div>

                    <p className="mt-3 text-xs leading-5 text-slate-500">
                        Estimates depend on the routing provider and do not include live traffic.
                    </p>
                </div>
            )}

            <MapContainer
                center={[31.326, 75.576]}
                zoom={8}
                style={{
                    height: '380px',
                    width: '100%',
                    borderRadius: '16px',
                }}
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler
                    enabled={!loading && !pinLoading}
                    onLocationSelected={handleMapClick}
                />

                <MapFocus
                    point={
                        selectionMode === 'pickup'
                            ? pickupPoint
                            : destinationPoint
                    }
                />

                {pickupPoint && (
                    <Marker position={pickupPoint}>
                        <Popup>Selected pickup location</Popup>
                    </Marker>
                )}

                {destinationPoint && (
                    <Marker position={destinationPoint}>
                        <Popup>Selected destination</Popup>
                    </Marker>
                )}

                {routePoints && (
                    <RouteLayer
                        routePoints={routePoints}
                        onRouteFound={handleRouteFound}
                        onRouteError={handleRouteError}
                    />
                )}
            </MapContainer>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-semibold text-slate-800">
                    Other ways to travel
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                    Walking and public transport directions are not integrated.
                    The current routing provider supplies road-route estimates.
                </p>
            </div>
        </div>
    )
}
