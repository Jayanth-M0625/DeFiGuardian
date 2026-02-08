"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { MobileMenu } from "./MobileMenu";

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
  </svg>
);

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
  </svg>
);

const navLinks = [
  { href: "/explorer", label: "Explorer", title: "Web3 transaction explorer" },
  { href: "/integrations", label: "Integrations", title: "Integrations" },
  { href: "/dashboard", label: "Dashboard", title: "Dashboard" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="flex items-center sticky top-0 z-50 justify-between whitespace-nowrap border-b border-solid border-border bg-surface px-4 md:px-6 lg:px-10 py-3 gap-4">
        <div className="flex items-center gap-4 lg:gap-8 min-w-0 shrink-0">
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-white shrink-0" title="deGuard – Home">
            <Image
              src="/logo_defi.svg"
              alt="deGuard"
              width={18}
              height={28}
              className="h-[22px] w-auto object-contain brightness-0 invert"
              unoptimized
            />
            <h2 className="text-white text-base md:text-lg font-bold leading-tight tracking-[-0.015em]">
              deGuard
            </h2>
          </Link>
          <nav className="hidden lg:flex items-center gap-6 xl:gap-9">
            {navLinks.map(({ href, label, title }) => (
              <Link
                key={label}
                href={href}
                title={title}
                className="text-white text-sm font-medium leading-normal hover:text-brand transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden md:flex flex-1 justify-center px-4 max-w-2xl w-full min-w-0">
          <label className="flex w-full flex-col h-12">
            <div className="flex w-full h-full items-stretch rounded-xl overflow-hidden bg-input border border-border focus-within:border-brand/50 transition-colors">
              <div className="text-muted flex items-center justify-center pl-4 shrink-0">
                <SearchIcon />
              </div>
              <input
                placeholder="Search by address, tx hash, block..."
                type="search"
                className="form-input flex w-full min-w-0 flex-1 bg-transparent text-white focus:outline-0 focus:ring-0 border-none placeholder:text-muted px-3 text-base font-normal"
              />
            </div>
          </label>
        </div>
        <div className="flex items-center gap-2 md:gap-4 lg:gap-6 shrink-0">
          <button
            id="nav-search-btn"
            className="md:hidden flex cursor-pointer items-center justify-center rounded-full h-10 w-10 bg-input text-white"
            aria-label="Search by address, tx hash, or block"
          >
            <SearchIcon />
          </button>
          <button
            className="flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-input text-white hover:bg-inputHover transition-colors"
            aria-label="Notifications"
          >
            <BellIcon />
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="lg:hidden flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-input text-white hover:bg-inputHover transition-colors"
            aria-label="Menu"
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          <div className="hidden md:block h-10 w-10 shrink-0 rounded-full bg-input border border-border" aria-hidden />
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
