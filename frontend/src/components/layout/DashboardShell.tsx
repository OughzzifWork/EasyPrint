"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { PanelLeftClose, PanelLeft, Menu } from "lucide-react";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 1024) setIsMobileOpen(false); };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) setIsMobileOpen(!isMobileOpen);
    else setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen h-[100dvh] w-full bg-[#FAFBFF] text-slate-900 font-sans relative overflow-hidden">
      {isMobileOpen && (
        <div onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-40 lg:hidden" />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out lg:static lg:z-auto h-full shrink-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"} ${isSidebarCollapsed ? "w-[72px]" : "w-60"}`}>
        <Sidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} onCloseMobile={() => setIsMobileOpen(false)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        <div className="glass text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-100 lg:hidden shrink-0" style={{ background: "rgba(30,41,59,0.95)" }}>
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors flex items-center gap-2">
              <Menu className="w-4 h-4" /><span className="text-xs font-semibold">Menu</span>
            </button>
            <span className="font-bold text-sm font-display">EasyPrint</span>
          </div>
        </div>
        <div className="relative">
          <button onClick={toggleSidebar}
            className={`hidden lg:flex fixed top-3 z-30 p-1.5 bg-white hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-r-xl border border-l-0 border-slate-200 shadow-sm transition-all duration-300 items-center group ${isSidebarCollapsed ? "left-[72px]" : "left-60"}`}
            title={isSidebarCollapsed ? "Déplier" : "Masquer"}>
            {isSidebarCollapsed ? <PanelLeft className="w-3.5 h-3.5 group-hover:text-blue-500" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
          </button>
        </div>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
