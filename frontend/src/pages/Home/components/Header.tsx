'use client'

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogPanel,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { BsQrCode, BsShop } from "react-icons/bs";
import { MdOutlineManageSearch, MdLocationOn } from "react-icons/md";
import { GrDocumentCloud } from "react-icons/gr";
import { FiUsers } from "react-icons/fi";
import { IoStatsChart } from "react-icons/io5";

const services = [
  { 
    name: 'For Customers', 
    description: 'Find local print shops and order with ease', 
    href: '#services', 
    icon: <FiUsers /> 
  },
  { 
    name: 'For Shop Owners', 
    description: 'Grow your business with our platform', 
    href: '#services', 
    icon: <BsShop /> 
  },
  { 
    name: 'Location Services', 
    description: 'Find registered shops near your location', 
    href: '#services', 
    icon: <MdLocationOn /> 
  },
  { 
    name: 'QR Code Pickup', 
    description: 'Streamline pickup with QR code system', 
    href: '#services', 
    icon: <BsQrCode /> 
  },
  { 
    name: 'Queue Management', 
    description: 'Real-time order tracking and status updates', 
    href: '#services', 
    icon: <MdOutlineManageSearch /> 
  },
  { 
    name: 'Cloud Integration', 
    description: 'Upload from Google Drive, Dropbox, and more', 
    href: '#services', 
    icon: <GrDocumentCloud /> 
  },
  { 
    name: 'Business Analytics', 
    description: 'Track your shop performance and growth', 
    href: '#services', 
    icon: <IoStatsChart /> 
  },
];

