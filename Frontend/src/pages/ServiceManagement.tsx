import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import './ServiceManagement.css';

const ServiceManagement: React.FC = () => {
  const { services, addService, updateService, deleteService } = useAppContext();
  const [form, setForm] = useState<{ icon: string; title: string; description: string }>({ icon: '', title: '', description: '' });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'file' && name === 'icon') {
      const fileInput = e.target as HTMLInputElement;
      if (fileInput.files && fileInput.files[0]) {
        setIconFile(fileInput.files[0]);
        setForm({ ...form, icon: URL.createObjectURL(fileInput.files[0]) });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let iconUrl = form.icon;
    if (iconFile) {
      iconUrl = URL.createObjectURL(iconFile);
    }
    const newService = { ...form, icon: iconUrl };
    if (editIndex !== null) {
      updateService(editIndex, newService);
      setEditIndex(null);
    } else {
      addService(newService);
    }
    setForm({ icon: '', title: '', description: '' });
    setIconFile(null);
  };

  const handleEdit = (idx: number) => {
    setForm(services[idx]);
    setEditIndex(idx);
    setIconFile(null);
  };

  const handleDelete = (idx: number) => {
    if (window.confirm('Are you sure you want to delete this service?')) {
      deleteService(idx);
      if (editIndex === idx) {
        setEditIndex(null);
        setForm({ icon: '', title: '', description: '' });
        setIconFile(null);
      }
    }
  };

  return (
    <section className="service-management">
      <div className="services-header">
        <h2>Service Management</h2>
      </div>

      <form className="service-form" onSubmit={handleSubmit}>
        <label className="icon-preview">
          <input type="file" name="icon" accept="image/*" onChange={handleChange} required={form.icon === ''} />
          {form.icon && <img src={form.icon} alt="preview" />}
        </label>

        <input type="text" name="title" placeholder="Title" value={form.title} onChange={handleChange} required />
        <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} required />

        <div className="form-actions">
          <button type="submit">{editIndex !== null ? 'Update' : 'Add'} Service</button>
          {editIndex !== null && (
            <button type="button" className="cancel-btn" onClick={() => { setEditIndex(null); setForm({ icon: '', title: '', description: '' }); setIconFile(null); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="services-grid">
        {services.map((service, index) => (
          <div className="service-card" key={index}>
            <div className="service-icon">
              <img src={service.icon} alt={service.title} />
            </div>
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <div className="card-actions">
              <button onClick={() => handleEdit(index)}>Edit</button>
              <button className="delete-btn" onClick={() => handleDelete(index)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ServiceManagement;
