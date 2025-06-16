import React, { useEffect, useState, useCallback } from 'react';
import { fetchJobs, deleteJob, updateJob } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Container, Row, Col, Card, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
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
        showDetailsModal: false,
        selectedJob: null,
        showEditModal: false,
        editJobData: {
            id: '',
            title: '',
            company: '',
            location: '',
            description: '',
        }
    });

    // Fetch jobs with useCallback to memoize the function
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

    // Event handlers
    const handleSearch = (e) => setState(prev => ({ ...prev, searchTerm: e.target.value }));
    const handleLocationChange = (e) => setState(prev => ({ ...prev, location: e.target.value }));

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return;

        try {
            await deleteJob(jobId);
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.filter(job => job.id !== jobId)
            }));
        } catch (error) {
            console.error('Error deleting job', error);
        }
    };

    const handleViewDetails = (job) => {
        setState(prev => ({
            ...prev,
            selectedJob: job,
            showDetailsModal: true
        }));
    };

    const handleEditClick = (job) => {
        setState(prev => ({
            ...prev,
            editJobData: {
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
            },
            showEditModal: true
        }));
    };

    const handleEditChange = (e) => {
        setState(prev => ({
            ...prev,
            editJobData: {
                ...prev.editJobData,
                [e.target.name]: e.target.value
            }
        }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateJob(state.editJobData.id, state.editJobData);
            setState(prev => ({
                ...prev,
                jobs: prev.jobs.map(job => 
                    job.id === state.editJobData.id ? { ...job, ...state.editJobData } : job
                ),
                showEditModal: false
            }));
            alert('Job updated successfully!');
        } catch (error) {
            console.error('Error updating job:', error);
        }
    };

    // Filter jobs based on search criteria
    const filteredJobs = state.jobs.filter(job =>
        (job.title && job.title.toLowerCase().includes(state.searchTerm.toLowerCase())) &&
        (job.location ? job.location.toLowerCase().includes(state.location.toLowerCase()) : true)
    );

    // Render job card
    const renderJobCard = (job) => (
        <Card key={job.id} className="h-100">
            <div className="card-img-container">
                <Card.Img
                    variant="top"
                    src={job.jobImage || '/placeholder-image.jpg'}
                    alt="Job Advert"
                    className="card-img-top"
                    onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                    }}
                />
            </div>
            <Card.Body className="text-center d-flex flex-column">
                <Card.Title>{job.title}</Card.Title>
                <Card.Subtitle className="mb-2 text-muted">{job.company}</Card.Subtitle>
                <Card.Text className="flex-grow-1">
                    {job.location && (
                        <span className="d-block mb-2">
                            <FaMapMarkerAlt className="me-1" />
                            {job.location}
                        </span>
                    )}
                </Card.Text>
                <Button 
                    variant="info" 
                    onClick={() => handleViewDetails(job)}
                    className="mt-auto"
                >
                    View Details
                </Button>

                {user?.role?.toLowerCase() === 'admin' && (
                    <div className="mt-2 d-flex justify-content-center gap-2">
                        <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('Delete this job?')) {
                                    handleDeleteJob(job.id);
                                }
                            }}
                        >
                            Delete
                        </Button>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(job);
                            }}
                        >
                            Edit
                        </Button>
                    </div>
                )}
            </Card.Body>
        </Card>
    );

    return (
        <Container fluid className="jobs-container py-4">
            <h1 className="text-center mb-4">Job Listings</h1>

            {/* Search and Filter Section */}
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

            {/* Job Listings */}
            {state.loading ? (
                <div className="d-flex justify-content-center my-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : state.error ? (
                <Alert variant="danger" className="text-center">
                    {state.error}
                </Alert>
            ) : filteredJobs.length === 0 ? (
                <Alert variant="info" className="text-center">
                    No jobs found matching your criteria
                </Alert>
            ) : (
                <Row xs={1} md={2} lg={3} className="g-4">
                    {filteredJobs.map(renderJobCard)}
                </Row>
            )}

            {/* Job Details Modal */}
            <Modal 
                show={state.showDetailsModal} 
                onHide={() => setState(prev => ({ ...prev, showDetailsModal: false }))} 
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>{state.selectedJob?.title || 'Job Details'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {state.selectedJob && (
                        <div className="job-details-container">
                            <div className="job-image-container mb-4">
                                <img
                                    src={state.selectedJob.jobImage || '/placeholder-image.jpg'}
                                    alt={state.selectedJob.title}
                                    className="img-fluid rounded"
                                    onError={(e) => {
                                        e.target.src = '/placeholder-image.jpg';
                                    }}
                                />
                            </div>
                            <div className="job-meta mb-3">
                                <h5>{state.selectedJob.company}</h5>
                                {state.selectedJob.location && (
                                    <p className="text-muted">
                                        <FaMapMarkerAlt className="me-1" />
                                        {state.selectedJob.location}
                                    </p>
                                )}
                            </div>
                            <div className="job-description">
                                <h6>Description:</h6>
                                <p>{state.selectedJob.description}</p>
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => setState(prev => ({ ...prev, showDetailsModal: false }))}
                    >
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Modal */}
            <Modal 
                show={state.showEditModal} 
                onHide={() => setState(prev => ({ ...prev, showEditModal: false }))}
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>Edit Job Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleEditSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Title</Form.Label>
                            <Form.Control 
                                type="text" 
                                name="title" 
                                value={state.editJobData.title} 
                                onChange={handleEditChange} 
                                required 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Company</Form.Label>
                            <Form.Control 
                                type="text" 
                                name="company" 
                                value={state.editJobData.company} 
                                onChange={handleEditChange} 
                                required 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Location</Form.Label>
                            <Form.Control 
                                type="text" 
                                name="location" 
                                value={state.editJobData.location} 
                                onChange={handleEditChange} 
                                required 
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={5} 
                                name="description" 
                                value={state.editJobData.description} 
                                onChange={handleEditChange} 
                                required 
                            />
                        </Form.Group>
                        <div className="d-flex gap-2">
                            <Button variant="primary" type="submit" className="flex-grow-1">
                                Save Changes
                            </Button>
                            <Button 
                                variant="outline-secondary" 
                                onClick={() => setState(prev => ({ ...prev, showEditModal: false }))}
                                className="flex-grow-1"
                            >
                                Cancel
                            </Button>
                        </div>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default JobPage;