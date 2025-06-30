import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import '../styles/home.css';

const Home = () => {
  useEffect(() => {
    // Animation trigger
    const elements = document.querySelectorAll('.fade-in-up');
    elements.forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  }, []);

  return (
    <div className="home-wrapper">
      {/* Hero Section */}
      <div className="home-container">
        <div className="overlay">
          <Container className="text-center py-5">
            <Row>
              <Col>
                <h1 className="home-title fade-in-up">Welcome to TalentPath</h1>
                <p className="home-subtitle fade-in-up">Find the best job opportunities that match your skills!</p>
                <div className="home-buttons mt-4 fade-in-up">
                  <Link to="/register">
                    <Button variant="primary" className="btn-custom btn-register">Get Started</Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="secondary" className="btn-custom btn-login">Login</Button>
                  </Link>
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </div>

      {/* Learn More Section */}
      <section className="learn-more">
        <Container>
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <h2 className="section-title">Why Choose TalentPath?</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">💼</div>
                  <h3>Curated Jobs</h3>
                  <p>Hand-picked opportunities matching your skills</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">📈</div>
                  <h3>Career Growth</h3>
                  <p>Tools to help you advance your career</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🤝</div>
                  <h3>Direct Connections</h3>
                  <p>Connect directly with hiring managers</p>
                </div>
              </div>
              <Link to="/jobs" className="btn-explore">Explore Jobs</Link>
            </Col>
          </Row>
        </Container>
      </section>
    </div>
  );
};

export default Home;