import { useState, useEffect, useRef } from "react"

const MIN_LOADING_DURATION_MS = 600

/**
 * Ensures that loading states are visible for a minimum duration.
 * This provides better visual feedback when data loads too quickly.
 * 
 * @param isActuallyLoading - The real loading state from React Query
 * @returns A loading state that respects the minimum duration
 */
export function useMinLoadingDuration(isActuallyLoading: boolean): boolean {
    const [showLoading, setShowLoading] = useState(isActuallyLoading)
    const loadingStartTime = useRef<number | null>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (isActuallyLoading) {
            // Loading started - record the time
            loadingStartTime.current = Date.now()
            setShowLoading(true)

            // Clear any pending timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
        } else if (loadingStartTime.current !== null) {
            // Loading finished - ensure minimum duration
            const elapsed = Date.now() - loadingStartTime.current
            const remaining = MIN_LOADING_DURATION_MS - elapsed

            if (remaining > 0) {
                // Wait for the remaining time before hiding loader
                timeoutRef.current = setTimeout(() => {
                    setShowLoading(false)
                    loadingStartTime.current = null
                }, remaining)
            } else {
                // Minimum duration already passed
                setShowLoading(false)
                loadingStartTime.current = null
            }
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [isActuallyLoading])

    return showLoading
}
