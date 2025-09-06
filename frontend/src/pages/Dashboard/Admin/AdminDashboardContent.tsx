import React, { useState } from "react"
import { useAuth } from "../../../context/AuthContext"
import "@fontsource/crimson-pro/400.css"
import "@fontsource/crimson-pro/700.css"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"

interface InventoryItem {
  name: string
  expectedStock: number
  currentStock: number
  productType: string
}

interface AdminDashboardContentProps {
  sidebarOpen: boolean
}

const AdminDashboardContent: React.FC<AdminDashboardContentProps> = ({ sidebarOpen }) => {
  const { user } = useAuth()
  const [selectedYear, setSelectedYear] = useState(2025)
  const [selectedProduct, setSelectedProduct] = useState("MUGS")

  const years = [2025, 2024, 2023, 2022, 2021, 2020]
  const products = ["MUGS", "SHIRTS", "DOCUMENTS", "TARPAULIN"]

  // Generate dummy sales data for the selected product
  const salesData = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    .map((month, i) => ({
      month,
      sales:
        selectedProduct === "MUGS"
          ? 200 + (i * 30) % 150
          : selectedProduct === "SHIRTS"
          ? 250 + (i * 25) % 180
          : selectedProduct === "DOCUMENTS"
          ? 150 + (i * 20) % 120
          : 300 + (i * 35) % 200,
    }))

  // Inventory data
  const inventoryData: InventoryItem[] = [
    { name: "Bond Paper", expectedStock: 500, currentStock: 120, productType: "BOND PAPER" },
    { name: "Shirts", expectedStock: 200, currentStock: 50, productType: "SHIRTS" },
    { name: "Ink", expectedStock: 100, currentStock: 40, productType: "INK" },
  ]

  const COLORS = ["#1e3a8a", "#d1d5db"]

  // Group inventory items 
  const groupedProducts: Record<string, InventoryItem[]> = {}
  inventoryData.forEach(item => {
    if (!groupedProducts[item.productType]) groupedProducts[item.productType] = []
    groupedProducts[item.productType].push(item)
  })

  return (
    <div className="transition-all duration-300 font-crimson p-4 lg:ml-64">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Current Sales for this DAY", value: "₱5,000" },
            { label: "Current Sales for this MONTH", value: "₱120,000" },
            { label: "Current Sales for this YEAR", value: "₱1,500,000" },
          ].map(stat => {
            const labelParts = stat.label.split(" ")
            const lastWord = labelParts[labelParts.length - 1]
            const restLabel = labelParts.slice(0, -1).join(" ")
            return (
              <div key={stat.label} className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4 flex flex-col items-center justify-center">
                {/* Value */}
                <span className="text-xl font-bold text-gray-900">{stat.value}</span>
                {/* Label */}
                <span className="text-gray-800 text-xs tracking-wide uppercase">
                  {restLabel} <span className="font-bold text-gray-900">{lastWord}</span>
                </span>
              </div>
            )
          })}
        </div>

        {/* Product Sales Graph + Product & Year Selectors */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">

          {/* Sales Graph */}
          <div className="flex-1 bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4 flex flex-col lg:flex-row">
            <div className="flex-1">
              <h2 className="text-base font-bold tracking-wide uppercase mb-4 text-gray-800">Product Sales</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="month"/>
                  <YAxis allowDecimals={false}/>
                  <Tooltip
                    cursor={false}
                    formatter={(value:number)=>[`₱${value}`,"Sales"]}
                    labelFormatter={label => ({
                      Jan:"January",Feb:"February",Mar:"March",Apr:"April",
                      May:"May",Jun:"June",Jul:"July",Aug:"August",
                      Sep:"September",Oct:"October",Nov:"November",Dec:"December"
                    }[label]||label)}
                  />
                  <Bar dataKey="sales" fill="#1e3a8a" radius={[6,6,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Product Selection Buttons */}
            <div className="flex flex-row lg:flex-col gap-2 mt-4 lg:mt-0 lg:ml-4 justify-center">
              {products.map(p => (
                <button
                  key={p}
                  onClick={()=>setSelectedProduct(p)}
                  className={`rounded-lg py-2 text-sm font-bold tracking-wide uppercase transition ${selectedProduct===p?"bg-gray-600 text-white":"bg-gray-300 text-gray-900 hover:bg-gray-400"}`}
                >{p}</button>
              ))}
            </div>
          </div>

          {/* Year Selector */}
          <div className="flex justify-center lg:justify-start items-center">
            <div className="w-32 bg-blue-900 rounded-xl shadow-md p-3 mt-4 lg:mt-0">
              <h3 className="text-white text-sm font-bold tracking-wide uppercase text-center mb-2">Year</h3>
              <div className="grid grid-cols-2 gap-2">
                {years.map(y => (
                  <button key={y} onClick={()=>setSelectedYear(y)}
                    className={`rounded-lg py-2 text-sm font-medium transition ${selectedYear===y?"bg-gray-600 text-white":"bg-gray-400 text-gray-900 hover:bg-gray-500"}`}>
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Pie Charts */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4 space-y-6">

          {/* Inventory Header & Legend */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
            <h2 className="text-base font-bold tracking-wide uppercase text-gray-800">Inventory Overview</h2>
            <div className="flex gap-4">
              {/* Legend */}
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-[#1e3a8a] rounded-sm"/> Remaining</div>
              <div className="flex items-center gap-1"><div className="w-4 h-4 bg-[#d1d5db] rounded-sm"/> Decreased/Used</div>
            </div>
          </div>

          {/* Pie Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(groupedProducts).map(productType => {
              const items = groupedProducts[productType]
              const totalExpected = items.reduce((sum,i)=>sum+i.expectedStock,0)
              const totalCurrent = items.reduce((sum,i)=>sum+i.currentStock,0)
              const pieData = productType==="INK"
                ? [{name:"Used", value:100-totalCurrent},{name:"Remaining", value:totalCurrent}]
                : [{name:"Remaining", value:totalCurrent},{name:"Decreased", value:totalExpected-totalCurrent}]
              const restock = totalCurrent < totalExpected*0.3

              return (
                <div key={productType} className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4 flex flex-col items-center transition ${restock?"animate-pulse shadow-[0_0_20px_#f87171]":""}`}>
                  {/* Pie Chart Title */}
                  <h3 className="text-base font-bold uppercase text-gray-800 mb-2">{productType}</h3>

                  {/* Pie Chart */}
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, index }) => {
                          const RADIAN = Math.PI / 180
                          const radius = innerRadius + (outerRadius - innerRadius) / 2
                          const x = cx + radius * Math.cos(-midAngle * RADIAN)
                          const y = cy + radius * Math.sin(-midAngle * RADIAN)
                          const slice = pieData[index]
                          return (
                            <text
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={14}
                              fontWeight="bold"
                              fill={
                                productType === "INK"
                                  ? slice.name === "Remaining"
                                    ? "#4b5563"
                                    : "#fff"
                                  : slice.name === "Decreased" || slice.name === "Used"
                                  ? "#4b5563"
                                  : "#fff"
                              }
                            >
                              {productType === "INK" && slice.name === "Remaining" ? `${slice.value}%` : slice.value}
                            </text>
                          )
                        }}
                      >
                        {/* Pie Slices */}
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboardContent
