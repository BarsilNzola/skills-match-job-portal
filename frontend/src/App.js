import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './pages/Home';
import JobPage from './pages/JobPage';
import ProfilePage from './pages/ProfilePage';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';

const App = () => {
    return (
        <Router>
            <Switch>
                <Route path="/" exact component={Home} />
                <Route path="/jobs" component={JobPage} />
                <Route path="/profile" component={ProfilePage} />
                <Route path="/login" component={LoginForm} />
                <Route path="/register" component={RegisterForm} />
            </Switch>
        </Router>
    );
};

export default App;
