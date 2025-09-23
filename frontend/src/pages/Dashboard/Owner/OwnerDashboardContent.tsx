import React, { useState, useRef, useEffect, useMemo } from "react"
import api from "../../../lib/api"
import "@fontsource/crimson-pro/400.css"
import "@fontsource/crimson-pro/700.css"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import logo from "/src/assets/PrintEase-Logo-Dark.png"
import autoTable from "jspdf-autotable"
import "@/assets/fonts/Roboto-Regular-normal"

// Types
interface VariantItem { variant: string; expectedStock: number; currentStock: number }
interface InventoryItem { name: string; unit: string; variants: VariantItem[] }
// (Order type is derived inline where needed to keep this file lean)

// Constants
const YEARS = [2025, 2024, 2023, 2022, 2021, 2020]
const COLORS = ["#1e3a8a", "#d1d5db"]
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const FULL_MONTHS: Record<string,string> = {
  Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June",
  Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December"
}

const INVENTORY: InventoryItem[] = [
  {
    name: "Bond Paper", unit: "reams",
    variants: [
      { variant: "A4", expectedStock: 50, currentStock: 20 },
      { variant: "Legal", expectedStock: 30, currentStock: 10 },
      { variant: "Letter", expectedStock: 40, currentStock: 25 }
    ]
  },
  {
    name: "Shirts", unit: "pcs",
    variants: [
      { variant: "Small", expectedStock: 60, currentStock: 15 },
      { variant: "Medium", expectedStock: 70, currentStock: 20 },
      { variant: "Large", expectedStock: 70, currentStock: 15 }
    ]
  },
  {
    name: "Ink", unit: "ml",
    variants: [
      { variant: "Black", expectedStock: 1000, currentStock: 400 },
      { variant: "Cyan", expectedStock: 800, currentStock: 300 },
      { variant: "Magenta", expectedStock: 800, currentStock: 250 },
      { variant: "Yellow", expectedStock: 800, currentStock: 280 }
    ]
  }
]

// Components
const StatCard = ({ value, label }: { value: string; label: string }) => {
  const parts = label.split(" "), last = parts.pop(), rest = parts.join(" ")
  return (
    <div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
      <span className="text-xl font-bold text-gray-900">{value}</span>
      <span className="text-gray-800 text-xs uppercase">{rest} <b>{last}</b></span>
    </div>
  )
}

type ServiceLite = { _id: string; name: string; active?: boolean }

// Product selector (reflects real services; scrollable on large screens)
const ProductButtons = ({
  services,
  selected,
  set,
}: {
  services: ServiceLite[]
  selected: string
  set: (id: string) => void
}) => (
  <div
    className="flex flex-col gap-2 mt-4 lg:mt-0 lg:ml-4 
               overflow-y-auto w-full lg:w-56 
               max-h-60 lg:max-h-[300px] p-2 
               bg-transparent"
    aria-label="Product filter"
    style={{ scrollbarGutter: "stable" }}
  >
    <button
      key="ALL"
      onClick={() => set("ALL")}
      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold uppercase transition w-full text-left truncate whitespace-nowrap ${
        selected === "ALL"
          ? "bg-gray-600 text-white"
          : "bg-gray-300 text-gray-900 hover:bg-gray-400"
      }`}
    >
      All
    </button>
    {services.map((svc) => (
      <button
        key={svc._id}
        onClick={() => set(svc._id)}
        className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold uppercase transition w-full text-left truncate whitespace-nowrap ${
          selected === svc._id
            ? "bg-gray-600 text-white"
            : "bg-gray-300 text-gray-900 hover:bg-gray-400"
        }`}
        title={svc.name}
      >
        {svc.name}
      </button>
    ))}
  </div>
)

