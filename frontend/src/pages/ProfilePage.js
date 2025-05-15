import React, { useEffect, useState } from 'react';
import { BiCamera } from 'react-icons/bi';  
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchUserProfile, uploadAvatar, updateUserProfile, updateUserSkills, uploadCV, convertCV, downloadCV, fetchRecommendedJobs } from '../services/api';
import { Container, Row, Col, Card, Spinner, Button, Form, Alert, Modal, ProgressBar } from 'react-bootstrap';
import '../styles/profilePage.css';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [skills, setSkills] = useState('');
    const [convertingToPdf, setConvertingToPdf] = useState(false);
    const [convertingToDocx, setConvertingToDocx] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
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
                    profileImage: response.data.profileImage || 'default-avatar.jpg',
                    cvFile: response.data.cvFile || null,
                    cvFileType: response.data.cvFileType || null
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
    
            // 1. Update skills separately
            await updateUserSkills({ skills: updatedSkills });
    
            // 2. Then update profile
            await updateUserProfile(updatedProfile);
    
            // 3. Update local user state
            setUser((prevUser) => ({
                ...prevUser,
                skills: updatedSkills,
                profile: {
                    ...prevUser.profile,
                    ...updatedProfile,
                },
                // Preserve these fields during profile updates
                profileImage: prevUser.profileImage,
                cvFile: prevUser.cvFile,
                cvFileType: prevUser.cvFileType
            }));
    
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            setError("Failed to update profile. Please try again.");
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const formData = new FormData();
          formData.append('avatar', file);
          
          const response = await uploadAvatar(formData);
          console.log('Upload response:', response.data);
          
          // Force refresh by fetching updated profile
          const profileResponse = await fetchUserProfile();
          setUser(profileResponse.data);
          
        } catch (error) {
          console.error('Upload failed:', error);
          setError('Failed to upload image. Please try again.');
        } finally {
          e.target.value = ''; // Reset input
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
            <h1 className="text-center mb-4">PROFILE</h1>

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
                                {/* Profile Picture Section */}
                                <div className="profile-header">
                                    {/* Avatar Container */}
                                    <div className="avatar-container">
                                        <img
                                        src={user.profileImage ? `http://localhost:5000/users/avatar/${user.id}` : '/default-avatar.jpg'}
                                        alt="Profile"
                                        className="avatar-image"
                                        onError={(e) => {
                                            e.target.src = '/default-avatar.jpg';
                                        }}
                                        />
                                        <label htmlFor="avatarUpload" className="avatar-edit-button" title="Change profile picture">
                                        <BiCamera />
                                        </label>
                                        <input
                                        type="file"
                                        id="avatarUpload"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleAvatarUpload}
                                        />
                                    </div>
                                    
                                    {/* Profile Text */}
                                    <div className="profile-text">
                                        <h2>{user.name}</h2>
                                        <span className="email">{user.email}</span>
                                        {user.role === 'admin' && (
                                        <span className="badge bg-danger">Admin</span>
                                        )}
                                    </div>
                                </div>

                                {!isEditing ? (
                                    <>
                                        <Card.Text>
                                            <strong>Skills:</strong>
                                            <div className="skills-container">
                                                {user.skills.map((skill, index) => (
                                                <span key={index} className="skills-chip">{skill}</span>
                                                ))}
                                            </div>
                                        </Card.Text>

                                        {/* CV Upload Section */}
                                        <Card className="mt-4">
                                            <Card.Body>
                                                <Card.Title>CV Management</Card.Title>
                                                
                                                {user.cvFile ? (
                                                    <>
                                                        <p>Current CV: {user.cvFile} ({user.cvFileType.toUpperCase()})</p>
                                                        <div className="d-flex flex-wrap gap-2 mb-3">
                                                            {/* Download Button */}
                                                            <Button 
                                                                variant="success" 
                                                                onClick={async () => {
                                                                    try {
                                                                        const response = await downloadCV();
                                                                        const url = window.URL.createObjectURL(new Blob([response.data]));
                                                                        const link = document.createElement('a');
                                                                        link.href = url;
                                                                        link.setAttribute('download', user.cvFile);
                                                                        document.body.appendChild(link);
                                                                        link.click();
                                                                        document.body.removeChild(link);
                                                                    } catch (error) {
                                                                        setError('Download failed');
                                                                    }
                                                                }}
                                                            >
                                                                Download CV
                                                            </Button>
                                                            
                                                            {/* Replace CV Button */}
                                                            <Button 
                                                                variant="primary" 
                                                                onClick={() => document.getElementById('cvUpload').click()}
                                                            >
                                                                Replace CV
                                                            </Button>
                                                            
                                                            {user.cvFileType !== 'pdf' && (
                                                                <Button 
                                                                    variant="info" 
                                                                    onClick={async () => {
                                                                        try {
                                                                            setConvertingToPdf(true);
                                                                            setError(null);
                                                                            // Step 1: Convert
                                                                            const conversionResponse = await convertCV('pdf');
                                                                            
                                                                            if (!conversionResponse.data?.success) {
                                                                                throw new Error(conversionResponse.data?.message || 'Conversion failed');
                                                                            }

                                                                            // Step 2: Download
                                                                            try {
                                                                                const downloadResponse = await downloadCV();
                                                                                const blob = new Blob([downloadResponse.data], {
                                                                                    type: downloadResponse.headers['content-type']
                                                                                });
                                                                                const url = window.URL.createObjectURL(blob);
                                                                                const link = document.createElement('a');
                                                                                link.href = url;
                                                                                link.download = `converted-${Date.now()}.pdf`;
                                                                                document.body.appendChild(link);
                                                                                link.click();
                                                                                document.body.removeChild(link);
                                                                                
                                                                                // Step 3: Refresh
                                                                                const profileResponse = await fetchUserProfile();
                                                                                setUser(profileResponse.data);
                                                                                
                                                                                toast.success('File converted and downloaded!');
                                                                            } catch (downloadError) {
                                                                                toast.warning('Converted but download failed');
                                                                                console.error('Download error:', downloadError);
                                                                            }
                                                                        } catch (error) {
                                                                            setError(error.message);
                                                                            toast.error(error.message);
                                                                        } finally {
                                                                            setConvertingToPdf(false);
                                                                        }
                                                                    }}
                                                                    disabled={convertingToPdf}
                                                                >
                                                                    {convertingToPdf ? (
                                                                        <>
                                                                            <Spinner 
                                                                                as="span"
                                                                                animation="border"
                                                                                size="sm"
                                                                                role="status"
                                                                                aria-hidden="true"
                                                                                className="me-2"
                                                                            />
                                                                            Converting...
                                                                        </>
                                                                    ) : (
                                                                        'Convert to PDF'
                                                                    )}
                                                                </Button>
                                                            )}
                                                            
                                                            {user.cvFileType === 'pdf' && (
                                                                <Button 
                                                                    variant="info" 
                                                                    onClick={async () => {
                                                                        try {
                                                                            setConvertingToDocx(true);
                                                                            setError(null);
                                                                            const { data } = await convertCV('docx');
                                                                            
                                                                            if (data.success) {
                                                                                const response = await downloadCV();
                                                                                const url = window.URL.createObjectURL(new Blob([response.data]));
                                                                                const link = document.createElement('a');
                                                                                link.href = url;
                                                                                link.setAttribute('download', `converted-${Date.now()}.docx`);
                                                                                document.body.appendChild(link);
                                                                                link.click();
                                                                                document.body.removeChild(link);
                                                                                
                                                                                const profileResponse = await fetchUserProfile();
                                                                                setUser(profileResponse.data);
                                                                            }
                                                                        } catch (error) {
                                                                            setError('Conversion failed');
                                                                        } finally {
                                                                            setConvertingToDocx(false);
                                                                        }
                                                                    }}
                                                                    disabled={convertingToDocx}
                                                                >
                                                                    {convertingToDocx ? (
                                                                        <>
                                                                            <Spinner 
                                                                                as="span"
                                                                                animation="border"
                                                                                size="sm"
                                                                                role="status"
                                                                                aria-hidden="true"
                                                                                className="me-2"
                                                                            />
                                                                            Converting...
                                                                        </>
                                                                    ) : (
                                                                        'Convert to Word'
                                                                    )}
                                                                </Button>
                                                            )}
                                                        </div>
                                                        {(convertingToPdf || convertingToDocx) && (
                                                            <div className="mt-2 text-muted">
                                                                <small>
                                                                    {convertingToPdf ? "Converting to PDF..." : "Converting to Word..."}
                                                                    <br />
                                                                    This may take a few moments...
                                                                </small>
                                                            </div>
                                                        )}
                                                        
                                                        {error && (
                                                            <Alert variant="danger" className="mt-2">
                                                                {error.includes('failed') ? (
                                                                    <>
                                                                        <strong>Conversion Error:</strong> {error}
                                                                        <div className="mt-2">
                                                                            <Button 
                                                                                variant="outline-danger" 
                                                                                size="sm"
                                                                                onClick={() => setError(null)}
                                                                            >
                                                                                Dismiss
                                                                            </Button>
                                                                        </div>
                                                                    </>
                                                                ) : error}
                                                            </Alert>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        <p>No CV uploaded</p>
                                                        <Button 
                                                            variant="primary" 
                                                            onClick={() => document.getElementById('cvUpload').click()}
                                                        >
                                                            Upload CV
                                                        </Button>
                                                    </>
                                                )}
                                                
                                                <input 
                                                    type="file" 
                                                    id="cvUpload" 
                                                    accept=".pdf,.doc,.docx" 
                                                    style={{ display: 'none' }}
                                                    onChange={async (e) => {
                                                        if (e.target.files[0]) {
                                                            const formData = new FormData();
                                                            formData.append('cv', e.target.files[0]);
                                                            
                                                            try {
                                                                setError(null);
                                                                await uploadCV(formData, {
                                                                    onUploadProgress: (progressEvent) => {
                                                                        const percentCompleted = Math.round(
                                                                            (progressEvent.loaded * 100) / progressEvent.total
                                                                        );
                                                                        setUploadProgress(percentCompleted);
                                                                    }
                                                                });
                                                                // Refresh user data
                                                                const response = await fetchUserProfile();
                                                                setUser(response.data);
                                                            } catch (error) {
                                                                setError('Upload failed');
                                                            }
                                                        }
                                                    }}
                                                />
                                            </Card.Body>
                                        </Card>

                                        {/* Education Section */}
                                        <Card.Text>
                                            <strong>Education:</strong>
                                            <ul style={{ marginBottom: '0.5rem' }}>
                                                {user.profile.education.split(',').map((edu, index) => (
                                                <li key={index}>{edu.trim()}</li>
                                                ))}
                                            </ul>
                                        </Card.Text>

                                        {/* Experience Section */}
                                        <Card.Text>
                                            <strong>Experience:</strong>
                                            <ul style={{ marginBottom: 0 }}>
                                                {user.profile.experience.split(',').map((exp, index) => (
                                                <li key={index}>{exp.trim()}</li>
                                                ))}
                                            </ul>
                                        </Card.Text>

                                        <Card className="mb-4">
                                            <Card.Body>
                                                <Card.Title>Projects</Card.Title>
                                                <div className="project-list">
                                                {user.projects && user.projects.length > 0 ? (
                                                    user.projects.map((project, index) => (
                                                    <Card key={index} className="mb-3 project-card">
                                                        <Card.Body>
                                                        <Card.Title>{project.title}</Card.Title>
                                                        <Card.Text>{project.description}</Card.Text>
                                                        {project.link && (
                                                            <a
                                                            href={project.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-primary"
                                                            >
                                                            View on GitHub
                                                            </a>
                                                        )}
                                                        </Card.Body>
                                                    </Card>
                                                    ))
                                                ) : (
                                                    <Card.Text>No projects available.</Card.Text>
                                                )}
                                                </div>
                                            </Card.Body>
                                        </Card>
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
                                                src={
                                                    job.jobImage
                                                      ? job.jobImage.startsWith('http')
                                                        ? job.jobImage
                                                        : `http://localhost:5000${job.jobImage}`
                                                      : 'http://localhost:5000/uploads/placeholder-image.jpg'
                                                }
                                                alt="Recommended Job"
                                                className="card-img-top"
                                                onError={(e) => {
                                                    if (e.target.src !== `http://localhost:5000/uploads/placeholder-image.jpg`) {
                                                    e.target.src = `http://localhost:5000/uploads/placeholder-image.jpg`;
                                                    }
                                                }}
                                            />
                                            <Card.Body>
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
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{selectedJob?.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center">
                    {selectedJob && (
                        <>
                        <img
                            src={selectedJob.jobImage}
                            alt={selectedJob.title}
                            className="img-fluid mb-3"
                            style={{ maxHeight: '700px', objectFit: 'contain' }}
                            onError={(e) => {
                            e.target.src = 'http://localhost:5000/uploads/placeholder-image.jpg';
                            }}
                        />
                        </>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ProfilePage;