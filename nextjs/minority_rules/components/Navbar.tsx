"use client";

import { Profile, Connect, useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const { user } = useFlowCurrentUser();
  const isLoggedIn = user?.loggedIn;
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/create", label: "Create Game", authRequired: true },
    { href: "/games", label: "Browse Games", authRequired: true },
    { href: "/my-games", label: "My Games", authRequired: true },
  ];

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const visibleLinks = navLinks.filter(link => !link.authRequired || isLoggedIn);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 relative z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* App Title */}
          <div className="flex-shrink-0">
            <Link href="/">
              <h1 className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                Minority Rule Game
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {visibleLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActiveLink(link.href)
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile menu button and Auth */}
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>

            {/* Auth Components */}
            <div className="flex-shrink-0 relative">
              {isLoggedIn ? (
                <div className="relative">
                  <Profile
                    balanceType="combined"
                    onDisconnect={() => console.log("User disconnected")}
                    balanceTokens={[
                      {
                        symbol: "FLOW",
                        name: "Flow Token", 
                        vaultIdentifier: "A.1654653399040a61.FlowToken.Vault",
                      },
                    ]}
                  />
                </div>
              ) : (
                <Connect
                  balanceTokens={[
                    {
                      symbol: "FLOW",
                      name: "Flow Token",
                      vaultIdentifier: "A.1654653399040a61.FlowToken.Vault",
                    },
                  ]}
                  balanceType="combined"
                />
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 bg-white">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}