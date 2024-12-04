import React, { useState, useEffect } from 'react';
import { fetchJobDetail, applyForJob } from '../services/api';

const JobDetail = ({ match }) => {
    const [job, setJob] = useState(null);
    const [userId, setUserId] = useState(''); // Replace with actual user authentication logic

    useEffect(() => {
        const getJobDetail = async () => {
            const response = await fetchJobDetail(match.params.id);
            setJob(response.data);
        };
        getJobDetail();
    }, [match.params.id]);

    const handleApply = async () => {
        try {
            const response = await applyForJob({ job: job.id, user: userId });
            console.log('Application Successful', response.data);
        } catch (error) {
            console.error('Application Failed', error);
        }
    };

    return (
        <div className="container mt-5">
            {job ? (
                <div className="card">
                    <div className="card-header">
                        <h1>{job.title}</h1>
                        <h5>{job.company}</h5>
                    </div>
                    <div className="card-body">
                        <p><strong>Location:</strong> {job.location}</p>
                        <p><strong>Description:</strong></p>
                        <p>{job.description}</p>
                    </div>
                    <div className="card-footer">
                        <button className="btn btn-primary" onClick={handleApply}>Apply</button>
                    </div>
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

export default JobDetail;
