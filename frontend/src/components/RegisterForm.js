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
    const [fieldErrors, setFieldErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);
    const [resendStatus, setResendStatus] = useState({
        loading: false,
        success: null,
        error: null
    });
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setFieldErrors({});
        setIsLoading(true);

        try {
            await registerUser(formData);
            setIsRegistered(true);
        } catch (error) {
            const response = error?.response?.data;
        
            if (response?.errors?.length) {
                // Convert array of errors to object with field names as keys
                const errorsObj = response.errors.reduce((acc, err) => {
                    acc[err.path] = err.msg;
                    return acc;
                }, {});
                setFieldErrors(errorsObj);
                
                // Set first error as general error for better visibility
                setError(response.errors[0].msg);
            } else {
                setError(response?.error || 'Registration failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for the current field when typing
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
        // Clear general error when any field changes
        if (error) setError(null);
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
                                {error && (
                                    <div className="alert alert-danger mb-3">
                                        <div className="d-flex align-items-center">
                                            <span className="me-2">⚠️</span>
                                            <span>{error}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Name Input */}
                                <div className="form-group mb-3">
                                    <label htmlFor="name" className="form-label">Full Name</label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            <FaUser />
                                        </span>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            className={`form-control ${fieldErrors.name ? 'is-invalid' : ''}`}
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>
                                    {fieldErrors.name && (
                                        <div className="invalid-feedback d-flex align-items-center">
                                            <span className="me-2">⚠️</span>
                                            <span>{fieldErrors.name}</span>
                                        </div>
                                    )}
                                </div>

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
                                            className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="Enter your email"
                                            required
                                        />
                                    </div>
                                    {fieldErrors.email && (
                                        <div className="invalid-feedback d-flex align-items-center">
                                            <span className="me-2">⚠️</span>
                                            <span>{fieldErrors.email}</span>
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
                                            className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="Enter your password"
                                            required
                                        />
                                    </div>
                                    {fieldErrors.password && (
                                        <div className="invalid-feedback d-flex align-items-center">
                                            <span className="me-2">⚠️</span>
                                            <span>{fieldErrors.password}</span>
                                        </div>
                                    )}
                                    <div className="form-text">
                                        Password must be at least 8 characters long
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    className="btn-register w-100" 
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

                                <div className="login-link text-center mt-3">
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