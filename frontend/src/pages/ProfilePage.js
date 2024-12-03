import React, { useEffect, useState } from 'react';
import { fetchUserProfile } from '../services/api';

const ProfilePage = ({ match }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const getUserProfile = async () => {
            const response = await fetchUserProfile(match.params.id);
            setUser(response.data);
        };
        getUserProfile();
    }, [match.params.id]);

    return (
        <div>
            <h1>User Profile</h1>
            {user ? (
                <div>
                    <p>Name: {user.name}</p>
                    <p>Email: {user.email}</p>
                    <p>Skills: {user.skills.join(', ')}</p>
                </div>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
};

export default ProfilePage;
