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
        <div>
            {job ? (
                <>
                    <h1>{job.title}</h1>
                    <p>{job.company}</p>
                    <p>{job.location}</p>
                    <p>{job.description}</p>
                    <button onClick={handleApply}>Apply</button>
                </>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

export default JobDetail;
