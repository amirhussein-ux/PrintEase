'use client'

import React, { useState } from 'react'
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
  ArrowPathIcon,
  Bars3Icon,
  ChartPieIcon,
  CursorArrowRaysIcon,
  FingerPrintIcon,
  SquaresPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { ChevronDownIcon, PlayCircleIcon } from '@heroicons/react/20/solid'
import { BsQrCode } from "react-icons/bs";
import { MdOutlineManageSearch } from "react-icons/md";
import { GrDocumentCloud } from "react-icons/gr";
import { FiShoppingCart } from "react-icons/fi";



const products = [
  { name: 'Stickers', description: 'High-quality printing solutions', href: '#', icon: ChartPieIcon },
  { name: 'T-Shirt', description: 'Custom design services for your needs', href: '#', icon: CursorArrowRaysIcon },
  { name: 'Motorplate', description: 'Promotional materials to boost your brand', href: '#', icon: FingerPrintIcon },
  { name: 'Customized Notepads', description: 'Innovative packaging designs and solutions', href: '#', icon: SquaresPlusIcon },
  { name: 'PVC ID', description: 'Fast and efficient digital printing services', href: '#', icon: ArrowPathIcon },
  { name: 'Customized Ref Magnet', description: 'Fast and efficient digital printing services', href: '#', icon: ArrowPathIcon },
  { name: 'Calling, Loyalty, and Membership Cards', description: 'Fast and efficient digital printing services', href: '#', icon: ArrowPathIcon },
  { name: 'Tarpaulin', description: 'Fast and efficient digital printing services', href: '#', icon: ArrowPathIcon },
  { name: 'Customized Mousepad', description: 'Fast and efficient digital printing services', href: '#', icon: ArrowPathIcon },
  { name: 'Mugs', description: 'Fast and efficient digital printing services', href: '#', icon: ArrowPathIcon },
  { name: 'LTFRB Sticker', description: 'Fast and efficient digital printing services', href: '#', icon: ArrowPathIcon },
];

