'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'

interface DashboardHeaderProps {
  role: 'admin' | 'customer'
  userName: string
}

export default function DashboardHeader({ role, userName }: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false)
  const avatarDropdownRef = useRef<HTMLDivElement>(null)
  const { logout } = useAuth()

  const adminLinks = [
    { name: 'Dashboard', href: '/dashboard/admin' },
    { name: 'Orders', href: null },
    { name: 'Services', href: null },
    { name: 'Inventory', href: null },
    { name: 'Notifications', href: null },
  ]

  const links = role === 'admin' ? adminLinks : []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
        setAvatarDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="bg-blue-900 fixed top-0 left-0 w-full z-50 shadow">
      <nav className="mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/src/assets/PrintEase-Logo.png"
              alt="PrintEase Logo"
              className="h-8 w-auto"
            />
          </Link>

          {/* Tabs */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-center">
            <div className="flex space-x-8">
              {links.map((link) =>
                link.href ? (
                  <NavLink
                    key={link.name}
                    to={link.href}
                    className={({ isActive }) =>
                      isActive
                        ? 'text-white font-medium border-b-2 border-white pb-1'
                        : 'text-white font-medium hover:underline cursor-pointer'
                    }
                  >
                    {link.name}
                  </NavLink>
                ) : (
                  <span
                    key={link.name}
                    className="text-white font-medium opacity-70 cursor-not-allowed"
                  >
                    {link.name}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Avatar */}
          <div className="relative" ref={avatarDropdownRef}>
            <button
              className="flex items-center text-white"
              onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
            >
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`}
                className="w-8 h-8 rounded-full"
              />
              <span className="ml-2 hidden sm:inline">{userName}</span>
              <ChevronDownIcon className="h-4 w-4 ml-1" />
            </button>

            {avatarDropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded-md shadow-lg py-1 z-50">
                <Link
                  to="/profile"
                  className="block px-4 py-2 hover:bg-blue-900 hover:text-white"
                >
                  Profile
                </Link>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-blue-900 hover:text-white"
                  onClick={() => {
                    logout()
                    window.location.href = '/login'
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
        <DialogPanel className="fixed inset-0 z-50 bg-blue-900 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white text-lg font-semibold">Menu</h2>
            <button onClick={() => setMobileMenuOpen(false)}>
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="space-y-2">
            {links.map((link) =>
              link.href ? (
                <NavLink
                  key={link.name}
                  to={link.href}
                  className={({ isActive }) =>
                    isActive
                      ? 'block px-3 py-2 text-white border-l-4 border-white rounded'
                      : 'block px-3 py-2 text-white hover:bg-white hover:text-blue-900 rounded'
                  }
                >
                  {link.name}
                </NavLink>
              ) : (
                <span
                  key={link.name}
                  className="block px-3 py-2 text-white opacity-70 cursor-not-allowed rounded"
                >
                  {link.name}
                </span>
              )
            )}
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  )
}
