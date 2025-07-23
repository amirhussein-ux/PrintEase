import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
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
    <section id="service-management" className="service-management section-padding">
      <div className="container">
        <div className="services-header">
          <h2>SERVICE MANAGEMENT</h2>
        </div>
        <form className="service-form" onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
          <input
            type="file"
            name="icon"
            accept="image/*"
            onChange={handleChange}
            style={{ marginRight: 8 }}
            required={form.icon === ''}
          />
          {form.icon && (
            <span style={{ marginRight: 8 }}>
              <img src={form.icon} alt="icon preview" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, verticalAlign: 'middle' }} />
            </span>
          )}
          <input
            type="text"
            name="title"
            placeholder="Title"
            value={form.title}
            onChange={handleChange}
            required
            style={{ marginRight: 8 }}
          />
          <textarea
            name="description"
            placeholder="Description"
            value={form.description}
            onChange={handleChange}
            required
            style={{ marginRight: 8, verticalAlign: 'top', resize: 'vertical', minHeight: 32 }}
          />
          <button type="submit">{editIndex !== null ? 'Update' : 'Add'} Service</button>
          {editIndex !== null && (
            <button type="button" onClick={() => { setEditIndex(null); setForm({ icon: '', title: '', description: '' }); setIconFile(null); }} style={{ marginLeft: 8 }}>
              Cancel
            </button>
          )}
        </form>
        <div className="services-grid">
          {services.map((service, index) => (
            <div className="service-card" key={index}>
              <div className="service-icon">
                <img src={service.icon} alt={service.title} />
              </div>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <div style={{ marginTop: 8 }}>
                <button onClick={() => handleEdit(index)} style={{ marginRight: 8 }}>Edit</button>
                <button onClick={() => handleDelete(index)} style={{ color: 'red' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceManagement;
