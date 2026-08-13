"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  FileCheck2,
  FileSpreadsheet,
  Building2,
  LayoutTemplate,
  Users,
  History,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Building,
  Printer,
  UserCheck,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";
import { clsx } from "clsx";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onCloseMobile?: () => void;
}

export function Sidebar({ collapsed = false, onToggle, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "VISITEUR";

  const navigation = [
    { name: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "COMPTABLE", "VISITEUR"] },
    { name: "Chèques", href: "/dashboard/cheques", icon: FileCheck2, roles: ["ADMIN", "COMPTABLE", "VISITEUR"] },
    { name: "Effets (LCN)", href: "/dashboard/effets", icon: FileSpreadsheet, roles: ["ADMIN", "COMPTABLE", "VISITEUR"] },
    { name: "Banques", href: "/dashboard/banks", icon: Building2, roles: ["ADMIN", "COMPTABLE", "VISITEUR"] },
    { name: "Bénéficiaires", href: "/dashboard/beneficiaries", icon: UserCheck, roles: ["ADMIN", "COMPTABLE", "VISITEUR"] },
    { name: "Modèles d'impression", href: "/dashboard/templates", icon: LayoutTemplate, roles: ["ADMIN", "COMPTABLE", "VISITEUR"] },
    { name: "Paramètres d'imprimante", href: "/dashboard/printer-settings", icon: Printer, roles: ["ADMIN"] },
    { name: "Utilisateurs", href: "/dashboard/users", icon: Users, roles: ["ADMIN"] },
    { name: "Journal d'audit", href: "/dashboard/audit", icon: History, roles: ["ADMIN", "COMPTABLE"] },
  ];

  const filteredNav = navigation.filter((item) => item.roles.includes(role));

  return (
    <aside
      className={clsx(
        "bg-slate-900 text-slate-100 flex flex-col h-screen sticky top-0 border-r border-slate-800 shadow-xl transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <Building className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <h1 className="font-bold text-base tracking-wide text-white leading-tight">IMPCE Web</h1>
              <p className="text-[11px] text-slate-400 font-medium truncate">Chèques & Effets</p>
            </div>
          )}
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg lg:hidden"
            title="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Collapse Toggle */}
        {onToggle && !onCloseMobile && (
          <button
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg hidden lg:block transition-colors"
            title={collapsed ? "Agrandir le menu" : "Masquer / Réduire le menu"}
          >
            {collapsed ? <PanelLeft className="w-5 h-5 text-blue-400" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* User Info Bar */}
      {!collapsed ? (
        <div className="p-3.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-slate-200 truncate">{session?.user?.name || "Utilisateur"}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={clsx(
                  "inline-block w-2 h-2 rounded-full",
                  role === "ADMIN" ? "bg-emerald-400" : role === "COMPTABLE" ? "bg-blue-400" : "bg-amber-400"
                )}
              />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{role}</span>
            </div>
          </div>
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
        </div>
      ) : (
        <div className="p-3 bg-slate-950/50 border-b border-slate-800/80 flex justify-center">
          <span
            className={clsx(
              "inline-block w-2.5 h-2.5 rounded-full",
              role === "ADMIN" ? "bg-emerald-400" : role === "COMPTABLE" ? "bg-blue-400" : "bg-amber-400"
            )}
            title={`Connecté: ${session?.user?.name || "Utilisateur"} (${role})`}
          />
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 p-2.5 space-y-1.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
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

      {/* Footer / Sign Out */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Déconnexion" : undefined}
          className={clsx(
            "w-full flex items-center rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors",
            collapsed ? "justify-center p-3" : "gap-3 px-3.5 py-2.5"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
