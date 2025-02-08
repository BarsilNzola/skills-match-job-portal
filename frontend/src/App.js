import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext'; // Import AuthProvider and useAuth
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
import JobPage from './pages/JobPage';
import JobDetail from './components/JobDetail';
import ProfilePage from './pages/ProfilePage';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

// ✅ Move everything inside a separate component to ensure AuthProvider is initialized
const AppContent = () => {
  const { user, logout } = useAuth();
  const [authChanged, setAuthChanged] = useState(false);

  useEffect(() => {
    setAuthChanged((prev) => !prev); // Trigger re-render when `user` changes
  }, [user]);

  return (
    <div>
      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-light bg-light">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">Skill-Match</Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/jobs">Jobs</Link>
              </li>
              {/* Admin link visible only for admins */}
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
                <li className="nav-item">
                  <Link className="nav-link" to="/login">Login</Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Routes */}
      <div className="container mt-4">
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
    </div>
  );
};

export default App;
