import { Link, NavLink } from 'react-router-dom'
import { usePlanStore } from '../store/planStore'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition ${
    isActive
      ? 'bg-violet-600 text-white'
      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
  }`

export function Nav() {
  const count = usePlanStore((s) => s.items.length)

  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
        <Link className="font-semibold text-neutral-900 dark:text-neutral-100" to="/">
          🏛️ JEP Planner
        </Link>
        <nav className="flex items-center gap-2">
          <NavLink to="/" end className={linkClass}>
            Recherche
          </NavLink>
          <NavLink to="/planning" className={linkClass}>
            Mon planning{count > 0 ? ` (${count})` : ''}
          </NavLink>
          <a
            href="https://ko-fi.com/tarnaud"
            target="_blank"
            rel="noopener noreferrer"
            title="Soutenir le projet sur Ko-fi"
            aria-label="Soutenir le projet sur Ko-fi"
            className="ml-1 border-l border-neutral-200 py-2 pl-3 pr-1 text-lg opacity-70 transition hover:opacity-100 dark:border-neutral-800"
          >
            ☕
          </a>
        </nav>
      </div>
    </header>
  )
}
