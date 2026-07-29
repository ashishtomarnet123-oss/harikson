import { authenticatedFetch, getApiConfig } from './apiHelper';
import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/router';

export default function ProfileSettings({ onClose }) {
  const [profile, setProfile] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    company: '',
    jobTitle: '',
    website: '',
    avatarUrl: '',
  });
  const [initialProfile, setInitialProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!localStorage.getItem('hk_user')) {
          router.push('/login');
          return;
        }
        const { apiBase, tenantSlug } = getApiConfig();
        const res = await authenticatedFetch(`${apiBase}/api/v1/user/profile`, {
          credentials: 'include',
          headers: {
            'x-tenant-slug': tenantSlug,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const loaded = {
            name: data.name || '',
            username: data.username || '',
            email: data.email || '',
            phone: data.phone || '',
            company: data.company || '',
            jobTitle: data.jobTitle || data.designation || '',
            website: data.website || '',
            avatarUrl: data.avatarUrl || '',
          };
          setProfile(loaded);
          setInitialProfile(loaded);
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
    if (e) e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { apiBase, tenantSlug } = getApiConfig();
      const res = await authenticatedFetch(`${apiBase}/api/v1/user/profile`, {
        credentials: 'include',
        method: 'PUT',
        headers: {
          'x-tenant-slug': tenantSlug,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setInitialProfile(profile);
        setMessage({ type: 'success', text: 'Profile updated successfully.' });
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size must be smaller than 5MB.' });
      return;
    }
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setMessage({ type: 'error', text: 'Only PNG or JPG formats are allowed.' });
      return;
    }

    setUploadingAvatar(true);
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

      const { apiBase, tenantSlug } = getApiConfig();

      const res = await authenticatedFetch(`${apiBase}/api/v1/user/avatar`, {
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
      setMessage({ type: 'success', text: 'Profile photo updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const nameInitials = profile.name
    ? profile.name.trim().split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : (profile.email || 'U').slice(0, 2).toUpperCase();

  const isDirty = JSON.stringify(profile) !== JSON.stringify(initialProfile);

  if (loading) {
    return (
      <div className="settings-loading-state">
        <div className="login-spinner" style={{ width: '28px', height: '28px' }} />
        <span>Loading profile information...</span>
      </div>
    );
  }

  return (
    <div className="profile-settings-container">
      {/* Page Title Header */}
      <div className="settings-header-group">
        <h1 className="settings-main-title">My Profile</h1>
        <p className="settings-main-subtitle">
          Manage your personal information and account details.
        </p>
      </div>

      {message && (
        <div className={`settings-toast-banner ${message.type}`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Section 1: Profile Photo ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">Profile Photo</h2>
        <div className="profile-photo-row">
          <div className="profile-avatar-circle">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" />
            ) : (
              <span>{nameInitials}</span>
            )}
          </div>
          <div className="profile-photo-controls">
            <label className="btn-change-photo">
              <Upload size={14} />
              <span>{uploadingAvatar ? 'Uploading...' : 'Change photo'}</span>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
                style={{ display: 'none' }}
              />
            </label>
            <p className="photo-help-text">
              PNG or JPG up to 5MB. Recommended size 256×256.
            </p>
          </div>
        </div>
      </div>

      <div className="settings-divider" />

      {/* ── Section 2: Personal Information ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">Personal Information</h2>
        <div className="settings-form-grid">
          <div className="settings-field-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
              placeholder="John Doe"
            />
          </div>

          <div className="settings-field-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              name="username"
              value={profile.username}
              onChange={handleChange}
              placeholder="johndoe"
            />
          </div>

          <div className="settings-field-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              value={profile.email}
              disabled
              className="disabled-field"
            />
            <span className="field-hint-text">Email cannot be changed directly.</span>
          </div>

          <div className="settings-field-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              type="tel"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>
      </div>

      <div className="settings-divider" />

      {/* ── Section 3: Professional Details ── */}
      <div className="settings-section-block">
        <h2 className="settings-section-heading">Professional Details</h2>
        <div className="settings-form-grid">
          <div className="settings-field-group">
            <label htmlFor="jobTitle">Designation <span className="optional-tag">(Optional)</span></label>
            <input
              id="jobTitle"
              type="text"
              name="jobTitle"
              value={profile.jobTitle}
              onChange={handleChange}
              placeholder="Software Engineer"
            />
          </div>

          <div className="settings-field-group">
            <label htmlFor="company">Company <span className="optional-tag">(Optional)</span></label>
            <input
              id="company"
              type="text"
              name="company"
              value={profile.company}
              onChange={handleChange}
              placeholder="Harikson Technologies"
            />
          </div>

          <div className="settings-field-group">
            <label htmlFor="website">Website <span className="optional-tag">(Optional)</span></label>
            <input
              id="website"
              type="text"
              name="website"
              value={profile.website}
              onChange={handleChange}
              placeholder="https://harikson.com"
            />
          </div>
        </div>
      </div>

      {/* ── Bottom Sticky Action Bar ── */}
      <div className="settings-action-bar">
        <button
          type="button"
          className="btn-cancel"
          onClick={() => {
            if (isDirty) {
              setProfile(initialProfile);
              setMessage(null);
            } else if (onClose) {
              onClose();
            }
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-save-primary"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
