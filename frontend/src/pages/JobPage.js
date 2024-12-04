import React, { useEffect, useState } from 'react';
import { fetchJobs } from '../services/api';
import JobList from '../components/JobList';
import { Container, Row, Col, Form } from 'react-bootstrap';

const JobPage = () => {
    const [jobs, setJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState('');

    useEffect(() => {
        const getJobs = async () => {
            const response = await fetchJobs();
            setJobs(response.data);
        };
        getJobs();
    }, []);

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleLocationChange = (event) => {
        setLocation(event.target.value);
    };

    const filteredJobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        job.location.toLowerCase().includes(location.toLowerCase())
    );

    return (
        <Container>
            <h1 className="my-4 text-center">Job Listings</h1>

            <Row className="mb-4">
                <Col md={6}>
                    <Form.Control
                        type="text"
                        placeholder="Search by skill or title"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </Col>
                <Col md={6}>
                    <Form.Control
                        type="text"
                        placeholder="Location"
                        value={location}
                        onChange={handleLocationChange}
                    />
                </Col>
            </Row>

            <JobList jobs={filteredJobs} />
        </Container>
    );
};

export default JobPage;
