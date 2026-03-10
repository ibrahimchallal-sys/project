import Navbar from './components/Navbar'
import Home from './components/Home'
import About from './components/About'
import Login from './components/Login'
import Services from './components/Services'
import Footer from './components/Footer'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

function App() {
  const location = useLocation();
  const showFooter = location.pathname !== '/login';

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="/home" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/login" element={<Login />} />
      </Routes>
      {showFooter && <Footer />}
    </>
  )
}

export default App
