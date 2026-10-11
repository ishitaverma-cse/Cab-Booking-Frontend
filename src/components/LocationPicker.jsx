import { useCallback, useEffect, useState } from 'react'
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap,
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

async function geocodeAddress(address) {
    const queries = [
        `${address}, Mohali, Punjab, India`,
        `${address}, Sahibzada Ajit Singh Nagar, Punjab, India`,
        `${address.split(',')[0]}, Mohali, Punjab, India`,
    ]

    for (const query of [...new Set(queries)]) {
        const url = new URL(
            'https://nominatim.openstreetmap.org/search'
        )

        url.search = new URLSearchParams({
            q: query,
            format: 'jsonv2',
            limit: '1',
            countrycodes: 'in',
        }).toString()

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(
                'Address search is temporarily unavailable. Please try again.'
            )
        }

        const results = await response.json()

        if (results.length > 0) {
            return L.latLng(
                Number(results[0].lat),
                Number(results[0].lon)
            )
        }

        // Respect the public geocoding service's usage policy.
        await new Promise(resolve => setTimeout(resolve, 1100))
    }

    throw new Error(
        `Could not find "${address}". Try a nearby landmark or a shorter address in Mohali, Punjab.`
    )
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
                onRouteError('No route was found for these locations.')
                return
            }

            onRouteFound({
                distanceKm: route.summary.totalDistance / 1000,
                durationMinutes: route.summary.totalTime / 60,
            })
        })

        routingControl.on('routingerror', () => {
            if (!active) return

            onRouteError(
                'Unable to calculate the route. Please try again.'
            )
        })

        routingControl.addTo(map)

        return () => {
            active = false
            routingControl.off()

            try {
                if (map.hasLayer(routingControl)) {
                    map.removeControl(routingControl)
                }
            } catch (error) {
                // Avoid cleanup errors if Leaflet has already removed the control.
                console.debug('Routing control cleanup:', error)
            }
        }
    }, [map, routePoints, onRouteFound, onRouteError])

    return null
}

export default function LocationPicker({
    pickup,
    destination,
    onCoordinatesChange,
    onRouteInfoChange,
}) {
    const [routePoints, setRoutePoints] = useState(null)
    const [loading, setLoading] = useState(false)
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

    async function handleShowRoute() {
        if (!pickup.trim() || !destination.trim()) {
            setError('Please enter both pickup and destination addresses.')
            return
        }

        if (
            pickup.trim().toLowerCase() ===
            destination.trim().toLowerCase()
        ) {
            setError('Pickup and destination must be different.')
            return
        }

        setLoading(true)
        setError('')
        setRouteInfo(null)
        onRouteInfoChange?.(null)
        setRoutePoints(null)

        try {
            const pickupPoint = await geocodeAddress(pickup.trim())

            // Space out requests to the public geocoding service.
            await new Promise(resolve => setTimeout(resolve, 1100))

            const destinationPoint = await geocodeAddress(
                destination.trim()
            )

            setRoutePoints([pickupPoint, destinationPoint])

            onCoordinatesChange?.({
                pickup: {
                    latitude: pickupPoint.lat,
                    longitude: pickupPoint.lng,
                },
                destination: {
                    latitude: destinationPoint.lat,
                    longitude: destinationPoint.lng,
                },
            })
        } catch (err) {
            setError(
                err.message || 'Could not locate the entered addresses.'
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
                    Find your route and compare available ride options.
                </p>
            </div>

            <button
                type="button"
                onClick={handleShowRoute}
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
                {loading ? 'Locating addresses...' : 'Show route'}
            </button>

            {error && (
                <p
                    role="alert"
                    className="break-words rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
                >
                    {error}
                </p>
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
                        Route estimates are based on the routing provider
                        and do not include live traffic.
                    </p>
                </div>
            )}

            <MapContainer
                center={[30.7046, 76.7179]}
                zoom={12}
                style={{
                    height: '350px',
                    width: '100%',
                    borderRadius: '16px',
                }}
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {routePoints && (
                    <>
                        <Marker position={routePoints[0]}>
                            <Popup>Pickup location</Popup>
                        </Marker>

                        <Marker position={routePoints[1]}>
                            <Popup>Destination</Popup>
                        </Marker>

                        <RouteLayer
                            routePoints={routePoints}
                            onRouteFound={handleRouteFound}
                            onRouteError={handleRouteError}
                        />
                    </>
                )}
            </MapContainer>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="font-semibold text-slate-800">
                    Other ways to travel
                </h4>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                    Walking and public transport directions are not yet
                    integrated. The current routing provider supplies
                    the road route used for vehicle estimates.
                </p>
            </div>
        </div>
    )
}
