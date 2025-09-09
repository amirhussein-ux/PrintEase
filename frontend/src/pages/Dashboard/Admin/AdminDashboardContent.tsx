import React, { useState, useRef } from "react"
import { useAuth } from "../../../context/useAuth"
import "@fontsource/crimson-pro/400.css"
import "@fontsource/crimson-pro/700.css"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import logo from "/src/assets/PrintEase-Logo-Dark.png"
import autoTable from "jspdf-autotable"
import "@/assets/fonts/Roboto-Regular-normal"

// Types
interface InventoryItem {
  name: string; expectedStock: number; currentStock: number; productType: string
}

// Constants
const YEARS = [2025, 2024, 2023, 2022, 2021, 2020]
const PRODUCTS = ["MUGS", "SHIRTS", "DOCUMENTS", "TARPAULIN"]
const COLORS = ["#1e3a8a", "#d1d5db"]
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const FULL_MONTHS: Record<string,string> = {
  Jan: "January", Feb: "February", Mar: "March", Apr: "April",
  May: "May", Jun: "June", Jul: "July", Aug: "August",
  Sep: "September", Oct: "October", Nov: "November", Dec: "December"
}

const STATS = [
  { label: "Current Sales for this DAY", value: "₱5,000" },
  { label: "Current Sales for this MONTH", value: "₱120,000" },
  { label: "Current Sales for this YEAR", value: "₱1,500,000" }
]

const INVENTORY: InventoryItem[] = [
  { name: "Bond Paper", expectedStock: 500, currentStock: 120, productType: "BOND PAPER" },
  { name: "Shirts", expectedStock: 200, currentStock: 50, productType: "SHIRTS" },
  { name: "Ink", expectedStock: 100, currentStock: 40, productType: "INK" }
]

// Statistic card
const StatCard = ({ value, label }: { value: string; label: string }) => {
  const parts = label.split(" "), last = parts.pop(), rest = parts.join(" ")
  return (
    <div className="bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center">
      <span className="text-xl font-bold text-gray-900">{value}</span>
      <span className="text-gray-800 text-xs uppercase">{rest} <b>{last}</b></span>
    </div>
  )
}

// Product selector
const ProductButtons = ({ selected, set }: { selected: string; set: (p: string) => void }) => (
  <div className="flex flex-row lg:flex-col gap-2 mt-4 lg:mt-0 lg:ml-4 justify-center">
    {PRODUCTS.map(p => (
      <button key={p} onClick={() => set(p)}
        className={`rounded-lg py-2 text-sm font-bold uppercase transition ${
          selected === p ? "bg-gray-600 text-white" : "bg-gray-300 text-gray-900 hover:bg-gray-400"
        }`}>{p}</button>
    ))}
  </div>
)

// Year selector
const YearSelector = ({ selected, set }: { selected: number; set: (y: number) => void }) => (
  <div className="w-32 bg-blue-900 rounded-xl shadow-md p-3">
    <h3 className="text-white text-sm font-bold text-center mb-2">Year</h3>
    <div className="grid grid-cols-2 gap-2">
      {YEARS.map(y => (
        <button key={y} onClick={() => set(y)}
          className={`rounded-lg py-2 text-sm transition ${
            selected === y ? "bg-gray-600 text-white" : "bg-gray-400 hover:bg-gray-500"
          }`}>{y}</button>
      ))}
    </div>
  </div>
)

