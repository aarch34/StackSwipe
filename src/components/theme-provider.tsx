"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // The admin panel is always on the night theme, including dialogs portalled to <body>.
  const pathname = usePathname()
  const forcedTheme = pathname.startsWith("/super-admin") ? "dark" : undefined

  return (
    <NextThemesProvider {...props} forcedTheme={forcedTheme}>
      {children}
    </NextThemesProvider>
  )
}
