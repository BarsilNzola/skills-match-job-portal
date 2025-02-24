import React, { useEffect, useState } from 'react';
import { fetchUserProfile, updateUserProfile, fetchRecommendedJobs } from '../services/api';
import { Container, Row, Col, Card, Spinner, Button, Form, Alert } from 'react-bootstrap';

const ProfilePage = () => {
    const [user, setUser] = useState({
        name: '',
        email: '',
        skills: [],
        profile: {
            education: '',
            experience: '',
            projects: [],
        },
    });
    const [skills, setSkills] = useState('');
    const [education, setEducation] = useState('');
    const [experience, setExperience] = useState('');
    const [projects, setProjects] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const getUserProfile = async () => {
            try {
                const response = await fetchUserProfile();
                setUser({
                    ...response.data,
                    skills: response.data.skills || [],
                    profile: response.data.profile || { education: '', experience: '', projects: [] },
                });
                setSkills(response.data.skills?.join(', ') || '');
                setEducation(response.data.profile?.education || '');
                setExperience(response.data.profile?.experience || '');
                setProjects(response.data.profile?.projects?.join('\n') || '');
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        };
        getUserProfile();
    }, []);

    const handleSaveProfile = async () => {
        try {
            const updatedSkills = skills.split(',').map(skill => skill.trim());
            const updatedProfile = {
                education,
                experience,
                projects: projects.split('\n').map(project => project.trim()),
            };

            // Call the API to update the profile
            const response = await updateUserProfile({
                skills: updatedSkills,
                ...updatedProfile,
            });

            // Update local user data
            setUser((prevUser) => ({
                ...prevUser,
                skills: updatedSkills,
                profile: {
                    ...prevUser.profile,
                    ...updatedProfile,
                },
            }));
            setIsEditing(false); // Exit edit mode
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    };

    const fetchJobs = async () => {
        setLoadingJobs(true);
        setError(null);
        try {
            const response = await fetchRecommendedJobs();
            if (response && response.length > 0) {
                setRecommendedJobs(response);
            } else {
                setRecommendedJobs([]);
            }
        } catch (error) {
            console.error("Error fetching recommended jobs:", error);
            setError("Error fetching recommended jobs.");
        } finally {
            setLoadingJobs(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchJobs();
        }
    }, [user]);

    return (
        <Container className="my-5">
            <h1 className="text-center mb-4">User Profile</h1>

            {user ? (
                <Row>
                    {/* Left Column: Profile Section */}
                    <Col md={6}>
                        <Card>
                            <Card.Body>
                                <Card.Title>{user.name}</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">{user.email}</Card.Subtitle>

                                {!isEditing ? (
                                    <>
                                        <Card.Text>
                                            <strong>Skills:</strong> {user.skills.join(', ')}
                                        </Card.Text>
                                        <Card.Text>
                                            <strong>Education:</strong> {user.profile.education}
                                        </Card.Text>
                                        <Card.Text>
                                            <strong>Experience:</strong> {user.profile.experience}
                                        </Card.Text>
                                        <Card.Text>
                                            <strong>Projects:</strong> {user.profile.projects.join(', ')}
                                        </Card.Text>
                                    </>
                                ) : (
                                    <Form>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Edit Skills</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={skills}
                                                onChange={(e) => setSkills(e.target.value)}
                                                placeholder="Enter skills separated by commas"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Edit Education</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={education}
                                                onChange={(e) => setEducation(e.target.value)}
                                                placeholder="Enter your education (one per line)"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Edit Experience</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={experience}
                                                onChange={(e) => setExperience(e.target.value)}
                                                placeholder="Enter your experience"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Edit Projects</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={projects}
                                                onChange={(e) => setProjects(e.target.value)}
                                                placeholder="Enter your projects (one per line)"
                                            />
                                        </Form.Group>
                                    </Form>
                                )}

                                <div className="mt-3">
                                    {!isEditing ? (
                                        <Button onClick={() => setIsEditing(true)} variant="secondary">
                                            Edit Profile
                                        </Button>
                                    ) : (
                                        <Button onClick={handleSaveProfile} variant="primary">
                                            Save Profile
                                        </Button>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    {/* Right Column: Recommended Jobs */}
                    <Col md={6}>
                        <h2 className="text-center mb-4">Recommended Jobs</h2>

                        {error && <Alert variant="danger" className="text-center">{error}</Alert>}

                        {loadingJobs ? (
                            <div className="d-flex justify-content-center">
                                <Spinner animation="border" />
                            </div>
                        ) : (
                            <>
                                {recommendedJobs.length === 0 ? (
                                    <Alert variant="info" className="w-100 text-center">
                                        No recommendations found. Update your skills or check back later!
                                    </Alert>
                                ) : (
                                    recommendedJobs.map((job) => (
                                        <Card key={job.id} className="mb-4 shadow-sm">
                                            <Card.Img
                                                variant="top"
                                                src={job.image ? `http://localhost:5000/uploads/${job.image}` : `http://localhost:5000/uploads/placeholder-image.jpg`}
                                                alt={job.title}
                                                style={{ height: "200px", objectFit: "cover" }}
                                                onError={(e) => {
                                                    if (e.target.src !== `http://localhost:5000/uploads/placeholder-image.jpg`) {
                                                        e.target.src = `http://localhost:5000/uploads/placeholder-image.jpg`;
                                                    }
                                                }}
                                            />

                                            <Card.Body className="d-flex flex-column">
                                                <Card.Title className="mb-3">{job.title}</Card.Title>
                                                <Card.Text className="flex-grow-1">{job.description}</Card.Text>

                                                <div className="mb-3">
                                                    <small className="text-muted">
                                                        Match: <strong>{(job.similarity * 100).toFixed(0)}%</strong>
                                                    </small>
                                                </div>

                                                <Button variant="primary" className="mt-auto">
                                                    Apply
                                                </Button>
                                            </Card.Body>
                                        </Card>
                                    ))
                                )}
                            </>
                        )}
                    </Col>
                </Row>
            ) : (
                <div className="d-flex justify-content-center">
                    <Spinner animation="border" />
                </div>
            )}
        </Container>
    );
};

export default ProfilePage;