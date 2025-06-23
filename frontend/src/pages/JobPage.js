import React, { useEffect, useState, useCallback } from 'react';
import { fetchJobs, deleteJob } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa';
import '../styles/jobPage.css';

const JobPage = () => {
  const { user } = useAuth();
  const [state, setState] = useState({
    jobs: [],
    searchTerm: '',
    location: '',
    loading: true,
    error: null,
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
    <Card key={job.id} className="h-100 p-3">
      <Card.Body className="d-flex flex-column">
        <Card.Title>{job.title}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">{job.company}</Card.Subtitle>
        {job.location && (
          <p className="text-muted mb-2">
            <FaMapMarkerAlt className="me-1" />
            {job.location}
          </p>
        )}
        <Card.Text className="flex-grow-1">
          {job.description}
        </Card.Text>
        {user?.role?.toLowerCase() === 'admin' && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteJob(job.id)}
            className="mt-2 align-self-end"
          >
            Delete
          </Button>
        )}
      </Card.Body>
    </Card>
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
              placeholder="Search by skill or title"
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
    </Container>
  );
};

export default JobPage;
