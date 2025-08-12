import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Home, Authentication } from "./pages"


function App() {

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Authentication />} />
          <Route path="/signup" element={<Authentication />} />
          <Route path="/forgot-password" element={<Authentication />} />
        </Routes>
      </Router>
    </>
  )
}

export default App
 