import React, { useState, useEffect } from 'react';
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
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('hk_user') ? 'cookie_auth' : null;
        if (!token) {
          router.push('/login');
          return;
        }
        const apiBase =
          localStorage.getItem('hk_api_base') ||
          process.env.NEXT_PUBLIC_API_URL ||
          'http://localhost:3008';
        const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
        const res = await fetch(`${apiBase}/api/user/profile`, {
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('hk_user') ? 'cookie_auth' : null;
      const apiBase =
        localStorage.getItem('hk_api_base') ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';
      const res = await fetch(`${apiBase}/api/user/profile`, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      alert("Only JPEG and PNG formats are allowed");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const size = Math.min(img.width, img.height);
        const xOffset = (img.width - size) / 2;
        const yOffset = (img.height - size) / 2;

        ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, 256, 256);

        canvas.toBlob((blob) => {
          uploadAvatar(blob);
        }, 'image/jpeg', 0.9);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('avatar', blob, 'avatar.jpg');

      const apiBase =
        localStorage.getItem('hk_api_base') ||
        process.env.NEXT_PUBLIC_API_URL ||
        'http://localhost:3008';
      const tenantSlug = localStorage.getItem('hk_tenant') || 'neuravolt';

      const res = await fetch(`${apiBase}/api/user/avatar`, {
        credentials: 'include',
        method: 'POST',
        headers: {
          'x-tenant-slug': tenantSlug,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload avatar');
      }

      const data = await res.json();
      setProfile((prev) => ({ ...prev, avatarUrl: data.avatarUrl }));
      setMessage({ type: 'success', text: 'Avatar uploaded successfully.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const nameInitials = profile.name
    ? profile.name.slice(0, 2).toUpperCase()
    : (profile.email || 'U').slice(0, 2).toUpperCase();

  if (loading)
    return <div className="settings-loading">Loading profile...</div>;

  return (
    <>
      <div className="settings-page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information and account details.</p>
      </div>

      {message && (
        <div className={`settings-alert ${message.type}`}>{message.text}</div>
      )}

      <form className="settings-form" onSubmit={handleSave}>
        <div className="settings-section">
          <h2>Personal Information</h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: 'white',
              overflow: 'hidden',
              border: '2px solid #334155',
              position: 'relative'
            }}>
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                nameInitials
              )}
            </div>
            <div>
              <label style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: 'white',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}>
                Change Photo
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Accepts PNG or JPG up to 5MB. Automatically cropped to 256x256.
              </p>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={profile.name || ''}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={profile.username || ''}
                onChange={handleChange}
                placeholder="johndoe"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={profile.email || ''}
                disabled
                className="disabled-input"
              />
              <span className="help-text">
                Email cannot be changed directly.
              </span>
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone || ''}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h2>Professional Details</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                name="company"
                value={profile.company || ''}
                onChange={handleChange}
                placeholder="Acme Corp"
              />
            </div>
            <div className="form-group">
              <label>Job Title</label>
              <input
                type="text"
                name="jobTitle"
                value={profile.jobTitle || ''}
                onChange={handleChange}
                placeholder="Software Engineer"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={profile.department || ''}
                onChange={handleChange}
                placeholder="Engineering"
              />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                name="country"
                value={profile.country || ''}
                onChange={handleChange}
                placeholder="United States"
              />
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
            {saving ? (
              'Saving...'
            ) : (
              <>
                <Save size={15} /> Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
