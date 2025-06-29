import React, { useState } from 'react';
import { registerUser } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa'; // Import icons
import '../styles/registerForm.css'; // Import custom CSS

const RegisterForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false); // Loading state
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setNameError('');
        setEmailError('');
        setPasswordError('');
        setLoading(true); // Set loading state

        try {
            await registerUser({ name, email, password });
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (error) {
            const message = error?.response?.data?.error || 'Registration failed. Please try again.';

            // Check for field-specific error content
            if (message.toLowerCase().includes('name')) setNameError(message);
            else if (message.toLowerCase().includes('email')) setEmailError(message);
            else if (message.toLowerCase().includes('password')) setPasswordError(message);
            else setError(message);
            console.error('Registration Failed', error);
        } finally {
            setLoading(false); // Reset loading state
        }
    };

    return (
        <div className="register-container">
            <div className="register-card">
                <h2 className="text-center mb-4">Register</h2>
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
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {loading ? <div className="spinner-border spinner-border-sm" role="status"></div> : 'Register'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegisterForm;