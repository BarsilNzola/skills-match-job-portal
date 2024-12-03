import React, { useEffect, useState } from 'react';
import { fetchJobs } from '../services/api';
import JobList from '../components/JobList';

const JobPage = () => {
    const [jobs, setJobs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [location, setLocation] = useState('');

    useEffect(() => {
        const getJobs = async () => {
            const response = await fetchJobs();
            setJobs(response.data);
        };
        getJobs();
    }, []);

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleLocationChange = (event) => {
        setLocation(event.target.value);
    };

    const filteredJobs = jobs.filter(job => 
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        job.location.toLowerCase().includes(location.toLowerCase())
    );

    return (
        <div>
            <h1>Job Listings</h1>
            <input
                type="text"
                placeholder="Search by skill or title"
                value={searchTerm}
                onChange={handleSearch}
            />
            <input
                type="text"
                placeholder="Location"
                value={location}
                onChange={handleLocationChange}
            />
            <JobList jobs={filteredJobs} />
        </div>
    );
};

export default JobPage;
