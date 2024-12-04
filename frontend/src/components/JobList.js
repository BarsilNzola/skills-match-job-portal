import React from 'react';
import { Link } from 'react-router-dom';

const JobList = ({ jobs }) => (
    <div className="container mt-5">
        <div className="row">
            {jobs.map(job => (
                <div key={job.id} className="col-md-4 mb-4">
                    <div className="card">
                        <div className="card-body">
                            <h5 className="card-title">{job.title}</h5>
                            <p className="card-text"><strong>Company:</strong> {job.company}</p>
                            <p className="card-text"><strong>Location:</strong> {job.location}</p>
                            <Link to={`/jobs/${job.id}`} className="btn btn-primary">View Details</Link>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default JobList;
