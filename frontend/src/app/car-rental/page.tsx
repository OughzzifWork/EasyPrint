"use client";

import { useState } from "react";
import { CarRentalSidebar } from "@/components/car-rental/CarRentalSidebar";
import {
  Car,
  CalendarCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Fuel,
  Clock,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Search,
  Bell,
  ChevronDown,
  Filter,
  Download,
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";

// Mock data
const kpiData = [
  {
    title: "Total Vehicles",
    value: "248",
    change: "+12",
    changeType: "positive",
    icon: Car,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    description: "Fleet size",
  },
  {
    title: "Active Rentals",
    value: "186",
    change: "+8.2%",
    changeType: "positive",
    icon: CalendarCheck,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    description: "Currently on rent",
  },
  {
    title: "Monthly Revenue",
    value: "$84,520",
    change: "+15.3%",
    changeType: "positive",
    icon: DollarSign,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    description: "vs last month",
  },
  {
    title: "Utilization Rate",
    value: "74.8%",
    change: "-2.1%",
    changeType: "negative",
    icon: TrendingUp,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
    description: "Fleet efficiency",
  },
];

const revenueData = [
  { month: "Jan", revenue: 62000, bookings: 142 },
  { month: "Feb", revenue: 58000, bookings: 128 },
  { month: "Mar", revenue: 71000, bookings: 156 },
  { month: "Apr", revenue: 68000, bookings: 148 },
  { month: "May", revenue: 76000, bookings: 164 },
  { month: "Jun", revenue: 82000, bookings: 178 },
  { month: "Jul", revenue: 89000, bookings: 192 },
  { month: "Aug", revenue: 84520, bookings: 186 },
];

const vehicleStatus = [
  { status: "Available", count: 62, color: "#22C55E" },
  { status: "Rented", count: 156, color: "#3B82F6" },
  { status: "Maintenance", count: 18, color: "#F59E0B" },
  { status: "Reserved", count: 8, color: "#8B5CF6" },
  { status: "Out of Service", count: 4, color: "#EF4444" },
];

const recentBookings = [
  {
    id: "BK-2847",
    customer: "Sarah Johnson",
    vehicle: "Toyota Camry 2024",
    pickup: "Downtown Office",
    return: "Airport Terminal",
    dates: "Aug 15 - Aug 20",
    status: "Active",
    amount: "$425",
  },
  {
    id: "BK-2846",
    customer: "Michael Chen",
    vehicle: "Honda CR-V 2024",
    pickup: "Airport Terminal",
    return: "Downtown Office",
    dates: "Aug 14 - Aug 18",
    status: "Active",
    amount: "$380",
  },
  {
    id: "BK-2845",
    customer: "Emma Wilson",
    vehicle: "Ford Mustang 2024",
    pickup: "Westside Branch",
    return: "Westside Branch",
    dates: "Aug 13 - Aug 16",
    status: "Completed",
    amount: "$520",
  },
  {
    id: "BK-2844",
    customer: "James Brown",
    vehicle: "Chevrolet Tahoe 2024",
    pickup: "Downtown Office",
    return: "Airport Terminal",
    dates: "Aug 12 - Aug 19",
    status: "Active",
    amount: "$685",
  },
  {
    id: "BK-2843",
    customer: "Lisa Anderson",
    vehicle: "Nissan Altima 2024",
    pickup: "Eastside Hub",
    return: "Downtown Office",
    dates: "Aug 11 - Aug 14",
    status: "Completed",
    amount: "$290",
  },
];

const topVehicles = [
  {
    plate: "EZ-2847",
    model: "Toyota Camry 2024",
    category: "Sedan",
    status: "Rented",
    dailyRate: "$85",
    utilization: "92%",
    nextService: "Aug 25",
  },
  {
    plate: "EZ-1923",
    model: "Honda CR-V 2024",
    category: "SUV",
    status: "Available",
    dailyRate: "$110",
    utilization: "78%",
    nextService: "Sep 02",
  },
  {
    plate: "EZ-0456",
    model: "Ford Mustang 2024",
    category: "Sports",
    status: "Rented",
    dailyRate: "$150",
    utilization: "85%",
    nextService: "Aug 20",
  },
  {
    plate: "EZ-7891",
    model: "Chevrolet Tahoe 2024",
    category: "SUV",
    status: "Maintenance",
    dailyRate: "$175",
    utilization: "71%",
    nextService: "In Service",
  },
  {
    plate: "EZ-3344",
    model: "Nissan Altima 2024",
    category: "Sedan",
    status: "Available",
    dailyRate: "$75",
    utilization: "88%",
    nextService: "Sep 10",
  },
];

const alerts = [
  { type: "warning", message: "5 vehicles due for service within 3 days", icon: AlertTriangle },
  { type: "info", message: "New booking request from Premium member", icon: CalendarCheck },
  { type: "success", message: "Fleet insurance renewed for 2024", icon: CheckCircle2 },
];

// Simple bar chart component
function BarChart({ data }: { data: typeof revenueData }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue));

  return (
    <div className="flex items-end gap-2 h-48">
      {data.map((item, index) => (
        <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
          <div className="relative w-full group">
            <div
              className="w-full bg-gradient-to-t from-[var(--color-accent)] to-red-400 rounded-t-lg transition-all duration-300 hover:from-red-600 hover:to-red-500 cursor-pointer"
              style={{ height: `${(item.revenue / maxRevenue) * 160}px` }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-primary)] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ${(item.revenue / 1000).toFixed(0)}k
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">{item.month}</span>
        </div>
      ))}
    </div>
  );
}

