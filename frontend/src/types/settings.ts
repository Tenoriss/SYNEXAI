export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]

export interface AppSettings {
  theme: ThemePreference
  sidebarCollapsed: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  sidebarCollapsed: false,
}
