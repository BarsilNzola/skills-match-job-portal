import React, { useState } from 'react';
import { postJobFromImage, postJobManual } from '../services/api';
import { Button, Form, Alert, Spinner, Card } from 'react-bootstrap';
import '../styles/adminpanel.css';

// Skill Tags Component
const SkillTags = ({ skills, isAutoDetected = false }) => (
  <div className="skill-tags">
    {skills.map(skill => (
      <span 
        key={skill} 
        className={`skill-tag ${isAutoDetected ? 'auto-detected' : ''}`}
      >
        {skill}
      </span>
    ))}
  </div>
);

const AdminPanel = () => {
  // State Management
  const [mode, setMode] = useState('upload');
  const [jobImage, setJobImage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    skills: []
  });
  const [skillInput, setSkillInput] = useState('');
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ocrFailed, setOcrFailed] = useState(false);

  // Handlers
  const handleImageChange = (e) => {
    setJobImage(e.target.files[0]);
    setOcrFailed(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillAdd = () => {
    if (!skillInput.trim()) return;
    const newSkills = [
      ...new Set([
        ...formData.skills,
        ...skillInput.split(',').map(s => s.trim())
      ])
    ];
    setFormData(prev => ({ ...prev, skills: newSkills }));
    setSkillInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let result;
      if (mode === 'upload' && jobImage) {
        const formData = new FormData();
        formData.append('jobImage', jobImage);
        result = await postJobFromImage(formData);
        setExtractedSkills(result.skills || []);
      } else {
        result = await postJobManual({
          ...formData,
          skills: [...formData.skills, ...extractedSkills]
        });
      }
      setSuccess('Job posted successfully!');
      resetForm();
    } catch (err) {
      console.error('Posting error:', err);
      setError(err.response?.data?.message || 'Failed to post job');
      if (err.response?.data?.ocrFailed) setOcrFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', skills: [] });
    setExtractedSkills([]);
    setJobImage(null);
  };

  return (
    <div className="admin-panel-container">
      <Card className="admin-card">
        <Card.Body>
          <h2 className="text-center mb-4">Post New Job</h2>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            {/* Mode Toggle */}
            <Form.Group className="mb-4 mode-toggle">
              <Form.Check
                type="radio"
                label="📷 Upload Image"
                name="mode"
                checked={mode === 'upload'}
                onChange={() => setMode('upload')}
                inline
              />
              <Form.Check
                type="radio"
                label="✍️ Enter Manually"
                name="mode"
                checked={mode === 'manual'}
                onChange={() => setMode('manual')}
                inline
              />
            </Form.Group>

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
                </Form.Group>

                {ocrFailed && (
                  <Alert variant="warning">
                    OCR failed. Please enter details manually below.
                  </Alert>
                )}
              </>
            )}

            {/* Manual Input Fields */}
            {(mode === 'manual' || ocrFailed) && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Job Title</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Add Skills</Form.Label>
                  <div className="d-flex gap-2 mb-2">
                    <Form.Control
                      type="text"
                      placeholder="e.g., JavaScript, Project Management"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                    />
                    <Button 
                      variant="outline-primary" 
                      onClick={handleSkillAdd}
                      type="button"
                    >
                      Add
                    </Button>
                  </div>
                  {(formData.skills.length > 0) && (
                    <SkillTags skills={formData.skills} />
                  )}
                </Form.Group>
              </>
            )}

            {/* Auto-detected Skills */}
            {extractedSkills.length > 0 && (
              <Form.Group className="mb-3">
                <Form.Label>Auto-Detected Skills</Form.Label>
                <SkillTags skills={extractedSkills} isAutoDetected />
              </Form.Group>
            )}

            {/* Submit Button */}
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading}
              className="w-100 mt-3"
            >
              {loading ? (
                <>
                  <Spinner as="span" size="sm" animation="border" />
                  <span className="ms-2">Processing...</span>
                </>
              ) : (
                'Post Job'
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdminPanel;