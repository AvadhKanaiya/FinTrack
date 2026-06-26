'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { format as fnsFormat, parseISO } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DateFormat = 'MMM_d_yyyy' | 'dd_MM_yyyy' | 'MM_dd_yyyy' | 'yyyy_MM_dd'
export type NumberFormat = 'comma' | 'dot' | 'space'
export type Currency = string // ISO 4217 code

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
  CHF: 'Fr',
  SGD: 'S$',
  AED: 'د.إ',
}

export interface UserPreferences {
  currency: Currency
  dateFormat: DateFormat
  numberFormat: NumberFormat
  monthlyIncome: number | null
}

interface UserPreferencesContextValue extends UserPreferences {
  setPreferences: (prefs: Partial<UserPreferences>) => void
  /** Format a date string (ISO yyyy-MM-dd) using the saved dateFormat */
  formatDate: (isoDate: string) => string
  /** Format a number using the saved numberFormat and currency */
  formatAmount: (amount: number, showCurrency?: boolean, decimals?: number) => string
  /** Format a plain number (no currency) */
  formatNumber: (n: number, decimals?: number) => string
  currencySymbol: string
}

// ─── Date format map ──────────────────────────────────────────────────────────

const DATE_FORMAT_PATTERNS: Record<DateFormat, string> = {
  MMM_d_yyyy: 'MMM d, yyyy',  // Jan 15, 2024
  dd_MM_yyyy: 'dd/MM/yyyy',    // 15/01/2024
  MM_dd_yyyy: 'MM/dd/yyyy',    // 01/15/2024
  yyyy_MM_dd: 'yyyy-MM-dd',    // 2024-01-15
}

// ─── Number formatter ─────────────────────────────────────────────────────────

function buildNumberFormatter(fmt: NumberFormat, currency: Currency, showCurrency: boolean, decimals = 2) {
  const localeMap: Record<NumberFormat, string> = {
    comma: 'en-US',  // 1,234.56
    dot:   'de-DE',  // 1.234,56
    space: 'fr-FR',  // 1 234,56
  }
  const locale = localeMap[fmt]
  return new Intl.NumberFormat(locale, {
    style: showCurrency ? 'currency' : 'decimal',
    currency: showCurrency ? currency : undefined,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// ─── Context ──────────────────────────────────────────────────────────────────

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ProviderProps {
  children: ReactNode
  initialPreferences?: Partial<UserPreferences>
}

export function UserPreferencesProvider({ children, initialPreferences }: ProviderProps) {
  const [prefs, setPrefsState] = useState<UserPreferences>({
    currency: initialPreferences?.currency ?? 'USD',
    dateFormat: (initialPreferences?.dateFormat as DateFormat) ?? 'MMM_d_yyyy',
    numberFormat: (initialPreferences?.numberFormat as NumberFormat) ?? 'comma',
    monthlyIncome: initialPreferences?.monthlyIncome ?? null,
  })

  const setPreferences = useCallback((partial: Partial<UserPreferences>) => {
    setPrefsState(prev => ({ ...prev, ...partial }))
  }, [])

  const formatDate = useCallback((isoDate: string): string => {
    try {
      const pattern = DATE_FORMAT_PATTERNS[prefs.dateFormat]
      return fnsFormat(parseISO(isoDate), pattern)
    } catch {
      return isoDate
    }
  }, [prefs.dateFormat])

  const formatNumber = useCallback((n: number, decimals = 2): string => {
    const localeMap: Record<NumberFormat, string> = {
      comma: 'en-US',
      dot:   'de-DE',
      space: 'fr-FR',
    }
    return new Intl.NumberFormat(localeMap[prefs.numberFormat], {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n)
  }, [prefs.numberFormat])

  const formatAmount = useCallback((amount: number, showCurrency = true, decimals = 2): string => {
    const cleanFormatted = (val: string) => {
      return val
        .replace(/US[\s\u00a0]*\$/gi, '$')
        .replace(/\$[\s\u00a0]*US/gi, '$')
        .replace(/USD/gi, '$')
    }
    try {
      return cleanFormatted(buildNumberFormatter(prefs.numberFormat, prefs.currency, showCurrency, decimals).format(amount))
    } catch {
      // Fallback if currency code is invalid
      return cleanFormatted(buildNumberFormatter(prefs.numberFormat, 'USD', showCurrency, decimals).format(amount))
    }
  }, [prefs.numberFormat, prefs.currency])

  const currencySymbol = CURRENCY_SYMBOLS[prefs.currency] || '$'

  return (
    <UserPreferencesContext.Provider value={{ ...prefs, currencySymbol, setPreferences, formatDate, formatAmount, formatNumber }}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUserPreferences() {
  const ctx = useContext(UserPreferencesContext)
  if (!ctx) throw new Error('useUserPreferences must be used inside <UserPreferencesProvider>')
  return ctx
}

// ─── Helpers (for server-side or non-context use) ────────────────────────────

export function formatDateStatic(isoDate: string, dateFormat: DateFormat): string {
  try {
    return fnsFormat(parseISO(isoDate), DATE_FORMAT_PATTERNS[dateFormat])
  } catch {
    return isoDate
  }
}

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = {
  MMM_d_yyyy: 'Jan 15, 2024',
  dd_MM_yyyy: '15/01/2024',
  MM_dd_yyyy: '01/15/2024',
  yyyy_MM_dd: '2024-01-15',
}

export const NUMBER_FORMAT_LABELS: Record<NumberFormat, string> = {
  comma: '1,234.56',
  dot:   '1.234,56',
  space: '1 234.56',
}
