import React, { useState, useEffect, useRef } from 'react';
import {
  Form,
  Button,
  Row,
  Col,
  Image,
  Card,
  ProgressBar
} from 'react-bootstrap';
import {
  PersonCircle,
  EyeFill,
  EyeSlashFill,
  CheckLg,
  XLg,
  Facebook,
  Github,
  Linkedin
} from 'react-bootstrap-icons';

const AccountPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const initialForm = {
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    houseNo: '',
    street: '',
    barangay: '',
    city: '',
    region: '',
    zip: '',
    gender: '',
    birthday: '',
    facebook: '',
    github: '',
    linkedin: '',
    password: '',
    confirmPassword: '',
    receiveUpdates: true,
    receiveNotifications: true,
    receivePromos: false
  };

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('accountData');
    return saved ? JSON.parse(saved) : initialForm;
  });

  const [profileImage, setProfileImage] = useState<string | null>(
    localStorage.getItem('profileImage') || null
  );
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNotification, setShowNotification] = useState(false);


  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        localStorage.setItem('profileImage', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = () => {
    setProfileImage(null);
    localStorage.removeItem('profileImage');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setResumeFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };
  const handleEdit = () => setIsEditing(true);

  const handleCancel = () => {
    const saved = localStorage.getItem('accountData');
    setFormData(saved ? JSON.parse(saved) : initialForm);
    setIsEditing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (resumeInputRef.current) resumeInputRef.current.value = '';
  };

  const handleSave = () => {
  localStorage.setItem('accountData', JSON.stringify(formData));
  setIsEditing(false);
  setShowNotification(true);
  setTimeout(() => setShowNotification(false), 3000);
};


  const profileCompletion = () => {
    const fields = [
      'username',
      'firstName',
      'lastName',
      'email',
      'phone',
      'houseNo',
      'street',
      'barangay',
      'city',
      'region',
      'zip',
      'gender',
      'birthday'
    ];
    const filled = fields.filter(f => formData[f as keyof typeof formData]);
    return Math.floor((filled.length / fields.length) * 100);
  };

  return (
    <div className="container py-4 text-dark">
      <h2 className="fw-bold mb-4">Account Settings</h2>
      
      {showNotification && (
        <div
          className="position-fixed bottom-0 end-0 p-3"
          style={{ zIndex: 9999 }}
        >
          <div
            className="toast show align-items-center text-white bg-success border-0"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            <div className="d-flex">
              <div className="toast-body fw-bold">
                Changes saved successfully!
              </div>
              <button
                type="button"
                className="btn-close btn-close-white me-2 m-auto"
                aria-label="Close"
                onClick={() => setShowNotification(false)}
              ></button>
            </div>
          </div>
        </div>
      )}

      <div className="w-50 mb-4">
        <label className="fw-bold mb-1">Profile Completion</label>
        <ProgressBar
          now={profileCompletion()}
          label={`${profileCompletion()}%`}
          variant="info"
          striped
          animated
        />
      </div>

      <Card className="p-4 shadow" style={{ borderRadius: '16px', backgroundColor: '#ffffff' }}>
        <div className="text-center mb-4">
          {profileImage ? (
            <Image
              src={profileImage}
              roundedCircle
              width={150}
              height={150}
              style={{ objectFit: 'cover', border: '3px solid #1e3a8a' }}
            />
          ) : (
            <PersonCircle size={150} color="gray" />
          )}
          {isEditing && (
            <div className="mt-3">
              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <Button
                className="custom-blue-btn fw-bold me-2"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
              <Button
                className="custom-white-btn fw-bold"
                onClick={handleImageRemove}
                disabled={!profileImage}
              >
                Remove
              </Button>
            </div>
          )}
        </div>

        <Form>
          <Row className="mb-3">
            <Col md={12}>
              <Form.Label className="fw-bold">@Username</Form.Label>
              <Form.Control
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label className="fw-bold">First Name</Form.Label>
              <Form.Control
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="fw-bold">Last Name</Form.Label>
              <Form.Control
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label className="fw-bold">Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="fw-bold">Phone Number</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
          </Row>

          <h5 className="mt-4 fw-bold">Address</h5>
          <Row className="mb-3">
            <Col md={2}>
              <Form.Label className="fw-bold">House No.</Form.Label>
              <Form.Control
                type="text"
                name="houseNo"
                value={formData.houseNo}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="fw-bold">Street</Form.Label>
              <Form.Control
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="fw-bold">Barangay</Form.Label>
              <Form.Control
                type="text"
                name="barangay"
                value={formData.barangay}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={4}>
              <Form.Label className="fw-bold">City</Form.Label>
              <Form.Control
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="fw-bold">Region</Form.Label>
              <Form.Control
                type="text"
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="fw-bold">Zip Code</Form.Label>
              <Form.Control
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Label className="fw-bold">Birthday</Form.Label>
              <Form.Control
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
            <Col md={6}>
              <Form.Label className="fw-bold">Gender</Form.Label>
              <Form.Select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Col>
          </Row>
          {isEditing && (
            <Row className="mb-4">
              <Col md={12}>
                <Form.Label className="fw-bold">Upload Resume / ID</Form.Label>
                <div className="d-flex align-items-center gap-3">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    ref={resumeInputRef}
                    onChange={handleResumeUpload}
                  />
                  {resumeFile && (
                    <span className="text-success fw-bold">
                      {resumeFile.name}
                    </span>
                  )}
                </div>
              </Col>
            </Row>
          )}

          <h5 className="mt-4 fw-bold">Social Media</h5>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Label className="fw-bold">
                <Facebook className="me-2 text-primary" /> Facebook
              </Form.Label>
              <Form.Control
                type="text"
                name="facebook"
                value={formData.facebook}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="fw-bold">
                <Github className="me-2" /> GitHub
              </Form.Label>
              <Form.Control
                type="text"
                name="github"
                value={formData.github}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
            <Col md={4}>
              <Form.Label className="fw-bold">
                <Linkedin className="me-2 text-primary" /> LinkedIn
              </Form.Label>
              <Form.Control
                type="text"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                className="custom-input"
                disabled={!isEditing}
              />
            </Col>
          </Row>

          {isEditing && (
            <>
              <h5 className="mt-4 fw-bold">Change Password</h5>
              <Row className="mb-3">
                <Col md={6}>
                  <Form.Label className="fw-bold">New Password</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type={showNewPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="custom-input pe-5"
                    />
                    <span
                      className="position-absolute top-50 end-0 translate-middle-y me-3"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeSlashFill /> : <EyeFill />}
                    </span>
                  </div>
                </Col>
                <Col md={6}>
                  <Form.Label className="fw-bold">Confirm Password</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="custom-input pe-5"
                    />
                    <span
                      className="position-absolute top-50 end-0 translate-middle-y me-5"
                      style={{ color: formData.confirmPassword === formData.password ? 'green' : 'red' }}
                    >
                      {formData.confirmPassword === formData.password ? <CheckLg /> : <XLg />}
                    </span>
                    <span
                      className="position-absolute top-50 end-0 translate-middle-y me-3"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeSlashFill /> : <EyeFill />}
                    </span>
                  </div>
                </Col>
              </Row>
            </>
          )}

          <h5 className="mt-4 fw-bold">Notification Preferences</h5>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Check
                type="switch"
                label="Receive Email Updates"
                name="receiveUpdates"
                checked={formData.receiveUpdates}
                onChange={handleChange}
                disabled={!isEditing}
                className="fw-bold"
              />
            </Col>
            <Col md={4}>
              <Form.Check
                type="switch"
                label="Receive System Notifications"
                name="receiveNotifications"
                checked={formData.receiveNotifications}
                onChange={handleChange}
                disabled={!isEditing}
                className="fw-bold"
              />
            </Col>
            <Col md={4}>
              <Form.Check
                type="switch"
                label="Receive Promo Offers"
                name="receivePromos"
                checked={formData.receivePromos}
                onChange={handleChange}
                disabled={!isEditing}
                className="fw-bold"
              />
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2">
            {isEditing ? (
              <>
                <Button variant="secondary" className="fw-bold" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button className="custom-blue-btn fw-bold" onClick={handleSave}>
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                className="custom-blue-btn fw-bold px-4"
                style={{ width: '180px' }}
                onClick={handleEdit}
              >
                Edit
              </Button>
            )}
          </div>
        </Form>
      </Card>

      <style>{`
        .custom-input {
          border: 1.5px solid #ccc;
          border-radius: 10px;
          padding: 10px;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
          transition: border-color 0.3s, box-shadow 0.3s;
        }

        .custom-input:hover {
          border-color: #162e72;
          box-shadow: 0 0 5px 1px rgba(22, 46, 114, 0.4);
        }

        .custom-input:focus {
          border-color: #162e72;
          box-shadow: 0 0 6px 2px rgba(22, 46, 114, 0.5);
        }

        .custom-white-btn {
          background-color: #ffffff;
          color: #1e3a8a;
          border: 1.5px solid #1e3a8a;
          border-radius: 8px;
          font-weight: bold;
          transition: background-color 0.3s, box-shadow 0.3s;
        }

        .custom-white-btn:hover {
          background-color: #f3f4f6;
          box-shadow: 0 0 8px 1px rgba(22, 46, 114, 0.3);
        }

        .custom-blue-btn {
          background-color: #162e72;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          transition: background-color 0.3s, box-shadow 0.3s;
        }

        .custom-blue-btn:hover {
          background-color: #0f245c;
          box-shadow: 0 0 8px 2px rgba(22, 46, 114, 0.5);
        }
      `}</style>
    </div>
  );
};

export default AccountPage;
