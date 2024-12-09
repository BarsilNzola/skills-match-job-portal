import React, { useEffect, useState } from 'react';
import { fetchUserProfile, updateUserSkills, fetchRecommendedJobs } from '../services/api'; // Include new API function
import { Container, Row, Col, Card, Spinner, Button, Form } from 'react-bootstrap';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [skills, setSkills] = useState('');
    const [isEditing, setIsEditing] = useState(false); // Tracks edit mode
    const [recommendedJobs, setRecommendedJobs] = useState([]);

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
        try {
            const jobsResponse = await fetchRecommendedJobs();
            setRecommendedJobs(jobsResponse.data);
        } catch (error) {
            console.error("Error fetching recommended jobs:", error);
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
            <Row>
                {recommendedJobs.length ? (
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
                ) : (
                    <div className="d-flex justify-content-center">
                        <Spinner animation="border" />
                    </div>
                )}
            </Row>
        </Container>
    );
};

export default ProfilePage;
