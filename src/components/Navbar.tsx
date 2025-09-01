import { NavLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-10 border-b backdrop-blur supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:dark:bg-slate-900/50">
      <div className="max-w-[980px] mx-auto px-4 flex items-center justify-between py-3">
        <div className="font-extrabold">React Site</div>
        <div className="flex items-center gap-3">
          <NavLink className={({isActive}) => `px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${isActive ? 'outline outline-2 outline-indigo-500' : ''}`} to="/" end>Home</NavLink>
          <NavLink className={({isActive}) => `px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${isActive ? 'outline outline-2 outline-indigo-500' : ''}`} to="/about">About</NavLink>
          <NavLink className={({isActive}) => `px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${isActive ? 'outline outline-2 outline-indigo-500' : ''}`} to="/contact">Contact</NavLink>
          <NavLink className={({isActive}) => `px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${isActive ? 'outline outline-2 outline-indigo-500' : ''}`} to="/showcase">Showcase</NavLink>
          <NavLink className={({isActive}) => `px-2 py-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${isActive ? 'outline outline-2 outline-indigo-500' : ''}`} to="/services">Services</NavLink>
          
          <ThemeToggle />
        </div>
      </div>
    </nav>
  )
}
