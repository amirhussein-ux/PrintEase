import React, { useState, useRef, useEffect, useMemo } from "react"
import api from "../../../lib/api"
import "@fontsource/crimson-pro/400.css"
import "@fontsource/crimson-pro/700.css"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { ExclamationTriangleIcon, ChartBarIcon, CubeIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline'
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import logo from "/src/assets/PrintEase-Logo-Dark.png"
import autoTable from "jspdf-autotable"
import "@/assets/fonts/Roboto-Regular-normal"

// Types
interface BackendInventoryItem { 
  _id: string; 
  name: string; 
  category?: string;
  amount: number; 
  minAmount: number; 
  price: number; 
  currency: string; 
  createdAt: string; 
}

// Constants
const YEARS = [2025, 2024, 2023, 2022, 2021, 2020]
const COLORS = ["#1e3a8a", "#60a5fa", "#d1d5db"]
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const FULL_MONTHS: Record<string,string> = {
  Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June",
  Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December"
}

// Enhanced StatCard with modern design
const StatCard = ({ value, label, icon: Icon, trend }: { value: string; label: string; icon?: React.ComponentType<any>; trend?: number }) => {
  const trendColor = trend && trend > 0 ? "text-green-500" : trend && trend < 0 ? "text-red-500" : "text-gray-500"
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 group">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-2">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${trendColor}`}>
              <span>{trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}</span>
              <span className="ml-1">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  )
}

type ServiceLite = { _id: string; name: string; active?: boolean }

// Modern Product Selector
const ProductButtons = ({
  services,
  selected,
  set,
}: {
  services: ServiceLite[]
  selected: string
  set: (id: string) => void
}) => (
  <div className="flex flex-col gap-3 w-full lg:w-64">
    <div className="bg-blue-600 rounded-2xl p-4 text-white">
      <h3 className="font-bold text-lg mb-2">Products</h3>
      <p className="text-blue-100 text-sm">Filter sales data by service</p>
    </div>
    
    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
      <button
        key="ALL"
        onClick={() => set("ALL")}
        className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 text-left border-2 ${
          selected === "ALL"
            ? "bg-blue-600 text-white border-blue-600 shadow-lg"
            : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-md"
        }`}
      >
        📊 All Services
      </button>
      {services.map((svc) => (
        <button
          key={svc._id}
          onClick={() => set(svc._id)}
          className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 text-left border-2 ${
            selected === svc._id
              ? "bg-blue-600 text-white border-blue-600 shadow-lg"
              : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:shadow-md"
          }`}
          title={svc.name}
        >
          <span className="truncate block">🛍️ {svc.name}</span>
        </button>
      ))}
    </div>
  </div>
)

// Modern Year Selector
const YearSelector = ({ selected, set }: { selected: number; set: (y: number) => void }) => (
  <div className="bg-blue-600 rounded-2xl shadow-lg p-6 h-full flex flex-col">
    <div className="text-white mb-4">
      <ChartBarIcon className="w-8 h-8 mb-2" />
      <h3 className="text-lg font-bold">Year</h3>
      <p className="text-blue-100 text-sm">Select reporting period</p>
    </div>
    
    <div className="space-y-2 flex-1 overflow-y-auto">
      {YEARS.map(y => (
        <button
          key={y}
          onClick={() => set(y)}
          className={`w-full rounded-xl py-3 px-4 text-sm font-semibold transition-all duration-200 ${
            selected === y
              ? "bg-white text-blue-600 shadow-lg"
              : "bg-blue-500 text-white hover:bg-blue-400"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  </div>
)

// Enhanced Category Accordion
const CategoryAccordion = ({
  category,
  items,
  open,
  onToggle,
}: {
  category: string;
  items: { name: string; amount: number; minAmount: number; expectedStock: number }[];
  open: boolean;
  onToggle: () => void;
}) => (
  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
    <button
      onClick={onToggle}
      className="w-full flex justify-between items-center px-6 py-4 font-bold text-gray-800 hover:bg-gray-50 transition-colors"
      aria-expanded={open}
      aria-controls={`cat-${category}`}
    >
      <div className="flex items-center gap-3">
        <CubeIcon className="w-5 h-5 text-blue-600" />
        <span className="text-lg">{category}</span>
        <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
          {items.length} items
        </span>
      </div>
      <span className={`text-2xl transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>▼</span>
    </button>
    
    {open && (
      <div id={`cat-${category}`} className="p-6 bg-gray-50 border-t border-gray-200">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
          {items.map(it => (
            <InventoryPie
              key={it.name}
              type={it.name}
              unit="units"
              items={[{ expectedStock: it.expectedStock, currentStock: it.amount, minAmount: it.minAmount }]}
            />
          ))}
        </div>
      </div>
    )}
  </div>
)

// Enhanced InventoryPie with better visuals
const InventoryPie = ({ items, type, unit }: { items: { expectedStock: number; currentStock: number; minAmount?: number }[]; type: string; unit: string }) => {
  const totalExpected = items.reduce((s, i) => s + Math.max(i.expectedStock, 0), 0)
  const totalCurrent = items.reduce((s, i) => s + Math.max(i.currentStock, 0), 0)
  const decreased = Math.max(totalExpected - totalCurrent, 0)
  const pieData = [
    { name: "Remaining", value: totalCurrent },
    { name: "Buffer", value: Math.max(totalExpected - totalCurrent - decreased, 0) },
    { name: "Used", value: decreased }
  ]
  
  const hasThresholdBreach = items.some(i => typeof i.minAmount === 'number' && i.currentStock <= (i.minAmount ?? 0))
  const restock = hasThresholdBreach || (totalExpected > 0 && totalCurrent < totalExpected * 0.3)
  const percentage = totalExpected > 0 ? Math.round((totalCurrent / totalExpected) * 100) : 0

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center border-2 transition-all duration-300 hover:shadow-xl ${
      restock 
        ? "border-red-500 animate-pulse bg-red-50" 
        : "border-gray-100"
    }`}>
      <h3 className="text-sm font-bold uppercase mb-3 text-gray-700 tracking-wide">{type}</h3>
      
      <div className="relative w-full h-48 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie 
              data={pieData} 
              dataKey="value" 
              cx="50%" 
              cy="50%" 
              innerRadius={40} 
              outerRadius={70} 
              labelLine={false}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{percentage}%</div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
        </div>
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{totalCurrent}</span> / {totalExpected} {unit}
        </p>
        
        {restock && (
          <div className="flex items-center gap-2 text-red-600 font-semibold text-sm bg-red-100 px-3 py-1 rounded-full">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>LOW STOCK</span>
          </div>
        )}
        
        {!restock && totalCurrent > 0 && (
          <div className="text-green-600 text-sm font-medium bg-green-100 px-3 py-1 rounded-full">
            ✓ In Stock
          </div>
        )}
      </div>
    </div>
  )
}


// Main dashboard with modern UI
const OwnerDashboardContent: React.FC = () => {
  const [year, setYear] = useState(2025)
  const [selectedServiceId, setSelectedServiceId] = useState<string>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const peso = (n: number) => "₱" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const [salesDay, setSalesDay] = useState(0)
  const [salesMonth, setSalesMonth] = useState(0)
  const [salesYear, setSalesYear] = useState(0)
  const [openIndex, setOpenIndex] = useState<number>(-1)
  const [loading, setLoading] = useState(true)
  const [inventoryCategories, setInventoryCategories] = useState<Array<{ category: string; items: { name: string; amount: number; minAmount: number; expectedStock: number }[] }>>([])
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [contentReady, setContentReady] = useState(false)
  const [orders, setOrders] = useState<Array<{
    _id: string
    status?: string
    paymentStatus?: string
    createdAt?: string
    items?: Array<{ service?: string; serviceName?: string; totalPrice?: number }>
    subtotal?: number
  }>>([])
  const [services, setServices] = useState<ServiceLite[]>([])

  // Compute monthly sales for the selected service/year based on backend orders
  const salesData = useMemo(() => {
    const sums = new Array(12).fill(0)
    for (const o of orders) {
      const paid = o.paymentStatus === "paid" || o.status === "completed"
      if (!paid) continue
      const dt = o.createdAt ? new Date(o.createdAt) : null
      if (!dt || dt.getFullYear() !== year) continue
      const monthIdx = dt.getMonth()
      const lineItems = Array.isArray(o.items) ? o.items : []
      let add = 0
      for (const it of lineItems) {
        if (selectedServiceId === 'ALL' || (it.service && String(it.service) === String(selectedServiceId))) {
          add += Number(it.totalPrice) || 0
        }
      }
      // If no line items (legacy orders), attribute only when viewing ALL
      if (add === 0 && lineItems.length === 0 && selectedServiceId === 'ALL') add = Number(o.subtotal) || 0
      sums[monthIdx] += add
    }
    return MONTHS.map((m, i) => ({ month: m, sales: Math.round(sums[i]) }))
  }, [orders, selectedServiceId, year])

  // Load sales totals and services
  useEffect(() => {
    let cancelled = false
    async function loadSales() {
      try {
        if (!cancelled) setLoading(true)
        const storeRes = await api.get('/print-store/mine')
        const sid: string | undefined = storeRes.data?._id
        if (!sid) return
        const ordRes = await api.get(`/orders/store/${sid}`)
        const ordersResp: Array<{ _id: string; subtotal?: number; createdAt?: string; status?: string; paymentStatus?: string; items?: Array<{ service?: string; serviceName?: string; totalPrice?: number }> }> = Array.isArray(ordRes.data) ? ordRes.data : []
        // fetch services for owner store
        const svcRes = await api.get('/services/mine')
        const svcList: ServiceLite[] = Array.isArray(svcRes.data)
          ? (svcRes.data as Array<{ _id: unknown; name: unknown; active?: unknown }>).map((s) => ({
              _id: String(s._id as string),
              name: String(s.name as string),
              active: Boolean(s.active),
            }))
          : []
        // fetch inventory items for owner store
        const invRes = await api.get('/inventory/mine')
        const invList: BackendInventoryItem[] = Array.isArray(invRes.data) ? invRes.data : []
        // group by category
        const grouped: Record<string, { name: string; amount: number; minAmount: number; expectedStock: number }[]> = {}
        for (const it of invList) {
          const amt = Math.max(Number(it.amount) || 0, 0)
            const minAmt = Math.max(Number(it.minAmount) || 0, 0)
            const expected = Math.max(amt, minAmt)
          const cat = (it.category && it.category.trim()) ? it.category.trim() : 'Uncategorized'
          if (!grouped[cat]) grouped[cat] = []
          grouped[cat].push({ name: it.name, amount: amt, minAmount: minAmt, expectedStock: expected })
        }
        const normalizedCategories = Object.keys(grouped)
          .sort((a,b)=>a.localeCompare(b))
          .map(cat => ({ category: cat, items: grouped[cat].sort((a,b)=>a.name.localeCompare(b.name)) }))

        const now = new Date()
        const startDay = new Date(now); startDay.setHours(0,0,0,0)
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startYear = new Date(now.getFullYear(), 0, 1)

        let d = 0, m = 0, y = 0
        for (const o of ordersResp) {
          const amt = Number(o.subtotal) || 0
          if (amt <= 0) continue
          const paid = o.paymentStatus === 'paid' || o.status === 'completed'
          if (!paid) continue
          const dt = o.createdAt ? new Date(o.createdAt) : null
          if (!dt) continue
          if (dt >= startYear) y += amt
          if (dt >= startMonth) m += amt
          if (dt >= startDay) d += amt
        }
        if (!cancelled) {
          setSalesDay(d)
          setSalesMonth(m)
          setSalesYear(y)
          setOrders(
            ordersResp.map((o) => ({
              _id: o._id,
              status: o.status,
              paymentStatus: o.paymentStatus,
              createdAt: o.createdAt,
              items: Array.isArray(o.items)
                ? o.items.map((it: { service?: unknown; serviceName?: string; totalPrice?: number }) => ({
                    service: it.service ? String(it.service) : undefined,
                    serviceName: it.serviceName,
                    totalPrice: it.totalPrice,
                  }))
                 : [],
              subtotal: o.subtotal,
            }))
          )
          setServices(svcList)
          setInventoryCategories(normalizedCategories)
          // ensure selected service remains valid
          if (selectedServiceId !== 'ALL' && !svcList.find((s) => s._id === selectedServiceId)) {
            setSelectedServiceId('ALL')
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadSales()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Crossfade skeleton -> content when loading completes
  useEffect(() => {
    if (loading) {
      setContentReady(false)
      setShowSkeleton(true)
    } else {
      setContentReady(true)
      const t = setTimeout(() => setShowSkeleton(false), 250)
      return () => clearTimeout(t)
    }
  }, [loading])

  // Recompute yearly sales total based on selected year (day/month remain current only)
  useEffect(() => {
    // Sum paid orders within the selected year using subtotal
    let y = 0
    for (const o of orders) {
      const amt = Number(o.subtotal) || 0
      if (amt <= 0) continue
      const paid = o.paymentStatus === 'paid' || o.status === 'completed'
      if (!paid) continue
      const dt = o.createdAt ? new Date(o.createdAt) : null
      if (!dt) continue
      if (dt.getFullYear() === year) y += amt
    }
    setSalesYear(y)
  }, [orders, year])

  // FIXED PDF Download Function
  const handleDownloadPDF = async () => {
    try {
      setDownloading(true)
      
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfW = pdf.internal.pageSize.getWidth()
      
      // Add logo
      const logoImg = new Image()
      logoImg.src = logo
      await new Promise(res => { 
        logoImg.onload = res; 
        logoImg.onerror = () => res(null) // Resolve even if logo fails
      })
      
      if (logoImg.complete && logoImg.naturalWidth !== 0) {
        pdf.addImage(logoImg, "PNG", 14, 10, pdfW/4, 20)
      }
      
      // Header
      pdf.setDrawColor(0).setLineWidth(0.5).line(10, 35, pdfW-10, 35)
      pdf.setFontSize(14)
        .text(`PrintEase Shop`, pdfW/2, 40, { align: "center" })
      
      const svcName = selectedServiceId === 'ALL' ? 'All Services' : (services.find((s) => s._id === selectedServiceId)?.name || 'Service')
      pdf.setFontSize(18)
        .text(`Annual Sales Report - ${svcName}`, pdfW/2, 50, { align: "center" })
      pdf.setFontSize(12)
        .text(`Year: ${year}`, pdfW/2, 58, { align: "center" })
      
      // Create a simple bar chart manually
      const maxSales = Math.max(...salesData.map(d => d.sales), 1) // Avoid division by zero
      const chartTop = 70
      const chartHeight = 60
      const barWidth = (pdfW - 40) / salesData.length
      
      // Draw bars and axes
      pdf.setDrawColor(200, 200, 200)
      pdf.line(20, chartTop, 20, chartTop + chartHeight) // Y-axis
      pdf.line(20, chartTop + chartHeight, pdfW - 20, chartTop + chartHeight) // X-axis
      
      // Draw bars
      salesData.forEach((data, index) => {
        const barHeight = (data.sales / maxSales) * chartHeight
        const x = 20 + (index * barWidth)
        const y = chartTop + chartHeight - barHeight
        
        pdf.setFillColor(30, 58, 138) // Blue color
        pdf.rect(x + 1, y, barWidth - 3, barHeight, 'F')
        
        // Month labels
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(data.month, x + (barWidth / 2) - 2, chartTop + chartHeight + 5)
        
        // Value labels on top of bars
        if (data.sales > 0) {
          pdf.setFontSize(7)
          pdf.setTextColor(30, 58, 138)
          pdf.text(peso(data.sales), x + (barWidth / 2) - 5, y - 2)
        }
      })
      
      // Sales data table
      const tableData = salesData.map(d => [FULL_MONTHS[d.month], peso(d.sales)])
      const total = salesData.reduce((sum, d) => sum + d.sales, 0)
      const avg = total / salesData.length
      
      tableData.push(
        ["", ""],
        ["Total", peso(total)],
        ["Average", peso(avg)],
        ["Highest", peso(Math.max(...salesData.map(d => d.sales)))],
        ["Lowest", peso(Math.min(...salesData.map(d => d.sales)))]
      )
      
      autoTable(pdf, {
        head: [["Month", "Sales"]],
        body: tableData,
        startY: chartTop + chartHeight + 20,
        theme: "grid",
        styles: { 
          halign: "center", 
          fontSize: 10,
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [30, 58, 138],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        }
      })
      
      // Add footer
      const pageHeight = pdf.internal.pageSize.getHeight()
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pdfW/2, pageHeight - 10, { align: "center" })
      
      pdf.save(`Annual_Sales_Report_${year}_${svcName.replace(/\s+/g, '_')}.pdf`)
      
    } catch (e) {
      console.error("PDF generation failed:", e)
      // Fallback: Create a simple PDF without complex elements
      const pdf = new jsPDF()
      pdf.text("Sales Report - Error generating full report", 20, 20)
      pdf.text(`Year: ${year}`, 20, 30)
      pdf.text(`Service: ${selectedServiceId === 'ALL' ? 'All Services' : services.find(s => s._id === selectedServiceId)?.name}`, 20, 40)
      pdf.save(`Sales_Report_${year}_simple.pdf`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 font-crimson p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's your business performance summary.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <DocumentChartBarIcon className="w-5 h-5" />
            Generate Report
          </button>
        </div>

        {/* Overlay for skeleton and content */}
        <div className="relative">
          {/* Content block */}
          <div className={`space-y-8 transition-opacity duration-500 ${contentReady ? 'opacity-100' : 'opacity-0'}`}>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard 
                value={peso(salesDay)} 
                label="Today's Sales" 
                icon={ChartBarIcon}
                trend={5.2}
              />
              <StatCard 
                value={peso(salesMonth)} 
                label="This Month's Revenue" 
                icon={CubeIcon}
                trend={12.8}
              />
              <StatCard 
                value={peso(salesYear)} 
                label="Year to Date" 
                icon={DocumentChartBarIcon}
                trend={8.4}
              />
            </div>

            {/* Sales Analytics Section */}
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900">
                        Sales Performance {selectedServiceId !== 'ALL' && `- ${services.find((s) => s._id === selectedServiceId)?.name || ''}`}
                      </h2>
                      <span className="bg-blue-100 text-blue-600 text-sm px-3 py-1 rounded-full font-medium">
                        {year}
                      </span>
                    </div>
                    
                    <div className="cursor-pointer" onClick={() => setShowModal(true)}>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={salesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                          <Tooltip 
                            formatter={(v: number) => ["₱"+v,"Sales"]}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                          />
                          <Bar 
                            dataKey="sales" 
                            fill="#1e3a8a" 
                            radius={[8, 8, 0, 0]}
                            className="hover:opacity-80 transition-opacity"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <ProductButtons services={services} selected={selectedServiceId} set={setSelectedServiceId} />
                </div>
              </div>
              
              <div className="flex justify-center lg:justify-start">
                <YearSelector selected={year} set={setYear} />
              </div>
            </div>

            {/* Inventory Overview */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Inventory Overview</h2>
                  <p className="text-gray-600">Monitor stock levels and restock alerts</p>
                </div>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#1e3a8a] rounded"></div>
                    <span className="text-sm text-gray-600">Remaining</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#60a5fa] rounded"></div>
                    <span className="text-sm text-gray-600">Buffer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-[#d1d5db] rounded"></div>
                    <span className="text-sm text-gray-600">Used</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {inventoryCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <CubeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No inventory items yet.</p>
                    <p className="text-gray-400 text-sm mt-2">Add inventory items to start tracking stock levels.</p>
                  </div>
                ) : (
                  inventoryCategories.map((cat, idx) => (
                    <CategoryAccordion
                      key={cat.category}
                      category={cat.category}
                      items={cat.items}
                      open={openIndex === idx}
                      onToggle={() => setOpenIndex(openIndex === idx ? -1 : idx)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Skeleton overlay */}
          {showSkeleton && (
            <div aria-busy="true" className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${contentReady ? 'opacity-0' : 'opacity-100'}`}>
              <div className="space-y-8">
                {/* Stats skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                      <div className="flex justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="h-4 w-24 bg-gray-200 rounded"></div>
                          <div className="h-8 w-32 bg-gray-300 rounded"></div>
                          <div className="h-3 w-20 bg-gray-200 rounded"></div>
                        </div>
                        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sales skeleton */}
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                    <div className="flex flex-col lg:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between">
                          <div className="h-6 w-48 bg-gray-300 rounded"></div>
                          <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="h-[300px] w-full bg-gray-200 rounded-xl"></div>
                      </div>
                      <div className="w-full lg:w-64 space-y-4">
                        <div className="h-20 bg-gray-200 rounded-2xl"></div>
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-14 bg-gray-200 rounded-xl"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-64 h-80 bg-gray-200 rounded-2xl animate-pulse"></div>
                </div>

                {/* Inventory skeleton */}
                <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                  <div className="flex flex-col md:flex-row justify-between mb-6">
                    <div className="space-y-2">
                      <div className="h-6 w-48 bg-gray-300 rounded"></div>
                      <div className="h-4 w-64 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex gap-6 mt-4 md:mt-0">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-200 rounded"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded-2xl"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6 relative">
              <button 
                className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowModal(false)}
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                  ✕
                </div>
              </button>
              
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">PrintEase Analytics</h2>
                <p className="text-gray-600 mt-2">Annual Sales Performance Analysis Report ({year})</p>
              </div>
              
              <div ref={reportRef} className={`w-full h-[400px] rounded-xl border-2 border-dashed border-gray-200 p-4 ${
                downloading ? "pointer-events-none opacity-50" : ""
              }`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(v: number) => ["₱" + v, "Sales"]}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    />
                    <Bar 
                      dataKey="sales" 
                      fill="#1e3a8a" 
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-8 flex flex-col items-center gap-4">
                <button 
                  onClick={handleDownloadPDF} 
                  disabled={downloading}
                  className={`px-8 py-3 rounded-xl font-semibold shadow-lg transition-all duration-200 flex items-center gap-2 ${
                    downloading 
                      ? "bg-gray-400 text-gray-700 cursor-not-allowed" 
                      : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl"
                  }`}
                >
                  <DocumentChartBarIcon className="w-5 h-5" />
                  {downloading ? "Preparing PDF..." : "Download as PDF"}
                </button>
                
                {downloading && (
                  <p className="text-sm text-gray-500 text-center">
                    Please wait, your professional report is being generated...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


export default OwnerDashboardContent
