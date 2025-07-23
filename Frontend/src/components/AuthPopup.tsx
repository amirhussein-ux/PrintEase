import React, { useState } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { EyeFill, EyeSlashFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

const AuthPopup: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [userType, setUserType] = useState<'customer'>('customer');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const navigate = useNavigate();
  const passwordMatch = confirmPassword && password === confirmPassword;

  const handleLogin = () => {
    if (!username || !password) {
      alert("Please fill in both username and password.");
      return;
    }

    // ✅ Save customer username
    localStorage.setItem('loggedInUsername', username);

    // ✅ Redirect to customer dashboard
    navigate('/customer/order');
  };

  const handleSignUp = () => {
    if (!username || !password || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (passwordMatch) {
      alert(`Signed up as: ${username}`);
      setShowSignUp(false);
      setShowLogin(true);
    } else {
      alert("Passwords do not match!");
    }
  };

  return (
    <>
      {/* ❌ Admin Log In Button — temporarily disabled */}
      <Button
        style={{ backgroundColor: '#1e3a8a', border: 'none', marginRight: '1rem' }}
        disabled
        title="Admin login is not available here"
      >
        Log In
      </Button>

      {/* ✅ Continue as Customer */}
      <Button
        variant="light"
        style={{
          color: '#1e3a8a',
          border: '2px solid #1e3a8a',
          fontWeight: '600',
        }}
        onClick={() => {
          setUserType('customer');
          setShowLogin(true);
        }}
      >
        Continue as Customer
      </Button>

      {/* Log In Modal */}
      <Modal show={showLogin} onHide={() => setShowLogin(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white', justifyContent: 'center' }}>
          <Modal.Title style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
            Log In as Customer
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <InputGroup.Text onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                  {showPassword ? <EyeSlashFill /> : <EyeFill />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column">
          <Button
            style={{ backgroundColor: '#1e3a8a', border: 'none', width: '100%' }}
            onClick={handleLogin}
          >
            Log In
          </Button>
          <div className="mt-2">
            Don't have an account?{' '}
            <span
              style={{ color: '#1e3a8a', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => {
                setShowLogin(false);
                setShowSignUp(true);
              }}
            >
              Sign up
            </span>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Sign Up Modal */}
      <Modal show={showSignUp} onHide={() => setShowSignUp(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white', justifyContent: 'center' }}>
          <Modal.Title style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
            Sign Up as Customer
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <InputGroup.Text onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                  {showPassword ? <EyeSlashFill /> : <EyeFill />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mt-3">
              <Form.Label>Confirm Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  isValid={confirmPassword && passwordMatch}
                  isInvalid={confirmPassword && !passwordMatch}
                />
                <InputGroup.Text onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ cursor: 'pointer' }}>
                  {showConfirmPassword ? <EyeSlashFill /> : <EyeFill />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            style={{ backgroundColor: '#1e3a8a', border: 'none', width: '100%' }}
            onClick={handleSignUp}
          >
            Sign Up
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AuthPopup;
