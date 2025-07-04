import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loginUser, resendVerificationEmail } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, 
  FaChartLine, FaBriefcase, FaCheckCircle, FaExclamationTriangle 
} from 'react-icons/fa';
import '../styles/loginForm.css';

const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({
        email: '',
        password: '',
        general: ''
    });
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const [showResend, setShowResend] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const verifiedParam = searchParams.get('verified');
        const errorParam = searchParams.get('error');
    
        if (verifiedParam === '1') {
            setIsVerified(true);
            // Remove query param without reload
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('verified');
            navigate({ pathname: '/login', search: newParams.toString() }, { replace: true });
        }
    
        if (errorParam) {
            setErrors(prev => ({
                ...prev,
                general: getErrorMessage(errorParam)
            }));
        }
    }, [searchParams, navigate]);

    const getErrorMessage = (errorCode) => {
        const errorMessages = {
            'missing_parameters': 'Verification link was incomplete. Please request a new verification email.',
            'invalid_token': 'Invalid or expired verification link. Please request a new verification email.',
            'verification_failed': 'Verification failed. Please try again or contact support.',
            'default': 'An error occurred during verification.'
        };
        return errorMessages[errorCode] || errorMessages.default;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({ email: '', password: '', general: '' });
        setLoading(true);

        try {
            const response = await loginUser(formData);
            login(response.token);
            navigate('/profile');
        } catch (error) {
            const response = error?.response?.data;
          
            if (response?.errors?.length) {
                // Convert array of errors to object with field names as keys
                const newErrors = response.errors.reduce((acc, err) => {
                    acc[err.path] = err.msg;
                    return acc;
                }, {});
                
                setErrors(prev => ({
                    ...prev,
                    ...newErrors,
                    general: response.errors[0].msg // Show first error as general message
                }));
            } 
            else if (response?.error === 'Email not verified') {
                setErrors({
                    email: 'Email not verified',
                    general: 'Your email is not verified. Please check your inbox for the verification link.'
                });
                setShowResend(true);
            }
            else {
                setErrors(prev => ({
                    ...prev,
                    general: response?.error || 'Login failed. Please try again.'
                }));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResendLoading(true);
        try {
            await resendVerificationEmail({ email: formData.email });
            setErrors(prev => ({
                ...prev,
                general: 'Verification email resent successfully! Check your inbox.'
            }));
            setShowResend(false);
        } catch (error) {
            setErrors(prev => ({
                ...prev,
                general: error?.response?.data?.error || 'Failed to resend verification email.'
            }));
        } finally {
            setResendLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for the current field when typing
        if (errors[name] || errors.general) {
            setErrors(prev => ({
                ...prev,
                [name]: '',
                general: name === 'email' ? '' : prev.general
            }));
        }
        // Hide resend button if email changes
        if (name === 'email' && showResend) {
            setShowResend(false);
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
                        
                        {/* Verification Success Message */}
                        {isVerified && (
                            <div className="alert alert-success mb-4">
                                <div className="d-flex align-items-center">
                                    <FaCheckCircle className="me-2" />
                                    <span>Your email has been verified successfully! You can now log in.</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Error Messages */}
                        {errors.general && (
                            <div className={`alert ${showResend ? 'alert-warning' : 'alert-danger'} mb-4`}>
                                <div className="d-flex align-items-center">
                                    <FaExclamationTriangle className="me-2" />
                                    <span>{errors.general}</span>
                                </div>
                                {showResend && (
                                    <button
                                        className="btn btn-link p-0 mt-2 text-decoration-none"
                                        onClick={handleResendVerification}
                                        disabled={resendLoading}
                                    >
                                        {resendLoading ? (
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                        ) : null}
                                        Resend verification email
                                    </button>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            {/* Email Input */}
                            <div className="form-group mb-3">
                                <label htmlFor="email" className="form-label">Email</label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <FaEnvelope />
                                    </span>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                                {errors.email && (
                                    <div className="invalid-feedback d-flex align-items-center">
                                        <FaExclamationTriangle className="me-2" />
                                        <span>{errors.email}</span>
                                    </div>
                                )}
                            </div>

                            {/* Password Input */}
                            <div className="form-group mb-4">
                                <label htmlFor="password" className="form-label">Password</label>
                                <div className="input-group">
                                    <span className="input-group-text">
                                        <FaLock />
                                    </span>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>
                                {errors.password && (
                                    <div className="invalid-feedback d-flex align-items-center">
                                        <FaExclamationTriangle className="me-2" />
                                        <span>{errors.password}</span>
                                    </div>
                                )}
                            </div>

                            <button 
                                type="submit" 
                                className="btn-login w-100" 
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Signing In...
                                    </>
                                ) : (
                                    <>
                                        <FaSignInAlt className="me-2" />
                                        Sign In
                                    </>
                                )}
                            </button>

                            <div className="register-link text-center mt-3">
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