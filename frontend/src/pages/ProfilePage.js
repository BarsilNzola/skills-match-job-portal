import React, { useEffect, useState, useCallback } from 'react';
import { BiCamera } from 'react-icons/bi';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  fetchUserProfile,
  uploadAvatar,
  updateUserProfile,
  updateUserSkills,
  uploadCV,
  convertCV,
  downloadCV,
  fetchRecommendedJobs,
  getAvatarUrl
} from '../services/api';
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Button,
  Form,
  Alert,
  Modal,
  ProgressBar,
  Badge
} from 'react-bootstrap';
import '../styles/profilePage.css';

const ProfilePage = () => {
  const [state, setState] = useState({
    user: null,
    skills: '',
    education: '',
    experience: '',
    projects: '',
    recommendedJobs: [],
    loading: {
      profile: true,
      jobs: true,
      cv: false
    },
    converting: {
      pdf: false,
      docx: false
    },
    ui: {
      isEditing: false,
      showModal: false,
      uploadProgress: 0
    },
    error: null
  });

  // Memoized fetch functions
  const fetchProfile = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, profile: true } }));
      const response = await fetchUserProfile();
      
      setState(prev => ({
        ...prev,
        user: {
          ...response.data,
          skills: response.data.skills || [],
          profile: response.data.profile || { education: '', experience: '', projects: [] },
          profileImage: response.data.profileImage || getAvatarUrl(response.data.id),
          cvFile: response.data.cvFile || null,
          cvFileType: response.data.cvFileType || null
        },
        skills: response.data.skills?.join(', ') || '',
        education: response.data.profile?.education || '',
        experience: response.data.profile?.experience || '',
        projects: response.data.profile?.projects?.join('\n') || '',
        loading: { ...prev.loading, profile: false },
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, profile: false },
        error: "Failed to load profile. Please try again."
      }));
      console.error("Error fetching user profile:", error);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, jobs: true } }));
      const response = await fetchRecommendedJobs();
      setState(prev => ({
        ...prev,
        recommendedJobs: response || [],
        loading: { ...prev.loading, jobs: false },
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, jobs: false },
        error: "Failed to load recommended jobs."
      }));
      console.error("Error fetching jobs:", error);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (state.user) {
      fetchJobs();
    }
  }, [state.user, fetchJobs]);

  // Handlers
  const handleSaveProfile = async () => {
    try {
      const updatedSkills = state.skills.split(',').map(skill => skill.trim());
      const updatedProfile = {
        education: state.education,
        experience: state.experience,
        projects: state.projects.split('\n').map(project => project.trim()),
      };

      await Promise.all([
        updateUserSkills({ skills: updatedSkills }),
        updateUserProfile(updatedProfile)
      ]);

      setState(prev => ({
        ...prev,
        user: {
          ...prev.user,
          skills: updatedSkills,
          profile: {
            ...prev.user.profile,
            ...updatedProfile
          }
        },
        ui: { ...prev.ui, isEditing: false },
        error: null
      }));

      toast.success("Profile updated successfully!");
    } catch (error) {
      setState(prev => ({ ...prev, error: "Failed to update profile." }));
      console.error("Profile update error:", error);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, cv: true } }));
      
      const response = await uploadAvatar(file);
      
      setState(prev => ({
        ...prev,
        user: {
          ...prev.user,
          profileImage: response.data.url || response.data.profileImage
        },
        error: null
      }));

      toast.success("Profile picture updated!");
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message || "Failed to upload avatar."
      }));
    } finally {
      setState(prev => ({ ...prev, loading: { ...prev.loading, cv: false } }));
      e.target.value = '';
    }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setState(prev => ({ ...prev, loading: { ...prev.loading, cv: true } }));
      
      await uploadCV(file, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setState(prev => ({
            ...prev,
            ui: { ...prev.ui, uploadProgress: percentCompleted }
          }));
        }
      });

      await fetchProfile(); // Refresh profile data
      toast.success("CV uploaded successfully!");
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: "Failed to upload CV. Please try again."
      }));
    } finally {
      setState(prev => ({
        ...prev,
        loading: { ...prev.loading, cv: false },
        ui: { ...prev.ui, uploadProgress: 0 }
      }));
      e.target.value = '';
    }
  };

  const handleCVConversion = async (targetFormat) => {
    const conversionKey = targetFormat === 'pdf' ? 'pdf' : 'docx';
    
    try {
      setState(prev => ({
        ...prev,
        converting: { ...prev.converting, [conversionKey]: true },
        error: null
      }));

      const { data } = await convertCV(targetFormat);
      
      if (data.success) {
        // In a real app, you might want to handle the download differently
        // since Supabase returns URLs directly
        await fetchProfile(); // Refresh to get updated CV info
        toast.success(`CV converted to ${targetFormat.toUpperCase()}!`);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: `Conversion failed: ${error.message}`
      }));
    } finally {
      setState(prev => ({
        ...prev,
        converting: { ...prev.converting, [conversionKey]: false }
      }));
    }
  };

  const handleCVDownload = async () => {
    try {
      const response = await downloadCV();
      // Supabase returns a URL, so we can redirect directly
      window.location.href = response.data.url;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: "Failed to download CV."
      }));
    }
  };

  // Render helpers
  const renderAvatarSection = () => (
    <div className="avatar-container">
      <img
        src={state.user.profileImage}
        alt="Profile"
        className="avatar-image"
        onError={(e) => {
          e.target.src = '/default-avatar.jpg';
        }}
      />
      <label htmlFor="avatarUpload" className="avatar-edit-button" title="Change profile picture">
        <BiCamera />
        {state.loading.cv && (
          <span className="upload-spinner"></span>
        )}
      </label>
      <input
        type="file"
        id="avatarUpload"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarUpload}
        disabled={state.loading.cv}
      />
    </div>
  );

  const renderCVSection = () => (
    <Card className="mt-4">
      <Card.Body>
        <Card.Title>CV Management</Card.Title>
        
        {state.user.cvFile ? (
          <>
            <p>Current CV: {state.user.cvFile} ({state.user.cvFileType?.toUpperCase()})</p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Button variant="success" onClick={handleCVDownload}>
                Download CV
              </Button>
              
              <Button 
                variant="primary" 
                onClick={() => document.getElementById('cvUpload').click()}
              >
                Replace CV
              </Button>
              
              {state.user.cvFileType !== 'pdf' && (
                <Button 
                  variant="info" 
                  onClick={() => handleCVConversion('pdf')}
                  disabled={state.converting.pdf}
                >
                  {state.converting.pdf ? (
                    <>
                      <Spinner as="span" size="sm" className="me-2" />
                      Converting...
                    </>
                  ) : (
                    'Convert to PDF'
                  )}
                </Button>
              )}
              
              {state.user.cvFileType === 'pdf' && (
                <Button 
                  variant="info" 
                  onClick={() => handleCVConversion('docx')}
                  disabled={state.converting.docx}
                >
                  {state.converting.docx ? (
                    <>
                      <Spinner as="span" size="sm" className="me-2" />
                      Converting...
                    </>
                  ) : (
                    'Convert to Word'
                  )}
                </Button>
              )}
            </div>
            
            {state.ui.uploadProgress > 0 && state.ui.uploadProgress < 100 && (
              <ProgressBar 
                now={state.ui.uploadProgress} 
                label={`${state.ui.uploadProgress}%`} 
                className="mt-2"
              />
            )}
          </>
        ) : (
          <>
            <p>No CV uploaded</p>
            <Button 
              variant="primary" 
              onClick={() => document.getElementById('cvUpload').click()}
              disabled={state.loading.cv}
            >
              {state.loading.cv ? (
                <>
                  <Spinner as="span" size="sm" className="me-2" />
                  Uploading...
                </>
              ) : (
                'Upload CV'
              )}
            </Button>
          </>
        )}
        
        <input 
          type="file" 
          id="cvUpload" 
          accept=".pdf,.doc,.docx" 
          style={{ display: 'none' }}
          onChange={handleCVUpload}
          disabled={state.loading.cv}
        />
      </Card.Body>
    </Card>
  );

  const renderRecommendedJobs = () => (
    <div className="recommended-jobs">
      {state.recommendedJobs.length === 0 ? (
        <Alert variant="info" className="w-100 text-center">
          No recommendations found. Update your skills or check back later!
        </Alert>
      ) : (
        state.recommendedJobs.map((job) => (
          <Card key={job.id} className="job-card mb-4 p-3">
            <h5>{job.title}</h5>
            <div className="mb-2">
              <small className="text-muted">
                Match: <strong>{(job.similarity * 100).toFixed(0)}%</strong>
              </small>
              <ProgressBar
                now={job.similarity * 100}
                className="mt-2"
                label={`${(job.similarity * 100).toFixed(0)}%`}
              />
            </div>
            <Button
              variant="primary"
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Job
            </Button>
          </Card>
        ))
      )}
    </div>
  );
  

  return (
    <Container fluid className="profile-container">
      <h1 className="text-center mb-4">PROFILE</h1>

      {state.loading.profile ? (
        <div className="d-flex justify-content-center">
          <Spinner animation="border" />
        </div>
      ) : state.user ? (
        <Row>
          {/* Left Column: Profile Section */}
          <Col md={6}>
            <Card>
              <Card.Body>
                <div className="profile-header">
                  {renderAvatarSection()}
                  <div className="profile-text">
                    <h2>{state.user.name}</h2>
                    <span className="email">{state.user.email}</span>
                    {state.user.role === 'admin' && (
                      <Badge bg="danger">Admin</Badge>
                    )}
                  </div>
                </div>

                {!state.ui.isEditing ? (
                  <>
                    <Card.Text>
                      <strong>Skills:</strong>
                      <div className="skills-container">
                        {state.user.skills.map((skill, index) => (
                          <span key={index} className="skills-chip">{skill}</span>
                        ))}
                      </div>
                    </Card.Text>

                    {renderCVSection()}

                    <Card.Text>
                      <strong>Education:</strong>
                      <ul className="mb-2">
                        {state.user.profile.education.split(',').map((edu, index) => (
                          <li key={index}>{edu.trim()}</li>
                        ))}
                      </ul>
                    </Card.Text>

                    <Card.Text>
                      <strong>Experience:</strong>
                      <ul className="mb-2">
                        {state.user.profile.experience.split(',').map((exp, index) => (
                          <li key={index}>{exp.trim()}</li>
                        ))}
                      </ul>
                    </Card.Text>

                    <Card className="mb-4">
                      <Card.Body>
                        <Card.Title>Projects</Card.Title>
                        {state.user.profile.projects?.length > 0 ? (
                          state.user.profile.projects.map((project, index) => (
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
                                    View Project
                                  </a>
                                )}
                              </Card.Body>
                            </Card>
                          ))
                        ) : (
                          <Card.Text>No projects available.</Card.Text>
                        )}
                      </Card.Body>
                    </Card>
                  </>
                ) : (
                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label>Skills</Form.Label>
                      <Form.Control
                        type="text"
                        value={state.skills}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          skills: e.target.value
                        }))}
                        placeholder="e.g., JavaScript, React, Node.js"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Education</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={state.education}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          education: e.target.value
                        }))}
                        placeholder="List your education"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Experience</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={state.experience}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          experience: e.target.value
                        }))}
                        placeholder="Describe your experience"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Projects</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={state.projects}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          projects: e.target.value
                        }))}
                        placeholder="List your projects (one per line)"
                      />
                    </Form.Group>
                  </Form>
                )}

                <div className="mt-3">
                  {!state.ui.isEditing ? (
                    <Button onClick={() => setState(prev => ({
                      ...prev,
                      ui: { ...prev.ui, isEditing: true }
                    }))} variant="secondary">
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

            {state.error && (
              <Alert variant="danger" className="text-center">
                {state.error}
              </Alert>
            )}

            {state.loading.jobs ? (
              <div className="d-flex justify-content-center">
                <Spinner animation="border" />
              </div>
            ) : (
              renderRecommendedJobs()
            )}
          </Col>
        </Row>
      ) : (
        <Alert variant="danger" className="text-center">
          Failed to load profile. Please try again.
        </Alert>
      )}
    </Container>
  );
};

export default ProfilePage;