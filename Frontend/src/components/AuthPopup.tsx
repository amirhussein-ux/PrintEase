import React, { useState } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';
import { EyeFill, EyeSlashFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

const AuthPopup: React.FC = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [userType, setUserType] = useState<'customer' | 'admin'>('customer');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');

  const navigate = useNavigate();
  const passwordMatch = confirmPassword && password === confirmPassword;

  const handleLogin = () => {
    if (!email || !password) {
      alert("Please fill in both email and password.");
      return;
    }
    // Save email (admin or customer)
    localStorage.setItem('loggedInEmail', email);
    // Redirect based on userType
    if (userType === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/customer/order');
    }
  };

  const handleSignUp = () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill in all required fields.");
      return;
    }
    if (!passwordMatch) {
      alert("Passwords do not match!");
      return;
    }
    // Here you would send the sign up data to your backend
    if (userType === 'admin') {
      alert(`Admin signed up: ${name} (${email})`);
    } else {
      alert(`Signed up as: ${name} (${email})`);
    }
    setShowSignUp(false);
    setShowLogin(true);
    setPassword("");
    setConfirmPassword("");
    setName("");
    setContactNumber("");
    setAddress("");
    // Pre-fill email in login
    setEmail(email);
  };

  // Guest login handler
  const handleGuestLogin = () => {
    localStorage.setItem('loggedInUsername', 'Guest');
    navigate('/customer/order');
  };

  return (
    <>


      {/* Admin Log In Button (opens admin login modal) */}
      <Button
        style={{ backgroundColor: '#1e3a8a', border: 'none', color: 'white', fontWeight: 600, marginRight: '1rem' }}
        onClick={() => {
          setUserType('admin');
          setShowLogin(true);
        }}
      >
        Admin Log In
      </Button>


      {/* Continue as Customer Button (customer login modal) */}
      <Button
        variant="light"
        style={{ color: '#1e3a8a', border: '2px solid #1e3a8a', fontWeight: 600 }}
        onClick={() => {
          setUserType('customer');
          setShowLogin(true);
        }}
      >
        Customer Log In
      </Button>


      {/* Log In Modal (admin or customer based on userType) */}
      <Modal show={showLogin} onHide={() => setShowLogin(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white', justifyContent: 'center' }}>
          <Modal.Title style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
            {userType === 'admin' ? 'Admin Log In' : 'Customer Log In'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder={userType === 'admin' ? 'Enter admin email' : 'Enter email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </Form.Group>
            <Form.Group className="mt-3">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder={userType === 'admin' ? 'Enter admin password' : 'Enter password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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
            {userType === 'admin' ? 'Admin Log In' : 'Customer Log In'}
          </Button>
          {userType === 'customer' && (
            <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span>
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
              </span>
              <Button
                variant="secondary"
                style={{ marginTop: '10px', width: '100%' }}
                onClick={handleGuestLogin}
              >
                Continue as Guest
              </Button>
            </div>
          )}
          {userType === 'admin' && (
            <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span>
                Don't have an account?{' '}
                <span
                  style={{ color: '#1e3a8a', cursor: 'pointer', fontWeight: 500 }}
                  onClick={() => {
                    setShowLogin(false);
                    setShowSignUp(true);
                  }}
                >
                  Admin Sign up
                </span>
              </span>
            </div>
          )}
        </Modal.Footer>
      </Modal>

      {/* Sign Up Modal (admin or customer) */}
      <Modal show={showSignUp} onHide={() => setShowSignUp(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#1e3a8a', color: 'white', justifyContent: 'center' }}>
          <Modal.Title style={{ color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
            {userType === 'admin' ? 'Admin Sign Up' : 'Sign Up as Customer'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                placeholder={userType === 'admin' ? 'Enter your full name (admin)' : 'Enter your full name'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mt-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                placeholder={userType === 'admin' ? 'Enter your admin email' : 'Enter your email'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mt-3">
              <Form.Label>Password</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder={userType === 'admin' ? 'Create admin password' : 'Create password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                  placeholder={userType === 'admin' ? 'Confirm admin password' : 'Confirm password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  isValid={Boolean(confirmPassword) && passwordMatch ? true : undefined}
                  isInvalid={Boolean(confirmPassword) && !passwordMatch ? true : undefined}
                  required
                />
                <InputGroup.Text onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ cursor: 'pointer' }}>
                  {showConfirmPassword ? <EyeSlashFill /> : <EyeFill />}
                </InputGroup.Text>
              </InputGroup>
            </Form.Group>
            {userType !== 'admin' && (
              <>
                <Form.Group className="mt-3">
                  <Form.Label>Contact Number <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your contact number"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </Form.Group>
                <Form.Group className="mt-3">
                  <Form.Label>Address <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Enter your address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </Form.Group>
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            style={{ backgroundColor: '#1e3a8a', border: 'none', width: '100%' }}
            onClick={handleSignUp}
          >
            {userType === 'admin' ? 'Admin Sign Up' : 'Sign Up'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default AuthPopup;
