import { useEffect, useState, useRef } from 'react'
import { UserButton, useUser, useAuth } from '@clerk/clerk-react'
import ProfileEditor from './ProfileEditor'
import LocationPicker from '../components/LocationPicker'
import RideOptions from '../components/RideOptions'
import RazorpayCheckout from '../components/RazorpayCheckout'


async function searchAddresses(query, signal) {
    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 3) return []

    const url = new URL('https://photon.komoot.io/api/')

    url.search = new URLSearchParams({
        q: trimmedQuery,
        limit: '10',
        lang: 'en',

        // Bias results toward the Mohali / Chandigarh area.
        lat: '30.7046',
        lon: '76.7179',
        zoom: '12',
        location_bias_scale: '1',
    }).toString()

    const response = await fetch(url.toString(), { signal })

    if (!response.ok) {
        throw new Error('Address search is temporarily unavailable.')
    }

    const result = await response.json()

    const normalizedQuery = trimmedQuery.toLowerCase()

    const queryWords = normalizedQuery
        .replace(/[.,]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1)

    const addresses = (result.features || [])
        .map(feature => {
            const properties = feature.properties || {}
            const coordinates = feature.geometry?.coordinates

            if (
                !Array.isArray(coordinates) ||
                coordinates.length < 2
            ) {
                return null
            }

            const [longitude, latitude] = coordinates

            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {
                return null
            }

            const street = [
                properties.housenumber,
                properties.street,
            ]
                .filter(Boolean)
                .join(' ')

            const label = [
                properties.name,
                street,
                properties.locality,
                properties.suburb,
                properties.city ||
                properties.town ||
                properties.village,
                properties.postcode,
                properties.state,
            ]
                .filter(Boolean)
                .filter(
                    (value, index, values) => values.indexOf(value) === index
                )
                .join(', ')

            const searchableText = [
                label,
                properties.postcode,
                properties.county,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()

            const matchedWords = queryWords.filter(word =>
                searchableText.includes(word)
            ).length

            const score =
                queryWords.length > 0
                    ? matchedWords / queryWords.length
                    : 0

            return {
                label,
                latitude,
                longitude,
                score,
            }
        })
        .filter(address => address?.label)
        .sort((a, b) => b.score - a.score)

    return addresses.map(({ label, latitude, longitude }) => ({
        label,
        latitude,
        longitude,
    }))
}

