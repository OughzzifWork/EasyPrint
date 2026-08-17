"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { PanelLeftClose, PanelLeft, Menu } from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
    <div className="flex h-screen h-[100dvh] w-full bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out lg:static lg:z-auto h-full bg-slate-900 shrink-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${isSidebarCollapsed ? "w-20" : "w-64"}`}
      >
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between border-b border-slate-800 lg:hidden shrink-0">
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

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
