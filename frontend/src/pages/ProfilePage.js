import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchUserProfile } from '../services/api';
import { Container, Row, Col, Card, Spinner } from 'react-bootstrap';

const ProfilePage = () => {
    const { id } = useParams(); // Access the route parameter
    const [user, setUser] = useState(null);

    useEffect(() => {
        const getUserProfile = async () => {
            try {
                const response = await fetchUserProfile(id); // Use `id` from useParams
                setUser(response.data);
            } catch (error) {
                console.error("Error fetching user profile:", error);
            }
        };
        getUserProfile();
    }, [id]);

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
