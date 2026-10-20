import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

const API_URL = (
    import.meta.env.VITE_API_URL || 'https://cab-booking-backend-exx6.onrender.com/api'
).replace(/\/+$/, '')

const RazorpayCheckout = ({
    ride,
    onPaymentSuccess,
    onPaymentError,
}) => {
    const { getToken } = useAuth()
    const [loading, setLoading] = useState(false)

    const handlePayment = async () => {
        if (loading) return

        if (!ride?.id) {
            onPaymentError?.('Ride information is missing.')
            return
        }

        if (typeof window.Razorpay !== 'function') {
            onPaymentError?.(
                'Razorpay Checkout did not load. Please refresh the page.'
            )
            return
        }

        setLoading(true)

        try {
            const token = await getToken()

            // Step 1: Create an order on the backend.
            const orderResponse = await fetch(
                `${API_URL}/payments/create-order`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        ride_id: ride.id,
                    }),
                }
            )

            const orderResult = await orderResponse.json()

            if (!orderResponse.ok || !orderResult.success) {
                throw new Error(
                    orderResult.message || 'Unable to create payment order.'
                )
            }

            const order = orderResult.data

            // Step 2: Open Razorpay Checkout.
            const checkout = new window.Razorpay({
                key: order.key_id,
                amount: order.amount,
                currency: order.currency,
                name: 'RideFlow',
                description: 'Payment for your completed ride',
                order_id: order.order_id,
                theme: {
                    color: '#2563eb',
                },
                modal: {
                    ondismiss: () => {
                        setLoading(false)
                    },
                },
                handler: async paymentResponse => {
                    try {
                        const latestToken = await getToken()

                        // Step 3: Verify the payment on the backend.
                        const verifyResponse = await fetch(
                            `${API_URL}/payments/verify`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${latestToken}`,
                                },
                                body: JSON.stringify({
                                    ride_id: ride.id,
                                    razorpay_order_id:
                                        paymentResponse.razorpay_order_id,
                                    razorpay_payment_id:
                                        paymentResponse.razorpay_payment_id,
                                    razorpay_signature:
                                        paymentResponse.razorpay_signature,
                                }),
                            }
                        )

                        const verifyResult = await verifyResponse.json()

                        if (
                            !verifyResponse.ok ||
                            !verifyResult.success
                        ) {
                            throw new Error(
                                verifyResult.message ||
                                'Payment verification failed.'
                            )
                        }

                        onPaymentSuccess?.(ride.id, verifyResult.data)
                    } catch (error) {
                        onPaymentError?.(
                            error.message ||
                            'Unable to verify payment. Please check your payment status before retrying.'
                        )
                    } finally {
                        setLoading(false)
                    }
                },
            })

            checkout.on('payment.failed', response => {
                setLoading(false)

                onPaymentError?.(
                    response.error?.description ||
                    'Payment failed. Please try again.'
                )
            })

            checkout.open()
        } catch (error) {
            setLoading(false)

            onPaymentError?.(
                error.message || 'Unable to start payment.'
            )
        }
    }

    return (
        <button
            type="button"
            onClick={handlePayment}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {loading ? 'Processing...' : 'Pay Now'}
        </button>
    )
}

export default RazorpayCheckout