import React from 'react';
import { Link } from 'react-router-dom';

const JobList = ({ jobs }) => (
    <ul>
        {jobs.map(job => (
            <li key={job.id}>
                <Link to={`/jobs/${job.id}`}>
                    <h2>{job.title}</h2>
                    <p>{job.company}</p>
                    <p>{job.location}</p>
                </Link>
            </li>
        ))}
    </ul>
);

export default JobList;
