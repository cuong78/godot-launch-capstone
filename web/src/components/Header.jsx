import React from "react";
import {
  ShoppingCart,
  Bell,
  Search,
  SquareTerminal,
  Settings,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useNotification } from "../hooks/useNotification";
import { useCart } from "../hooks/useCart";

export default function Header() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const { unreadCount, setIsNotificationOpen } = useNotification();
  const { cartCount, setIsCartOpen } = useCart();

  return (
    <nav className="bg-surface/80 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(0,242,255,0.15)] docked full-width top-0 z-50 fixed w-full">
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
        <Link
          to={isAdmin ? "/admin" : "/"}
          className={`font-display-lg text-headline-md uppercase tracking-widest ${isAdmin ? "text-primary-fixed-dim drop-shadow-[0_0_8px_rgba(0,219,231,0.5)] font-black" : "text-surface-tint"}`}
        >
          {isAdmin ? "GLITCH_ADMIN" : "INDIE_CORE"}
        </Link>

        {isAdmin && (
          <div className="hidden md:flex relative items-center ml-4">
            <Search className="absolute left-3 text-on-surface-variant/70 w-4 h-4 text-sm" />
            <input
              className="bg-surface-container-low border border-outline-variant/50 text-on-surface focus:border-primary-container focus:outline-none focus:ring-1 focus:ring-primary-container focus:shadow-[0_0_15px_rgba(0,242,255,0.3)] rounded py-1.5 pl-9 pr-4 font-label-sm text-label-sm w-48 lg:w-64 transition-all placeholder:text-on-surface-variant/50"
              placeholder="Query DB..."
              type="text"
            />
          </div>
        )}

        {isAdmin ? (
          <div className="hidden lg:flex gap-8 items-center font-label-sm text-label-sm ml-auto mr-8">
            <Link
              to="/admin/moderation"
              className={
                location.pathname === "/admin/moderation"
                  ? "text-primary-fixed border-b-2 border-primary-fixed-dim pb-1 shadow-[0_2px_10px_rgba(0,219,231,0.3)] brightness-125 transition-all"
                  : "text-on-surface-variant/70 hover:text-on-surface transition-all duration-300"
              }
            >
              Moderation
            </Link>
            <Link
              to="/admin/finance"
              className={
                location.pathname === "/admin/finance"
                  ? "text-primary-fixed border-b-2 border-primary-fixed-dim pb-1 shadow-[0_2px_10px_rgba(0,219,231,0.3)] brightness-125 transition-all"
                  : "text-on-surface-variant/70 hover:text-on-surface transition-all duration-300"
              }
            >
              Finance
            </Link>
            <Link
              to="/admin"
              className={
                location.pathname === "/admin"
                  ? "text-primary-fixed border-b-2 border-primary-fixed-dim pb-1 shadow-[0_2px_10px_rgba(0,219,231,0.3)] brightness-125 transition-all"
                  : "text-on-surface-variant/70 hover:text-on-surface transition-all duration-300"
              }
            >
              Users
            </Link>
            <Link
              to="/admin/logs"
              className={
                location.pathname === "/admin/logs"
                  ? "text-primary-fixed border-b-2 border-primary-fixed-dim pb-1 shadow-[0_2px_10px_rgba(0,219,231,0.3)] brightness-125 transition-all"
                  : "text-on-surface-variant/70 hover:text-on-surface transition-all duration-300"
              }
            >
              Logs
            </Link>
          </div>
        ) : (
          <div className="hidden md:flex gap-8 items-center font-label-sm text-label-sm">
            <Link
              to="/"
              className={`transition-all duration-300 ease-in-out active:scale-95 ${
                location.pathname === "/"
                  ? "text-surface-tint font-bold border-b-2 border-surface-tint pb-1 hover:text-primary-fixed-dim"
                  : "text-on-surface-variant font-medium hover:text-primary-fixed-dim"
              }`}
            >
              Store
            </Link>
            <Link
              to="/library"
              className={`transition-all duration-300 ease-in-out active:scale-95 ${
                location.pathname === "/library"
                  ? "text-surface-tint font-bold border-b-2 border-surface-tint pb-1 hover:text-primary-fixed-dim"
                  : "text-on-surface-variant font-medium hover:text-primary-fixed-dim"
              }`}
            >
              Library
            </Link>
            <Link
              to="/community"
              className={`transition-all duration-300 ease-in-out active:scale-95 ${
                location.pathname === "/community"
                  ? "text-surface-tint font-bold border-b-2 border-surface-tint pb-1 hover:text-primary-fixed-dim"
                  : "text-on-surface-variant font-medium hover:text-primary-fixed-dim"
              }`}
            >
              Community
            </Link>
            <Link
              to="/dev-portal"
              className={`transition-all duration-300 ease-in-out active:scale-95 ${
                location.pathname.startsWith("/dev-portal")
                  ? "text-surface-tint font-bold border-b-2 border-surface-tint pb-1 hover:text-primary-fixed-dim"
                  : "text-on-surface-variant font-medium hover:text-primary-fixed-dim"
              }`}
            >
              Dev Portal
            </Link>
          </div>
        )}

        <div className="flex items-center gap-6">
          {!isAdmin && (
            <button className="hidden md:block font-label-sm text-label-sm text-surface-tint border border-surface-tint/50 px-4 py-2 rounded uppercase tracking-widest hover:bg-surface-tint/10 transition-colors">
              Support Dev
            </button>
          )}
          <div className="flex items-center gap-4 text-surface-tint">
            {isAdmin ? (
              <>
                <button
                  onClick={() => setIsNotificationOpen(true)}
                  className="relative hover:text-primary-fixed-dim transition-all duration-300 text-on-surface-variant/70"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 bg-error text-on-error text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button className="hover:text-primary-fixed-dim transition-all duration-300 text-on-surface-variant/70 hidden sm:block">
                  <SquareTerminal className="w-5 h-5" />
                </button>
                <button className="hover:text-primary-fixed-dim transition-all duration-300 text-on-surface-variant/70 hidden sm:block">
                  <Settings className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="relative hover:text-primary-fixed-dim transition-all duration-300 active:scale-95"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-error text-on-error text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(229,57,57,0.6)]">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setIsNotificationOpen(true)}
                  className="relative hover:text-primary-fixed-dim transition-all duration-300 active:scale-95"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-error text-on-error text-xs font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(229,57,57,0.6)]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              </>
            )}
            <Link
              to="/login"
              className="w-8 h-8 rounded-full bg-surface-container overflow-hidden border border-white/10 block hover:border-surface-tint transition-all cursor-pointer flex-shrink-0"
            >
              <img
                alt="User profile"
                className="w-full h-full object-cover"
                src={
                  isAdmin
                    ? "https://lh3.googleusercontent.com/aida-public/AB6AXuCa1cAURjwqpEFrc2Tu_jVVbf55otNZTIZ2kSxnLml55ukqSwTyS5xRwkw0OUHPx7UcdWjOOjVeenxKDMBnpQzIle6iXJV5B3UmaUzAG1tenx-Cb5XEimErcZSMg42qNoMjE3n1QOn3IOtZ3HEUxeTD4_RO09qARz9QOn6brVk0Z9AgnNJqd4lp1sF9Uskb2-QN7t7nkjEQ_dbzG9bVOtZcfwQ9lWrRRuj1pRmt6yCbE3L59UzqrgGbXeqGfEPLHZGuya3hsCxL0MrU"
                    : "https://lh3.googleusercontent.com/aida-public/AB6AXuCbd2dT12ZtEf7c-mfxRSvXg2Fn5K64gg5sl24X3AEZbXN2TEtuJ-f9FVI9IsIMgSdHtbmj1OY4EPIU47YJ-SLFnn5lQSkmidlsoIpjrqCodm2AC9tU1s7RpJllR68lvcUXuBkngh5ml8HABcGICSnTBzCosIeDlx9BpKN5f8O_NiKTU0z7lS9JDulDJIDbsGMrPZHrU94xoSmGCwJ9JJjxHO5GQuAtq1Gd70ks3iGCg-JDCsC34-owmdY3jaOPqSurwOuvF_ZAWqyV"
                }
              />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
