import React, { useState, useEffect } from 'react';
import SettingsLayout from '../../components/SettingsLayout';
import { Save } from 'lucide-react';
import { useRouter } from 'next/router';

export default function ProfileSettings() {
  const [profile, setProfile] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    department: '',
    country: '',
    timeZone: '',
    bio: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('hk_token');
        if (!token) {
          router.push('/login');
          return;
        }
        
        // Use a relative or absolute URL based on your API setup.
        // For now, assuming the API is hosted on the same domain or we have an apiBase.
        // If apiBase is needed, we should extract it from env or standard config.
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
        
        const res = await fetch(`${apiBase}/api/user/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setProfile(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      const token = localStorage.getItem('hk_token');
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      
      const res = await fetch(`${apiBase}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profile)
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully.' });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="settings-loading">Loading profile...</div>;

  return (
    <SettingsLayout>
      <div className="settings-page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information and account details.</p>
      </div>

      {message && (
        <div className={`settings-alert ${message.type}`}>
          {message.text}
        </div>
      )}

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-section">
          <h2>Personal Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="name" value={profile.name || ''} onChange={handleChange} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" name="username" value={profile.username || ''} onChange={handleChange} placeholder="johndoe" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" value={profile.email || ''} disabled className="disabled-input" />
              <span className="help-text">Email cannot be changed directly.</span>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" value={profile.phone || ''} onChange={handleChange} placeholder="+1 (555) 000-0000" />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Professional Details</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" name="company" value={profile.company || ''} onChange={handleChange} placeholder="Acme Corp" />
            </div>
            <div className="form-group">
              <label>Job Title</label>
              <input type="text" name="jobTitle" value={profile.jobTitle || ''} onChange={handleChange} placeholder="Software Engineer" />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <input type="text" name="department" value={profile.department || ''} onChange={handleChange} placeholder="Engineering" />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input type="text" name="country" value={profile.country || ''} onChange={handleChange} placeholder="United States" />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>About</h2>
          
          <div className="form-group">
            <label>Short Bio</label>
            <textarea 
              name="bio" 
              value={profile.bio || ''} 
              onChange={handleChange} 
              rows={4} 
              placeholder="Tell us a little bit about yourself..."
            />
          </div>
        </div>

        <div className="settings-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
          </button>
        </div>
      </form>
    </SettingsLayout>
  );
}
