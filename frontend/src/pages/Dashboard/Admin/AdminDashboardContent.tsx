import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter
} from "recharts";

type ModalData = {
  title: string;
  description: string;
  content: React.ReactNode;
};

const AdminDashboardContent: React.FC = () => {
  const [modalData, setModalData] = useState<ModalData | null>(null);

  const printOrdersData = [
    { name: "Mon", orders: 45 },
    { name: "Tue", orders: 65 },
    { name: "Wed", orders: 35 },
    { name: "Thu", orders: 80 },
    { name: "Fri", orders: 55 },
    { name: "Sat", orders: 90 },
    { name: "Sun", orders: 40 }
  ];

  const systemPerformanceData = [
    { time: "00:00", cpu: 45, memory: 60 },
    { time: "04:00", cpu: 35, memory: 55 },
    { time: "08:00", cpu: 65, memory: 70 },
    { time: "12:00", cpu: 80, memory: 85 },
    { time: "16:00", cpu: 70, memory: 75 },
    { time: "20:00", cpu: 55, memory: 65 },
    { time: "24:00", cpu: 40, memory: 50 }
  ];

  const userActivityData = [
    { name: "Active Users", value: 75, color: "#1e3a8a" },
    { name: "Inactive Users", value: 25, color: "#ff6b35" }
  ];

  const notificationsData = Array.from({ length: 50 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 20 + 5
  }));

  const openModal = (title: string, description: string, content: React.ReactNode) => {
    setModalData({ title, description, content });
  };

  const closeModal = () => setModalData(null);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold text-blue-900">Admin Dashboard</h1>
        <div className="flex gap-4 text-xl">
          <span>👤</span>
          <span>🔔</span>
        </div>
      </header>

      {/* Dashboard Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {/* Print Orders */}
        <div
          className="bg-white rounded-2xl p-6 shadow-md border-l-8 border-blue-900 hover:-translate-y-1 transition cursor-pointer"
          onClick={() =>
            openModal(
              "Print Orders",
              "The highest print orders occurred on Saturday (90 orders), while the lowest was on Wednesday (35 orders). Orders tend to peak towards the weekend.",
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={printOrdersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                  <XAxis dataKey="name" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Bar dataKey="orders" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        >
          <h3 className="mb-4 text-lg font-semibold text-blue-900">🖨️ Print Orders</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={printOrdersData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Bar dataKey="orders" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* System Performance */}
        <div
          className="bg-white rounded-2xl p-6 shadow-md border-l-8 border-blue-900 hover:-translate-y-1 transition cursor-pointer"
          onClick={() =>
            openModal(
              "System Performance",
              "System CPU and memory usage peaked around noon, showing possible heavy workload during that period.",
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={systemPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                  <XAxis dataKey="time" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Line type="monotone" dataKey="cpu" stroke="#ff6b35" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="memory" stroke="#1e3a8a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )
          }
        >
          <h3 className="mb-4 text-lg font-semibold text-blue-900">⚙️ System Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={systemPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="time" stroke="#888" />
              <YAxis stroke="#888" />
              <Line type="monotone" dataKey="cpu" stroke="#ff6b35" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="memory" stroke="#1e3a8a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* User Activity */}
        <div
          className="bg-white rounded-2xl p-6 shadow-md border-l-8 border-blue-900 hover:-translate-y-1 transition cursor-pointer"
          onClick={() =>
            openModal(
              "User Activity",
              "Currently, 75% of users are active, while 25% are inactive. This indicates strong engagement.",
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={userActivityData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value">
                    {userActivityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )
          }
        >
          <h3 className="mb-4 text-lg font-semibold text-blue-900">👥 User Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={userActivityData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value">
                {userActivityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Notifications */}
        <div
          className="bg-white rounded-2xl p-6 shadow-md border-l-8 border-blue-900 hover:-translate-y-1 transition cursor-pointer md:col-span-2 lg:col-span-1"
          onClick={() =>
            openModal(
              "Notifications Summary",
              "The scatter chart shows notification distribution. Most notifications are clustered around the middle range, indicating typical activity.",
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                  <XAxis dataKey="x" stroke="#888" />
                  <YAxis dataKey="y" stroke="#888" />
                  <Scatter data={notificationsData} fill="#1e3a8a" />
                </ScatterChart>
              </ResponsiveContainer>
            )
          }
        >
          <h3 className="mb-4 text-lg font-semibold text-blue-900">📩 Notifications Summary</h3>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="x" stroke="#888" />
              <YAxis dataKey="y" stroke="#888" />
              <Scatter data={notificationsData} fill="#1e3a8a" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal */}
      {modalData && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white p-6 rounded-2xl shadow-lg w-[90%] max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-blue-900">{modalData.title}</h2>
            <div className="mb-4">{modalData.content}</div>
            <p className="text-gray-700 mb-6">{modalData.description}</p>
            <button
              className="px-4 py-2 bg-blue-900 text-white rounded-xl hover:bg-blue-700"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardContent;
