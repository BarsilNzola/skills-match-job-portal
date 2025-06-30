import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import JobPage from './pages/JobPage';
import JobDetail from './components/JobDetail';
import ProfilePage from './pages/ProfilePage';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Footer from './components/Footer';
import { HelmetProvider } from 'react-helmet-async';
import { Helmet } from 'react-helmet-async';
import './App.css'; 

const App = () => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
};

const AppContent = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    document.body.style.overflow = sidebarOpen ? 'auto' : 'hidden';
  };
  
  const closeSidebar = () => {
    setSidebarOpen(false);
    document.body.style.overflow = 'auto';
  };
  
  return (
    <div className="app-container">
      <Helmet>
        <title>TalentPath</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Helmet>

      {/* Navigation - Updated with new color scheme */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dominant">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/" onClick={closeSidebar}>TalentPath</Link>
          <button 
            className="navbar-toggler" 
            type="button" 
            onClick={toggleSidebar}
            aria-expanded={sidebarOpen}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          
          {/* Overlay */}
          <div 
            className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} 
            onClick={closeSidebar}
          />
          
          {/* Sidebar */}
          <div className={`collapse navbar-collapse ${sidebarOpen ? 'show' : ''}`} id="navbarContent">
            <button className="sidebar-close" onClick={closeSidebar} aria-label="Close menu">
              &times;
            </button>
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link className="nav-link" to="/jobs" onClick={closeSidebar}>Jobs</Link>
              </li>
              {user ? (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/profile" onClick={closeSidebar}>Profile</Link>
                  </li>
                  <li className="nav-item">
                    <button className="btn btn-link nav-link" onClick={() => { logout(); closeSidebar(); }}>Logout</button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/login" onClick={closeSidebar}>Login</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/register" onClick={closeSidebar}>Register</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Routes */}
      <div className="app-main-content">
        <Routes>
          <Route path="/" exact element={<Home />} />
          <Route path="/jobs" element={<JobPage />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
        </Routes>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;