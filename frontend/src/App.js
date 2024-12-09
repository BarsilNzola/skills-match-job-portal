import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';  // Make sure the path is correct
import { useAuth } from './context/AuthContext';  // Use centralized auth state
import Home from './pages/Home';
import AdminPanel from './pages/AdminPanel';
import JobPage from './pages/JobPage';
import ProfilePage from './pages/ProfilePage';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';

const App = () => {
  const { user, logout } = useAuth();

  console.log('Navbar user:', user); // Debug to ensure user is defined

  return (
    <AuthProvider>
      <Router>
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
                  {user?.role === 'admin' && (
                    <li className="nav-item">
                      <Link className="nav-link" to="/admin">Admin Panel</Link>
                    </li>
                  )}
                  <li className="nav-item">
                    {user ? (
                      <button className="btn btn-link nav-link" onClick={logout}>Logout</button>
                    ) : (
                      <Link className="nav-link" to="/login">Login</Link>
                    )}
                  </li>
                </ul>
              </div>
            </div>
          </nav>

          {/* Routes */}
          <div className="container mt-4">
            <Routes>
              <Route path="/" exact element={<Home />} />
              <Route path="/jobs" element={<JobPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route
                path="/admin"
                element={
                  user?.role === 'admin' ? <AdminPanel /> : <Navigate to="/login" replace />
                }
              />
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
