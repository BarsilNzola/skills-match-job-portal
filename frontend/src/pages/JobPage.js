import React, { useEffect, useState } from 'react';
import { fetchJobs, deleteJob } from '../services/api';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const JobPage = () => {
    const [jobs, setJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState('');
    const [isAdmin, setIsAdmin] = useState(false); // Assuming user role is stored here

    useEffect(() => {
        const getJobs = async () => {
            try {
                const response = await fetchJobs();
                console.log('Fetched Jobs:', response.data);
                setJobs(response.data);
            } catch (error) {
                console.error('Error fetching jobs:', error);
            }
        };

        getJobs();
        setIsAdmin(true); // Set based on user data or role from API
    }, []); // Empty dependency array ensures this runs once on mount

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleLocationChange = (event) => {
        setLocation(event.target.value);
    };

    const handleDeleteJob = async (jobId) => {
        try {
            await deleteJob(jobId);
            setJobs(jobs.filter(job => job.id !== jobId));
        } catch (error) {
            console.error('Error deleting job', error);
        }
    };

    const filteredJobs = jobs.filter(job =>
        (job.title && job.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (job.location ? job.location.toLowerCase().includes(location.toLowerCase()) : true)
    );

    return (
        <Container>
            <h1 className="my-4 text-center">Job Listings</h1>

            <Row className="mb-4">
                <Col md={6}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search by skill or title"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </Col>
                <Col md={6}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Location"
                        value={location}
                        onChange={handleLocationChange}
                    />
                </Col>
            </Row>

            <Row>
                {filteredJobs.map(job => (
                    <Col key={job.id} md={4} className="mb-4">
                        <Card>
                            {/* Display job image or fallback to placeholder */}
                            <Card.Img
                                variant="top"
                                src={job.image ? `http://localhost:5000/uploads/${job.image}` : `http://localhost:5000/uploads/placeholder-image.jpg`}
                                alt="Job Advert"
                                onError={(e) => {
                                    if (e.target.src !== `http://localhost:5000/uploads/placeholder-image.jpg`) {
                                        e.target.src = `http://localhost:5000/uploads/placeholder-image.jpg`;
                                    }
                                }}
                            />
                            {job.image && console.log(`Image URL: http://localhost:5000/uploads/${job.image}`)}

                            <Card.Body className="text-center">
                                <Link to={`/jobs/${job.id}`} className="btn btn-info">
                                    View Details
                                </Link>

                                {/* Admin-only controls */}
                                {isAdmin && (
                                    <div className="mt-2">
                                        <Button
                                            variant="danger"
                                            onClick={() => handleDeleteJob(job.id)}
                                        >
                                            Delete
                                        </Button>
                                        <Button variant="primary" className="ml-2">
                                            Edit
                                        </Button>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </Container>
    );
};

export default JobPage;
