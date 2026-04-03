import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import TokenPage from './pages/TokenPage'
import CreateToken from './pages/CreateToken'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-950 text-white">
        <NavBar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/token/:mint" element={<TokenPage />} />
          <Route path="/create" element={<CreateToken />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