const YearSelector = ({ selected, set }: { selected: number; set: (y: number) => void }) => (
  <div className="w-40 bg-blue-900 rounded-xl shadow-md p-3 h-full flex flex-col">
    <h3 className="text-white text-sm font-bold text-center mb-3">Year</h3>
    <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
      {YEARS.map(y => (
        <button
          key={y}
          onClick={() => set(y)}
          className={`w-full rounded-lg py-2 text-sm transition ${
            selected === y
              ? "bg-gray-600 text-white"
              : "bg-gray-400 hover:bg-gray-500"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  </div>
)

const Accordion = ({ item, open, onToggle }: { item: InventoryItem; open: boolean; onToggle: () => void }) => (
  <div className="border rounded-xl shadow-sm bg-white/90">
    <button onClick={onToggle} className="w-full flex justify-between items-center px-4 py-3 font-bold text-gray-800">
      <span>{item.name}</span><span>{open ? "−" : "+"}</span>
    </button>
    {open && (
      <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {item.variants.map((v) => (
          <InventoryPie key={v.variant} type={`${item.name} - ${v.variant}`} items={[v]} unit={item.unit} />
        ))}
      </div>
    )}
  </div>
)

const InventoryPie = ({ items, type, unit }: { items: { expectedStock: number; currentStock: number }[]; type: string; unit: string }) => {
  const totalExpected = items.reduce((s, i) => s + i.expectedStock, 0)
  const totalCurrent = items.reduce((s, i) => s + i.currentStock, 0)
  const pieData = [{ name: "Remaining", value: totalCurrent }, { name: "Decreased", value: totalExpected - totalCurrent }]
  const restock = totalCurrent < totalExpected * 0.3

  return (
    <div className={`bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center ${restock ? "animate-pulse shadow-[0_0_20px_#f87171]" : ""}`}>
      <h3 className="text-sm font-bold uppercase mb-2">{type}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={60} labelLine={false}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-600 mt-1">{totalCurrent}/{totalExpected} {unit}</p>
    </div>
  )
}

// Main dashboard
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
  // UI transition helpers for smoother skeleton -> content
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
    // selectedServiceId intentionally read only for validity reset; do not refetch on change
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

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return
    try {
      setDownloading(true)
      await new Promise(r => setTimeout(r, 800))

      const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true })
      const chartImg = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p","mm","a4")
      const pdfW = pdf.internal.pageSize.getWidth()

      const logoImg = new Image()
      logoImg.src = logo
      await new Promise(res => { logoImg.onload = res; logoImg.onerror = res })
      pdf.addImage(logoImg,"PNG",14,10,pdfW/4,20)

      pdf.setDrawColor(0).setLineWidth(0.5).line(10,35,pdfW-10,35)
      
      pdf.setFont("Roboto-Regular","normal").setFontSize(14)
        .text(`[SHOP NAME]`, pdfW/2,40,{ align:"center" })
      const svcName = selectedServiceId === 'ALL' ? 'All Services' : (services.find((s) => s._id === selectedServiceId)?.name || 'Service')
      pdf.setFont("Roboto-Regular","normal").setFontSize(18)
        .text(`Annual Sales Report - ${svcName}`, pdfW/2,50,{ align:"center" })
      pdf.setFont("Roboto-Regular","normal").setFontSize(12)
        .text(`Year: ${year}`, pdfW/2,58,{ align:"center" })

      const chartH = (canvas.height * (pdfW - 20)) / canvas.width
      pdf.addImage(chartImg,"PNG",10,60,pdfW-20,chartH)

      const vals = salesData.map(d => d.sales)
      const total = vals.reduce((a,v) => a+v,0)
      const avg = total / vals.length

      const tableData = [
        ...salesData.map(d => [FULL_MONTHS[d.month], peso(d.sales)]),
        ["Total", peso(total)], ["Average", peso(avg)],
        ["Highest", peso(Math.max(...vals))], ["Lowest", peso(Math.min(...vals))]
      ]

      autoTable(pdf,{
        head:[["Month","Sales"]],
        body:tableData,
        startY:65+chartH,
        theme:"grid",
        styles:{ halign:"center", font:"Roboto-Regular", fontSize:11 },
        headStyles:{ fillColor:[30,58,138] }
      })

      pdf.save(`Annual_Sales_Report_${year}_${svcName.replace(/\s+/g,'_')}.pdf`)
    } catch(e) {
      console.error("PDF failed:", e)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="transition-all duration-300 font-crimson p-6 sm:p-8">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Overlayed skeleton + content wrapper to prevent layout shift */}
        <div className="relative">
          {/* Content block (kept in flow) */}
          <div className={`space-y-6 transition-opacity duration-300 ${contentReady ? 'opacity-100' : 'opacity-0'}`}>
            {/* Stats */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Current Sales for this DAY', value: peso(salesDay) },
                { label: 'Current Sales for this MONTH', value: peso(salesMonth) },
                { label: 'Current Sales for this YEAR', value: peso(salesYear) },
              ].map((s) => <StatCard key={s.label} {...s} />)}
            </div>

            {/* Sales */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 bg-white/90 rounded-xl shadow-md p-6 flex flex-col lg:flex-row">
                <div className="flex-1 cursor-pointer" onClick={() => setShowModal(true)}>
                  <h2 className="text-lg font-bold mb-4">
                    Product Sales {selectedServiceId !== 'ALL' ? `- ${services.find((s) => s._id === selectedServiceId)?.name || ''}` : '(All Services)'}
                  </h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" /><YAxis allowDecimals={false} />
                      <Tooltip formatter={(v: number) => ["₱"+v,"Sales"]} />
                      <Bar dataKey="sales" fill="#1e3a8a" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ProductButtons services={services} selected={selectedServiceId} set={setSelectedServiceId} />
              </div>
              <div className="flex justify-center lg:justify-start items-center mt-4 lg:mt-0">
                <YearSelector selected={year} set={setYear} />
              </div>
            </div>
          </div>

          {/* Skeleton overlay (not in flow) */}
          {showSkeleton && (
            <div aria-busy="true" className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${contentReady ? 'opacity-0' : 'opacity-100'}`}>
              <div className="space-y-6">
                {/* Stats skeleton */}
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 animate-pulse">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white/90 rounded-xl shadow-md p-4">
                      <div className="h-6 w-24 bg-gray-300 rounded mb-2" />
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
                {/* Sales skeleton */}
                <div className="flex flex-col lg:flex-row gap-4 animate-pulse">
                  <div className="flex-1 bg-white/90 rounded-xl shadow-md p-6 flex flex-col lg:flex-row">
                    <div className="flex-1">
                      <div className="h-6 w-64 bg-gray-300 rounded mb-4" />
                      <div className="h-[280px] w-full rounded bg-gray-200" />
                    </div>
                    <div className="flex flex-col gap-2 mt-4 lg:mt-0 lg:ml-4 w-full lg:w-56">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-10 w-full rounded bg-gray-200" />
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-center lg:justify-start items-center mt-4 lg:mt-0">
                    <div className="w-40 h-full self-stretch rounded-xl bg-white/90 shadow-md p-3 flex flex-col">
                      <div className="h-4 w-16 bg-gray-300 rounded mb-3" />
                      <div className="flex flex-col gap-2 flex-1 overflow-hidden">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-8 w-full rounded bg-gray-200" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Inventory skeleton */}
                <div className="bg-white/90 rounded-xl shadow-md p-6 space-y-6 mt-6">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
                    <div className="h-5 w-48 bg-gray-300 rounded" />
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-gray-300 rounded" />
                        <div className="h-3 w-20 bg-gray-200 rounded" />
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-gray-300 rounded" />
                        <div className="h-3 w-28 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="bg-white/90 rounded-xl shadow-inner p-4 flex flex-col items-center">
                        <div className="h-5 w-24 bg-gray-300 rounded mb-3" />
                        <div className="w-40 h-40 bg-gray-200 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Inventory */}
  <div className="bg-white/90 rounded-xl shadow-md p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800 mb-2">Inventory Overview</h2>
          <div className="flex gap-4 mb-3">
            <div className="flex items-center gap-1"><div className="w-4 h-4 bg-[#1e3a8a]" /> Remaining</div>
            <div className="flex items-center gap-1"><div className="w-4 h-4 bg-[#d1d5db]" /> Decreased/Used</div>
          </div>
          <div className="space-y-3">
            {INVENTORY.map((item, idx) => (
              <Accordion key={item.name} item={item} open={openIndex === idx} onToggle={() => setOpenIndex(openIndex === idx ? -1 : idx)} />
            ))}
          </div>
        </div>

      {/* Modal (single instance) */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 relative">
              <button className="absolute top-3 right-3 cursor-pointer" onClick={() => setShowModal(false)}>✕</button>
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold">PrintEase</h2>
                <p className="text-sm">Annual Sales Performance Analysis Report ({year})</p>
              </div>
              <div ref={reportRef} className={`w-full h-[320px] ${downloading ? "pointer-events-none" : ""}`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(v: number) => ["₱" + v, "Sales"]} />
                    <Bar dataKey="sales" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 flex flex-col items-center gap-2">
                <button onClick={handleDownloadPDF} disabled={downloading}
                  className={`px-6 py-2 rounded-lg shadow cursor-pointer ${downloading ? "bg-gray-400 text-gray-700" : "bg-blue-900 text-white hover:bg-blue-800"}`}>
                  {downloading ? "Preparing PDF..." : "Download as PDF"}
                </button>
                {downloading && <p className="text-xs text-gray-500">Please wait, your report is being generated.</p>}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default OwnerDashboardContent