import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';

const Home = () => (
    <div className="home-container" style={{ background: 'url(/path-to-image.jpg) no-repeat center center fixed', backgroundSize: 'cover', minHeight: '100vh' }}>
        <Container className="text-center py-5">
            <Row>
                <Col>
                    <h1 className="text-white display-3">Welcome to Skill-Match Job Portal</h1>
                    <p className="text-white lead">Find the best job opportunities that match your skills!</p>
                    <div>
                        <Link to="/register">
                            <Button variant="primary" className="mx-2">Register</Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="secondary" className="mx-2">Login</Button>
                        </Link>
                    </div>
                </Col>
            </Row>
        </Container>
    </div>
);

export default Home;
