import React, { useEffect, useState } from 'react';
import { fetchUserProfile, updateUserProfile, fetchRecommendedJobs } from '../services/api';
import { Container, Row, Col, Card, Spinner, Button, Form, Alert, Modal, ProgressBar } from 'react-bootstrap';
import '../styles/profilePage.css';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [skills, setSkills] = useState('');
    const [education, setEducation] = useState('');
    const [experience, setExperience] = useState('');
    const [projects, setProjects] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [error, setError] = useState(null);

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);

    useEffect(() => {
        const getUserProfile = async () => {
            setLoadingProfile(true);
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
                setError("Failed to load profile. Please try again.");
            } finally {
                setLoadingProfile(false);
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

            const response = await updateUserProfile({
                skills: updatedSkills,
                ...updatedProfile,
            });

            setUser((prevUser) => ({
                ...prevUser,
                skills: updatedSkills,
                profile: {
                    ...prevUser.profile,
                    ...updatedProfile,
                },
            }));
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            setError("Failed to update profile. Please try again.");
        }
    };

    const fetchJobs = async () => {
        setLoadingJobs(true);
        setError(null);
        try {
            const response = await fetchRecommendedJobs();
            setRecommendedJobs(response || []);
        } catch (error) {
            console.error("Error fetching recommended jobs:", error);
            setError("Failed to load recommended jobs. Please try again.");
        } finally {
            setLoadingJobs(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchJobs();
        }
    }, [user]);

    const handleApplyClick = (job) => {
        setSelectedJob(job);
        setShowModal(true);
    };

    return (
        <Container fluid className="profile-container">
            <h1 className="text-center mb-4">User Profile</h1>

            {loadingProfile ? (
                <div className="d-flex justify-content-center">
                    <Spinner animation="border" />
                </div>
            ) : user ? (
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
                                            <Form.Label>Skills</Form.Label>
                                            <Form.Control
                                                type="text"
                                                value={skills}
                                                onChange={(e) => setSkills(e.target.value)}
                                                placeholder="e.g., JavaScript, React, Node.js"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Education</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={education}
                                                onChange={(e) => setEducation(e.target.value)}
                                                placeholder="e.g., Bachelor's in Computer Science"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Experience</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={experience}
                                                onChange={(e) => setExperience(e.target.value)}
                                                placeholder="e.g., 2 years as a Frontend Developer"
                                            />
                                        </Form.Group>

                                        <Form.Group className="mb-3">
                                            <Form.Label>Projects</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                value={projects}
                                                onChange={(e) => setProjects(e.target.value)}
                                                placeholder="e.g., Built a job portal using React"
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
                            <div className="recommended-jobs">
                                {recommendedJobs.length === 0 ? (
                                    <Alert variant="info" className="w-100 text-center">
                                        No recommendations found. Update your skills or check back later!
                                    </Alert>
                                ) : (
                                    recommendedJobs.map((job) => (
                                        <Card key={job.id} className="job-card mb-4">
                                            <Card.Img
                                                variant="top"
                                                src={job.image ? `http://localhost:5000${job.image}` : `http://localhost:5000/uploads/placeholder-image.jpg`}
                                                alt={job.title}
                                                onError={(e) => {
                                                    if (e.target.src !== `http://localhost:5000/uploads/placeholder-image.jpg`) {
                                                        e.target.src = `http://localhost:5000/uploads/placeholder-image.jpg`;
                                                    }
                                                }}
                                            />
                                            <Card.Body>
                                                <Card.Title>{job.title}</Card.Title>
                                                <Card.Text>{job.description}</Card.Text>
                                                <div className="mb-3">
                                                    <small className="text-muted">
                                                        Match: <strong>{(job.similarity * 100).toFixed(0)}%</strong>
                                                    </small>
                                                    <ProgressBar now={job.similarity * 100} className="mt-2" />
                                                </div>
                                                <Button variant="primary" onClick={() => handleApplyClick(job)}>
                                                    Apply
                                                </Button>
                                            </Card.Body>
                                        </Card>
                                    ))
                                )}
                            </div>
                        )}
                    </Col>
                </Row>
            ) : (
                <Alert variant="danger" className="text-center">Failed to load profile. Please try again.</Alert>
            )}

            {/* Modal for Job Advert */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>{selectedJob?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedJob && (
                        <>
                            {selectedJob.image && (
                                <img
                                    src={`http://localhost:5000${selectedJob.image}`}
                                    alt={selectedJob.title}
                                    className="img-fluid mb-3"
                                />
                            )}
                            <p><strong>Company:</strong> {selectedJob.company}</p>
                            <p><strong>Location:</strong> {selectedJob.location}</p>
                            <p><strong>Description:</strong> {selectedJob.description}</p>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={() => setShowModal(false)}>
                        Apply Now
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ProfilePage;