function UserDashboard() {
    const { user } = useUser()
    const { getToken } = useAuth()

    const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false)
    const firstName = user?.firstName || 'there'

    const [pickup, setPickup] = useState('')
    const [destination, setDestination] = useState('')
    const [pickupCoordinates, setPickupCoordinates] = useState(null)
    const [destinationCoordinates, setDestinationCoordinates] = useState(null)
    const [routeInfo, setRouteInfo] = useState(null)

    const [pickupSuggestions, setPickupSuggestions] = useState([])
    const [destinationSuggestions, setDestinationSuggestions] = useState([])
    const [activeLocationField, setActiveLocationField] = useState('')

    const API_URL = (
        import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    ).replace(/\/+$/, '')

    const [rides, setRides] = useState([])
    const [ridesLoading, setRidesLoading] = useState(true)
    const [ridesError, setRidesError] = useState('')
    const [isRideStreamConnected, setIsRideStreamConnected] = useState(false)
    const [currentRidePage, setCurrentRidePage] = useState(1)
    const RIDES_PER_PAGE = 4

    const totalRidePages = Math.ceil(rides.length / RIDES_PER_PAGE)

    const startIndex = (currentRidePage - 1) * RIDES_PER_PAGE

    const paginatedRides = rides.slice(
        startIndex,
        startIndex + RIDES_PER_PAGE
    )
    const [paymentStatuses, setPaymentStatuses] = useState({})
    const [sendingReceiptId, setSendingReceiptId] = useState(null)

    const [reviewedRideIds, setReviewedRideIds] = useState([])
    const [reviewingRideId, setReviewingRideId] = useState(null)
    const [reviewRatings, setReviewRatings] = useState({})
    const [reviewTexts, setReviewTexts] = useState({})
    const [submittingReviewId, setSubmittingReviewId] = useState(null)
    const [activeReviewRideId, setActiveReviewRideId] = useState(null)

    const [toast, setToast] = useState('')
    const [isClearNotificationsModalOpen, setIsClearNotificationsModalOpen] = useState(false)

    const [notifications, setNotifications] = useState([])
    const [isNotificationOpen, setIsNotificationOpen] = useState(false)

    const unreadCount = notifications.filter(
        notification => !notification.read
    ).length

    const notificationPanelRef = useRef(null)

    useEffect(() => {
        function handleOutsideClick(event) {
            if (
                notificationPanelRef.current &&
                !notificationPanelRef.current.contains(event.target)
            ) {
                setIsNotificationOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
        }
    }, [])


    useEffect(() => {
        if (!activeLocationField) {
            setPickupSuggestions([])
            setDestinationSuggestions([])
            return
        }

        const query =
            activeLocationField === 'pickup' ? pickup : destination

        if (query.trim().length < 3) {
            if (activeLocationField === 'pickup') {
                setPickupSuggestions([])
            } else {
                setDestinationSuggestions([])
            }

            return
        }

        const controller = new AbortController()

        const timer = setTimeout(async () => {
            try {
                const results = await searchAddresses(
                    query,
                    controller.signal
                )

                if (activeLocationField === 'pickup') {
                    setPickupSuggestions(results)
                } else {
                    setDestinationSuggestions(results)
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    if (activeLocationField === 'pickup') {
                        setPickupSuggestions([])
                    } else {
                        setDestinationSuggestions([])
                    }
                }
            }
        }, 350)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [pickup, destination, activeLocationField])

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
        let isFirstFetch = true
        let isFetching = false
        let knownStatuses = {}

        async function fetchRides() {
            if (isFetching || cancelled) return

            isFetching = true

            if (isFirstFetch) {
                setRidesLoading(true)
            }

            try {
                const token = await getToken()

                const response = await fetch(
                    `${API_URL}/rides?clerk_id=${encodeURIComponent(user.id)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
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

                if (cancelled) return

                const latestRides = result.data || []

                // Notify only when a previously loaded ride changes status.
                if (!isFirstFetch) {
                    const changedRide = latestRides.find(
                        ride =>
                            knownStatuses[ride.id] !== undefined &&
                            knownStatuses[ride.id] !== ride.status
                    )

                    if (changedRide) {
                        setToast(
                            `Ride status updated: ${(
                                changedRide.status || 'unknown'
                            ).replaceAll('_', ' ')}`
                        )
                    }
                }

                // Save the latest status of every ride.
                knownStatuses = Object.fromEntries(
                    latestRides.map(ride => [ride.id, ride.status])
                )

                setRides(latestRides)
                setRidesError('')

                if (isFirstFetch) {
                    setCurrentRidePage(1)
                }

                isFirstFetch = false
            } catch (error) {
                if (!cancelled) {
                    setRidesError(error.message)
                }
            } finally {
                isFetching = false

                if (!cancelled) {
                    setRidesLoading(false)
                }
            }
        }

        fetchRides()

        // Check for ride-status changes every 30 seconds.
        const interval = setInterval(
            fetchRides,
            isRideStreamConnected ? 60000 : 30000
        )

        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [user?.id, isRideStreamConnected])

    function handleRideBooked(ride) {
        if (!ride) return

        setRides(previousRides => [
            ride,
            ...previousRides.filter(item => item.id !== ride.id),
        ])

        setCurrentRidePage(1)
        setToast('Ride requested successfully!')
    }

    const handlePaymentSuccess = (rideId, payment) => {
        setPaymentStatuses(previous => ({
            ...previous,
            [rideId]: payment.payment_status,
        }))

        setToast('Payment successful! Your ride payment is confirmed.')
    }


    async function handleEmailReceipt(rideId) {
        setSendingReceiptId(rideId)

        try {
            const token = await getToken()

            const response = await fetch(
                `${API_URL}/rides/${encodeURIComponent(rideId)}/receipt`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || 'Unable to email your ride receipt.'
                )
            }

            setToast('Ride receipt emailed successfully!')
        } catch (error) {
            console.error('Email receipt error:', error)
            setToast(error.message || 'Unable to email your ride receipt.')
        } finally {
            setSendingReceiptId(null)
        }
    }


    const handleSubmitReview = async (rideId) => {
        const rating = reviewRatings[rideId]

        if (!rating) {
            setToast('Please select a star rating first.')
            return
        }

        try {
            setSubmittingReviewId(rideId)

            const token = await getToken()

            const response = await fetch(
                `${API_URL}/rides/${encodeURIComponent(rideId)}/review`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        rating,
                        review_text: reviewTexts[rideId] || '',
                    }),
                }
            )

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Unable to submit review.')
            }

            setReviewedRideIds((previous) => [...previous, rideId])
            setToast('Thank you! Your review has been submitted.')
        } catch (error) {
            console.error('Submit review error:', error)
            setToast(error.message || 'Unable to submit your review.')
        } finally {
            setSubmittingReviewId(null)
        }
    }


    function handleSelectLocation(field, suggestion) {
        const coordinates = {
            lat: suggestion.latitude,
            lng: suggestion.longitude,
        }

        if (field === 'pickup') {
            setPickup(suggestion.label)
            setPickupCoordinates(coordinates)
        } else {
            setDestination(suggestion.label)
            setDestinationCoordinates(coordinates)
        }

        setActiveLocationField('')
        setPickupSuggestions([])
        setDestinationSuggestions([])
        setRouteInfo(null)
    }


    useEffect(() => {
        if (!user?.id) return

        const controller = new AbortController()

        async function connectToRideStream() {
            try {
                const token = await getToken()

                if (!token) {
                    console.error('Ride stream: Clerk token unavailable.')
                    return
                }

                const response = await fetch(`${API_URL}/rides/stream`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'text/event-stream',
                    },
                    signal: controller.signal,
                })

                if (!response.ok || !response.body) {
                    throw new Error(
                        `Ride stream failed (HTTP ${response.status}).`
                    )
                }

                console.log('Ride stream: connected to the response.')
                setIsRideStreamConnected(true)

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (true) {
                    const { value, done } = await reader.read()

                    if (done) break

                    buffer += decoder.decode(value, { stream: true })

                    const events = buffer.split('\n\n')
                    buffer = events.pop() || ''

                    for (const eventText of events) {
                        const eventName = eventText
                            .split('\n')
                            .find(line => line.startsWith('event:'))
                            ?.slice(6)
                            .trim()

                        const dataLine = eventText
                            .split('\n')
                            .find(line => line.startsWith('data:'))


                        if (eventName === 'ride_status' && dataLine) {
                            const ride = JSON.parse(dataLine.slice(5).trim())

                            setRides(previousRides => {
                                const rideExists = previousRides.some(
                                    item => item.id === ride.id
                                )

                                if (!rideExists) {
                                    return [ride, ...previousRides]
                                }

                                return previousRides.map(item =>
                                    item.id === ride.id
                                        ? { ...item, ...ride }
                                        : item
                                )
                            })

                            const status = (ride.status || 'unknown').replaceAll('_', ' ')


                            const notificationToken = await getToken()

                            const notificationResponse = await fetch(
                                `${API_URL}/notifications`,
                                {
                                    headers: {
                                        Authorization: `Bearer ${notificationToken}`,
                                    },
                                }
                            )

                            if (notificationResponse.ok) {
                                const notificationResult = await notificationResponse.json()

                                if (notificationResult.success) {
                                    setNotifications(
                                        (notificationResult.data || []).map(notification => ({
                                            id: notification.id,
                                            rideId: notification.ride_id,
                                            message: notification.message,
                                            status: notification.status,
                                            createdAt: notification.created_at,
                                            read: notification.is_read,
                                        }))
                                    )
                                }
                            }
                            setToast(`Ride status updated: ${status}`)

                        }

                        if (eventName === 'stream_error') {
                            console.error('Ride stream reported an error:', dataLine)
                        }
                    }
                }

                setIsRideStreamConnected(false)
            } catch (error) {
                setIsRideStreamConnected(false)

                if (error.name !== 'AbortError') {
                    console.error('Ride stream error:', error)
                }
            }
        }

        connectToRideStream()

        return () => controller.abort()
    }, [user?.id, getToken])


    useEffect(() => {
        if (!user?.id) return

        let cancelled = false

        async function loadNotifications() {
            try {
                const token = await getToken()

                const response = await fetch(`${API_URL}/notifications`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                const result = await response.json()

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || 'Unable to load notifications.'
                    )
                }

                if (!cancelled) {
                    setNotifications(
                        (result.data || []).map(notification => ({
                            id: notification.id,
                            rideId: notification.ride_id,
                            message: notification.message,
                            status: notification.status,
                            createdAt: notification.created_at,
                            read: notification.is_read,
                        }))
                    )
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Load notifications error:', error)
                }
            }
        }

        loadNotifications()

        return () => {
            cancelled = true
        }
    }, [user?.id, getToken])


    useEffect(() => {
        let cancelled = false

        const fetchPaymentStatuses = async () => {
            if (!user?.id) return

            try {
                const token = await getToken()

                const response = await fetch(`${API_URL}/payments`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                const result = await response.json()

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || 'Unable to fetch payment statuses.'
                    )
                }

                if (cancelled) return

                const statuses = {}

                for (const payment of result.data || []) {
                    if (payment.payment_status === 'paid') {
                        statuses[payment.ride_id] = 'paid'
                    } else if (!statuses[payment.ride_id]) {
                        statuses[payment.ride_id] =
                            payment.payment_status || 'pending'
                    }
                }

                setPaymentStatuses(statuses)
            } catch (error) {
                if (!cancelled) {
                    console.error('Payment status fetch error:', error.message)
                }
            }
        }

        fetchPaymentStatuses()

        return () => {
            cancelled = true
        }
    }, [user?.id, getToken])


    async function markNotificationAsRead(notificationId) {
        try {
            const token = await getToken()

            const response = await fetch(
                `${API_URL}/notifications/${notificationId}/read`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Unable to mark as read.')
            }

            setNotifications(previous =>
                previous.map(notification =>
                    notification.id === notificationId
                        ? { ...notification, read: true }
                        : notification
                )
            )
        } catch (error) {
            console.error('Mark notification as read error:', error)
            setToast('Could not update notification. Please try again.')
        }
    }

    async function markAllNotificationsAsRead() {
        const unreadNotifications = notifications.filter(
            notification => !notification.read
        )

        try {
            await Promise.all(
                unreadNotifications.map(async notification => {
                    const token = await getToken()

                    const response = await fetch(
                        `${API_URL}/notifications/${notification.id}/read`,
                        {
                            method: 'PATCH',
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                        }
                    )

                    const result = await response.json()

                    if (!response.ok || !result.success) {
                        throw new Error('Unable to mark all notifications as read.')
                    }
                })
            )

            setNotifications(previous =>
                previous.map(notification => ({
                    ...notification,
                    read: true,
                }))
            )
        } catch (error) {
            console.error('Mark all notifications as read error:', error)
            setToast('Some notifications could not be updated.')
        }
    }

    async function deleteNotification(notificationId) {
        try {
            const token = await getToken()

            const response = await fetch(
                `${API_URL}/notifications/${notificationId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Unable to delete notification.')
            }

            setNotifications(previous =>
                previous.filter(notification => notification.id !== notificationId)
            )
        } catch (error) {
            console.error('Delete notification error:', error)
            setToast('Could not delete notification. Please try again.')
        }
    }

    async function clearAllNotifications() {
        try {
            const token = await getToken()

            const response = await fetch(`${API_URL}/notifications`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const result = await response.json()

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || 'Unable to clear notifications.'
                )
            }

            setNotifications([])
            setToast('All notifications cleared successfully.')
        } catch (error) {
            console.error('Clear notifications error:', error)
            setToast('Could not clear notifications. Please try again.')
        }
    }


    useEffect(() => {
        let cancelled = false

        const fetchMyReviews = async () => {
            try {
                const token = await getToken()

                const response = await fetch(`${API_URL}/rides/reviews/mine`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                const result = await response.json()

                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Failed to fetch reviews.')
                }

                if (!cancelled) {
                    setReviewedRideIds(
                        (result.data || []).map((review) => review.ride_id)
                    )

                    setReviewRatings(
                        Object.fromEntries(
                            (result.data || []).map((review) => [
                                review.ride_id,
                                review.rating,
                            ])
                        )
                    )

                    setReviewTexts(
                        Object.fromEntries(
                            (result.data || []).map((review) => [
                                review.ride_id,
                                review.review_text || '',
                            ])
                        )
                    )
                }
            } catch (error) {
                if (!cancelled) {
                    console.error('Fetch reviews error:', error)
                }
            }
        }

        if (user && getToken) {
            fetchMyReviews()
        }

        return () => {
            cancelled = true
        }
    }, [user?.id, getToken])



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
            <header className="sticky top-0 z-[1000] border-b border-blue-100 bg-white/90 backdrop-blur-xl">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
                    <a
                        href="#home"
                        onClick={() => setIsNotificationOpen(false)}
                        className="text-xl font-extrabold tracking-tight text-slate-900"
                    >
                        RideFlow<span className="text-blue-600">.</span>
                    </a>

                    <div className="flex items-center gap-4">

                        {/* Dashboard Navigation */}
                        <nav
                            aria-label="Dashboard navigation"
                            className="hidden items-center gap-1 md:flex"
                        >
                            <a
                                href="#plan-route"
                                onClick={() => setIsNotificationOpen(false)}
                                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                            >
                                Book Ride
                            </a>

                            <a
                                href="#my-rides"
                                onClick={() => setIsNotificationOpen(false)}
                                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                            >
                                My Rides
                            </a>
                        </nav>


                        {/* Notifications */}
                        <div className="relative" ref={notificationPanelRef}>
                            <button
                                type="button"
                                onClick={() => setIsNotificationOpen(previous => !previous)}
                                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    className="h-5 w-5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                                    />
                                </svg>

                                {unreadCount > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {isNotificationOpen && (
                                <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96">
                                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                                        <div>
                                            <h3 className="font-bold text-slate-900">
                                                Notifications
                                            </h3>
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                {unreadCount} unread
                                            </p>
                                        </div>

                                        {unreadCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={markAllNotificationsAsRead}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                            >
                                                Mark all as read
                                            </button>
                                        )}
                                    </div>

                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="px-5 py-10 text-center">
                                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                        className="h-6 w-6"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
                                                        />
                                                    </svg>
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700">
                                                    You're all caught up!
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Ride updates will appear here.
                                                </p>
                                            </div>
                                        ) : (
                                            notifications.map(notification => (
                                                <div
                                                    key={notification.id}
                                                    className={`flex gap-3 border-b border-slate-100 px-4 py-4 transition hover:bg-blue-50/60 ${notification.read ? 'bg-white' : 'bg-blue-50/50'
                                                        }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => markNotificationAsRead(notification.id)}
                                                        className="flex min-w-0 flex-1 gap-3 text-left"
                                                        aria-label={`Mark notification as read: ${notification.message}`}
                                                    >
                                                        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="1.8"
                                                                className="h-4 w-4"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M5 12h14M13 6l6 6-6 6"
                                                                />
                                                            </svg>
                                                        </span>

                                                        <span className="min-w-0 flex-1">
                                                            <span className="block text-sm font-medium text-slate-800">
                                                                {notification.message}
                                                            </span>

                                                            <span className="mt-1 block text-xs text-slate-400">
                                                                {new Date(notification.createdAt).toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                })}
                                                            </span>
                                                        </span>

                                                        {!notification.read && (
                                                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                                        )}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => deleteNotification(notification.id)}
                                                        aria-label="Delete notification"
                                                        title="Delete notification"
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="1.8"
                                                            className="h-4 w-4"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>


                                    {notifications.length > 0 && (
                                        <div className="border-t border-slate-100 px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsClearNotificationsModalOpen(true)}
                                                className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                            >
                                                Clear all notifications
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <UserButton>
                            <UserButton.MenuItems>
                                <UserButton.Action
                                    label="Edit profile"
                                    labelIcon={<span>✏️</span>}
                                    onClick={() => setIsProfileEditorOpen(true)}
                                />
                            </UserButton.MenuItems>
                        </UserButton>
                    </div>
                </div>
            </header>

            {isProfileEditorOpen && (
                <ProfileEditor
                    onClose={() => setIsProfileEditorOpen(false)}
                />
            )}

            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
                {/* Welcome */}
                <section id='home' className="mb-8">
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
                <section className="relative isolate overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-[#edf4ff] to-[#e2edff] p-6 shadow-xl shadow-blue-900/[0.04] sm:p-9 lg:p-10">
                    {/* Decorative background elements */}
                    <div className="pointer-events-none absolute -right-16 -top-24 -z-10 h-80 w-80 rounded-full border-[55px] border-blue-500/[0.06]" />
                    <div className="pointer-events-none absolute -bottom-28 right-24 -z-10 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />

                    <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">
                        {/* Left: Hero content */}
                        <div className="relative z-10 max-w-2xl">
                            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                                YOUR JOURNEY, YOUR WAY
                            </span>

                            <h2 className="mt-5 max-w-xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-[2.8rem]">
                                Every great journey starts with a{' '}
                                <span className="text-blue-600">ride.</span>
                            </h2>

                            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">
                                Your next destination is closer than you think.
                                Plan your ride and let the journey begin.
                            </p>

                            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-blue-100/80 bg-white/70 px-4 py-3 shadow-sm shadow-blue-900/[0.03]">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="21"
                                        height="21"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                                        <circle cx="12" cy="10" r="2.5" />
                                    </svg>
                                </span>

                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        Your city. Your route.
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Your ride, your way.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Decorative journey illustration */}
                        <div className="relative mx-auto flex w-full max-w-sm items-center justify-center lg:min-h-[290px] lg:max-w-none">
                            <div className="absolute h-56 w-56 rounded-full bg-blue-300/20 blur-3xl sm:h-64 sm:w-64" />

                            <div className="relative w-full max-w-[320px]">
                                <svg
                                    viewBox="0 0 340 290"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-auto w-full drop-shadow-sm"
                                    role="img"
                                    aria-label="Illustration of a journey route connecting two destinations"
                                >
                                    {/* Soft illustration backdrop */}
                                    <circle cx="170" cy="145" r="112" fill="#DBEAFE" fillOpacity="0.48" />
                                    <circle cx="170" cy="145" r="86" stroke="#93C5FD" strokeOpacity="0.35" strokeDasharray="4 8" />

                                    {/* Winding route */}
                                    <path
                                        d="M69 213C69 173 105 173 105 136C105 97 151 101 171 127C190 153 211 174 235 146C249 130 249 91 276 78"
                                        stroke="#FFFFFF"
                                        strokeWidth="19"
                                        strokeLinecap="round"
                                    />
                                    <path
                                        d="M69 213C69 173 105 173 105 136C105 97 151 101 171 127C190 153 211 174 235 146C249 130 249 91 276 78"
                                        stroke="#60A5FA"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeDasharray="5 8"
                                    />

                                    {/* Starting point */}
                                    <circle cx="69" cy="213" r="19" fill="#BFDBFE" fillOpacity="0.65" />
                                    <circle cx="69" cy="213" r="10" fill="#FFFFFF" />
                                    <circle cx="69" cy="213" r="5" fill="#2563EB" />

                                    {/* Destination marker */}
                                    <path
                                        d="M276 52C263 52 253 62 253 75C253 92 276 111 276 111S299 92 299 75C299 62 289 52 276 52Z"
                                        fill="#2563EB"
                                    />
                                    <circle cx="276" cy="75" r="8" fill="#FFFFFF" />
                                    <circle cx="276" cy="75" r="3" fill="#2563EB" />

                                    {/* Floating travel card */}
                                    <rect x="104" y="177" width="148" height="62" rx="15" fill="#FFFFFF" />
                                    <rect x="104.5" y="177.5" width="147" height="61" rx="14.5" stroke="#DBEAFE" />

                                    <rect x="116" y="189" width="36" height="36" rx="11" fill="#EFF6FF" />
                                    <path
                                        d="M125 207V202L127 196H141L143 202V207M125 202H143M128 207V210M140 207V210"
                                        stroke="#2563EB"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <circle cx="129" cy="203" r="1.5" fill="#2563EB" />
                                    <circle cx="139" cy="203" r="1.5" fill="#2563EB" />

                                    <rect x="160" y="190" width="64" height="6" rx="3" fill="#CBD5E1" />
                                    <rect x="160" y="202" width="47" height="5" rx="2.5" fill="#E2E8F0" />
                                    <rect x="160" y="213" width="56" height="5" rx="2.5" fill="#DBEAFE" />

                                    {/* Small decorative accent */}
                                    <circle cx="91" cy="75" r="5" fill="#60A5FA" fillOpacity="0.8" />
                                    <circle cx="230" cy="53" r="4" fill="#93C5FD" />
                                    <path d="M83 99L88 104M88 99L83 104" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Main Dashboard */}
                <section id="plan-route" className="mt-8 scroll-mt-24">                    <LocationPicker
                    pickup={pickup}
                    destination={destination}
                    pickupCoordinates={pickupCoordinates}
                    destinationCoordinates={destinationCoordinates}
                    onPickupChange={setPickup}
                    onDestinationChange={setDestination}
                    onCoordinatesChange={({ pickup, destination }) => {
                        setPickupCoordinates(pickup)
                        setDestinationCoordinates(destination)
                    }}
                    onRouteInfoChange={setRouteInfo}
                    locationFields={
                        <>
                            <div className="mb-7">
                                <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                                    PLAN A JOURNEY
                                </p>

                                <h2 className="mt-3 text-xl font-bold text-slate-900">
                                    Plan your next ride
                                </h2>

                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    Enter your locations and view your route on the map.
                                </p>
                            </div>

                            <div className="space-y-5">
                                {/* Pickup */}
                                <div className="flex gap-4">
                                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
                                        ●
                                    </div>

                                    <div className="relative min-w-0 flex-1">
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
                                            onFocus={() => setActiveLocationField('pickup')}
                                            onChange={event => {
                                                setPickup(event.target.value)
                                                setPickupCoordinates(null)
                                                setRouteInfo(null)
                                                setActiveLocationField('pickup')
                                            }}
                                            placeholder="Enter your pickup location"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                        />

                                        {activeLocationField === 'pickup' &&
                                            pickupSuggestions.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                                    {pickupSuggestions.map((suggestion, index) => (
                                                        <button
                                                            key={`${suggestion.label}-${index}`}
                                                            type="button"
                                                            onMouseDown={event => event.preventDefault()}
                                                            onClick={() =>
                                                                handleSelectLocation('pickup', suggestion)
                                                            }
                                                            className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-blue-50"
                                                        >
                                                            <span className="mt-0.5 text-blue-600">●</span>
                                                            <span className="text-sm text-slate-700">
                                                                {suggestion.label}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                    </div>
                                </div>

                                <div className="ml-5 h-5 border-l-2 border-dashed border-slate-300" />

                                {/* Destination */}
                                <div className="flex gap-4">
                                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                                        ◆
                                    </div>

                                    <div className="relative min-w-0 flex-1">
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
                                            onFocus={() =>
                                                setActiveLocationField('destination')
                                            }
                                            onChange={event => {
                                                setDestination(event.target.value)
                                                setDestinationCoordinates(null)
                                                setRouteInfo(null)
                                                setActiveLocationField('destination')
                                            }}
                                            placeholder="Where are you heading?"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                                        />

                                        {activeLocationField === 'destination' &&
                                            destinationSuggestions.length > 0 && (
                                                <div className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                                                    {destinationSuggestions.map((suggestion, index) => (
                                                        <button
                                                            key={`${suggestion.label}-${index}`}
                                                            type="button"
                                                            onMouseDown={event => event.preventDefault()}
                                                            onClick={() =>
                                                                handleSelectLocation(
                                                                    'destination',
                                                                    suggestion
                                                                )
                                                            }
                                                            className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-blue-50"
                                                        >
                                                            <span className="mt-0.5 text-indigo-600">◆</span>
                                                            <span className="text-sm text-slate-700">
                                                                {suggestion.label}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </div>
                        </>
                    }
                    rideOptions={
                        <RideOptions
                            routeInfo={routeInfo}
                            pickup={pickup}
                            destination={destination}
                            clerkId={user?.id}
                            onRideBooked={handleRideBooked}
                        />
                    }
                />
                </section>


                {/* Ride History */}
                <section id='my-rides' className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/[0.03] sm:p-8">
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
                        <div className="mt-7 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                            {paginatedRides.map(ride => (
                                <article
                                    key={ride.id}
                                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:border-blue-200 hover:shadow-md"
                                >
                                    {/* Ride header */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                                                {ride.ride_type === 'bike'
                                                    ? '🏍️'
                                                    : ride.ride_type === 'auto'
                                                        ? '🛺'
                                                        : '🚕'}
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="font-bold capitalize text-slate-900">
                                                    {ride.ride_type || 'Ride'} ride
                                                </h3>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {ride.created_at
                                                        ? new Date(ride.created_at).toLocaleString()
                                                        : 'Booking date unavailable'}
                                                </p>
                                                <p className="mt-1 break-all text-xs text-slate-400">
                                                    ID: {ride.id.slice(0, 8)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="sm:text-right">
                                            <p className="text-xs font-medium text-slate-500">
                                                Total fare
                                            </p>
                                            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
                                                ₹{Number(ride.fare || 0).toFixed(0)}
                                            </p>

                                            <span
                                                className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${ride.status === 'completed'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-700'
                                                    }`}
                                            >
                                                {ride.status === 'completed' && '✓ '}
                                                {(ride.status || 'requested').replaceAll('_', ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Journey route */}
                                    <div className="p-4 sm:p-5">
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                                            <div className="flex gap-3">
                                                <div className="flex w-5 shrink-0 flex-col items-center">
                                                    <span className="mt-1.5 h-3 w-3 rounded-full border-[3px] border-blue-600 bg-white" />
                                                    <span className="my-1.5 min-h-8 w-px flex-1 border-l-2 border-dashed border-slate-300" />
                                                </div>

                                                <div className="min-w-0 flex-1 pb-4">
                                                    <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400">
                                                        PICKUP
                                                    </p>
                                                    <p className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-800">
                                                        {ride.pickup_location || 'Pickup unavailable'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <div className="flex w-5 shrink-0 justify-center">
                                                    <span className="mt-1 h-3 w-3 rounded-sm bg-emerald-500 ring-4 ring-emerald-50" />
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400">
                                                        DESTINATION
                                                    </p>
                                                    <p className="mt-1.5 break-words text-sm font-semibold leading-6 text-slate-800">
                                                        {ride.drop_location || 'Destination unavailable'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>


                                    {/* Payment and receipt actions */}
                                    <div className="mt-auto border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                                        {ride.status === 'completed' ? (
                                            <>
                                                {/* Payment Status */}
                                                <div className="mb-3 min-h-5">
                                                    {paymentStatuses[ride.id] === 'paid' ? (
                                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs">
                                                                ✓
                                                            </span>
                                                            Payment completed
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-600">
                                                            Payment pending
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Side-by-side Actions */}
                                                <div className="grid grid-cols-2 gap-2">
                                                    {paymentStatuses[ride.id] !== 'paid' ? (
                                                        <div className="min-w-0 [&_button]:!flex [&_button]:!h-[46px] [&_button]:!w-full [&_button]:!items-center [&_button]:!justify-center [&_button]:!rounded-xl [&_button]:!px-2 [&_button]:!py-3 [&_button]:!text-sm">
                                                            <RazorpayCheckout
                                                                ride={ride}
                                                                onPaymentSuccess={handlePaymentSuccess}
                                                                onPaymentError={message => window.alert(message)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEmailReceipt(ride.id)}
                                                            disabled={sendingReceiptId === ride.id}
                                                            className="inline-flex h-[46px] min-w-0 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-2 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            <span aria-hidden="true">✉</span>
                                                            <span className="truncate">
                                                                {sendingReceiptId === ride.id
                                                                    ? 'Sending...'
                                                                    : 'Email receipt'}
                                                            </span>
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveReviewRideId(ride.id)}
                                                        className="group flex h-[46px] min-w-0 items-center justify-center gap-1.5 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-3 text-sm font-semibold text-blue-700 transition hover:border-blue-300 hover:from-blue-100 hover:to-indigo-100"
                                                    >
                                                        <span className="text-lg">
                                                            {reviewedRideIds.includes(ride.id) ? '★' : '☆'}
                                                        </span>
                                                        <span className="truncate">
                                                            {reviewedRideIds.includes(ride.id)
                                                                ? 'View Feedback'
                                                                : 'Leave a Review'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </>

                                        ) : (
                                            /* Status information for rides without payment actions */
                                            <div className="flex min-h-[80px] items-center">
                                                <div
                                                    className={`flex w-full items-center gap-3 rounded-xl border p-3 ${ride.status === 'accepted'
                                                        ? 'border-blue-100 bg-blue-50/70'
                                                        : ride.status === 'cancelled'
                                                            ? 'border-red-100 bg-red-50/70'
                                                            : 'border-amber-100 bg-amber-50/70'
                                                        }`}
                                                >
                                                    <div
                                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${ride.status === 'accepted'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : ride.status === 'cancelled'
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-amber-100 text-amber-700'
                                                            }`}
                                                    >
                                                        {ride.status === 'accepted'
                                                            ? '✓'
                                                            : ride.status === 'cancelled'
                                                                ? '×'
                                                                : '◷'}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p
                                                            className={`text-sm font-bold ${ride.status === 'accepted'
                                                                ? 'text-blue-900'
                                                                : ride.status === 'cancelled'
                                                                    ? 'text-red-900'
                                                                    : 'text-amber-900'
                                                                }`}
                                                        >
                                                            {ride.status === 'accepted'
                                                                ? 'Your ride has been accepted'
                                                                : ride.status === 'cancelled'
                                                                    ? 'This ride was cancelled'
                                                                    : 'Waiting for driver acceptance'}
                                                        </p>

                                                        <p className="mt-1 text-xs leading-5 text-slate-600">
                                                            {ride.status === 'accepted'
                                                                ? 'Your ride request has been accepted.'
                                                                : ride.status === 'cancelled'
                                                                    ? 'This ride is no longer active.'
                                                                    : 'Your ride request has been submitted.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

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


                    {/* Ride Feedback Modal */}
                    {activeReviewRideId && (() => {
                        const ride = rides.find(
                            item => item.id === activeReviewRideId
                        )

                        if (!ride) return null

                        const hasReviewed = reviewedRideIds.includes(ride.id)
                        const rating = reviewRatings[ride.id] || 0
                        const review = reviewTexts[ride.id] || ''

                        return (
                            <div
                                className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-900/50 px-4 py-3 backdrop-blur-sm" onClick={() => setActiveReviewRideId(null)}
                            >
                                <div
                                    role="dialog"
                                    aria-modal="true"
                                    aria-labelledby="review-modal-title"
                                    className="my-auto w-full max-w-md rounded-2xl bg-white px-7 py-5 shadow-2xl sm:px-8"
                                    onClick={event => event.stopPropagation()}
                                >
                                    {/* Modal Header */}
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                                                {hasReviewed ? '⭐' : '💬'}
                                            </div>

                                            <h3
                                                id="review-modal-title"
                                                className="mt-4 text-xl font-bold text-slate-900"
                                            >
                                                {hasReviewed
                                                    ? 'Your ride review'
                                                    : 'How was your ride?'}
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                {hasReviewed
                                                    ? 'Thanks for sharing your experience!'
                                                    : 'Your feedback helps us improve RideFlow.'}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setActiveReviewRideId(null)}
                                            aria-label="Close review modal"
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                        >
                                            ×
                                        </button>
                                    </div>

                                    {/* Rating */}
                                    <div className="mt-6">
                                        <p className="text-sm font-semibold text-slate-800">
                                            Rate your experience
                                        </p>

                                        <div className="mt-3 flex items-center justify-center gap-2">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    disabled={hasReviewed}
                                                    aria-label={`Rate ${star} out of 5 stars`}
                                                    aria-pressed={rating === star}
                                                    onClick={() =>
                                                        setReviewRatings(previous => ({
                                                            ...previous,
                                                            [ride.id]: star,
                                                        }))
                                                    }
                                                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-3xl transition ${star <= rating
                                                        ? 'bg-amber-50 text-amber-400'
                                                        : 'text-slate-300'
                                                        } ${hasReviewed
                                                            ? 'cursor-default'
                                                            : 'hover:scale-110 hover:bg-amber-50 hover:text-amber-400'
                                                        }`}
                                                >
                                                    {star <= rating ? '★' : '☆'}
                                                </button>
                                            ))}
                                        </div>

                                        <p className="mt-2 text-center text-sm font-medium text-slate-500">
                                            {rating
                                                ? `${rating} out of 5 stars`
                                                : 'Tap a star to rate'}
                                        </p>
                                    </div>

                                    {/* Review Text */}
                                    <div className="mt-5">
                                        <label
                                            htmlFor="ride-review-text"
                                            className="text-sm font-semibold text-slate-800"
                                        >
                                            Your review
                                            {!hasReviewed && (
                                                <span className="font-normal text-slate-400">
                                                    {' '}
                                                </span>
                                            )}
                                        </label>

                                        <textarea
                                            id="ride-review-text"
                                            value={review}
                                            readOnly={hasReviewed}
                                            onChange={event =>
                                                setReviewTexts(previous => ({
                                                    ...previous,
                                                    [ride.id]: event.target.value.slice(0, 1000),
                                                }))
                                            }
                                            maxLength={1000}
                                            rows={4}
                                            placeholder="Tell us about your experience..."
                                            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 read-only:cursor-default"
                                        />

                                        {!hasReviewed && (
                                            <p className="mt-1 text-right text-xs text-slate-400">
                                                {review.length}/1000 characters
                                            </p>
                                        )}
                                    </div>

                                    {/* Modal Actions */}
                                    <div className="mt-6 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setActiveReviewRideId(null)}
                                            className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"                                        >
                                            {hasReviewed ? 'Close' : 'Cancel'}
                                        </button>

                                        {!hasReviewed && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await handleSubmitReview(ride.id)

                                                    setActiveReviewRideId(null)
                                                }}
                                                disabled={
                                                    !rating ||
                                                    submittingReviewId === ride.id
                                                }
                                                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {submittingReviewId === ride.id
                                                    ? 'Submitting...'
                                                    : 'Submit review'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
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

            {isClearNotificationsModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 px-5 backdrop-blur-sm">
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="clear-notifications-title"
                        aria-describedby="clear-notifications-description"
                        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
                    >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                className="h-6 w-6"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"
                                />
                            </svg>
                        </div>

                        <h2
                            id="clear-notifications-title"
                            className="mt-5 text-xl font-bold text-slate-900"
                        >
                            Clear all notifications?
                        </h2>

                        <p
                            id="clear-notifications-description"
                            className="mt-3 text-sm leading-6 text-slate-500"
                        >
                            This will permanently delete all your notifications. This action cannot be undone.
                        </p>

                        <div className="mt-7 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsClearNotificationsModalOpen(false)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={async () => {
                                    setIsClearNotificationsModalOpen(false)
                                    await clearAllNotifications()
                                }}
                                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                Delete all
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default UserDashboard
