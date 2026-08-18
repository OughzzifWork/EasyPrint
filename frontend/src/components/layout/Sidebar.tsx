"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  FileCheck2, FileSpreadsheet, Building2, LayoutTemplate, Users,
  History, LayoutDashboard, LogOut, ChevronRight, ShieldCheck,
  Building, Printer, UserCheck, PanelLeftClose, PanelLeft, X, Landmark,
} from "lucide-react";
import { clsx } from "clsx";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onCloseMobile?: () => void;
}

export function Sidebar({ collapsed = false, onToggle, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role || "VISITEUR";

  const navigation = [
    { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "COMPTABLE", "VISITEUR"], color: "text-blue-500" },
    { name: "Chèques", href: "/dashboard/cheques", icon: FileCheck2, roles: ["ADMIN", "COMPTABLE", "VISITEUR"], color: "text-emerald-500" },
    { name: "Effets (LCN)", href: "/dashboard/effets", icon: FileSpreadsheet, roles: ["ADMIN", "COMPTABLE", "VISITEUR"], color: "text-orange-500" },
    { name: "Banques", href: "/dashboard/banks", icon: Building2, roles: ["ADMIN", "COMPTABLE", "VISITEUR"], color: "text-violet-500" },
    { name: "Bénéficiaires", href: "/dashboard/beneficiaries", icon: UserCheck, roles: ["ADMIN", "COMPTABLE", "VISITEUR"], color: "text-pink-500" },
    { name: "Modèles d'impression", href: "/dashboard/templates", icon: LayoutTemplate, roles: ["ADMIN", "COMPTABLE", "VISITEUR"], color: "text-blue-500" },
    { name: "Paramètres", href: "/dashboard/printer-settings", icon: Printer, roles: ["ADMIN"], color: "text-emerald-500" },
    { name: "Utilisateurs", href: "/dashboard/users", icon: Users, roles: ["ADMIN"], color: "text-violet-500" },
    { name: "Entités", href: "/dashboard/entities", icon: Landmark, roles: ["ADMIN"], color: "text-emerald-500" },
    { name: "Journal d'audit", href: "/dashboard/audit", icon: History, roles: ["ADMIN"], color: "text-orange-500" },
  ];

  const filteredNav = navigation.filter((item) => item.roles.includes(role));

  return (
    <aside className="glass-sidebar flex flex-col h-full w-full transition-all duration-300 rounded-r-2xl">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src="/logo.png" alt="EasyPrint Logo" className="w-9 h-9 rounded-xl object-contain shrink-0" />
          {!collapsed && (
            <div className="truncate">
              <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-tight font-display">EasyPrint</h1>
              <p className="text-[10px] text-slate-400 font-medium truncate">Chèques & Effets</p>
            </div>
          )}
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg lg:hidden"><X className="w-4 h-4" /></button>
        )}
        {onToggle && !onCloseMobile && (
          <button onClick={onToggle} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg hidden lg:block transition-colors" title={collapsed ? "Agrandir" : "Masquer"}>
            {collapsed ? <PanelLeft className="w-4 h-4 text-blue-500" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {!collapsed ? (
        <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.fullName || "Utilisateur"}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={clsx("inline-block w-1.5 h-1.5 rounded-full", role === "ADMIN" ? "bg-emerald-400" : role === "COMPTABLE" ? "bg-blue-400" : "bg-slate-300")} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{role}</span>
              {user?.entityName && <span className="text-[10px] text-slate-300 ml-1 truncate max-w-[100px]">· {user.entityName}</span>}
            </div>
          </div>
          <ShieldCheck className="w-4 h-4 text-slate-300 shrink-0" />
        </div>
      ) : (
        <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex justify-center">
          <span className={clsx("inline-block w-2 h-2 rounded-full", role === "ADMIN" ? "bg-emerald-400" : role === "COMPTABLE" ? "bg-blue-400" : "bg-slate-300")} title={`${user?.fullName} (${role})`} />
        </div>
      )}

      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href} onClick={onCloseMobile} title={collapsed ? item.name : undefined}
              className={clsx(
                "flex items-center rounded-xl text-[13px] font-medium transition-all duration-150 group",
                collapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5",
                isActive ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )}>
              <div className="flex items-center gap-2.5">
                <item.icon className={clsx("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", isActive ? "text-blue-500" : item.color)} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </div>
              {!collapsed && isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-2.5 border-t border-slate-100">
        <button onClick={() => logout()} title={collapsed ? "Déconnexion" : undefined}
          className={clsx("w-full flex items-center rounded-xl text-[13px] font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors", collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2")}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
