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
import { FaBriefcase, FaMapMarkerAlt, FaStar, FaSort, FaFilter, FaExternalLinkAlt } from 'react-icons/fa';
import '../styles/profilePage.css';

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [skillsInput, setSkillsInput] = useState(''); // For edit form
  const [educationInput, setEducationInput] = useState(''); // For edit form
  const [experienceInput, setExperienceInput] = useState(''); // For edit form
  const [projectsInput, setProjectsInput] = useState(''); // For edit form
  const [recommendedJobs, setRecommendedJobs] = useState([]);

  const [loading, setLoading] = useState({
    profile: true,
    jobs: true,
    cv: false,
    avatar: false
  });

  const [converting, setConverting] = useState({
    pdf: false,
    docx: false
  });

  const [ui, setUi] = useState({
    isEditing: false,
    showModal: false,
    uploadProgress: 0,
    showSortDropdown: false,
    sortOption: 'match' // Moved here since it's UI related
  });

  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      
      const response = await fetchUserProfile();
      let profileImage = response.profileImage;
      
      if (!profileImage) {
        profileImage = await getAvatarUrl(response.id);
      }
  
      setUser({
        ...response,
        skills: response.skills || [],
        profile: response.profile || { education: '', experience: '', projects: [] },
        profileImage,
        cvFile: response.cvFile || null,
        cvFileType: response.cvFileType || null
      });
  
      // Set form inputs
      setSkillsInput(response.skills?.join(', ') || '');
      setEducationInput(response.profile?.education || '');
      setExperienceInput(response.profile?.experience || '');
      setProjectsInput(response.profile?.projects?.join('\n') || '');
  
      setLoading(prev => ({ ...prev, profile: false }));
      setError(null);
    } catch (error) {
      setLoading(prev => ({ ...prev, profile: false }));
      setError("Failed to load profile. Please try again.");
    }
  }, []);
  

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, jobs: true }));
      const response = await fetchRecommendedJobs();
      setRecommendedJobs(response || []);
      setLoading(prev => ({ ...prev, jobs: false }));
      setError(null);
    } catch (error) {
      setLoading(prev => ({ ...prev, jobs: false }));
      setError("Failed to load recommended jobs.");
      console.error("Error fetching jobs:", error);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);
  
  useEffect(() => {
    if (user) { 
      fetchJobs();
    }
  }, [user, fetchJobs]); 

  const handleSaveProfile = async () => {
    try {
      const updatedSkills = skillsInput.split(',').map(skill => skill.trim());
      const updatedProfile = {
        education: educationInput,
        experience: experienceInput,
        projects: projectsInput.split('\n').map(project => project.trim()),
      };
  
      await Promise.all([
        updateUserSkills({ skills: updatedSkills }),
        updateUserProfile(updatedProfile)
      ]);
  
      setUser(prev => ({
        ...prev,
        skills: updatedSkills,
        profile: {
          ...prev.profile,
          ...updatedProfile
        }
      }));
  
      setUi(prev => ({ ...prev, isEditing: false }));
      toast.success("Profile updated successfully!");
    } catch (error) {
      setError("Failed to update profile.");
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      setLoading(prev => ({ ...prev, avatar: true }));
      
      // Upload and get response with new URL
      const { profileImage } = await uploadAvatar(file);
      
      // Optimistically update the UI with new image
      setUser(prev => ({
        ...prev,
        profileImage: profileImage || URL.createObjectURL(file) // Fallback to local URL
      }));
      
      toast.success("Profile picture updated successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to update avatar");
    } finally {
      setLoading(prev => ({ ...prev, avatar: false }));
      e.target.value = ''; // Reset input
    }
  };
  
  const handleCVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      setLoading(prev => ({ ...prev, cv: true }));
      setUi(prev => ({ ...prev, uploadProgress: 0 }));
  
      // Using the service function
      const response = await uploadCV(file, (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUi(prev => ({ ...prev, uploadProgress: progress }));
      });
  
      setUser(prev => ({
        ...prev,
        cvFile: response.data.filename,
        cvFileType: response.data.fileType
      }));
  
      toast.success("CV uploaded successfully!");
    } catch (error) {
      console.error("CV upload error:", error);
      toast.error(error.response?.data?.error || "Failed to upload CV");
    } finally {
      setLoading(prev => ({ ...prev, cv: false }));
      e.target.value = '';
    }
  };  

  const handleCVConversion = async (targetFormat) => {
    const conversionKey = targetFormat === 'pdf' ? 'pdf' : 'docx';
    
    try {
      setConverting(prev => ({ ...prev, [conversionKey]: true }));
      
      // Convert and get response
      const { filename, fileType } = await convertCV(targetFormat);
      
      // Update user state
      setUser(prev => ({
        ...prev,
        cvFile: filename,
        cvFileType: fileType
      }));
      
      toast.success(`CV converted to ${targetFormat.toUpperCase()} successfully!`);
    } catch (error) {
      toast.error(error.message || `Failed to convert CV to ${targetFormat}`);
    } finally {
      setConverting(prev => ({ ...prev, [conversionKey]: false }));
    }
  };

  const handleCVDownload = async () => {
    try {
        await downloadCV();
    } catch (error) {
        alert('Failed to download CV. Please try again.');
    }
  };    
  
  const handleSortChange = (option) => {
    setUi(prev => ({
      ...prev,
      sortOption: option,
      showSortDropdown: false
    }));
  };

  const renderAvatarSection = () => (
    <div className="avatar-container">
      <img
        src={user?.profileImage}  // Changed from state.user to user
        alt="Profile"
        className="avatar-image"
        onError={(e) => {
          e.target.src = '/default-avatar.jpg';
        }}
      />
      <label htmlFor="avatarUpload" className="avatar-edit-button" title="Change profile picture">
        <BiCamera />
        {loading.cv && (  // Changed from state.loading to loading
          <span className="upload-spinner"></span>
        )}
      </label>
      <input
        type="file"
        id="avatarUpload"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarUpload}
        disabled={loading.cv}  // Changed from state.loading to loading
      />
    </div>
  );

  const renderCVSection = () => (
    <Card className="mt-4">
      <Card.Body>
        <Card.Title>CV Management</Card.Title>
        
        {user?.cvFile ? (
          <>
            <p>Current CV: {user.cvFile} ({user.cvFileType?.toUpperCase()})</p>
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Button variant="success" onClick={handleCVDownload}>
                Download CV
              </Button>
              
              <Button 
                variant="primary" 
                onClick={() => document.getElementById('cvUpload').click()}
                disabled={loading.cv}
              >
                Replace CV
              </Button>
              
              {user.cvFileType !== 'pdf' && (
                <Button 
                  variant="info" 
                  onClick={() => handleCVConversion('pdf')}
                  disabled={converting.pdf}
                >
                  {converting.pdf ? (
                    <>
                      <Spinner as="span" size="sm" className="me-2" />
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
                  onClick={() => handleCVConversion('docx')}
                  disabled={converting.docx}
                >
                  {converting.docx ? (
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
            
            {ui.uploadProgress > 0 && ui.uploadProgress < 100 && (
              <ProgressBar 
                now={ui.uploadProgress} 
                label={`${ui.uploadProgress}%`} 
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
              disabled={loading.cv}
            >
              {loading.cv ? (
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
          disabled={loading.cv}
        />
      </Card.Body>
    </Card>
  );

  const renderRecommendedJobs = () => {
    if (loading.jobs) {
      return (
        <div className="d-flex justify-content-center py-4">
          <Spinner animation="border" variant="primary" />
          <span className="ms-2">Analyzing your profile...</span>
        </div>
      );
    }
  
    const sortedJobs = [...recommendedJobs].sort((a, b) => {
      if (ui.sortOption === 'match') return b.similarity - a.similarity;
      if (ui.sortOption === 'date') return new Date(b.createdAt) - new Date(a.createdAt);
      return 0;
    });
  
    if (sortedJobs.length === 0) {
      return (
        <Alert variant="info" className="text-center">
          <FaStar className="me-2" />
          No recommendations found. Try adding more skills to your profile!
        </Alert>
      );
    }
  
    return (
      <div className="recommended-jobs-container">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="sort-filter-container position-relative">
            <Button 
              variant="outline-secondary" 
              size="sm"
              onClick={() => setUi(prev => ({...prev, showSortDropdown: !prev.showSortDropdown}))}
            >
              <FaSort className="me-1" />
              Sort: {ui.sortOption === 'match' ? 'Best Match' : 'Most Recent'}
            </Button>
            
            {ui.showSortDropdown && (
              <div className="sort-dropdown">
                <div 
                  className={`dropdown-item ${ui.sortOption === 'match' ? 'active' : ''}`}
                  onClick={() => handleSortChange('match')}
                >
                  Best Match
                </div>
                <div 
                  className={`dropdown-item ${ui.sortOption === 'date' ? 'active' : ''}`}
                  onClick={() => handleSortChange('date')}
                >
                  Most Recent
                </div>
              </div>
            )}
          </div>
          
          <Badge bg="secondary" pill>
            {sortedJobs.length} matching {sortedJobs.length === 1 ? 'job' : 'jobs'}
          </Badge>
        </div>
  
        {sortedJobs.map((job) => (
          <Card key={job.id} className="recommended-job-card mb-3">
            {/* Rest of the job card rendering remains the same */}
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <Card.Title className="mb-1">{job.title}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    {job.company || 'Company not specified'}
                  </Card.Subtitle>
                </div>
                <div className="d-flex flex-column align-items-end">
                  <Badge bg="info" className="match-badge mb-1">
                    {(job.similarity * 100).toFixed(0)}% Match
                  </Badge>
                  {job.source && (
                    <Badge bg="secondary" className="source-badge">
                      {job.source}
                    </Badge>
                  )}
                </div>
              </div>
  
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                {job.location && (
                  <div className="d-flex align-items-center">
                    <FaMapMarkerAlt className="me-1 text-muted" />
                    <small className="text-muted">{job.location}</small>
                  </div>
                )}
                
                {job.createdAt && (
                  <small className="text-muted">
                    Posted: {new Date(job.createdAt).toLocaleDateString()}
                  </small>
                )}
                
                {job.url && (
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary small"
                  >
                    <FaExternalLinkAlt className="me-1" />
                    Original Post
                  </a>
                )}
              </div>
  
              <div className="match-breakdown mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small>Skill Match</small>
                  <small>
                    <strong>{(job.matchDetails?.skills * 100).toFixed(0)}%</strong>
                  </small>
                </div>
                <ProgressBar
                  now={job.matchDetails?.skills * 100 || 0}
                  variant="success"
                  className="mb-2"
                />
  
                <div className="d-flex justify-content-between mb-1">
                  <small>Experience Match</small>
                  <small>
                    <strong>{(job.matchDetails?.experience * 100).toFixed(0)}%</strong>
                  </small>
                </div>
                <ProgressBar
                  now={job.matchDetails?.experience * 100 || 0}
                  variant="warning"
                  className="mb-2"
                />
  
                <div className="d-flex justify-content-between mb-1">
                  <small>Education Match</small>
                  <small>
                    <strong>{(job.matchDetails?.education * 100).toFixed(0)}%</strong>
                  </small>
                </div>
                <ProgressBar
                  now={job.matchDetails?.education * 100 || 0}
                  variant="info"
                />
              </div>
  
              {job.matchDetails?.matchedSkills && job.matchDetails.matchedSkills.length > 0 && (
                <div className="matching-skills mb-3">
                  <small className="text-muted d-block mb-1">
                    Matching Skills:
                  </small>
                  <div className="d-flex flex-wrap gap-1">
                    {job.matchDetails.matchedSkills.map((skill, i) => (
                      <Badge key={i} bg="light" text="dark" className="skill-badge">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
  
              <div className="d-flex justify-content-between align-items-center mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Apply Now
                </Button>
                <small className="text-muted">
                  Match confidence: <strong>{job.similarity.toFixed(2)}</strong>
                </small>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>
    );
  };
  
  return (
    <Container fluid className="profile-container">
      <h1 className="text-center mb-4">PROFILE</h1>

      {loading.profile ? (
        <div className="d-flex justify-content-center">
          <Spinner animation="border" />
        </div>
      ) : user ? (
        <Row>
          <Col md={6}>
            <Card>
              <Card.Body>
                <div className="profile-header">
                  {renderAvatarSection()}
                  <div className="profile-text">
                    <h2>{user.name}</h2>
                    <span className="email">{user.email}</span>
                    {user.role === 'admin' && (
                      <Badge bg="danger">Admin</Badge>
                    )}
                  </div>
                </div>

                {!ui.isEditing ? (
                  <>
                    <Card.Text>
                      <strong>Skills:</strong>
                      <div className="skills-container">
                        {user.skills.map((skill, index) => (
                          <span key={index} className="skills-chip">{skill}</span>
                        ))}
                      </div>
                    </Card.Text>

                    {renderCVSection()}

                    <Card.Text>
                      <strong>Education:</strong>
                      <ul className="mb-2">
                        {user.profile.education.split(',').map((edu, index) => (
                          <li key={index}>{edu.trim()}</li>
                        ))}
                      </ul>
                    </Card.Text>

                    <Card.Text>
                      <strong>Experience:</strong>
                      <ul className="mb-2">
                        {user.profile.experience.split(',').map((exp, index) => (
                          <li key={index}>{exp.trim()}</li>
                        ))}
                      </ul>
                    </Card.Text>

                    <Card className="mb-4">
                      <Card.Body>
                        <Card.Title>Projects</Card.Title>
                        {user.profile.projects?.length > 0 ? (
                          user.profile.projects.map((project, index) => (
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
                        value={skillsInput}
                        onChange={(e) => setSkillsInput(e.target.value)}
                        placeholder="e.g., JavaScript, React, Node.js"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Education</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={educationInput}
                        onChange={(e) => setEducationInput(e.target.value)}
                        placeholder="List your education"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Experience</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={experienceInput}
                        onChange={(e) => setExperienceInput(e.target.value)} 
                        placeholder="Describe your experience"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Projects</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={projectsInput}
                        onChange={(e) => setProjectsInput(e.target.value)}
                        placeholder="List your projects (one per line)"
                      />
                    </Form.Group>
                  </Form>
                )}

                <div className="mt-3">
                  {!ui.isEditing ? (
                    <Button 
                      onClick={() => setUi(prev => ({ ...prev, isEditing: true }))}
                      variant="secondary"
                    >
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

          <Col md={6} lg={5} className="recommended-jobs-column">
            <Card className="sticky-top">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title className="mb-0">
                    <FaStar className="me-2 text-warning" />
                    Recommended Jobs
                  </Card.Title>
                  <Badge bg="secondary" pill>
                    {recommendedJobs.length}
                  </Badge>
                </div>
                
                {renderRecommendedJobs()}
              </Card.Body>
            </Card>
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