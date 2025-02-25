import React, { useState } from 'react';
import { postJobFromImage } from '../services/api';
import { Button, Form, Alert, Spinner, Card } from 'react-bootstrap';
import '../styles/adminPanel.css'; // Import custom CSS

const AdminPanel = () => {
    const [jobImage, setJobImage] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [ocrFailed, setOcrFailed] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setJobImage(file);
    };

    const handleTitleChange = (e) => setTitle(e.target.value);
    const handleDescriptionChange = (e) => setDescription(e.target.value);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!jobImage) {
            setError('Please upload a job image.');
            return;
        }

        const formData = new FormData();
        formData.append('jobImage', jobImage);

        setLoading(true);
        setError(null);
        setSuccess(null);
        setOcrFailed(false);

        try {
            const response = await postJobFromImage(formData);
            setSuccess('Job successfully posted!');
        } catch (err) {
            console.error(err);

            if (err.response && err.response.data.message.includes('OCR failed')) {
                setOcrFailed(true);
                setError('OCR failed to extract job details. Please fill in manually.');
            } else {
                setError('Failed to post job. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-panel-container">
            <h1 className="text-center mb-4">Admin Panel</h1>

            <Card className="admin-card">
                <Card.Body>
                    {success && <Alert variant="success">{success}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group controlId="formFile" className="mb-3">
                            <Form.Label>Upload Job Image</Form.Label>
                            <Form.Control 
                                type="file" 
                                name="jobImage" 
                                onChange={handleImageChange} 
                                className="form-control-file"
                            />
                        </Form.Group>

                        {ocrFailed && (
                            <>
                                <Form.Group controlId="formTitle" className="mb-3">
                                    <Form.Label>Job Title</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        placeholder="Enter job title" 
                                        value={title} 
                                        onChange={handleTitleChange}
                                    />
                                </Form.Group>

                                <Form.Group controlId="formDescription" className="mb-3">
                                    <Form.Label>Job Description</Form.Label>
                                    <Form.Control 
                                        as="textarea" 
                                        rows={3} 
                                        placeholder="Enter job description" 
                                        value={description} 
                                        onChange={handleDescriptionChange} 
                                    />
                                </Form.Group>
                            </>
                        )}

                        <Button variant="primary" type="submit" disabled={loading} className="w-100">
                            {loading ? <Spinner animation="border" size="sm" /> : 'Post Job'}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default AdminPanel;