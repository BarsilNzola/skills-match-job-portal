import React, { useEffect, useState } from 'react';
import { fetchJobs, deleteJob, updateJob } from '../services/api';
import { Container, Row, Col, Card, Button, Modal, Form, Spinner, Alert } from 'react-bootstrap';
import { FaSearch, FaMapMarkerAlt } from 'react-icons/fa'; // Import icons
import '../styles/jobPage.css';

const JobPage = () => {
    const [jobs, setJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for job details modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editJobData, setEditJobData] = useState({
        id: '',
        title: '',
        company: '',
        location: '',
        description: '',
    });

    useEffect(() => {
        const getJobs = async () => {
            try {
                const response = await fetchJobs();
                setJobs(response.data);
            } catch (error) {
                console.error('Error fetching jobs:', error);
                setError('Failed to load jobs. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        getJobs();
        setIsAdmin(true); // Set based on user data or role from API
    }, []);

    const handleSearch = (event) => setSearchTerm(event.target.value);
    const handleLocationChange = (event) => setLocation(event.target.value);

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return;

        try {
            await deleteJob(jobId);
            setJobs(jobs.filter(job => job.id !== jobId)); // Remove from UI
        } catch (error) {
            console.error('Error deleting job', error);
        }
    };

    // Open View Details Modal
    const handleViewDetails = (job) => {
        setSelectedJob(job);
        setShowDetailsModal(true);
    };

    // Open Edit Modal
    const handleEditClick = (job) => {
        setEditJobData({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
        });
        setShowEditModal(true);
    };

    // Handle Form Input Change
    const handleEditChange = (e) => {
        setEditJobData({ ...editJobData, [e.target.name]: e.target.value });
    };

    // Submit Edited Job Data
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateJob(editJobData.id, editJobData);
            setJobs(prevJobs =>
                prevJobs.map(job => (job.id === editJobData.id ? { ...job, ...editJobData } : job))
            );
            setShowEditModal(false);
            alert('Job updated successfully!');
        } catch (error) {
            console.error('Error updating job:', error);
        }
    };

    const filteredJobs = jobs.filter(job =>
        (job.title && job.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (job.location ? job.location.toLowerCase().includes(location.toLowerCase()) : true)
    );

    return (
        <Container fluid className='jobs-container'>
            <h1 className="my-4 text-center">Job Listings</h1>

            {/* Search and Filter Section */}
            <Row className="mb-4">
                <Col md={6} className="mb-3">
                    <div className="search-input">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search by skill or title"
                            value={searchTerm}
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
                            placeholder="Location"
                            value={location}
                            onChange={handleLocationChange}
                        />
                    </div>
                </Col>
            </Row>

            {/* Job Listings */}
            {loading ? (
                <div className="d-flex justify-content-center">
                    <Spinner animation="border" />
                </div>
            ) : error ? (
                <Alert variant="danger" className="text-center">{error}</Alert>
            ) : (
                <Row>
                    {filteredJobs.map(job => (
                        <Col key={job.id} md={4} className="mb-4">
                            <Card>
                                <div className="card-img-container">
                                    <Card.Img
                                        variant="top"
                                        src={job.jobImage ? `http://localhost:5000${job.jobImage}` : `http://localhost:5000/uploads/placeholder-image.jpg`}
                                        alt="Job Advert"
                                        className="card-img-top"
                                        onError={(e) => {
                                            if (e.target.src !== `http://localhost:5000/uploads/placeholder-image.jpg`) {
                                                e.target.src = `http://localhost:5000/uploads/placeholder-image.jpg`;
                                            }
                                        }}
                                    />
                                </div>
                                <Card.Body className="text-center">
                                    <Button variant="info" onClick={() => handleViewDetails(job)}>View Details</Button>

                                    {isAdmin && (
                                        <div className="mt-2">
                                            <Button variant="danger" onClick={() => handleDeleteJob(job.id)}>
                                                Delete
                                            </Button>
                                            <Button variant="primary" className="ml-2" onClick={() => handleEditClick(job)}>
                                                Edit
                                            </Button>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Job Details Modal */}
            <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Job Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedJob && (
                        <>
                            <h5>{selectedJob.title}</h5>
                            <p><strong>Company:</strong> {selectedJob.company}</p>
                            <p><strong>Location:</strong> {selectedJob.location}</p>
                            <p>{selectedJob.description}</p>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            {/* Edit Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Job Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={handleEditSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Title</Form.Label>
                            <Form.Control type="text" name="title" value={editJobData.title} onChange={handleEditChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Company</Form.Label>
                            <Form.Control type="text" name="company" value={editJobData.company} onChange={handleEditChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Location</Form.Label>
                            <Form.Control type="text" name="location" value={editJobData.location} onChange={handleEditChange} required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={3} name="description" value={editJobData.description} onChange={handleEditChange} required />
                        </Form.Group>
                        <Button variant="success" type="submit">Save Changes</Button>
                        <Button variant="secondary" className="ml-2" onClick={() => setShowEditModal(false)}>
                            Close
                        </Button>
                    </Form>
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default JobPage;