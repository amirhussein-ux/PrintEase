import React from 'react'
import DashboardHeader from '../shared_components/dashboard_header'
import { useAuth } from '../../../context/useAuth'

const Customer = () => {
  const { user } = useAuth()  

  return (
    <DashboardHeader 
      role="customer" 
      userName={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "Guest"} 
    />
  )
}

export default Customer
