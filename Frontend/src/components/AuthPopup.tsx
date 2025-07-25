import React, { useState } from 'react';
import {
  Modal,
  Button,
  Form,
  InputGroup,
  Toast,
  ToastContainer
} from 'react-bootstrap';
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

  const [showLoginToast, setShowLoginToast] = useState(false);
  const [showSignupToast, setShowSignupToast] = useState(false);

  const navigate = useNavigate();
  const passwordMatch = confirmPassword && password === confirmPassword;

  const handleLogin = () => {
    if (!username || !password) {
      alert('Please fill in both username and password.');
      return;
    }

    localStorage.setItem('loggedInUsername', username);
    localStorage.setItem('loginSuccess', 'true');
    setShowLogin(false);
    setShowLoginToast(true);
    navigate('/customer/order');
  };

  const handleSignUp = () => {
    if (!username || !password || !confirmPassword) {
      alert('Please fill in all fields.');
      return;
    }

    if (passwordMatch) {
      setShowSignUp(false);
      setShowLogin(true);
      setShowSignupToast(true);
    } else {
      alert('Passwords do not match!');
    }
  };

  return (
    <>
      {/* Toast Notifications */}
      <ToastContainer position="bottom-start" className="p-3">
        <Toast
          bg="success"
          onClose={() => setShowLoginToast(false)}
          show={showLoginToast}
          delay={3000}
          autohide
        >
          <Toast.Header closeButton={false}>
            <strong className="me-auto text-white">Logged In</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            Welcome back, <strong>{username}</strong>!
          </Toast.Body>
        </Toast>

        <Toast
          bg="success"
          onClose={() => setShowSignupToast(false)}
          show={showSignupToast}
          delay={3000}
          autohide
        >
          <Toast.Header closeButton={false}>
            <strong className="me-auto text-dark">Sign Up</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            You’ve successfully signed up as <strong>{username}</strong>.
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Buttons */}
      <Button
        style={{ backgroundColor: '#1e3a8a', border: 'none', marginRight: '1rem' }}
        disabled
        title="Admin login is not available here"
      >
        Log In
      </Button>

      <Button
        variant="light"
        style={{
          color: '#1e3a8a',
          border: '2px solid #1e3a8a',
          fontWeight: '600'
        }}
        onClick={() => {
          setUserType('customer');
          setShowLogin(true);
        }}
      >
        Continue as Customer
      </Button>

      {/* Login Modal */}
      <Modal show={showLogin} onHide={() => setShowLogin(false)} centered>
        <Modal.Header
          closeButton
          style={{
            backgroundColor: '#1e3a8a',
            color: 'white',
            justifyContent: 'center'
          }}
        >
          <Modal.Title
            style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}
          >
            Log In as Customer
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
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
                <InputGroup.Text
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: 'pointer' }}
                >
                  {showPassword ? <EyeSlashFill /> : <EyeFill />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <Button
              type="submit"
              style={{
                backgroundColor: '#1e3a8a',
                border: 'none',
                width: '100%'
              }}
              className="mt-4"
            >
              Log In
            </Button>
          </Form>
          <div className="mt-3 text-center">
            Don't have an account?{' '}
            <span
              style={{
                color: '#1e3a8a',
                cursor: 'pointer',
                fontWeight: 500
              }}
              onClick={() => {
                setShowLogin(false);
                setShowSignUp(true);
              }}
            >
              Sign up
            </span>
          </div>
        </Modal.Body>
      </Modal>

      {/* Sign Up Modal */}
      <Modal show={showSignUp} onHide={() => setShowSignUp(false)} centered>
        <Modal.Header
          closeButton
          style={{
            backgroundColor: '#1e3a8a',
            color: 'white',
            justifyContent: 'center'
          }}
        >
          <Modal.Title
            style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}
          >
            Sign Up as Customer
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleSignUp();
            }}
          >
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
                <InputGroup.Text
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ cursor: 'pointer' }}
                >
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
                <InputGroup.Text
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ cursor: 'pointer' }}
                >
                  {showConfirmPassword ? <EyeSlashFill /> : <EyeFill />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>

            <Button
              type="submit"
              style={{
                backgroundColor: '#1e3a8a',
                border: 'none',
                width: '100%'
              }}
              className="mt-4"
            >
              Sign Up
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default AuthPopup;
