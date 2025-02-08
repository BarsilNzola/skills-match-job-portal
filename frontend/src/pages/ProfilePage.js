import React, { useEffect, useState } from 'react';
import { fetchUserProfile, updateUserSkills, fetchRecommendedJobs } from '../services/api';
import { Container, Row, Col, Card, Spinner, Button, Form, Alert } from 'react-bootstrap';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [skills, setSkills] = useState('');
    const [isEditing, setIsEditing] = useState(false); // Tracks edit mode
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true); // State to track loading jobs
    const [error, setError] = useState(null); // State to track errors for job fetching

    useEffect(() => {
        const getUserProfile = async () => {
            try {
                const response = await fetchUserProfile();
                setUser(response.data);
                setSkills(response.data.skills.join(', ')); // Pre-fill skills
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        };
        getUserProfile();
    }, []);

    const handleSaveSkills = async () => {
        try {
            const updatedSkills = skills.split(',').map(skill => skill.trim());
            const response = await updateUserSkills({ skills: updatedSkills });
            setUser(response.data); // Update local user data
            setIsEditing(false); // Exit edit mode
        } catch (error) {
            console.error("Error updating skills:", error);
        }
    };

    const fetchJobs = async () => {
        setLoadingJobs(true); // Start loading
        setError(null); // Reset error state
        try {
            console.log("Fetching recommended jobs...");  // Log before request
            
            const response = await fetchRecommendedJobs();
            console.log("API Response:", response);  // Log full response
    
            if (response && response.length > 0) {
                setRecommendedJobs(response);
            } else {
                console.warn("No recommended jobs found.");
                setRecommendedJobs([]); // Set to empty array if no jobs
            }
        } catch (error) {
            console.error("Error fetching recommended jobs:", error); // Log full error
            setError("Error fetching recommended jobs.");
        } finally {
            setLoadingJobs(false); // End loading
        }
    };
    
    useEffect(() => {
        if (user) fetchJobs();
    }, [user]);
    

    return (
        <Container className="my-5">
            <h1 className="text-center mb-4">User Profile</h1>

            {user ? (
                <Row>
                    <Col md={6} className="mx-auto">
                        <Card>
                            <Card.Body>
                                <Card.Title>{user.name}</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">{user.email}</Card.Subtitle>

                                {!isEditing ? (
                                    <Card.Text>
                                        <strong>Skills:</strong> {user.skills.join(', ')}
                                    </Card.Text>
                                ) : (
                                    <Form>
                                        <Form.Group>
                                            <Form.Label>Edit Skills</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={skills}
                                                onChange={(e) => setSkills(e.target.value)}
                                                placeholder="Enter skills separated by commas"
                                            />
                                        </Form.Group>
                                    </Form>
                                )}

                                <div className="mt-3">
                                    {!isEditing ? (
                                        <Button onClick={() => setIsEditing(true)} variant="secondary">
                                            Edit Skills
                                        </Button>
                                    ) : (
                                        <Button onClick={handleSaveSkills} variant="primary">
                                            Save Skills
                                        </Button>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <div className="d-flex justify-content-center">
                    <Spinner animation="border" />
                </div>
            )}

            <h2 className="text-center mt-5">Recommended Jobs</h2>
            
            {/* Show error if there is an issue with fetching jobs */}
            {error && <Alert variant="danger" className="text-center">{error}</Alert>}

            {/* Handle job loading state */}
            {loadingJobs ? (
                <div className="d-flex justify-content-center">
                    <Spinner animation="border" />
                </div>
            ) : (
                <Row>
                    {recommendedJobs.length === 0 ? (
                        <Alert variant="info" className="w-100 text-center">
                            No recommendations for now
                        </Alert>
                    ) : (
                        recommendedJobs.map((job) => (
                            <Col md={4} key={job.id} className="mb-4">
                                <Card>
                                    <Card.Body>
                                        <Card.Title>{job.title}</Card.Title>
                                        <Card.Text>{job.description}</Card.Text>
                                        <Button variant="primary">Apply</Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))
                    )}
                </Row>
            )}
        </Container>
    );
};

export default ProfilePage;
