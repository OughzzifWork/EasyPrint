"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { PanelLeftClose, PanelLeft, Menu, X } from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  // Desktop collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Mobile drawer state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto handle window resize for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-x-hidden">
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Desktop & Mobile Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out lg:static lg:z-auto ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isSidebarCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top bar with Toggle Button for Mobile & Desktop */}
        <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between border-b border-slate-800 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors flex items-center gap-2"
              title="Afficher/Masquer le menu"
            >
              <Menu className="w-5 h-5 text-blue-400" />
              <span className="text-xs font-bold">Menu</span>
            </button>
            <span className="font-bold text-sm tracking-wide text-white">IMPCE Web</span>
          </div>
        </div>

        {/* Global Floating/Header Toggle Button for Desktop when collapsed or expanding */}
        <div className="relative">
          <button
            onClick={toggleSidebar}
            className={`hidden lg:flex fixed top-4 z-30 p-2 bg-slate-900 text-white hover:bg-blue-600 rounded-r-xl border border-l-0 border-slate-700 shadow-lg transition-all duration-300 items-center gap-1.5 group ${
              isSidebarCollapsed ? "left-20" : "left-64"
            }`}
            title={isSidebarCollapsed ? "Déplier le menu latéral" : "Masquer / Réduire le menu latéral"}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="w-4 h-4 text-blue-400 group-hover:text-white" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-300 group-hover:text-white" />
            )}
          </button>
        </div>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
