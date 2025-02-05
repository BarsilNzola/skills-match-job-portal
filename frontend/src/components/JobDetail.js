import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { fetchJobDetail, applyForJob } from '../services/api';
import { useParams } from 'react-router-dom';

const JobDetail = () => {
    const [job, setJob] = useState(null);
    const [showModal, setShowModal] = useState(false); 
    const { id } = useParams();  

    useEffect(() => {
        const getJobDetail = async () => {
            try {
                const response = await fetchJobDetail(id);
                setJob(response.data);
            } catch (error) {
                console.error("Error fetching job details:", error);
            }
        };

        getJobDetail();
    }, [id]);

    const handleApply = async () => {
        try {
            const response = await applyForJob({ jobId: job.id });
            console.log('Application Successful', response.data);
            alert('Application submitted successfully!');
        } catch (error) {
            console.error('Application Failed', error);
            alert('Failed to apply. Please try again.');
        }
    };

    const handleClose = () => setShowModal(false);
    const handleShow = () => setShowModal(true);

    return (
        <div className="container mt-5">
            {/* View Details Button to Open Modal */}
            <Button variant="info" onClick={handleShow}>View Details</Button>

            {/* Job Details Modal */}
            <Modal show={showModal} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{job ? job.title : 'Loading...'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {job ? (
                        <>
                            <img 
                                src={job.jobImage ? `http://localhost:5000/uploads/${job.jobImage}` : `http://localhost:5000/uploads/placeholder-image.jpg`}
                                alt={job.title}
                                className="img-fluid mb-3"
                            />
                            <h5>{job.company}</h5>
                            <p><strong>Location:</strong> {job.location}</p>
                            <p><strong>Description:</strong> {job.description}</p>
                        </>
                    ) : (
                        <p>Loading job details...</p>
                    )}
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>Close</Button>
                    <Button variant="primary" onClick={handleApply} disabled={!job}>Apply</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default JobDetail;
