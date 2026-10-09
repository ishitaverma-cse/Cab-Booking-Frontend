import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
const API_URL = 'http://localhost:5000/api'

function ProfileEditor({ onClose }) {
    const { user } = useUser()

    const [firstName, setFirstName] = useState(user?.firstName || '')
    const [lastName, setLastName] = useState(user?.lastName || '')
    const [phone, setPhone] = useState(
        user?.primaryPhoneNumber?.phoneNumber || ''
    )
    const [code, setCode] = useState('')
    const [phoneResource, setPhoneResource] = useState(null)
    const [image, setImage] = useState(null)
    const [preview, setPreview] = useState(user?.imageUrl || '')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleImageChange = (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file.')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image size must be 5 MB or less.')
            return
        }

        setError('')
        setImage(file)
        setPreview(URL.createObjectURL(file))
    }

    const handleSaveProfile = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        try {
            if (!firstName.trim()) {
                throw new Error('First name is required.')
            }

            await user.update({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
            })

            const response = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clerk_id: user.id,
                    name: `${firstName.trim()} ${lastName.trim()}`.trim(),
                    email: user.primaryEmailAddress?.emailAddress,
                    phone: user.primaryPhoneNumber?.phoneNumber || null,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Could not sync profile with database.')
            }

            if (image) {
                await user.setProfileImage({ file: image })
            }

            setMessage('Profile updated successfully!')
            setImage(null)
        } catch (err) {
            setError(err?.errors?.[0]?.longMessage || err.message || 'Could not update profile.')
        } finally {
            setLoading(false)
        }
    }

    const handleSendCode = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        try {
            if (!phone.trim().startsWith('+')) {
                throw new Error('Enter your phone number with country code, e.g. +91XXXXXXXXXX.')
            }

            const created = await user.createPhoneNumber({
                phoneNumber: phone.trim(),
            })

            await user.reload()

            const resource = user.phoneNumbers.find(
                (item) => item.id === created.id
            )

            if (!resource) {
                throw new Error('Phone number created, but could not load its verification details. Please try again.')
            }

            await resource.prepareVerification()
            setPhoneResource(resource)
            setMessage('Verification code sent. Check your SMS.')
        } catch (err) {
            setError(
                err?.errors?.[0]?.longMessage ||
                err.message ||
                'Could not send verification code.'
            )
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyPhone = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError('')
        setMessage('')

        try {
            const verified = await phoneResource.attemptVerification({
                code: code.trim(),
            })

            await user.update({
                primaryPhoneNumberId: verified.id,
            })

            await user.reload()
            setPhoneResource(null)
            setCode('')
            setMessage('Phone number verified and saved!')
        } catch (err) {
            setError(
                err?.errors?.[0]?.longMessage ||
                err.message ||
                'Phone verification failed. Check the code and try again.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="my-auto w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                            ACCOUNT SETTINGS
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900">
                            Edit your profile
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Keep your personal details up to date.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close profile editor"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div className="flex items-center gap-4">
                        <img
                            src={preview || 'https://placehold.co/96x96/eaf1ff/2563eb?text=User'}
                            alt="Profile preview"
                            className="h-20 w-20 rounded-2xl border border-blue-100 bg-blue-50 object-cover"
                        />

                        <div>
                            <label
                                htmlFor="profile-image"
                                className="inline-flex cursor-pointer rounded-xl bg-blue-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                                Choose photo
                            </label>
                            <input
                                id="profile-image"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="sr-only"
                            />
                            <p className="mt-2 text-xs text-slate-500">
                                Images only · Maximum 5 MB
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="first-name" className="mb-2 block text-sm font-medium text-slate-700">
                                First name
                            </label>
                            <input
                                id="first-name"
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div>
                            <label htmlFor="last-name" className="mb-2 block text-sm font-medium text-slate-700">
                                Last name
                            </label>
                            <input
                                id="last-name"
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-blue-400 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? 'Saving...' : 'Save profile'}
                    </button>
                </form>

                <div className="my-6 border-t border-slate-100" />

                <form
                    onSubmit={phoneResource ? handleVerifyPhone : handleSendCode}
                    className="space-y-4"
                >
                    <div>
                        <h3 className="font-semibold text-slate-900">Phone number</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Use the international format, including your country code.
                            A verification code is required.
                        </p>
                    </div>

                    {!phoneResource ? (
                        <>
                            <input
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                value={phone.replace(/^\+91/, '')}
                                onChange={(event) => {
                                    const digits = event.target.value.replace(/\D/g, '').slice(0, 10)
                                    setPhone(`+91${digits}`)
                                }}
                                placeholder="+91XXXXXXXXXX"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                            >
                                {loading ? 'Sending code...' : 'Send verification code'}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                Enter the code sent to {phoneResource.phoneNumber}.
                            </p>

                            <input
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={code}
                                onChange={(event) => setCode(event.target.value)}
                                placeholder="Enter verification code"
                                required
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                            >
                                {loading ? 'Verifying...' : 'Verify and save number'}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPhoneResource(null)
                                    setCode('')
                                    setMessage('')
                                    setError('')
                                }}
                                className="w-full text-sm font-medium text-slate-500 hover:text-slate-800"
                            >
                                Use a different number
                            </button>
                        </>
                    )}
                </form>

                {message && (
                    <p role="status" className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {message}
                    </p>
                )}

                {error && (
                    <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-5 w-full rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                    Done
                </button>
            </div>
        </div>
    )
}

export default ProfileEditor