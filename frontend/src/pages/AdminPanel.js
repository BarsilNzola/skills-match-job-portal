import React, { useState } from 'react';
import { postJobFromImage } from '../services/api'; // Import your API function
import { Button, Form, Alert, Spinner } from 'react-bootstrap';

const AdminPanel = () => {
    const [jobImage, setJobImage] = useState(null); // State to store the image
    const [title, setTitle] = useState(''); // State for job title
    const [description, setDescription] = useState(''); // State for job description
    const [loading, setLoading] = useState(false); // Loading state
    const [error, setError] = useState(null); // Error state
    const [success, setSuccess] = useState(null); // Success message
    const [ocrFailed, setOcrFailed] = useState(false); // OCR failure state

    // Handle image file selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        console.log(file); // Log the selected file object
        setJobImage(e.target.files[0]);
    };

    // Handle form data change (title and description)
    const handleTitleChange = (e) => setTitle(e.target.value);
    const handleDescriptionChange = (e) => setDescription(e.target.value);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!jobImage) {
            setError('Please upload a job image.');
            return;
        }

        const formData = new FormData();
        formData.append('jobImage', jobImage);

        // Log FormData contents to check if the file is appended
        for (let pair of formData.entries()) {
        console.log(pair[0]+ ': ' + pair[1]);
    }

        setLoading(true);
        setError(null);
        setSuccess(null);
        setOcrFailed(false);

        try {
            const response = await postJobFromImage(formData); // Send the formData to API
            console.log(response);
            setSuccess('Job successfully posted!');
        } catch (err) {
            console.error(err);

            if (err.response && err.response.data.message.includes('OCR failed')) {
                // Handle OCR failure
                setOcrFailed(true);
                setError('OCR failed to extract job details. Please fill in manually.');
            } else {
                // Generic error
                setError('Failed to post job. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container my-5">
            <h1 className="text-center mb-4">Admin Panel</h1>

            {success && <Alert variant="success">{success}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formFile" className="mb-3">
                    <Form.Label>Upload Job Image</Form.Label>
                    <Form.Control type="file" name="jobImage" onChange={handleImageChange} />
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
                                placeholder="Enter job description" 
                                value={description} 
                                onChange={handleDescriptionChange} 
                            />
                        </Form.Group>
                    </>
                )}

                <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? <Spinner animation="border" size="sm" /> : 'Post Job'}
                </Button>
            </Form>
        </div>
    );
};

export default AdminPanel;
