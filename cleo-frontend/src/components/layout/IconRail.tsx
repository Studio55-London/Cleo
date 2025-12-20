import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  MessageSquare,
  Layers,
  ListTodo,
  Settings,
  Sparkles,
  Users,
  LogOut,
  User,
  Moon,
  Sun,
  BookOpen,
  Plug,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/store/authStore'

interface NavIconProps {
  icon: React.ElementType
  label: string
  to: string
  isActive: boolean
}

function NavIcon({ icon: Icon, label, to, isActive }: NavIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-150',
            'text-foreground-secondary hover:text-foreground hover:bg-background-hover hover:scale-105',
            isActive && 'bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground'
          )}
        >
          <Icon className="h-5 w-5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function Divider() {
  return <div className="w-8 h-px bg-border my-2" />
}

export function IconRail() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('cleo-dark-mode')
    return saved ? saved === 'true' : false
  })

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('cleo-dark-mode', String(isDarkMode))
  }, [isDarkMode])

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

  const isActive = (path: string) => {
    if (path === '/chat') {
      return location.pathname === '/chat' || location.pathname.startsWith('/chat/')
    }
    return location.pathname.startsWith(path)
  }

  // Primary navigation (chat & spaces)
  const primaryNavItems = [
    { icon: MessageSquare, label: 'Chat', to: '/chat' },
    { icon: Layers, label: 'Spaces', to: '/spaces' },
  ]

  // Secondary navigation (management)
  const secondaryNavItems = [
    { icon: Users, label: 'Agents', to: '/agents' },
    { icon: ListTodo, label: 'Tasks', to: '/tasks' },
  ]

  // Tertiary navigation (content & integrations)
  const tertiaryNavItems = [
    { icon: BookOpen, label: 'Knowledge', to: '/knowledge' },
    { icon: Plug, label: 'Integrations', to: '/integrations' },
  ]

  const handleLogout = () => {
    logout()
  }

  // Get user initials
  const getInitials = () => {
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase()
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase()
    }
    return 'U'
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-16 min-w-[64px] flex flex-col items-center py-3 bg-background-secondary border-r border-border shadow-md z-50">
        {/* Logo */}
        <Link
          to="/chat"
          className="flex items-center justify-center w-10 h-10 mb-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover hover:scale-105 transition-all"
        >
          <Sparkles className="h-5 w-5" />
        </Link>

        {/* Navigation Icons */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          {/* Primary nav - Chat & Spaces */}
          {primaryNavItems.map((item) => (
            <NavIcon
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              isActive={isActive(item.to)}
            />
          ))}

          <Divider />

          {/* Secondary nav - Management */}
          {secondaryNavItems.map((item) => (
            <NavIcon
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              isActive={isActive(item.to)}
            />
          ))}

          <Divider />

          {/* Tertiary nav - Content & Integrations */}
          {tertiaryNavItems.map((item) => (
            <NavIcon
              key={item.to}
              icon={item.icon}
              label={item.label}
              to={item.to}
              isActive={isActive(item.to)}
            />
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-2">
          {/* User Avatar with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mt-2 focus:outline-none">
                <Avatar className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{user?.username || 'User'}</span>
                  <span className="text-xs text-foreground-secondary">{user?.email || ''}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link to="/settings">
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link to="/settings">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={toggleDarkMode}>
                {isDarkMode ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Light Mode
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark Mode
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  )
}
