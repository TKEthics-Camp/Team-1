import { NavLink } from 'react-router'
import { Sparkles, User } from 'lucide-react'

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-md px-6 pb-5">
        <div className="pointer-events-auto flex items-center justify-around rounded-full border border-[#e3ded2] bg-[#fbf9f4]/90 backdrop-blur-xl py-2 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-full transition-colors ${
                isActive ? 'text-[#b3856f]' : 'text-[#9a958a] hover:text-[#6e6a60]'
              }`
            }
          >
            <Sparkles size={22} strokeWidth={1.8} />
            <span className="text-[10px] tracking-wide">星球</span>
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-6 py-1.5 rounded-full transition-colors ${
                isActive ? 'text-[#b3856f]' : 'text-[#9a958a] hover:text-[#6e6a60]'
              }`
            }
          >
            <User size={22} strokeWidth={1.8} />
            <span className="text-[10px] tracking-wide">我的</span>
          </NavLink>
        </div>
      </div>
    </nav>
  )
}
