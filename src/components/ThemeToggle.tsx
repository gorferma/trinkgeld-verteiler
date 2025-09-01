import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isLight = theme === 'light'
  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:border-indigo-500"
    >
      <span aria-hidden>{isLight ? '🌞' : '🌙'}</span>
      <span className="text-xs">{isLight ? 'Light' : 'Dark'}</span>
    </button>
  )
}