// Inventory pie
const InventoryPie = ({ items, type }: { items: InventoryItem[]; type: string }) => {
  const totalExpected = items.reduce((s, i) => s + i.expectedStock, 0)
  const totalCurrent = items.reduce((s, i) => s + i.currentStock, 0)

  const pieData = type === "INK"
    ? [{ name: "Used", value: 100 - totalCurrent }, { name: "Remaining", value: totalCurrent }]
    : [{ name: "Remaining", value: totalCurrent }, { name: "Decreased", value: totalExpected - totalCurrent }]

  const restock = totalCurrent < totalExpected * 0.3

  return (
    <div className={`bg-white/90 rounded-xl shadow-md p-4 flex flex-col items-center ${restock ? "animate-pulse shadow-[0_0_20px_#f87171]" : ""}`}>
      <h3 className="text-base font-bold uppercase mb-2">{type}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={80} labelLine={false}
              label={(props: any) => {
                const { cx = 0, cy = 0, midAngle, innerRadius = 0, outerRadius = 0, index } = props;
                if (midAngle === undefined || index === undefined) return null
                const RAD = Math.PI / 180
                const r = innerRadius + (outerRadius - innerRadius) / 2
                const x = cx + r * Math.cos(-midAngle * RAD)
                const y = cy + r * Math.sin(-midAngle * RAD)
                const slice = pieData[index]
                return (
                  <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold"
                    fill={type === "INK"
                      ? (slice.name === "Remaining" ? "#4b5563" : "#fff")
                      : (slice.name !== "Remaining" ? "#4b5563" : "#fff")}>
                    {type === "INK" && slice.name === "Remaining" ? `${slice.value}%` : slice.value}
                  </text>
                )
              }}>
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

// Main dashboard
const AdminDashboardContent: React.FC = () => {
  const { user } = useAuth()
  const [year, setYear] = useState(2025)
  const [product, setProduct] = useState("MUGS")
  const [showModal, setShowModal] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const peso = (n: number) => "₱" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // Sales data by month
  const salesData = MONTHS.map((m, i) => ({
    month: m,
    sales: product === "MUGS" ? 200 + (i * 30) % 150 :
           product === "SHIRTS" ? 250 + (i * 25) % 180 :
           product === "DOCUMENTS" ? 150 + (i * 20) % 120 :
           300 + (i * 35) % 200
  }))

  // Group inventory
  const grouped = INVENTORY.reduce((acc, i) => {
    (acc[i.productType] ||= []).push(i); return acc
  }, {} as Record<string, InventoryItem[]>)

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
      pdf.setFont("Roboto-Regular","normal").setFontSize(18)
        .text(`Annual Sales Report - ${product}`, pdfW/2,50,{ align:"center" })
      pdf.setFont("Roboto-Regular","normal").setFontSize(12)
        .text(`Year: ${year}`, pdfW/2,58,{ align:"center" })

      const chartH = (canvas.height * (pdfW - 20)) / canvas.width
      pdf.addImage(chartImg,"PNG",10,60,pdfW-20,chartH)

      const vals = salesData.map(d => d.sales)
      const total = vals.reduce((a,v) => a+v,0)
      const avg = total / vals.length

      const tableData = [
        ...salesData.map(d => [FULL_MONTHS[d.month], peso(d.sales)]),
        ["Total", peso(total)],
        ["Average", peso(avg)],
        ["Highest", peso(Math.max(...vals))],
        ["Lowest", peso(Math.min(...vals))]
      ]

      autoTable(pdf,{
        head:[["Month","Sales"]],
        body:tableData,
        startY:65+chartH,
        theme:"grid",
        styles:{ halign:"center", font:"Roboto-Regular", fontSize:11 },
        headStyles:{ fillColor:[30,58,138] }
      })

      pdf.save(`Annual_Sales_Report_${year}_${product}.pdf`)
    } catch(e) {
      console.error("PDF failed:", e)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="transition-all duration-300 font-crimson p-4 lg:ml-64">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Sales */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 bg-white/90 rounded-xl shadow-md p-4 flex flex-col lg:flex-row">
            <div className="flex-1 cursor-pointer" onClick={() => setShowModal(true)}>
              <h2 className="text-base font-bold mb-4">Product Sales</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" /><YAxis allowDecimals={false} />
                  <Tooltip formatter={(v: number) => ["₱"+v,"Sales"]} />
                  <Bar dataKey="sales" fill="#1e3a8a" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ProductButtons selected={product} set={setProduct} />
          </div>
          <div className="flex justify-center lg:justify-start items-center mt-4 lg:mt-0">
            <YearSelector selected={year} set={setYear} />
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white/90 rounded-xl shadow-md p-4 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
            <h2 className="text-base font-bold text-gray-800">Inventory Overview</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-[#1e3a8a]" /> Remaining</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-[#d1d5db]" /> Decreased/Used</div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(grouped).map(([t,i]) => <InventoryPie key={t} type={t} items={i} />)}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 relative">
            <button className="absolute top-3 right-3 cursor-pointer" onClick={() => setShowModal(false)}>✕</button>
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">PrintEase</h2>
              <p className="text-sm">Annual Sales Performance Analysis Report ({year})</p>
            </div>
            <div
              ref={reportRef}
              className={`w-full h-[300px] ${downloading ? "pointer-events-none" : ""}`}
            >
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
  )
}

export default AdminDashboardContent