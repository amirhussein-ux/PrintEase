import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Search, X, Check } from "lucide-react";

const data = [
  { month: "Jan", stock: 120, prize: 20000 },
  { month: "Feb", stock: 90, prize: 15000 },
  { month: "Mar", stock: 60, prize: 12000 },
  { month: "Apr", stock: 180, prize: 22000 },
  { month: "May", stock: 140, prize: 18500 },
  { month: "Jun", stock: 200, prize: 25000 },
  { month: "Jul", stock: 170, prize: 21000 },
  { month: "Aug", stock: 100, prize: 14000 },
  { month: "Sep", stock: 130, prize: 17500 },
  { month: "Oct", stock: 190, prize: 24000 },
  { month: "Nov", stock: 150, prize: 20000 },
  { month: "Dec", stock: 220, prize: 27000 },
];

const stats = [
  { label: "Stock Prize", value: "₱20,000.00", color: "text-gray-900" },
  { label: "Profit", value: "₱8,500.00", color: "text-green-600" },
  { label: "Expenses", value: "₱5,200.00", color: "text-red-600" },
  { label: "Employees", value: "12", color: "text-blue-600" },
];

const numericFields = ["amount", "minAmount", "entryPrice", "price"];

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    product: "", amount: "", minAmount: "", entryPrice: "", price: ""
  });

  // Load products from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("products");
    if (saved) setProducts(JSON.parse(saved));
  }, []);

  // Save products to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(products));
  }, [products]);

  const handleSave = () => {
    setProducts([...products, form]);
    setForm({ product: "", amount: "", minAmount: "", entryPrice: "", price: "" });
    setShowModal(false);
  };

  return (
    <div
      className="transition-all duration-300 font-crimson p-10 space-y-8 origin-top-left"
      style={{ transform: "scale(0.7)", width: `${100 / 0.7}%` }}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-gray-200 rounded-xl shadow-md p-6">
            <h3 className="text-sm text-gray-600">{s.label}</h3>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {["Stock Amount", "Stock Prize"].map((title) => (
          <div key={title} className="bg-gray-200 rounded-xl shadow-md p-6 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">{title}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  domain={title === "Stock Amount" ? [0, 250] : undefined}
                  ticks={title === "Stock Amount" ? [0, 50, 100, 150, 200, 250] : undefined}
                />
                <Tooltip />
                <Bar
                  dataKey={title === "Stock Amount" ? "stock" : "prize"}
                  fill={title === "Stock Amount" ? "#3b82f6" : "#10b981"}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Search + Create */}
      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3 flex items-center bg-gray-700 rounded-full shadow-md px-4 py-2 gap-3">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-full bg-gray-100 text-gray-900 focus:outline-none"
          />
          <button className="px-5 py-2 bg-blue-600 text-white rounded-full font-medium shadow-md hover:bg-blue-700 transition flex items-center gap-1">
            <Search className="w-4 h-4" /> Search
          </button>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-green-400 text-white py-2 rounded-full font-medium shadow-md hover:bg-green-500 transition"
        >
          + Create
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-gray-200 rounded-xl shadow-md overflow-x-auto">
        <div className="py-4">
          <h2 className="text-2xl font-bold text-center text-gray-800">PRODUCTS</h2>
        </div>
        <table className="min-w-full text-gray-700">
          <thead className="bg-gray-300">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold w-1/2">Product</th>
              <th colSpan={4} className="px-4 py-3 w-1/2">
                <div className="flex justify-end gap-6 text-sm font-semibold">
                  <span>Amount</span>
                  <span>Min. Amount</span>
                  <span>Entry Price</span>
                  <span>Price</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500 italic">
                  No products available
                </td>
              </tr>
            ) : (
              products.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-3">{p.product}</td>
                  <td colSpan={4} className="px-4 py-3">
                    <div className="flex justify-end gap-6">
                      {numericFields.map(f => (
                        <span key={f} className="text-right w-16">{(p as any)[f]}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="relative bg-gray-100 rounded-xl shadow-2xl w-96 p-6 space-y-4 border border-gray-300 pointer-events-auto">
            <h2 className="text-xl font-bold text-center mb-4">Create Product</h2>
            {Object.keys(form).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1 capitalize">{field.replace(/([A-Z])/g, " $1")}</label>
                <input
                  type="text"
                  value={(form as any)[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                  className="w-full px-4 py-2 rounded-full bg-gray-200 text-gray-900 focus:outline-none"
                />
              </div>
            ))}
            <div className="flex justify-between pt-4">
              <button onClick={() => setShowModal(false)} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-green-400 text-white rounded-full hover:bg-green-500 transition">
                <Check className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
