import React, { useState } from 'react';
import { registerUser } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaCheck, FaRocket, FaUsers, FaChartLine } from 'react-icons/fa';
import '../styles/registerForm.css';

const RegisterForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setNameError('');
        setEmailError('');
        setPasswordError('');
        setLoading(true);

        try {
            await registerUser({ name, email, password });
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            const message = error?.response?.data?.error || 'Registration failed. Please try again.';
            if (message.toLowerCase().includes('name')) setNameError(message);
            else if (message.toLowerCase().includes('email')) setEmailError(message);
            else if (message.toLowerCase().includes('password')) setPasswordError(message);
            else setError(message);
            console.error('Registration Failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-grid">
                {/* Information Column */}
                <div className="info-column">
                    <div className="info-content">
                        <h2>Join TalentPath Today</h2>
                        <p>Create your account and unlock these benefits:</p>
                        
                        <ul className="benefits-list">
                            <li>
                                <FaRocket className="benefit-icon" />
                                <span>Access to exclusive job opportunities</span>
                            </li>
                            <li>
                                <FaUsers className="benefit-icon" />
                                <span>Connect with top employers</span>
                            </li>
                            <li>
                                <FaChartLine className="benefit-icon" />
                                <span>Track your career progress</span>
                            </li>
                        </ul>
                        
                        <div className="testimonial">
                            <p>"TalentPath helped me find my dream job in just two weeks!"</p>
                            <div className="testimonial-author">- Sarah K., UX Designer</div>
                        </div>
                    </div>
                </div>

                {/* Form Column */}
                <div className="form-column">
                    <div className="register-card">
                        <h2 className="text-center mb-4">Create Account</h2>
                        <form onSubmit={handleSubmit}>
                            {error && <div className="alert alert-danger">{error}</div>}
                            {success && <div className="alert alert-success">{success}</div>}
                            
                            {/* Name Input */}
                            <div className="input-group mb-3">
                                <span className="input-group-text">
                                    <FaUser />
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>
                            {nameError && <div className="text-danger mb-2">{nameError}</div>}

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

                            <button type="submit" className="btn-register" disabled={loading}>
                                {loading ? (
                                    <div className="spinner-border spinner-border-sm" role="status"></div>
                                ) : (
                                    <>
                                        <FaCheck style={{ marginRight: '8px' }} />
                                        Register Now
                                    </>
                                )}
                            </button>

                            <div className="login-link">
                                Already have an account? <a href="/login">Sign in</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterForm;