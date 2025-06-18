import React, { useState, useCallback, useRef } from 'react';
import api, { postJobFromImage, postJobManual } from '../services/api';
import { Button, Form, Alert, Spinner, Card, Badge } from 'react-bootstrap';
import '../styles/adminpanel.css';

const AdminPanel = () => {
  // State management
  const [state, setState] = useState({
    mode: 'upload',
    formData: {
      title: '',
      description: '',
      skills: []
    },
    skillInput: '',
    extractedSkills: [],
    loading: false,
    error: null,
    success: null,
    ocrFailed: false,
    jobImage: null
  });

  // Derived state
  const { 
    mode, 
    formData, 
    skillInput, 
    extractedSkills, 
    loading, 
    error, 
    success, 
    ocrFailed, 
    jobImage 
  } = state;

  // Handlers
  const fileInputRef = useRef();

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    try {
      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
  
      const formData = new FormData();
      formData.append('jobImage', file); // Must match backend exactly
  
      // Clean API call - no headers needed
      const response = await api.post('api/admin/jobs', formData);
      
      console.log('Upload success:', response.data);
      return response.data;
    } catch (error) {
      console.error('Upload failed:', {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      throw error;
    }
  };

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [name]: value
      }
    }));
  }, []);

  const handleSkillAdd = useCallback(() => {
    if (!skillInput.trim()) return;
    
    const newSkills = [
      ...new Set([
        ...formData.skills,
        ...skillInput.split(',').map(s => s.trim()).filter(s => s)
      ])
    ];
    
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        skills: newSkills
      },
      skillInput: ''
    }));
  }, [formData.skills, skillInput]);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: null
    }));
  
    try {
      let response;
  
      if (mode === 'upload' && jobImage) {
        const formData = new FormData();
        formData.append('jobImage', jobImage);
        formData.append('title', formData.title || '');
        formData.append('description', formData.description || '');
        formData.append('company', formData.company || '');
  
        response = await api.post('api/admin/jobs', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
  
      } else {
        // Manual post
        response = await api.post('api/admin/jobs', {
          title: formData.title,
          description: formData.description,
          company: formData.company,
          skills: [...formData.skills, ...extractedSkills],
          location: formData.location || ''
        });
      }
  
      setState(prev => ({
        ...prev,
        success: 'Job posted successfully!',
        formData: { title: '', description: '', company: '', location: '', skills: [] },
        extractedSkills: [],
        jobImage: null,
        ocrFailed: false
      }));
    } catch (err) {
      console.error('Post error:', err);
  
      setState(prev => ({
        ...prev,
        error: err.response?.data?.error || 'Failed to post job',
        ocrFailed: !!err.response?.data?.warning
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };  

  // Skill Tag Component
  const SkillTag = ({ skill, isAutoDetected = false, onRemove }) => (
    <Badge 
      pill 
      bg={isAutoDetected ? 'info' : 'primary'} 
      className="me-2 mb-2 skill-tag"
    >
      {skill}
      {!isAutoDetected && (
        <button 
          className="skill-tag-remove" 
          onClick={() => onRemove(skill)}
          aria-label={`Remove ${skill}`}
        >
          &times;
        </button>
      )}
    </Badge>
  );

  const handleSkillRemove = (skillToRemove) => {
    setState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        skills: prev.formData.skills.filter(skill => skill !== skillToRemove)
      }
    }));
  };

  return (
    <div className="admin-panel-container">
      <Card className="admin-card shadow-sm">
        <Card.Body>
          <h2 className="text-center mb-4">Post New Job</h2>
          
          {error && (
            <Alert variant="danger" dismissible onClose={() => setState(prev => ({ ...prev, error: null }))}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" dismissible onClose={() => setState(prev => ({ ...prev, success: null }))}>
              {success}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* Mode Toggle */}
            <div className="d-flex justify-content-center mb-4">
              <div className="btn-group" role="group">
                <Button
                  variant={mode === 'upload' ? 'primary' : 'outline-primary'}
                  onClick={() => setState(prev => ({ ...prev, mode: 'upload' }))}
                >
                  <i className="bi bi-image me-2"></i> Upload Image
                </Button>
                <Button
                  variant={mode === 'manual' ? 'primary' : 'outline-primary'}
                  onClick={() => setState(prev => ({ ...prev, mode: 'manual' }))}
                >
                  <i className="bi bi-keyboard me-2"></i> Enter Manually
                </Button>
              </div>
            </div>

            {/* Image Upload */}
            {mode === 'upload' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Job Posting Image</Form.Label>
                  <Form.Control 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageChange}
                    required={mode === 'upload'}
                  />
                  <Form.Text muted>
                    Upload a clear image of the job posting (JPEG, PNG)
                  </Form.Text>
                </Form.Group>

                {ocrFailed && (
                  <Alert variant="warning" className="mt-3">
                    <Alert.Heading>OCR Processing Failed</Alert.Heading>
                    <p>We couldn't extract text from your image. Please enter the details manually below.</p>
                  </Alert>
                )}
              </>
            )}

            {/* Manual Input Fields */}
            {(mode === 'manual' || ocrFailed) && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Job Title*</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Senior Frontend Developer"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description*</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter detailed job description..."
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Add Skills</Form.Label>
                  <div className="d-flex gap-2 mb-2">
                    <Form.Control
                      type="text"
                      placeholder="e.g., JavaScript, Project Management"
                      value={skillInput}
                      onChange={(e) => setState(prev => ({ ...prev, skillInput: e.target.value }))}
                      onKeyPress={(e) => e.key === 'Enter' && handleSkillAdd()}
                    />
                    <Button 
                      variant="outline-primary" 
                      onClick={handleSkillAdd}
                      type="button"
                    >
                      Add
                    </Button>
                  </div>
                  {formData.skills.length > 0 && (
                    <div className="skill-tags-container mb-3">
                      {formData.skills.map(skill => (
                        <SkillTag 
                          key={skill} 
                          skill={skill} 
                          onRemove={handleSkillRemove}
                        />
                      ))}
                    </div>
                  )}
                </Form.Group>
              </>
            )}

            {/* Auto-detected Skills */}
            {extractedSkills.length > 0 && (
              <Form.Group className="mb-3">
                <Form.Label>Auto-Detected Skills</Form.Label>
                <div className="skill-tags-container">
                  {extractedSkills.map(skill => (
                    <SkillTag 
                      key={skill} 
                      skill={skill} 
                      isAutoDetected 
                    />
                  ))}
                </div>
              </Form.Group>
            )}

            {/* Submit Button */}
            <div className="d-grid mt-4">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Spinner 
                      as="span" 
                      animation="border" 
                      size="sm" 
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    {mode === 'upload' ? 'Processing Image...' : 'Posting Job...'}
                  </>
                ) : (
                  `Post ${mode === 'upload' ? 'from Image' : 'Job'}`
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminPanel;