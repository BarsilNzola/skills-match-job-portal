import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
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
  
  return (
    <div className="app-container">

      <Helmet>
        <title>Skill-Match</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Helmet>

      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark" style={{ background: 'linear-gradient(to right, rgba(15, 32, 39, 0.95), rgba(44, 83, 100, 0.95)' }}>
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">Skill-Match</Link>
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarContent"
          aria-controls="navbarContent" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse justify-content-end" id="navbarContent">
            <ul className="navbar-nav">
              <li className="nav-item">
                <Link className="nav-link" to="/jobs">Jobs</Link>
              </li>
              {user?.role === 'admin' && (
                <li className="nav-item">
                  <Link className="nav-link" to="/admin">Admin Panel</Link>
                </li>
              )}
              {user ? (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/profile">Profile</Link>
                  </li>
                  <li className="nav-item">
                    <button className="btn btn-link nav-link" onClick={logout}>Logout</button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="nav-link" to="/login">Login</Link>
                  </li>
                  <li className="nav-item">
                    <Link className="nav-link" to="/register">Register</Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Routes */}
      <div> {/* Remove `mt-4` here */}
        <Routes>
          <Route path="/" exact element={<Home />} />
          <Route path="/jobs" element={<JobPage />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          {/* Admin Panel Route - Only accessible by admins */}
          <Route path="/admin" element={user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/login" replace />} />
        </Routes>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default App;