export default function Header() {
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollToSection = (selector: string, isMobile: boolean = false) => {
    if (isMobile) setMobileMenuOpen(false)
    
    const section = document.querySelector(selector)
    if (section) {
      const header = document.querySelector('header')
      const headerHeight = header ? header.getBoundingClientRect().height : 0
      const sectionTop = section.getBoundingClientRect().top + window.scrollY
      
      window.scrollTo({
        top: sectionTop - headerHeight,
        behavior: 'smooth'
      })
    }
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleServiceClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, isMobile: boolean = false) => {
    e.preventDefault()
    scrollToSection('#services', isMobile)
  }

  return (
    <header className="bg-blue-900 fixed top-0 left-0 w-full z-50 shadow-lg">
      <nav aria-label="Global" className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex lg:flex-1">
          <a href="#" className="p-0 absolute left-1/2 -translate-x-1/2 lg:static lg:translate-x-0" onClick={handleLogoClick}>
            <span className="sr-only">PrintEase</span>
            <img
              alt="PrintEase Logo"
              src="/src/assets/PrintEase-logo-light.png"
              className="h-10 w-auto cursor-pointer transition-transform hover:scale-105"
            />
          </a>
        </div>
        <div className="flex sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white hover:bg-blue-800 transition-colors"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>
        <PopoverGroup className="hidden sm:flex lg:hidden sm:gap-x-8">
          {/* SERVICES FIRST */}
          <Popover className="relative">
            <PopoverButton className="flex items-center gap-x-1 text-base font-semibold text-white hover:text-blue-200 transition-colors focus:outline-none focus:ring-0">
              Services
              <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-blue-300" />
            </PopoverButton>
            <PopoverPanel
              transition
              className="absolute left-1/2 z-10 mt-8 w-screen max-w-md -translate-x-1/2 top-12 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-900/5 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
            >
              <div className="p-4">
                {services.map((item) => (
                  <div key={item.name} className="group relative flex flex-col gap-y-2 rounded-lg p-4 text-sm/6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-x-6">
                      <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                        {React.isValidElement(item.icon)
                          ? React.cloneElement(item.icon, { className: "size-6 text-blue-600 group-hover:text-blue-700", 'aria-hidden': true })
                          : null}
                      </div>
                      <div className="flex-auto">
                        <a 
                          href={item.href} 
                          className="block font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          onClick={(e) => handleServiceClick(e)}
                        >
                          {item.name}
                          <span className="absolute inset-0" />
                        </a>
                        <p className="mt-1 text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverPanel>
          </Popover>
          {/* ABOUT SECOND */}
          <a href="#about" className="text-base font-semibold text-white hover:text-blue-200 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection('#about'); }}>
            About
          </a>
          <a href="#feedback" className="text-base font-semibold text-white hover:text-blue-200 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection('#feedback'); }}>
            Feedback
          </a>
          <a href="#contact" className="text-base font-semibold text-white hover:text-blue-200 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection('#contact'); }}>
            Contact
          </a>
          {/* LOGIN BUTTON */}
          <button
            onClick={() => navigate('/login')}
            className="text-base font-semibold text-white hover:text-blue-200 transition-colors"
          >
            Log In
          </button>
        </PopoverGroup>
        <PopoverGroup className="hidden lg:flex lg:gap-x-8 lg:items-center"> 
          {/* SERVICES FIRST */}
          <Popover className="relative">
            <PopoverButton className="flex items-center gap-x-1 text-base font-semibold text-white hover:text-blue-200 transition-colors focus:outline-none focus:ring-0">
              Services
              <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-blue-300" />
            </PopoverButton>
            <PopoverPanel
              transition
              className="absolute left-1/2 z-10 mt-8 w-screen max-w-md -translate-x-1/2 top-12 overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-900/5 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
            >
              <div className="p-4">
                {services.map((item) => (
                  <div key={item.name} className="group relative flex flex-col gap-y-2 rounded-lg p-4 text-sm/6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-x-6">
                      <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                        {React.isValidElement(item.icon)
                          ? React.cloneElement(item.icon, { className: "size-6 text-blue-600 group-hover:text-blue-700", 'aria-hidden': true })
                          : null}
                      </div>
                      <div className="flex-auto">
                        <a 
                          href={item.href} 
                          className="block font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          onClick={(e) => handleServiceClick(e)}
                        >
                          {item.name}
                          <span className="absolute inset-0" />
                        </a>
                        <p className="mt-1 text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverPanel>
          </Popover>
          {/* ABOUT SECOND */}
          <a href="#about" className="text-base font-semibold text-white hover:text-blue-200 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection('#about'); }}>
            About
          </a>
          <a href="#feedback" className="text-base font-semibold text-white hover:text-blue-200 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection('#feedback'); }}>
            Feedback
          </a>
          <a href="#contact" className="text-base font-semibold text-white hover:text-blue-200 transition-colors" onClick={(e) => { e.preventDefault(); scrollToSection('#contact'); }}>
            Contact
          </a>
          {/* LOGIN BUTTON - Next to Contact */}
          <button
            onClick={() => navigate('/login')}
            className="text-base font-semibold text-white border border-white/50 rounded-lg px-4 py-2 hover:bg-white/10 hover:border-white/70 transition-all duration-200"
          >
            Log In
          </button>
        </PopoverGroup>
      </nav>
      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="sm:hidden">
        <div className="fixed inset-0 z-50" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-blue-900 p-6 sm:max-w-sm sm:ring-1 sm:ring-white/10">
          <div className="flex items-center justify-between">
            <a href="#" className="p-0" onClick={handleLogoClick}>
              <span className="sr-only">PrintEase</span>
              <img
                alt="PrintEase Logo"
                src="/src/assets/PrintEase-logo-light.png"
                className="h-10 w-auto cursor-pointer"
              />
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-white hover:bg-blue-800 transition-colors"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-blue-500/20">
              <div className="space-y-2 py-6">
                {/* SERVICES FIRST */}
                <Disclosure as="div" className="-mx-3">
                  <DisclosureButton className="group flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-white hover:bg-blue-800 transition-colors">
                    Services
                    <ChevronDownIcon aria-hidden="true" className="size-5 flex-none group-data-open:rotate-180 transition-transform" />
                  </DisclosureButton>
                  <DisclosurePanel className="mt-2 space-y-2">
                    {services.map((item) => (
                      <DisclosureButton
                        key={item.name}
                        as="a"
                        href="#services"
                        className="block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-white hover:bg-blue-800 transition-colors"
                        onClick={(e) => { e.preventDefault(); handleServiceClick(e, true); }}
                      >
                        {item.name}
                      </DisclosureButton>
                    ))}
                  </DisclosurePanel>
                </Disclosure>
                {/* ABOUT SECOND */}
                <a
                  href="#about"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-blue-800 transition-colors"
                  onClick={(e) => { e.preventDefault(); scrollToSection('#about', true); }}
                >
                  About
                </a>
                <a
                  href="#feedback"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-blue-800 transition-colors"
                  onClick={(e) => { e.preventDefault(); scrollToSection('#feedback', true); }}
                >
                  Feedback
                </a>
                <a
                  href="#contact"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-blue-800 transition-colors"
                  onClick={(e) => { e.preventDefault(); scrollToSection('#contact', true); }}
                >
                  Contact
                </a>
                {/* LOGIN BUTTON IN MOBILE */}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/login')
                  }}
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-blue-800 transition-colors w-full text-left"
                >
                  Log In
                </button>
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  )
}