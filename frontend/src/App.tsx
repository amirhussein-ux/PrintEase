import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Home, Authentication, Admin, Customer} from "./pages"


function App() {

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Authentication />} />
          <Route path="/signup" element={<Authentication />} />
          <Route path="/forgot-password" element={<Authentication />} />

          <Route path="/dashboard/admin" element={<Admin/>} />
          <Route path="/dashboard/customer" element={<Customer/>} />
        </Routes>
      </Router>
    </>
  )
}

export default App
 