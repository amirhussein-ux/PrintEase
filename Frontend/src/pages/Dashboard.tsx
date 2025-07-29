import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter
} from 'recharts';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const printOrdersData = [
    { name: 'Mon', orders: 45 },
    { name: 'Tue', orders: 65 },
    { name: 'Wed', orders: 35 },
    { name: 'Thu', orders: 80 },
    { name: 'Fri', orders: 55 },
    { name: 'Sat', orders: 90 },
    { name: 'Sun', orders: 40 }
  ];

  const systemPerformanceData = [
    { time: '00:00', cpu: 45, memory: 60 },
    { time: '04:00', cpu: 35, memory: 55 },
    { time: '08:00', cpu: 65, memory: 70 },
    { time: '12:00', cpu: 80, memory: 85 },
    { time: '16:00', cpu: 70, memory: 75 },
    { time: '20:00', cpu: 55, memory: 65 },
    { time: '24:00', cpu: 40, memory: 50 }
  ];

  const userActivityData = [
    { name: 'Active Users', value: 75, color: '#1e3a8a' },
    { name: 'Inactive Users', value: 25, color: '#ff6b35' }
  ];

  const notificationsData = Array.from({ length: 50 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 20 + 5
  }));

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="user-info">
          <span>👤</span>
          <span>🔔</span>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>🖨️ Print Orders</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={printOrdersData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="name" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Bar dataKey="orders" fill="#1e3a8a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card">
          <h3>⚙️ System Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={systemPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="time" stroke="#aaa" />
              <YAxis stroke="#aaa" />
              <Line type="monotone" dataKey="cpu" stroke="#ff6b35" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="memory" stroke="#1e3a8a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card">
          <h3>👥 User Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={userActivityData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                dataKey="value"
              >
                {userActivityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card">
          <h3>📩 Notifications Summary</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
              <XAxis dataKey="x" stroke="#aaa" />
              <YAxis dataKey="y" stroke="#aaa" />
              <Scatter data={notificationsData} fill="#1e3a8a" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
