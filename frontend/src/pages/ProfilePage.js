import React, { useEffect, useState } from 'react';
import { fetchUserProfile } from '../services/api';  // Import the updated API function
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';

const ProfilePage = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const getUserProfile = async () => {
            try {
                const response = await fetchUserProfile(); // No need for `id` anymore
                setUser(response.data);
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        };
        getUserProfile();
    }, []);  // Empty dependency array ensures it runs once when the component mounts

    return (
        <Container className="my-5">
            <h1 className="text-center mb-4">User Profile</h1>

            {user ? (
                <Row>
                    <Col md={6} className="mx-auto">
                        <Card>
                            <Card.Body>
                                <Card.Title>{user.name}</Card.Title>
                                <Card.Subtitle className="mb-2 text-muted">{user.email}</Card.Subtitle>
                                <Card.Text>
                                    <strong>Skills:</strong> {user.skills.join(', ')}
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <div className="d-flex justify-content-center">
                    <Spinner animation="border" />
                </div>
            )}
        </Container>
    );
};

export default ProfilePage;
