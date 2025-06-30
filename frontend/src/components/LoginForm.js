import React, { useState } from 'react';
import { loginUser } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, FaChartLine, FaBriefcase } from 'react-icons/fa';
import '../styles/loginForm.css';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setEmailError('');
        setPasswordError('');
        setLoading(true);

        try {
            const response = await loginUser({ email, password });
            login(response.data.token);
            navigate('/profile');
        } catch (error) {
            const message = error.response?.data?.error || 'Login failed. Please try again.';
            console.error('Login Failed', error);
            if (message.toLowerCase().includes('email')) setEmailError(message);
            else if (message.toLowerCase().includes('password')) setPasswordError(message);
            else setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-grid">
                {/* Information Column */}
                <div className="info-column">
                    <div className="info-content">
                        <h2>Welcome Back to TalentPath</h2>
                        <p>Sign in to access your personalized dashboard and continue your job search journey.</p>
                        
                        <ul className="features-list">
                            <li>
                                <FaBriefcase className="feature-icon" />
                                <span>Track your job applications</span>
                            </li>
                            <li>
                                <FaChartLine className="feature-icon" />
                                <span>View your career progress</span>
                            </li>
                            <li>
                                <FaUserPlus className="feature-icon" />
                                <span>Get matched with new opportunities</span>
                            </li>
                        </ul>
                        
                        <div className="testimonial">
                            <p>"I landed 3 interviews in my first week using TalentPath!"</p>
                            <div className="testimonial-author">- Michael T., Software Engineer</div>
                        </div>
                    </div>
                </div>

                {/* Form Column */}
                <div className="form-column">
                    <div className="login-card">
                        <h2 className="text-center mb-4">Sign In</h2>
                        <form onSubmit={handleSubmit}>
                            {error && <div className="alert alert-danger">{error}</div>}
                            
                            {/* Email Input */}
                            <div className="input-group mb-3">
                                <span className="input-group-text">
                                    <FaEnvelope />
                                </span>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            {emailError && <div className="text-danger mb-2">{emailError}</div>}

                            {/* Password Input */}
                            <div className="input-group mb-3">
                                <span className="input-group-text">
                                    <FaLock />
                                </span>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                            {passwordError && <div className="text-danger mb-2">{passwordError}</div>}

                            <button type="submit" className="btn-login" disabled={loading}>
                                {loading ? (
                                    <div className="spinner-border spinner-border-sm" role="status"></div>
                                ) : (
                                    <>
                                        <FaSignInAlt style={{ marginRight: '8px' }} />
                                        Sign In
                                    </>
                                )}
                            </button>

                            <div className="register-link">
                                Don't have an account? <a href="/register">Create one</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;