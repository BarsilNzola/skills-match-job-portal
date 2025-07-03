import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { loginUser } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaEnvelope, FaLock, FaSignInAlt, FaUserPlus, 
  FaChartLine, FaBriefcase, FaCheckCircle, FaExclamationTriangle 
} from 'react-icons/fa';
import '../styles/loginForm.css';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const [isVerified, setIsVerified] = useState(false);
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
            setError(getErrorMessage(errorParam));
        }
    }, [searchParams, navigate]);

    const getErrorMessage = (errorCode) => {
        switch(errorCode) {
            case 'missing_parameters':
                return 'Verification link was incomplete. Please request a new verification email.';
            case 'invalid_token':
                return 'Invalid or expired verification link. Please request a new verification email.';
            case 'verification_failed':
                return 'Verification failed. Please try again or contact support.';
            default:
                return 'An error occurred during verification.';
        }
    };

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

            if (error.response?.data?.errors) {
                error.response.data.errors.forEach(err => {
                if (err.path === 'email') setEmailError(err.msg);
                if (err.path === 'password') setPasswordError(err.msg);
                });
            } else if (message === 'Email not verified') {
                setError(
                <>
                    Your email is not verified.{' '}
                    <button
                    className="btn btn-link p-0"
                    onClick={() => handleResendVerification(email)}
                    >
                    Resend verification email
                    </button>
                </>
                );
            } else {
                if (message.toLowerCase().includes('email')) setEmailError(message);
                else if (message.toLowerCase().includes('password')) setPasswordError(message);
                else setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async (emailToResend) => {
        try {
          await resendVerificationEmail({ email: emailToResend });
          setError('Verification email resent successfully!');
        } catch (err) {
          setError('Failed to resend verification email. Please try again.');
        }
    };

    const handleInputChange = (e, field) => {
        const value = e.target.value;
        if (field === 'email') {
            setEmail(value);
            if (emailError) setEmailError('');
        } else {
            setPassword(value);
            if (passwordError) setPasswordError('');
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
                        {error && (
                            <div className="alert alert-danger mb-4">
                                <div className="d-flex align-items-center">
                                    <FaExclamationTriangle className="me-2" />
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* Email Input */}
                            <div className="input-group mb-3">
                                <span className="input-group-text">
                                    <FaEnvelope />
                                </span>
                                <input
                                    type="email"
                                    className={`form-control ${emailError ? 'is-invalid' : ''}`}
                                    value={email}
                                    onChange={(e) => handleInputChange(e, 'email')}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                            {emailError && (
                                <div className="text-danger mb-2 d-flex align-items-center">
                                    <FaExclamationTriangle className="me-2" />
                                    <span>{emailError}</span>
                                </div>
                            )}

                            {/* Password Input */}
                            <div className="input-group mb-3">
                                <span className="input-group-text">
                                    <FaLock />
                                </span>
                                <input
                                    type="password"
                                    className={`form-control ${passwordError ? 'is-invalid' : ''}`}
                                    value={password}
                                    onChange={(e) => handleInputChange(e, 'password')}
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                            {passwordError && (
                                <div className="text-danger mb-2 d-flex align-items-center">
                                    <FaExclamationTriangle className="me-2" />
                                    <span>{passwordError}</span>
                                </div>
                            )}

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