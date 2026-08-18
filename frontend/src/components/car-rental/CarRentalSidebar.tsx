"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Car,
  Users,
  CalendarCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  X,
  Fuel,
  Wrench,
  FileText,
  MapPin,
} from "lucide-react";

interface CarRentalSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onCloseMobile?: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/car-rental", icon: LayoutDashboard },
  { name: "Vehicles", href: "/car-rental/vehicles", icon: Car },
  { name: "Bookings", href: "/car-rental/bookings", icon: CalendarCheck },
  { name: "Customers", href: "/car-rental/customers", icon: Users },
  { name: "Fleet Status", href: "/car-rental/fleet", icon: Fuel },
  { name: "Maintenance", href: "/car-rental/maintenance", icon: Wrench },
  { name: "Locations", href: "/car-rental/locations", icon: MapPin },
  { name: "Reports", href: "/car-rental/reports", icon: BarChart3 },
  { name: "Invoices", href: "/car-rental/invoices", icon: FileText },
  { name: "Settings", href: "/car-rental/settings", icon: Settings },
];

export function CarRentalSidebar({ collapsed = false, onToggle, onCloseMobile }: CarRentalSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "bg-[var(--color-primary)] text-slate-100 flex flex-col h-full w-full border-r border-slate-700/50 shadow-xl transition-all duration-300"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent)] to-red-700 flex items-center justify-center shadow-lg shadow-red-500/30 shrink-0">
            <Car className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <h1 className="font-display font-bold text-base tracking-wide text-white leading-tight">EasyRent</h1>
              <p className="text-[11px] text-slate-400 font-medium truncate">Car Rental System</p>
            </div>
          )}
        </div>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {onToggle && !onCloseMobile && (
          <button
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg hidden lg:block transition-colors"
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? (
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/car-rental" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              title={collapsed ? item.name : undefined}
              className={clsx(
                "flex items-center rounded-xl text-sm font-medium transition-all duration-150 group relative",
                collapsed ? "justify-center p-3" : "justify-between px-3.5 py-2.5",
                isActive
                  ? "bg-[var(--color-accent)] text-white shadow-md shadow-red-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={clsx(
                    "w-5 h-5 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-white" : "text-slate-400"
                  )}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </div>
              {!collapsed && isActive && <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-slate-700/50">
        <button
          className={clsx(
            "w-full flex items-center rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors",
            collapsed ? "justify-center p-3" : "gap-3 px-3.5 py-2.5"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
