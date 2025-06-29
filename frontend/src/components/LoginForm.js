import React, { useState } from 'react';
import { loginUser } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEnvelope, FaLock } from 'react-icons/fa'; // Import icons
import '../styles/loginForm.css'; // Import custom CSS

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(false); // Loading state
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setEmailError('');
        setPasswordError('');
        setLoading(true); // Set loading state

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
            setLoading(false); // Reset loading state
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="text-center mb-4">Login</h2>
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
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {loading ? <div className="spinner-border spinner-border-sm" role="status"></div> : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;