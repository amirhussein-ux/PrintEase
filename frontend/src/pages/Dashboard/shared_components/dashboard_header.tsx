'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogPanel } from '@headlessui/react'
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface DashboardHeaderProps {
  role: 'admin' | 'customer'
}

export default function DashboardHeader({ role }: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [menuDropdownOpen, setMenuDropdownOpen] = useState(false)
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false)

  const menuDropdownRef = useRef<HTMLDivElement>(null)
  const avatarDropdownRef = useRef<HTMLDivElement>(null)

  const adminLinks = [
    { name: 'Dashboard', href: '#' },
    { name: 'Order Management', href: '#' },
    { name: 'Services', href: '#' },
    { name: 'Inventory Management', href: '#' },
    { name: 'Notifications', href: '#' },
  ]

  const customerLinks = [
    { name: 'Order', href: '#' },
    { name: 'Customize', href: '#' },
    { name: 'Track Orders', href: '#' },
  ]

  const links = role === 'admin' ? adminLinks : customerLinks

  // Close dropdowns if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target as Node)) {
        setMenuDropdownOpen(false)
      }
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
        <div className="flex items-center justify-between h-16 w-full">


          {/* Centered logo for tablet/small desktop */}
          <div className="hidden sm:block lg:hidden absolute left-1/2 transform -translate-x-1/2">
            <a href="#" className="-m-1.5 p-1.5">
              <span className="sr-only">PrintEase</span>
              <img
                alt="PrintEase Logo"
                src="/src/assets/PrintEase-Logo.png"
                className="h-8 w-auto"
              />
            </a>
          </div>

          {/* Logo for large desktop (left aligned) */}
          <div className="hidden lg:flex lg:items-center lg:flex-shrink-0">
            <a href="#" className="-m-1.5 p-1.5">
              <span className="sr-only">PrintEase</span>
              <img
                alt="PrintEase Logo"
                src="/src/assets/PrintEase-Logo.png"
                className="h-8 w-auto"
              />
            </a>
          </div>
          
          {/* Menu Button - left aligned on mobile/tablet */}
          <div className="flex items-center lg:hidden" ref={menuDropdownRef}>
            <button
              type="button"
              className="text-white p-2 rounded-md"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>

          {/* Centered Links (lg and up) */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-center">
            <div className="flex space-x-8">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-white hover:text-white font-medium relative group"
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
            </div>
          </div>

          {/* Avatar + Dropdown - right aligned on all screens */}
          <div className="flex items-center justify-end flex-shrink-0" ref={avatarDropdownRef}>
            <button
              className="flex items-center text-white font-medium focus:outline-none hover:text-gray-200 transition-colors duration-200"
              onClick={() => setAvatarDropdownOpen(!avatarDropdownOpen)}
            >
              <img
                src="https://ui-avatars.com/api/?name=John+Doe"
                alt="User avatar"
                className="w-8 h-8 rounded-full"
              />
              <span className="ml-2 hidden sm:inline">John Doe</span>
              <ChevronDownIcon className="h-4 w-4 ml-1" />
            </button>
            {avatarDropdownOpen && (
              <div className="absolute right-0 top-full mt-4 w-40 bg-white rounded-md shadow-lg py-1 z-50">
                <a
                  href="#"
                  className="block px-4 py-2 text-md text-black rounded-t-md
                    hover:bg-blue-900 hover:text-white transition-colors duration-200"
                >
                  Profile
                </a>
                <a
                  href="#"
                  className="block px-4 py-2 text-md text-black rounded-b-md
                    hover:bg-blue-900 hover:text-white transition-colors duration-200"
                >
                  Logout
                </a>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Fullscreen Mobile Menu */}
      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
        <div className="fixed inset-0 bg-black bg-opacity-25 z-40" />
        <DialogPanel className="fixed inset-y-0 left-0 z-50 w-full bg-blue-900 p-6 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-lg font-semibold">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)}>
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="space-y-2">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-white hover:text-blue-900 transition-colors duration-200"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Logo at bottom on true mobile */}
          <div className="mt-8 flex justify-center sm:hidden">
            <img
              alt="PrintEase Logo"
              src="/src/assets/PrintEase-Logo.png"
              className="h-8 w-auto"
            />
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  )
}