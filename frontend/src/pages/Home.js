import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import '../styles/home.css';

const Home = () => (
    <div fluid className="home-container">
        <div className="overlay">
            <Container className="text-center py-5">
                <Row>
                    <Col>
                        <h1 className="text-white display-3">Welcome to TalentPath</h1>
                        <p className="text-white lead">Find the best job opportunities that match your skills!</p>
                        <div className="mt-4">
                            <Link to="/register">
                                <Button variant="primary" className="mx-2 btn-custom">Register</Button>
                            </Link>
                            <Link to="/login">
                                <Button variant="secondary" className="mx-2 btn-custom">Login</Button>
                            </Link>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    </div>
);

export default Home;