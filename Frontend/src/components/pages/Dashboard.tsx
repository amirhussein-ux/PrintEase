
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  // State for print orders data
  const [printOrdersData, setPrintOrdersData] = useState<{ name: string; orders: number }[]>([
    { name: 'Mon', orders: 0 },
    { name: 'Tue', orders: 0 },
    { name: 'Wed', orders: 0 },
    { name: 'Thu', orders: 0 },
    { name: 'Fri', orders: 0 },
    { name: 'Sat', orders: 0 },
    { name: 'Sun', orders: 0 }
  ]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrintOrders = async () => {
      setLoadingOrders(true);
      setOrdersError(null);
      try {
        const res = await fetch('http://localhost:8000/api/orders/summary/print-orders');
        if (!res.ok) throw new Error('Failed to fetch print orders summary');
        const data = await res.json();
        // API returns [{ day: 'Mon', orders: 10 }, ...]
        // Map to recharts format: { name: 'Mon', orders: 10 }
        setPrintOrdersData(
          ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
            const found = data.find((d: any) => d.day === day);
            return { name: day, orders: found ? found.orders : 0 };
          })
        );
      } catch (err: any) {
        setOrdersError(err.message || 'Unknown error');
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchPrintOrders();
  }, []);

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
    { name: 'Active Users', value: 75, color: '#4a9eff' },
    { name: 'Inactive Users', value: 25, color: '#ff6b35' }
  ]

  const notificationsData = Array.from({ length: 50 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 20 + 5
  }))

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="user-info">
          <span>👤</span>
          <span>🔔</span>
        </div>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Print Orders</h3>
          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: '2em' }}>Loading...</div>
          ) : ordersError ? (
            <div style={{ color: 'red', textAlign: 'center', padding: '2em' }}>{ordersError}</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={printOrdersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3a" />
                <XAxis dataKey="name" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Bar dataKey="orders" fill="#4a9eff" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="dashboard-card">
          <h3>System Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={systemPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffffff" />
              <XAxis dataKey="time" stroke="#ccc" />
              <YAxis stroke="#ccc" />
              <Line type="monotone" dataKey="cpu" stroke="#ff6b35" strokeWidth={2} />
              <Line type="monotone" dataKey="memory" stroke="#4a9eff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="dashboard-card">
          <h3>User Activity</h3>
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
          <h3>Notifications Summary</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart data={notificationsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffffff" />
              <XAxis dataKey="x" stroke="#ccc" />
              <YAxis dataKey="y" stroke="#ccc" />
              <Scatter dataKey="size" fill="#4a9eff" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
