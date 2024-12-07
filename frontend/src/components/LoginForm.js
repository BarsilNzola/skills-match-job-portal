import React, { useState } from 'react';
import { loginUser } from '../services/api'; // Assuming you have a loginUser function
import { useNavigate } from 'react-router-dom';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('Sending login request with data:', { email, password }); // Debug log
        setError(null); // Reset error state
        try {
            const response = await loginUser({ email, password });
            console.log('Login Successful', response.data);
            // Redirect to profile page or dashboard

            // On successful login, save the token to localStorage
            localStorage.setItem('authToken', response.data.token); // Assuming response contains token

            navigate('/profile');
        } catch (error) {
            console.error('Login Failed', error);
            setError(error.response?.data?.message || 'Login failed, please try again.');
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <h2 className="text-center mb-4">Login</h2>
                    <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
                        {error && <div className="alert alert-danger">{error}</div>}
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">Email</label>
                            <input
                                type="email"
                                id="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input
                                type="password"
                                id="password"
                                className="form-control"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                        </div>
                        <button type="submit" className="btn btn-primary w-100">Login</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;
