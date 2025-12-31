import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from "dayjs"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(relativeTime)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M"
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K"
  }
  return num.toLocaleString()
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function formatRelativeTime(date: Date | string): string {
  return dayjs(date).fromNow()
}

export function formatFullDate(date: Date | string): string {
  return dayjs(date).format("MMM D, YYYY h:mm:ss A")
}

export function formatTimestamp(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function truncateMiddle(str: string, maxLength: number = 20): string {
  if (str.length <= maxLength) return str
  const half = Math.floor((maxLength - 3) / 2)
  return `${str.slice(0, half)}...${str.slice(-half)}`
}