// Donut chart component
function DonutChart({ data }: { data: typeof vehicleStatus }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let accumulated = 0;

  const segments = data.map((item) => {
    const percentage = (item.count / total) * 100;
    const startAngle = (accumulated / total) * 360;
    accumulated += item.count;
    const endAngle = (accumulated / total) * 360;

    return {
      ...item,
      percentage,
      startAngle,
      endAngle,
    };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((segment, index) => {
            const circumference = 2 * Math.PI * 35;
            const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -(
              (segments.slice(0, index).reduce((sum, s) => sum + s.percentage, 0) / 100) *
              circumference
            );

            return (
              <circle
                key={segment.status}
                cx="50"
                cy="50"
                r="35"
                fill="none"
                stroke={segment.color}
                strokeWidth="12"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 hover:stroke-[14px] cursor-pointer"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-slate-900">{total}</span>
          <span className="text-xs text-slate-500">Total</span>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        {data.map((item) => (
          <div key={item.status} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-slate-600">{item.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">{item.count}</span>
              <span className="text-xs text-slate-500 w-12 text-right">
                {((item.count / total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CarRentalDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[var(--color-background)]">
      {/* Desktop Sidebar */}
      <div className={`hidden lg:block ${sidebarCollapsed ? "w-20" : "w-64"} transition-all duration-300`}>
        <CarRentalSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-64">
            <CarRentalSidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-[var(--color-border)] px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="font-display text-xl font-bold text-[var(--color-foreground)]">Dashboard</h1>
              <p className="text-sm text-slate-500">Welcome back! Here&apos;s your fleet overview.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-xl px-4 py-2.5">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search vehicles, bookings..."
                className="bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none w-48"
              />
            </div>
            <button className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-accent)] rounded-full" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-slate-700 flex items-center justify-center text-white font-semibold text-sm cursor-pointer">
              JD
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Alerts */}
            <div className="flex flex-wrap gap-3">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up ${
                    alert.type === "warning"
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : alert.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                  }`}
                >
                  <alert.icon className="w-4 h-4 shrink-0" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
              {kpiData.map((kpi, index) => (
                <div
                  key={index}
                  className="bg-white p-5 rounded-2xl border border-[var(--color-border)] shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.title}</p>
                    <p className="text-2xl font-bold text-[var(--color-foreground)] mt-1 font-display">{kpi.value}</p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {kpi.changeType === "positive" ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          kpi.changeType === "positive" ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {kpi.change}
                      </span>
                      <span className="text-xs text-slate-500">{kpi.description}</span>
                    </div>
                  </div>
                  <div
                    className={`w-12 h-12 rounded-xl ${kpi.iconBg} ${kpi.iconColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  >
                    <kpi.icon className="w-6 h-6" />
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm animate-fade-in-up">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[var(--color-foreground)]">Revenue Overview</h3>
                    <p className="text-sm text-slate-500">Monthly revenue for 2024</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      6M
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium bg-[var(--color-primary)] text-white rounded-lg">
                      12M
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <BarChart data={revenueData} />
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[var(--color-accent)]" />
                    <span className="text-sm text-slate-600">Revenue</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">$84,520</p>
                    <p className="text-xs text-emerald-600 font-medium">+15.3% vs last month</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Status Chart */}
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 shadow-sm animate-fade-in-up">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[var(--color-foreground)]">Fleet Status</h3>
                    <p className="text-sm text-slate-500">Current vehicle distribution</p>
                  </div>
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <DonutChart data={vehicleStatus} />
              </div>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Bookings */}
              <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm animate-fade-in-up">
                <div className="flex items-center justify-between p-6 pb-4">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[var(--color-foreground)]">Recent Bookings</h3>
                    <p className="text-sm text-slate-500">Latest reservation activity</p>
                  </div>
                  <button className="text-sm font-medium text-[var(--color-accent)] hover:text-red-700 transition-colors flex items-center gap-1">
                    View All <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-t border-b border-slate-100">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                          Booking
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                          Customer
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                          Dates
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                          Status
                        </th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {recentBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-[var(--color-foreground)]">{booking.id}</span>
                            <p className="text-xs text-slate-500 mt-0.5">{booking.vehicle}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-semibold text-slate-600">
                                {booking.customer.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <span className="text-sm text-slate-700">{booking.customer}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <span className="text-sm text-slate-600">{booking.dates}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                booking.status === "Active"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : booking.status === "Completed"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {booking.status === "Active" && <Loader2 className="w-3 h-3 animate-spin" />}
                              {booking.status === "Completed" && <CheckCircle2 className="w-3 h-3" />}
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-bold text-[var(--color-foreground)]">{booking.amount}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Vehicles */}
              <div className="bg-white rounded-2xl border border-[var(--color-border)] shadow-sm animate-fade-in-up">
                <div className="flex items-center justify-between p-6 pb-4">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[var(--color-foreground)]">Top Vehicles</h3>
                    <p className="text-sm text-slate-500">Highest performing fleet members</p>
                  </div>
                  <button className="text-sm font-medium text-[var(--color-accent)] hover:text-red-700 transition-colors flex items-center gap-1">
                    View Fleet <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-t border-b border-slate-100">
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                          Vehicle
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                          Status
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">
                          Rate
                        </th>
                        <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                          Util.
                        </th>
                        <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {topVehicles.map((vehicle) => (
                        <tr key={vehicle.plate} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                                <Car className="w-5 h-5 text-slate-500" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-[var(--color-foreground)] block">
                                  {vehicle.model}
                                </span>
                                <span className="text-xs text-slate-500">{vehicle.plate} · {vehicle.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                vehicle.status === "Available"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : vehicle.status === "Rented"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {vehicle.status === "Available" && <CheckCircle2 className="w-3 h-3" />}
                              {vehicle.status === "Rented" && <Loader2 className="w-3 h-3" />}
                              {vehicle.status === "Maintenance" && <AlertTriangle className="w-3 h-3" />}
                              {vehicle.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 hidden lg:table-cell">
                            <span className="text-sm font-semibold text-slate-700">{vehicle.dailyRate}</span>
                            <span className="text-xs text-slate-500">/day</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-100 rounded-full h-1.5">
                                <div
                                  className="bg-[var(--color-accent)] h-1.5 rounded-full"
                                  style={{ width: vehicle.utilization }}
                                />
                              </div>
                              <span className="text-xs font-medium text-slate-600">{vehicle.utilization}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-[var(--color-primary)] to-slate-800 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium bg-white/10 px-2.5 py-1 rounded-full">Today</span>
                </div>
                <p className="text-3xl font-bold font-display">12</p>
                <p className="text-sm text-slate-300 mt-1">Pickups scheduled</p>
              </div>

              <div className="bg-gradient-to-br from-[var(--color-accent)] to-red-700 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium bg-white/10 px-2.5 py-1 rounded-full">Today</span>
                </div>
                <p className="text-3xl font-bold font-display">8</p>
                <p className="text-sm text-red-100 mt-1">Returns expected</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium bg-white/10 px-2.5 py-1 rounded-full">Avg</span>
                </div>
                <p className="text-3xl font-bold font-display">3.2</p>
                <p className="text-sm text-emerald-100 mt-1">Days per rental</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