const services = [
  { name: 'QR Code Pickup', description: 'Streamline business transactions with our QR code system', href: '#', icon: <BsQrCode /> },
  { name: 'Queue Management', description: 'Optimize your workflow with our queue management system', href: '#', icon: <MdOutlineManageSearch /> },
  { name: 'Document Cloud Integration', description: 'Seamlessly integrate with popular cloud services like Google Drive, Dropbox, and OneDrive', href: '#', icon: <GrDocumentCloud /> },
  {
    name: 'Products',
    description: 'Our product offerings',
    href: '#',
    icon: <FiShoppingCart />,
    products: products
  }
];
const callsToAction = [
  { name: 'Watch demo', href: '#', icon: PlayCircleIcon },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Scroll to top handler
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  // Scroll to About section with offset for fixed header
  const handleAboutClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, isMobile: boolean = false) => {
    e.preventDefault();
    const aboutSection = document.querySelector('h2');
    if (aboutSection) {
      const header = document.querySelector('header');
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      const sectionTop = aboutSection.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: sectionTop - headerHeight,
        behavior: 'smooth'
      });
    }
    if (isMobile) setMobileMenuOpen(false);
  };
  return (
    <header className="bg-blue-900 fixed top-0 left-0 w-full z-50">
      <nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
        <div className="flex lg:flex-1">
          <a href="#" className="-m-1.5 p-1.5" onClick={handleLogoClick}>
            <span className="sr-only">PrintEase</span>
            <img
              alt="PrintEase Logo"
              src="/src/assets/PrintEase-Logo.png"
              className="h-8 w-auto cursor-pointer"
            />
          </a>
        </div>
        <div className="flex sm:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="size-6" />
          </button>
        </div>
        <PopoverGroup className="hidden sm:flex lg:hidden sm:gap-x-8">
          {/* Home button removed */}
          <a href="#about" className="text-base font-semibold text-white" onClick={(e) => handleAboutClick(e)}>
            About
          </a>
          <Popover className="relative">
            <PopoverButton className="flex items-center gap-x-1 text-base font-semibold text-white focus:outline-none focus:ring-0">
              Services
              <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-gray-400" />
            </PopoverButton>
            <PopoverPanel
              transition
              className="absolute left-1/2 z-10 mt-8 w-screen max-w-md -translate-x-1/2 top-12 overflow-hidden rounded-3xl bg-white shadow-lg outline-1 outline-gray-900/5 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
            >
              <div className="p-4">
                {services.map((item) => (
                  item.products ? (
                    <Disclosure key={item.name} as="div" className="group relative flex flex-col gap-y-2 rounded-lg p-4 text-sm/6 hover:bg-gray-50">
                      <DisclosureButton className="flex items-center gap-x-6 w-full">
                        <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                          {typeof item.icon === 'function'
                            ? <item.icon aria-hidden="true" className="size-6 text-gray-600 group-hover:text-indigo-600" />
                            : React.isValidElement(item.icon)
                              ? React.cloneElement(item.icon, { className: "size-6 text-gray-600 group-hover:text-indigo-600", 'aria-hidden': true })
                              : null}
                        </div>
                        <div className="flex-auto text-left">
                          <span className="block font-semibold text-gray-900">{item.name}</span>
                          <p className="mt-1 text-gray-600">{item.description}</p>
                        </div>
                        <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-gray-400 group-data-open:rotate-180 transition-transform" />
                      </DisclosureButton>
                      <DisclosurePanel className="ml-12 mt-2 flex flex-col gap-y-1">
                        {item.products.map((prod) => (
                          <a key={prod.name} href={prod.href} className="flex items-center gap-x-2 text-sm text-gray-700 hover:text-indigo-600">
                            {typeof prod.icon === 'function'
                              ? <prod.icon aria-hidden="true" className="size-4 text-gray-400" />
                              : React.isValidElement(prod.icon)
                                ? React.cloneElement(prod.icon, { className: "size-4 text-gray-400", 'aria-hidden': true })
                                : null}
                            {prod.name}
                          </a>
                        ))}
                      </DisclosurePanel>
                    </Disclosure>
                  ) : (
                    <div key={item.name} className="group relative flex flex-col gap-y-2 rounded-lg p-4 text-sm/6 hover:bg-gray-50">
                      <div className="flex items-center gap-x-6">
                        <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                          {typeof item.icon === 'function'
                            ? <item.icon aria-hidden="true" className="size-6 text-gray-600 group-hover:text-indigo-600" />
                            : React.isValidElement(item.icon)
                              ? React.cloneElement(item.icon, { className: "size-6 text-gray-600 group-hover:text-indigo-600", 'aria-hidden': true })
                              : null}
                        </div>
                        <div className="flex-auto">
                          <a href={item.href} className="block font-semibold text-gray-900">
                            {item.name}
                            <span className="absolute inset-0" />
                          </a>
                          <p className="mt-1 text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
              <div className="bg-gray-50">
                {callsToAction.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center justify-center gap-x-2.5 p-3 text-sm/6 font-semibold text-gray-900 hover:bg-gray-100 w-full"
                  >
                    <item.icon aria-hidden="true" className="size-5 flex-none text-gray-400" />
                    {item.name}
                  </a>
                ))}
              </div>
            </PopoverPanel>
          </Popover>
          <a href="#" className="text-base font-semibold text-white">
            Feedback
          </a>
          <a href="#" className="text-base font-semibold text-white">
            Contact
          </a>
        </PopoverGroup>
        <PopoverGroup className="hidden lg:flex lg:gap-x-12"> 
          <a href="#about" className="text-base font-semibold text-white" onClick={(e) => handleAboutClick(e)}>
            About
          </a>
          <Popover className="relative">
            <PopoverButton className="flex items-center gap-x-1 text-base font-semibold text-white focus:outline-none focus:ring-0">
              Services
              <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-gray-400" />
            </PopoverButton>
            <PopoverPanel
              transition
              className="absolute left-1/2 z-10 mt-8 w-screen max-w-md -translate-x-1/2 top-12 overflow-hidden rounded-3xl bg-white shadow-lg outline-1 outline-gray-900/5 transition data-closed:translate-y-1 data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-150 data-leave:ease-in"
            >
              <div className="p-4">
                {services.map((item) => (
                  item.products ? (
                    <Disclosure key={item.name} as="div" className="group relative flex flex-col gap-y-2 rounded-lg p-4 text-sm/6 hover:bg-gray-50">
                      <DisclosureButton className="flex items-center gap-x-6 w-full">
                        <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                          {typeof item.icon === 'function'
                            ? <item.icon aria-hidden="true" className="size-6 text-gray-600 group-hover:text-indigo-600" />
                            : React.isValidElement(item.icon)
                              ? React.cloneElement(item.icon, { className: "size-6 text-gray-600 group-hover:text-indigo-600", 'aria-hidden': true })
                              : null}
                        </div>
                        <div className="flex-auto text-left">
                          <span className="block font-semibold text-gray-900">{item.name}</span>
                          <p className="mt-1 text-gray-600">{item.description}</p>
                        </div>
                        <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-gray-400 group-data-open:rotate-180 transition-transform" />
                      </DisclosureButton>
                      <DisclosurePanel className="ml-12 mt-2 flex flex-col gap-y-1">
                        {item.products.map((prod) => (
                          <a key={prod.name} href={prod.href} className="flex items-center gap-x-2 text-sm text-gray-700 hover:text-indigo-600">
                            {typeof prod.icon === 'function'
                              ? <prod.icon aria-hidden="true" className="size-4 text-gray-400" />
                              : React.isValidElement(prod.icon)
                                ? React.cloneElement(prod.icon, { className: "size-4 text-gray-400", 'aria-hidden': true })
                                : null}
                            {prod.name}
                          </a>
                        ))}
                      </DisclosurePanel>
                    </Disclosure>
                  ) : (
                    <div key={item.name} className="group relative flex flex-col gap-y-2 rounded-lg p-4 text-sm/6 hover:bg-gray-50">
                      <div className="flex items-center gap-x-6">
                        <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                          {typeof item.icon === 'function'
                            ? <item.icon aria-hidden="true" className="size-6 text-gray-600 group-hover:text-indigo-600" />
                            : React.isValidElement(item.icon)
                              ? React.cloneElement(item.icon, { className: "size-6 text-gray-600 group-hover:text-indigo-600", 'aria-hidden': true })
                              : null}
                        </div>
                        <div className="flex-auto">
                          <a href={item.href} className="block font-semibold text-gray-900">
                            {item.name}
                            <span className="absolute inset-0" />
                          </a>
                          <p className="mt-1 text-gray-600">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
              <div className="bg-gray-50">
                {callsToAction.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center justify-center gap-x-2.5 p-3 text-sm/6 font-semibold text-gray-900 hover:bg-gray-100 w-full"
                  >
                    <item.icon aria-hidden="true" className="size-5 flex-none text-gray-400" />
                    {item.name}
                  </a>
                ))}
              </div>
            </PopoverPanel>
          </Popover>
          <a href="#" className="text-base font-semibold text-white">
            Feedback
          </a>
          <a href="#" className="text-base font-semibold text-white">
            Contact
          </a>
        </PopoverGroup>
      </nav>
      <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="sm:hidden">
        <div className="fixed inset-0 z-50" />
        <DialogPanel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-blue-900 p-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between">
            <a href="#" className="-m-1.5 p-1.5" onClick={handleLogoClick}>
              <span className="sr-only">PrintEase</span>
              <img
                alt="PrintEase Logo"
                src="src/assets/PrintEase-Logo.png"
                className="h-8 w-auto cursor-pointer"
              />
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-white"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">               
                {/* Home button removed */}
                <a
                  href="#about"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-gray-50 hover:text-black"
                  onClick={(e) => handleAboutClick(e, true)}
                >
                  About
                </a>
                <Disclosure as="div" className="-mx-3">
                  <DisclosureButton className="group flex w-full items-center justify-between rounded-lg py-2 pr-3.5 pl-3 text-base/7 font-semibold text-white hover:bg-gray-50 hover:text-black">

                    Services
                    <ChevronDownIcon aria-hidden="true" className="size-5 flex-none group-data-open:rotate-180" />
                  </DisclosureButton>
                  <DisclosurePanel className="mt-2 space-y-2">
                    {[...services, ...callsToAction].map((item) => (
                      <div key={item.name}>
                        {item.products ? (
                          <Disclosure as="div">
                            <DisclosureButton className="group flex w-full items-center justify-between rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-white hover:bg-gray-50 hover:text-black" style={{paddingLeft: '1.5rem'}}>
                              {item.name}
                              <ChevronDownIcon aria-hidden="true" className="size-4 flex-none group-data-open:rotate-180" />
                            </DisclosureButton>
                            <DisclosurePanel className="mt-1 space-y-1">
                              <div className="bg-white rounded-lg p-2 grid grid-cols-2 gap-2">
                                {item.products.map((prod) => (
                                  <Disclosure as="div" key={prod.name}>
                                    <DisclosureButton
                                      className="flex items-center rounded-lg py-2 px-4 text-sm text-black w-full whitespace-normal transition-colors duration-150 hover:bg-blue-900 hover:text-white"
                                      style={{ justifyContent: 'flex-start' }}
                                    >
                                      <span className="block w-full text-left">{prod.name}</span>
                                    </DisclosureButton>
                                  </Disclosure>
                                ))}
                              </div>
                            </DisclosurePanel>
                          </Disclosure>
                        ) : (
                          <DisclosureButton
                            as="a"
                            href={item.href}
                            className="block rounded-lg py-2 pr-3 pl-6 text-sm/7 font-semibold text-white hover:bg-gray-50 hover:text-black"
                          >
                            {item.name}
                          </DisclosureButton>
                        )}
                      </div>
                    ))}
                  </DisclosurePanel>
                </Disclosure>
                <a
                  href="#"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-gray-50 hover:text-black"
                >
                  Feedback
                </a>
                <a
                  href="#"
                  className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-white hover:bg-gray-50 hover:text-black"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>
        </DialogPanel>
      </Dialog>
    </header>
  )
}
