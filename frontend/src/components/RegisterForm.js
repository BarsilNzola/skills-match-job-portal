import React, { useState } from 'react';
import { registerUser, resendVerificationEmail } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { 
  FaUser, FaEnvelope, FaLock, FaCheck, 
  FaRocket, FaUsers, FaChartLine, FaPaperPlane 
} from 'react-icons/fa';
import '../styles/registerForm.css';

const RegisterForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({
        name: '',
        email: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [resendStatus, setResendStatus] = useState({
        loading: false,
        success: null,
        error: null
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear field-specific error when user types
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await registerUser(formData);
            setIsRegistered(true);
        } catch (error) {
            const message = error?.response?.data?.error || 'Registration failed. Please try again.';
            
            // Handle field-specific errors
            if (message.toLowerCase().includes('name')) {
                setFieldErrors(prev => ({ ...prev, name: message }));
            } else if (message.toLowerCase().includes('email')) {
                setFieldErrors(prev => ({ ...prev, email: message }));
            } else if (message.toLowerCase().includes('password')) {
                setFieldErrors(prev => ({ ...prev, password: message }));
            } else {
                setError(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResendStatus({ loading: true, success: null, error: null });
        try {
            await resendVerificationEmail({ email: formData.email });
            setResendStatus({
                loading: false,
                success: 'Verification email resent successfully!',
                error: null
            });
        } catch (error) {
            setResendStatus({
                loading: false,
                success: null,
                error: error?.response?.data?.error || 'Failed to resend verification email'
            });
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
                        
                        {isRegistered ? (
                            <div className="verification-message">
                                <div className="alert alert-success">
                                    <h3>Almost there!</h3>
                                    <p>We've sent a verification email to <strong>{formData.email}</strong>.</p>
                                    <p>Please check your inbox and click the verification link to activate your account.</p>
                                </div>

                                <div className="resend-section">
                                    <p>Didn't receive the email?</p>
                                    {resendStatus.success && (
                                        <div className="alert alert-success">{resendStatus.success}</div>
                                    )}
                                    {resendStatus.error && (
                                        <div className="alert alert-danger">{resendStatus.error}</div>
                                    )}
                                    <button
                                        className="btn-resend"
                                        onClick={handleResendVerification}
                                        disabled={resendStatus.loading}
                                    >
                                        {resendStatus.loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <FaPaperPlane className="me-2" />
                                                Resend Verification Email
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="login-redirect">
                                    <p>Already verified your email?</p>
                                    <button 
                                        className="btn-login"
                                        onClick={() => navigate('/login')}
                                    >
                                        Proceed to Login
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {error && <div className="alert alert-danger">{error}</div>}

                                {/* Name Input */}
                                <div className="input-group mb-3">
                                    <span className="input-group-text">
                                        <FaUser />
                                    </span>
                                    <input
                                        type="text"
                                        name="name"
                                        className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter your name"
                                        required
                                    />
                                </div>
                                {fieldErrors.name && (
                                    <div className="text-danger mb-2">{fieldErrors.name}</div>
                                )}

                                {/* Email Input */}
                                <div className="input-group mb-3">
                                    <span className="input-group-text">
                                        <FaEnvelope />
                                    </span>
                                    <input
                                        type="email"
                                        name="email"
                                        className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Enter your email"
                                        required
                                    />
                                </div>
                                {fieldErrors.email && (
                                    <div className="text-danger mb-2">{fieldErrors.email}</div>
                                )}

                                {/* Password Input */}
                                <div className="input-group mb-3">
                                    <span className="input-group-text">
                                        <FaLock />
                                    </span>
                                    <input
                                        type="password"
                                        name="password"
                                        className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter your password"
                                        required
                                    />
                                </div>
                                {fieldErrors.password && (
                                    <div className="text-danger mb-2">{fieldErrors.password}</div>
                                )}

                                <button 
                                    type="submit" 
                                    className="btn-register" 
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Registering...
                                        </>
                                    ) : (
                                        <>
                                            <FaCheck className="me-2" />
                                            Register Now
                                        </>
                                    )}
                                </button>

                                <div className="login-link">
                                    Already have an account? <a href="/login">Sign in</a>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterForm;