import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap'; // Import Modal from react-bootstrap
import { fetchJobDetail, applyForJob } from '../services/api';
import { useParams } from 'react-router-dom';  // Use for fetching job ID from URL

const JobDetail = () => {
    const [job, setJob] = useState(null);
    const [showModal, setShowModal] = useState(false); // State to control the modal visibility
    const { id } = useParams();  // Get the job ID from URL params

    useEffect(() => {
        const getJobDetail = async () => {
            const response = await fetchJobDetail(id);
            setJob(response.data);
        };
        
        // Fetch job details when the component mounts
        getJobDetail();
    }, [id]);

    const handleApply = async () => {
        try {
            const response = await applyForJob({ job: job.id });
            console.log('Application Successful', response.data);
        } catch (error) {
            console.error('Application Failed', error);
        }
    };

    const handleClose = () => setShowModal(false); // Close the modal
    const handleShow = () => setShowModal(true); // Open the modal

    return (
        <div className="container mt-5">
            {/* Job Details Modal */}
            <Modal show={showModal} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>{job ? job.title : 'Loading...'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {job ? (
                        <>
                            <img src={job.image} alt={`${job.title} image`} className="img-fluid mb-3" />
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
                    <Button variant="primary" onClick={handleApply}>Apply</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default JobDetail;
