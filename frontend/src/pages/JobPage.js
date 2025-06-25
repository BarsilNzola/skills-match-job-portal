import React, { useEffect, useState, useCallback } from 'react';
import { fetchJobs, deleteJob } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Container, Row, Col, Card, Button, 
  Spinner, Alert, Modal, Badge 
} from 'react-bootstrap';
import { 
  FaSearch, 
  FaMapMarkerAlt, 
  FaExternalLinkAlt,
  FaTrash,
  FaInfoCircle
} from 'react-icons/fa';
import '../styles/jobPage.css';

const JobPage = () => {
  const { user } = useAuth();
  const [state, setState] = useState({
    jobs: [],
    searchTerm: '',
    location: '',
    loading: true,
    error: null,
    showModal: false,
    selectedJob: null
  });

  const getJobs = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await fetchJobs();
      setState(prev => ({ ...prev, jobs: response.data }));
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setState(prev => ({ ...prev, error: 'Failed to load jobs. Please try again.' }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    getJobs();
  }, [getJobs]);

  const handleSearch = e => setState(prev => ({ ...prev, searchTerm: e.target.value }));
  const handleLocationChange = e => setState(prev => ({ ...prev, location: e.target.value }));

  const handleShowModal = (job) => setState(prev => ({
    ...prev,
    showModal: true,
    selectedJob: job
  }));

  const handleCloseModal = () => setState(prev => ({
    ...prev,
    showModal: false,
    selectedJob: null
  }));

  const handleDeleteJob = async jobId => {
    if (!window.confirm('Are you sure you want to delete this job?')) return;
    try {
      await deleteJob(jobId);
      setState(prev => ({
        ...prev,
        jobs: prev.jobs.filter(job => job.id !== jobId),
      }));
    } catch (error) {
      console.error('Error deleting job', error);
    }
  };

  // Filter jobs
  const filteredJobs = state.jobs.filter(
    job =>
      job.title?.toLowerCase().includes(state.searchTerm.toLowerCase()) &&
      (job.location ? job.location.toLowerCase().includes(state.location.toLowerCase()) : true)
  );

  const renderJobCard = job => (
    <Col key={job.id} className="mb-4">
      <Card className="h-100 job-card">
        <Card.Body className="d-flex flex-column">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <Card.Title className="mb-1">{job.title}</Card.Title>
              <Card.Subtitle className="mb-2 text-muted">
                {job.company || 'Not specified'}
              </Card.Subtitle>
            </div>
            <Badge bg="secondary" className="source-badge">
              {job.source || 'Unknown'}
            </Badge>
          </div>
          
          {job.location && (
            <div className="d-flex align-items-center mb-2">
              <FaMapMarkerAlt className="me-1 text-muted" />
              <small className="text-muted">{job.location}</small>
            </div>
          )}

          <Card.Text className="job-preview">
            {job.description?.substring(0, 150)}...
          </Card.Text>

          <div className="mt-auto d-flex justify-content-between align-items-end">
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => handleShowModal(job)}
              className="view-details-btn"
            >
              <FaInfoCircle className="me-1" />
              View Details
            </Button>
            
            {job.url && (
              <a 
                href={job.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="job-link"
              >
                <FaExternalLinkAlt className="me-1" />
                Original Post
              </a>
            )}
          </div>

          {user?.role?.toLowerCase() === 'admin' && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => handleDeleteJob(job.id)}
              className="mt-2 delete-btn"
            >
              <FaTrash className="me-1" />
              Delete
            </Button>
          )}
        </Card.Body>
      </Card>
    </Col>
  );

  return (
    <Container fluid className="jobs-container py-4">
      <h1 className="text-center mb-4">Job Listings</h1>

      <Row className="mb-4 g-3">
        <Col md={6}>
          <div className="search-input">
            <FaSearch className="search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Search by job title or company"
              value={state.searchTerm}
              onChange={handleSearch}
            />
          </div>
        </Col>
        <Col md={6}>
          <div className="search-input">
            <FaMapMarkerAlt className="search-icon" />
            <input
              type="text"
              className="form-control"
              placeholder="Filter by location"
              value={state.location}
              onChange={handleLocationChange}
            />
          </div>
        </Col>
      </Row>

      {state.loading ? (
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : state.error ? (
        <Alert variant="danger" className="text-center">{state.error}</Alert>
      ) : filteredJobs.length === 0 ? (
        <Alert variant="info" className="text-center">No jobs found matching your criteria</Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {filteredJobs.map(renderJobCard)}
        </Row>
      )}

      {/* Job Details Modal */}
      <Modal show={state.showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{state.selectedJob?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <h5>{state.selectedJob?.company}</h5>
            {state.selectedJob?.location && (
              <div className="d-flex align-items-center text-muted mb-2">
                <FaMapMarkerAlt className="me-1" />
                <span>{state.selectedJob?.location}</span>
              </div>
            )}
            <div className="d-flex align-items-center mb-3">
              <Badge bg="secondary" className="me-2">
                Source: {state.selectedJob?.source || 'Unknown'}
              </Badge>
              {state.selectedJob?.url && (
                <a 
                  href={state.selectedJob?.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-decoration-none"
                >
                  <Badge bg="primary">
                    <FaExternalLinkAlt className="me-1" />
                    Original Post
                  </Badge>
                </a>
              )}
            </div>
          </div>
          
          <div className="job-description">
            {state.selectedJob?.description?.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default JobPage;