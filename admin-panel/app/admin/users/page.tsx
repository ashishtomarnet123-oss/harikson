'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCookie } from 'cookies-next';
import {
  Users,
  Loader2,
  BadgeCheck,
  Clock,
  Building,
  Search,
  MessageSquare,
  Zap,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Mail,
  Send,
  Key,
  Edit3,
  Phone,
  Building2,
  Briefcase,
  Globe,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Lock,
  Sparkles,
  ShieldCheck,
  MoreVertical,
  LogOut,
  Shield,
  History,
  AlertTriangle,
} from 'lucide-react';
import { useAdminAuth } from '../../../context/AdminAuthContext';

interface User {
  id: string;
  email: string;
  role: string;
  status?: string;
  tenant_name: string;
  created_at: string;
  conversations_count?: number;
  messages_count?: number;
  total_tokens?: number;
  is_suspended?: boolean;
  name?: string;
  username?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  department?: string;
  country?: string;
  bio?: string;
  billing_info?: any;
  force_password_change?: boolean;
  must_change_password?: boolean;
  password_changed_at?: string;
  password_reset_at?: string;
  password_reset_by?: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const apiBase = '/api-proxy';
  const [error, setError] = useState('');

  // Details drawer state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userConversations, setUserConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  // Subscription plan modification state
  const [plans, setPlans] = useState<any[]>([]);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('starter');

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    company: '',
    job_title: '',
    department: '',
    country: '',
    bio: '',
    role: 'user'
  });

  const handleOpenEditProfile = (user: any) => {
    setProfileForm({
      name: user.name || '',
      phone: user.phone || '',
      company: user.company || '',
      job_title: user.job_title || '',
      department: user.department || '',
      country: user.country || '',
      bio: user.bio || '',
      role: user.role || 'user'
    });
    setEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSavingProfile(true);

    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileForm),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('User profile and business details updated successfully!');
        setEditingProfile(false);
        fetchUsers();
        setSelectedUser(data.user);
      } else {
        alert(`Error: ${data.error || 'Failed to update user profile'}`);
      }
    } catch (err: any) {
      alert(`Error updating profile: ${err?.message || err}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAssignPlan = async (userId: string, planId: string) => {
    setUpdatingPlan(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/plan`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ planId }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Success: ${data.message || 'Subscription plan updated successfully'}`);
        fetchUsers();
        if (selectedUser?.id === userId) {
          setSelectedUser((prev: any) => (prev ? { ...prev, billing_info: data.billing_info } : null));
        }
      } else {
        alert(`Error: ${data.error || 'Failed to update plan'}`);
      }
    } catch (err: any) {
      alert(`Error updating plan: ${err?.message || err}`);
    } finally {
      setUpdatingPlan(false);
    }
  };

  // Manual transactional email dispatch state
  const [emailSending, setEmailSending] = useState<string | null>(null);

  const handleSendUserEmail = async (userId: string, emailType: string) => {
    setEmailSending(emailType);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/send-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ emailType }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Success: ${data.message || 'Email dispatched successfully'}`);
      } else {
        alert(`Error: ${data.error || 'Failed to dispatch email'}`);
      }
    } catch (err: any) {
      alert(`Error sending email: ${err?.message || err}`);
    } finally {
      setEmailSending(null);
    }
  };

  // Superadmin authorization context
  const { user: currentAdmin } = useAdminAuth();
  const isSuperAdmin = currentAdmin?.role === 'superadmin' || currentAdmin?.role === 'founder' || currentAdmin?.role === 'admin';

  // Action Menu dropdown state
  const [actionMenuUserId, setActionMenuUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setActionMenuUserId(null);
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Password Strength Meter
  const computePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-gray-200 dark:bg-gray-700', width: '0%' };
    let score = 0;
    if (pwd.length >= 12) score += 1;
    if (pwd.length >= 16) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)) score += 1;

    if (score <= 2) {
      return { score, label: 'Weak (Need 12+ chars, mixed case, number, symbol)', color: 'bg-rose-500', width: '25%' };
    } else if (score === 3) {
      return { score, label: 'Fair (Min 12 characters recommended)', color: 'bg-amber-500', width: '50%' };
    } else if (score === 4) {
      return { score, label: 'Good', color: 'bg-blue-500', width: '75%' };
    }
    return { score, label: 'Strong (Enterprise Compliant)', color: 'bg-emerald-500', width: '100%' };
  };

  // Password Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [userForReset, setUserForReset] = useState<User | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(true);
  const [revokeSessionsOnReset, setRevokeSessionsOnReset] = useState(true);
  const [sendEmailNotice, setSendEmailNotice] = useState(false);
  const [submittingReset, setSubmittingReset] = useState(false);
  const [sendingResetLink, setSendingResetLink] = useState(false);
  const [resetResult, setResetResult] = useState<{
    success: boolean;
    message: string;
    tempPassword?: string;
  } | null>(null);
  const [copiedResetPassword, setCopiedResetPassword] = useState(false);

  // Temporary Password Modal State
  const [tempPasswordModalOpen, setTempPasswordModalOpen] = useState(false);
  const [userForTempPassword, setUserForTempPassword] = useState<User | null>(null);
  const [generatedTempPassword, setGeneratedTempPassword] = useState<string | null>(null);
  const [generatingTempPassword, setGeneratingTempPassword] = useState(false);
  const [copiedTempPassword, setCopiedTempPassword] = useState(false);

  // Generated Reset Link Modal State
  const [generatedResetLink, setGeneratedResetLink] = useState<{
    url: string;
    email: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);

  // Sign Out Sessions Modal State
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const [userForSignOut, setUserForSignOut] = useState<User | null>(null);
  const [signingOutSessions, setSigningOutSessions] = useState(false);

  // Security Activity Audit Feed State
  const [securityActivity, setSecurityActivity] = useState<any[]>([]);
  const [loadingSecurityActivity, setLoadingSecurityActivity] = useState(false);

  const fetchSecurityActivity = async (userId: string) => {
    setLoadingSecurityActivity(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/security-activity`, {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setSecurityActivity(data.activities || []);
      }
    } catch (err) {
      console.error('Error fetching security activity:', err);
    } finally {
      setLoadingSecurityActivity(false);
    }
  };

  useEffect(() => {
    if (selectedUser?.id) {
      fetchSecurityActivity(selectedUser.id);
    } else {
      setSecurityActivity([]);
    }
  }, [selectedUser?.id]);

  const generateStrongPassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%^&*_-+=';
    const all = uppercase + lowercase + numbers + symbols;

    let pwd = '';
    pwd += uppercase[Math.floor(Math.random() * uppercase.length)];
    pwd += lowercase[Math.floor(Math.random() * lowercase.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 16; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    const shuffled = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    setResetNewPassword(shuffled);
    setResetConfirmPassword(shuffled);
    setShowResetPassword(true);
    setCopiedResetPassword(false);
  };

  const handleOpenResetModal = (user: User) => {
    setUserForReset(user);
    setResetNewPassword('');
    setResetConfirmPassword('');
    setShowResetPassword(false);
    setForcePasswordChange(true);
    setRevokeSessionsOnReset(true);
    setSendEmailNotice(false);
    setResetResult(null);
    setCopiedResetPassword(false);
    setResetModalOpen(true);
  };

  const handleCloseResetModal = () => {
    setResetModalOpen(false);
    setUserForReset(null);
    setResetResult(null);
    setResetNewPassword('');
    setResetConfirmPassword('');
    setCopiedResetPassword(false);
  };

  const handleCopyCredentials = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedResetPassword(true);
    setTimeout(() => setCopiedResetPassword(false), 2500);
  };

  const handleSubmitAdminPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForReset) return;

    if (!resetNewPassword || resetNewPassword.length < 12) {
      alert('Password must be at least 12 characters long according to enterprise security policy.');
      return;
    }

    if (!/[A-Z]/.test(resetNewPassword)) {
      alert('Password must contain at least one uppercase letter (A-Z).');
      return;
    }

    if (!/[a-z]/.test(resetNewPassword)) {
      alert('Password must contain at least one lowercase letter (a-z).');
      return;
    }

    if (!/[0-9]/.test(resetNewPassword)) {
      alert('Password must contain at least one numeric digit (0-9).');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(resetNewPassword)) {
      alert('Password must contain at least one special character (e.g. !@#$%^&*).');
      return;
    }

    if (resetConfirmPassword && resetNewPassword !== resetConfirmPassword) {
      alert('Passwords do not match. Please verify.');
      return;
    }

    setSubmittingReset(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userForReset.id}/password/reset`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          password: resetNewPassword,
          forceChangeOnNextLogin: forcePasswordChange,
          revokeSessions: revokeSessionsOnReset,
          sendEmailNotification: sendEmailNotice,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, error: text || `Server error (${res.status})` };
      }

      if (res.ok && data.success) {
        setResetResult({
          success: true,
          message: data.message || 'Password reset successfully.',
          tempPassword: resetNewPassword,
        });
        fetchUsers();
        if (selectedUser?.id === userForReset.id) {
          fetchSecurityActivity(userForReset.id);
        }
      } else {
        alert(data.error || 'Failed to reset password');
      }
    } catch (err: any) {
      alert(`Error resetting password: ${err?.message || err}`);
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleGenerateTempPassword = async (user: User) => {
    setUserForTempPassword(user);
    setGeneratingTempPassword(true);
    setGeneratedTempPassword(null);
    setCopiedTempPassword(false);
    setTempPasswordModalOpen(true);

    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${user.id}/password/generate`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          forceChangeOnNextLogin: true,
          revokeSessions: true,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, error: text || `Server error (${res.status})` };
      }

      if (res.ok && data.success && data.temporaryPassword) {
        setGeneratedTempPassword(data.temporaryPassword);
        fetchUsers();
        if (selectedUser?.id === user.id) {
          fetchSecurityActivity(user.id);
        }
      } else {
        alert(data.error || 'Failed to generate temporary password');
        setTempPasswordModalOpen(false);
      }
    } catch (err: any) {
      alert(`Error generating temporary password: ${err?.message || err}`);
      setTempPasswordModalOpen(false);
    } finally {
      setGeneratingTempPassword(false);
    }
  };

  const handleToggleForcePasswordChange = async (userId: string, currentVal: boolean) => {
    const newVal = !currentVal;
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/password/force-change`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ forceChange: newVal }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        data = { success: false, error: text || `Server error (${res.status})` };
      }
      if (res.ok && data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, force_password_change: newVal, must_change_password: newVal } : u))
        );
        if (selectedUser?.id === userId) {
          setSelectedUser((prev: any) =>
            prev ? { ...prev, force_password_change: newVal, must_change_password: newVal } : null
          );
          fetchSecurityActivity(userId);
        }
      } else {
        alert(data.error || 'Failed to update force password change setting');
      }
    } catch (err: any) {
      alert(`Error: ${err?.message || err}`);
    }
  };

  const handleOpenSignOutModal = (user: User) => {
    setUserForSignOut(user);
    setSignOutModalOpen(true);
  };

  const handleConfirmSignOutSessions = async () => {
    if (!userForSignOut) return;
    setSigningOutSessions(true);

    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userForSignOut.id}/sessions/sign-out`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Success: ${data.message || 'All active sessions terminated.'}`);
        setSignOutModalOpen(false);
        if (selectedUser?.id === userForSignOut.id) {
          fetchSecurityActivity(userForSignOut.id);
        }
      } else {
        alert(data.error || 'Failed to sign out user sessions');
      }
    } catch (err: any) {
      alert(`Error: ${err?.message || err}`);
    } finally {
      setSigningOutSessions(false);
    }
  };

  const handleSendResetEmailLink = async () => {
    if (!userForReset) return;
    setSendingResetLink(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      // Proactively reset rate limit before dispatching admin reset
      await fetch(`${apiBase}/v1/admin/users/${userForReset.id}/reset-email-rate-limit`, {
        method: 'POST',
        headers,
        credentials: 'include',
      }).catch(() => {});

      const res = await fetch(`${apiBase}/v1/admin/users/${userForReset.id}/force-password-reset`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.resetLink) {
          setGeneratedResetLink({
            url: data.resetLink,
            email: userForReset.email,
            emailSent: !!data.emailSent,
            emailError: data.emailError,
          });
          handleCloseResetModal();
        } else {
          alert(`Success: ${data.message || 'Password reset link dispatched to user email!'}`);
          handleCloseResetModal();
        }
      } else {
        alert(`Error: ${data.error || 'Failed to dispatch reset link'}`);
      }
    } catch (err: any) {
      alert(`Error sending reset link: ${err?.message || err}`);
    } finally {
      setSendingResetLink(false);
    }
  };

  const handleResetEmailRateLimit = async (userId: string) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/reset-email-rate-limit`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Email rate limit has been reset successfully!');
      } else {
        alert(data.error || 'Failed to reset email rate limit');
      }
    } catch (err: any) {
      alert(`Error resetting email rate limit: ${err?.message || err}`);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users`, {
        headers,
        credentials: 'include',
      });
      if (res.status === 401 || res.status === 403) {
        return;
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to admin API');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/plans`, {
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  const handleUserPlanChange = async (planId: string) => {
    if (!selectedUser) return;
    setUpdatingPlan(true);
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${selectedUser.id}/plan`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ planId }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update plan');
      }
      const data = await res.json();
      const updatedUser = data.user;
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, billing_info: updatedUser.billing_info } : u))
      );
      setSelectedUser((prev) => (prev ? { ...prev, billing_info: updatedUser.billing_info } : null));
    } catch (err: any) {
      alert(err.message || 'Error assigning subscription plan');
    } finally {
      setUpdatingPlan(false);
    }
  };

  useEffect(() => {
    if (!selectedUser) {
      setUserConversations([]);
      return;
    }
    const fetchConversations = async () => {
      setLoadingConvs(true);
      const token = getCookie('admin_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      try {
        const res = await fetch(
          `${apiBase}/v1/admin/users/${selectedUser.id}/conversations`,
          { headers, credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          setUserConversations(data.conversations || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingConvs(false);
      }
    };
    fetchConversations();
  }, [selectedUser]);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/status`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: newStatus, is_suspended: newStatus === 'suspended' } : u))
        );
        if (selectedUser?.id === userId) {
          setSelectedUser((prev) =>
            prev ? { ...prev, status: newStatus, is_suspended: newStatus === 'suspended' } : null
          );
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to update user status');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating user status');
    }
  };

  const handleImpersonateUser = async (userId: string) => {
    try {
      const token = getCookie('admin_token') || localStorage.getItem('admin_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${apiBase}/v1/admin/users/${userId}/impersonate`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      const userPortalBase = process.env.NEXT_PUBLIC_USER_PORTAL_URL || 'https://xarwiz.com';
      const redirectPath = data.redirectUrl || `/impersonate?token=${data.token}`;
      const userPortalUrl = `${userPortalBase}${redirectPath}`;
      window.open(userPortalUrl, '_blank');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete user "${email}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    const token = getCookie('admin_token') || localStorage.getItem('admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiBase}/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        if (selectedUser?.id === userId) {
          setSelectedUser(null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting user');
    }
  };

  const getInitials = (email: string) => {
    if (!email) return 'US';
    return email.split('@')[0].substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (email: string) => {
    const hash = email
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'from-blue-500 to-indigo-600',
      'from-purple-500 to-pink-600',
      'from-emerald-400 to-teal-600',
      'from-amber-400 to-orange-600',
      'from-rose-500 to-red-600',
    ];
    return colors[hash % colors.length];
  };

  // Filter Calculations
  const pendingCount = users.filter((u) => (u.status || 'active') === 'pending').length;
  const activeCount = users.filter((u) => (u.status || 'active') === 'active').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;

  const filteredUsers = users.filter((user) => {
    const q = (searchTerm || '').toLowerCase();
    const matchesSearch =
      (user.email || '').toLowerCase().includes(q) ||
      (user.tenant_name || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q);
    
    const userStatus = user.status || 'active';
    const matchesStatus = statusFilter === 'all' || userStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalUsers = users.length;
  const totalConversations = users.reduce(
    (acc, u) => acc + (Number(u.conversations_count) || 0),
    0
  );
  const totalMessages = users.reduce(
    (acc, u) => acc + (Number(u.messages_count) || 0),
    0
  );
  const totalTokens = users.reduce(
    (acc, u) => acc + (Number(u.total_tokens) || 0),
    0
  );

  return (
    <div className="space-y-6 max-w-6xl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `,
        }}
      />

      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                User Access & Management
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Invite-only platform control. Approve pending signups and manage tenant user permissions.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by email or tenant..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800/80 rounded-xl text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs font-semibold">
          Error: {error}
        </div>
      )}

      {/* Pending Approval Banner */}
      {pendingCount > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {pendingCount} Registration Request{pendingCount > 1 ? 's' : ''} Awaiting Approval
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-400">
                These users submitted public signup and require administrator authorization before they can log in.
              </div>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('pending')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
          >
            Review Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Total Registrations
          </span>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {totalUsers}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
            Pending Approval
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {pendingCount}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
            Active Users
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {activeCount}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 p-4 rounded-xl flex flex-col justify-between shadow-sm">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
            Total LLM Tokens
          </span>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {totalTokens.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Table Card */}
      <div className="bg-white dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/60 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 p-3 bg-gray-50/50 dark:bg-gray-950/40 border-b border-gray-200 dark:border-gray-800/60 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'
            }`}
          >
            All Users ({totalUsers})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Approval ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active ({activeCount})
          </button>
          <button
            onClick={() => setStatusFilter('suspended')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'suspended'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Suspended ({suspendedCount})
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800/60 bg-gray-50/50 dark:bg-gray-950/40 text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400">
                <th className="py-3.5 px-6 w-[28%]">User Identity</th>
                <th className="py-3.5 px-6 w-[18%]">Tenant Name</th>
                <th className="py-3.5 px-6 w-[18%]">Usage Telemetry</th>
                <th className="py-3.5 px-6 w-[10%]">Role</th>
                <th className="py-3.5 px-6 w-[12%]">Access Status</th>
                <th className="py-3.5 px-6 w-[14%]">Joined Date</th>
                <th className="py-3.5 px-6 w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500 mb-2" />
                    Fetching user records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 font-medium">
                    No matching users found in the system.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const currentStatus = user.status || 'active';
                  return (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/10 border-b border-gray-100 dark:border-gray-800/40 transition-all text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      {/* User Profile */}
                      <td className="py-3 px-6 text-gray-900 dark:text-gray-200">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(user.email)} flex items-center justify-center shrink-0 shadow-sm text-[11px] font-black text-white`}
                          >
                            {getInitials(user.email)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-gray-200 truncate">
                              {user.name || user.email}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tenant Info */}
                      <td className="py-3 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-indigo-500/40 shrink-0" />
                          <span className="font-medium text-gray-800 dark:text-gray-300">
                            {user.tenant_name || 'No Tenant'}
                          </span>
                        </div>
                      </td>

                      {/* Usage telemetry stats */}
                      <td className="py-3 px-6 whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-[11px] text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                            <MessageSquare className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span>
                              {user.conversations_count || 0} chats ({user.messages_count || 0} msgs)
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-purple-500 shrink-0" />
                            <span>
                              {Number(user.total_tokens || 0).toLocaleString()} tokens
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${
                            user.role === 'admin' || user.role === 'superadmin'
                              ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/20 dark:text-purple-400'
                              : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400'
                          }`}
                        >
                          {user.role === 'admin' || user.role === 'superadmin' ? (
                            <BadgeCheck className="w-3 h-3 shrink-0" />
                          ) : null}
                          {user.role}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-6 whitespace-nowrap">
                        {currentStatus === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400">
                            <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
                            Pending Approval
                          </span>
                        ) : currentStatus === 'suspended' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[10px] font-medium">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {new Date(user.created_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td
                        className="py-3 px-6 text-right whitespace-nowrap space-x-2 relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Quick Access Status Action */}
                        {currentStatus === 'pending' ? (
                          <button
                            onClick={() => handleUpdateStatus(user.id, 'active')}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 flex items-center gap-1 inline-flex"
                          >
                            <CheckCircle2 className="w-3 h-3" /> ALLOW ACCESS
                          </button>
                        ) : currentStatus === 'suspended' ? (
                          <button
                            onClick={() => handleUpdateStatus(user.id, 'active')}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                          >
                            Reactivate
                          </button>
                        ) : null}

                        {/* User Action Dropdown Menu */}
                        <div className="relative inline-block text-left">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuUserId(actionMenuUserId === user.id ? null : user.id);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold text-xs inline-flex items-center gap-1 transition-all"
                            title="Actions Menu"
                          >
                            <MoreVertical className="w-3.5 h-3.5" /> Actions
                          </button>

                          {actionMenuUserId === user.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl py-1 z-30 text-left animate-in fade-in zoom-in-95 duration-100"
                            >
                              <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                                {user.name || user.email}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setActionMenuUserId(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                              >
                                <Eye className="w-3.5 h-3.5 text-gray-400" /> View User
                              </button>
                              <button
                                onClick={() => {
                                  handleOpenEditProfile(user);
                                  setActionMenuUserId(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-gray-400" /> Edit Profile
                              </button>

                              {isSuperAdmin && (
                                <>
                                  <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                                  <button
                                    onClick={() => {
                                      handleOpenResetModal(user);
                                      setActionMenuUserId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 flex items-center gap-2 font-medium"
                                  >
                                    <Key className="w-3.5 h-3.5 text-amber-500" /> Reset Password
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleOpenResetModal(user);
                                      setActionMenuUserId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-2 font-medium"
                                  >
                                    <Lock className="w-3.5 h-3.5 text-indigo-500" /> Set New Password
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleGenerateTempPassword(user);
                                      setActionMenuUserId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 flex items-center gap-2 font-medium"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Generate Temp Password
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleToggleForcePasswordChange(user.id, !!user.force_password_change);
                                      setActionMenuUserId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-500/10 flex items-center gap-2 font-medium"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5 text-orange-500" />
                                    {user.force_password_change ? 'Clear Password Change Gate' : 'Force Password Change'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleOpenSignOutModal(user);
                                      setActionMenuUserId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 font-medium"
                                  >
                                    <LogOut className="w-3.5 h-3.5 text-rose-500" /> Sign Out All Sessions
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleResetEmailRateLimit(user.id);
                                      setActionMenuUserId(null);
                                    }}
                                    className="w-full px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-emerald-500" /> Reset Email Limit
                                  </button>
                                </>
                              )}

                              <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                              {currentStatus === 'suspended' ? (
                                <button
                                  onClick={() => {
                                    handleUpdateStatus(user.id, 'active');
                                    setActionMenuUserId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Reactivate User
                                </button>
                              ) : currentStatus === 'active' ? (
                                <button
                                  onClick={() => {
                                    handleUpdateStatus(user.id, 'suspended');
                                    setActionMenuUserId(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                                >
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Suspend User
                                </button>
                              ) : null}
                              <button
                                onClick={() => {
                                  handleDeleteUser(user.id, user.email);
                                  setActionMenuUserId(null);
                                }}
                                className="w-full px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-bold"
                              >
                                <X className="w-3.5 h-3.5 text-red-500" /> Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Slide-over Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white dark:bg-gray-900 h-full shadow-2xl border-l border-gray-200 dark:border-gray-800 animate-slide-in flex flex-col">
            {/* Drawer Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-950/40">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(
                    selectedUser.email
                  )} flex items-center justify-center text-white font-black text-sm shadow-md`}
                >
                  {getInitials(selectedUser.email)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedUser.name || selectedUser.email}
                  </h2>
                  <p className="text-xs text-gray-500 font-mono">
                    {selectedUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Approval Alert if Pending */}
              {(selectedUser.status === 'pending') && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      User Awaiting Approval
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      This user submitted public signup and cannot access the platform until approved.
                    </div>
                  </div>
                  <button
                    onClick={() => handleUpdateStatus(selectedUser.id, 'active')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> ALLOW ACCESS
                  </button>
                </div>
              )}

              {/* Status & Role Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Access Status
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedUser.status === 'pending' ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400">
                        Pending Approval
                      </span>
                    ) : selectedUser.status === 'suspended' ? (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400">
                        Suspended
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                    Role & Scope
                  </span>
                  <div className="flex items-center gap-2 mt-1 font-bold text-xs text-gray-800 dark:text-gray-200">
                    <BadgeCheck className="w-4 h-4 text-purple-500" />
                    {selectedUser.role}
                  </div>
                </div>
              </div>

              {/* Dedicated Security & Access Section */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" /> Security & Credentials
                  </span>
                  {selectedUser.force_password_change && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Must Change Password
                    </span>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60 space-y-3.5 text-xs">
                  {/* Password Info & Actions */}
                  <div>
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Password Management
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-2.5">
                      Last changed:{' '}
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {selectedUser.password_changed_at
                          ? new Date(selectedUser.password_changed_at).toLocaleString()
                          : 'Not recorded'}
                      </span>
                    </div>

                    {isSuperAdmin && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleOpenResetModal(selectedUser)}
                          className="py-2 px-2.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <Key className="w-3.5 h-3.5" /> Reset / Set Password
                        </button>
                        <button
                          onClick={() => handleGenerateTempPassword(selectedUser)}
                          className="py-2 px-2.5 rounded-xl text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Generate Temp
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Force Password Change Toggle */}
                  {isSuperAdmin && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-800/60 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                          Force Change on Next Login
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Requires user to create a new password on next sign in
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleToggleForcePasswordChange(selectedUser.id, !!selectedUser.force_password_change)
                        }
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                          selectedUser.force_password_change
                            ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {selectedUser.force_password_change ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  )}

                  {/* Session Invalidation */}
                  {isSuperAdmin && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-800/60 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                          Active User Sessions
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Terminate all tokens & active device logins
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenSignOutModal(selectedUser)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1 transition-all"
                      >
                        <LogOut className="w-3 h-3 text-rose-500" /> Sign Out All
                      </button>
                    </div>
                  )}

                  {/* Email Rate Limit Reset */}
                  {isSuperAdmin && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-800/60 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                          Email Rate Limit
                        </div>
                        <div className="text-[10px] text-gray-500">
                          Clear rate limit lock for transactional emails
                        </div>
                      </div>
                      <button
                        onClick={() => handleResetEmailRateLimit(selectedUser.id)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1 transition-all"
                      >
                        <RefreshCw className="w-3 h-3 text-emerald-500" /> Reset Limit
                      </button>
                    </div>
                  )}

                  {/* Security Activity Feed */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <History className="w-3 h-3" /> Security Activity
                      </span>
                      <button
                        onClick={() => fetchSecurityActivity(selectedUser.id)}
                        className="text-[10px] text-indigo-500 hover:underline flex items-center gap-0.5"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${loadingSecurityActivity ? 'animate-spin' : ''}`} /> Refresh
                      </button>
                    </div>

                    {loadingSecurityActivity ? (
                      <div className="py-3 text-center text-gray-400 flex items-center justify-center gap-1 text-[11px]">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading activity...
                      </div>
                    ) : securityActivity.length === 0 ? (
                      <div className="py-2 text-[11px] text-gray-400 italic">
                        No recent security events recorded.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {securityActivity.slice(0, 5).map((act: any) => (
                          <div
                            key={act.id}
                            className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[10px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-bold text-gray-800 dark:text-gray-200">
                              <span>{act.action.replace(/_/g, ' ')}</span>
                              <span className="text-[9px] font-normal text-gray-400">
                                {new Date(act.createdAt).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-gray-500 text-[9px] flex items-center justify-between">
                              <span>Actor: {act.adminId || 'System Admin'}</span>
                              <span>IP: {act.ipAddress || 'Internal'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Transactional Email Dispatch */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Transactional Email Dispatches
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSendUserEmail(selectedUser.id, 'approval')}
                    disabled={!!emailSending}
                    style={{ color: '#3730a3', backgroundColor: '#e0e7ff', borderColor: '#818cf8', fontWeight: 800 }}
                    className="py-2.5 px-3 rounded-xl text-[11px] font-extrabold border shadow-sm transition-all flex items-center justify-center gap-1.5 hover:opacity-90"
                  >
                    <Mail className="w-3.5 h-3.5" style={{ color: '#3730a3' }} /> Approval
                  </button>
                  <button
                    onClick={() => handleSendUserEmail(selectedUser.id, 'welcome')}
                    disabled={!!emailSending}
                    style={{ color: '#065f46', backgroundColor: '#d1fae5', borderColor: '#34d399', fontWeight: 800 }}
                    className="py-2.5 px-3 rounded-xl text-[11px] font-extrabold border shadow-sm transition-all flex items-center justify-center gap-1.5 hover:opacity-90"
                  >
                    <Send className="w-3.5 h-3.5" style={{ color: '#065f46' }} /> Welcome
                  </button>
                  <button
                    onClick={() => handleSendUserEmail(selectedUser.id, 'password_reset')}
                    disabled={!!emailSending}
                    style={{ color: '#92400e', backgroundColor: '#fef3c7', borderColor: '#fbbf24', fontWeight: 800 }}
                    className="py-2.5 px-3 rounded-xl text-[11px] font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5 hover:opacity-90"
                  >
                    <Key className="w-3.5 h-3.5" style={{ color: '#92400e' }} /> Reset Pass
                  </button>
                </div>
              </div>

              {/* User Profile & Business Details Suite */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    User Contact & Business Profile
                  </span>
                  <button
                    onClick={() => handleOpenEditProfile(selectedUser)}
                    className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-all flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> Edit Profile
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone Number:
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {selectedUser.phone || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" /> Organization / Company:
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {selectedUser.company || 'Not Provided'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-gray-400" /> Job Title & Dept:
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {selectedUser.job_title || 'N/A'} {selectedUser.department ? `(${selectedUser.department})` : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-gray-400" /> Country / Region:
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {selectedUser.country || 'Global'}
                    </span>
                  </div>
                  {selectedUser.bio && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-800/80">
                      <span className="text-gray-500 font-medium block mb-1">User Notes / Bio:</span>
                      <p className="text-[11px] text-gray-700 dark:text-gray-300 italic">{selectedUser.bio}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Internal Subscription Plan Assignment & Override */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Internal Subscription Plan Override
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    {selectedUser.billing_info?.planName || 'Free Guest Plan'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white outline-none"
                  >
                    <option value="free">Free / Guest Trial ($0 - 1 Prompt)</option>
                    <option value="starter">Starter Plan ($19/mo - 100K Tokens)</option>
                    <option value="professional">Professional Plan ($49/mo - 1M Tokens)</option>
                    <option value="enterprise">Enterprise AI OS ($199/mo - Unlimited)</option>
                  </select>
                  <button
                    onClick={() => handleAssignPlan(selectedUser.id, selectedPlanId)}
                    disabled={updatingPlan}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Zap className={`w-3.5 h-3.5 ${updatingPlan ? 'animate-spin' : ''}`} /> Assign Plan
                  </button>
                </div>
              </div>

              {/* System Knowledge & Data Identifiers */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  System Knowledge & Identifiers
                </span>

                <div className="bg-gray-50 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-200 dark:border-gray-800/60 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">User UUID:</span>
                    <code className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {selectedUser.id}
                    </code>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Tenant Workspace:</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      {selectedUser.tenant_name || 'Xarwiz Default Workspace'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Registration Date:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {new Date(selectedUser.created_at).toLocaleDateString()} ({new Date(selectedUser.created_at).toLocaleTimeString()})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Conversations History:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedUser.conversations_count || 0} chats ({selectedUser.messages_count || 0} messages)
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                {selectedUser.status === 'pending' ? (
                  <button
                    onClick={() => handleUpdateStatus(selectedUser.id, 'active')}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> ALLOW ACCESS
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      handleUpdateStatus(
                        selectedUser.id,
                        selectedUser.status === 'suspended' ? 'active' : 'suspended'
                      )
                    }
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm ${
                      selectedUser.status === 'suspended'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                  >
                    {selectedUser.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                  </button>
                )}
                <button
                  onClick={() => handleImpersonateUser(selectedUser.id)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Impersonate
                </button>
                <button
                  onClick={() => handleDeleteUser(selectedUser.id, selectedUser.email)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 shadow-sm bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-500" /> Edit Profile & Business Details
              </h3>
              <button onClick={() => setEditingProfile(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                    placeholder="+1 555-0199"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Company / Org</label>
                  <input
                    type="text"
                    value={profileForm.company}
                    onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={profileForm.job_title}
                    onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Country / Region</label>
                  <input
                    type="text"
                    value={profileForm.country}
                    onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">User Notes / Bio</label>
                <textarea
                  rows={2}
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5"
                >
                  {savingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Password Reset Modal */}
      {resetModalOpen && userForReset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Reset / Set Password
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Set a new password for <span className="font-semibold text-gray-800 dark:text-gray-200">{userForReset.email}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseResetModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Note banner */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              <div>
                <strong>Security Protection:</strong> The user's current password is stored as an irreversible bcrypt hash and cannot be viewed or retrieved. Setting a new password will immediately replace it.
              </div>
            </div>

            {/* If reset succeeded, show credentials summary box */}
            {resetResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" /> Password Successfully Updated!
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    The user's password has been updated and existing lockout flags were cleared.
                  </p>
                </div>

                {resetResult.tempPassword && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2">
                    <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      User Credentials
                    </div>
                    <div className="flex items-center justify-between text-xs font-mono bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-800">
                      <div>
                        <span className="text-gray-400">Email: </span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{userForReset.email}</span>
                        <br />
                        <span className="text-gray-400">Password: </span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{resetResult.tempPassword}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyCredentials(
                            `Email: ${userForReset.email}\nPassword: ${resetResult.tempPassword}`
                          )
                        }
                        className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center gap-1.5"
                      >
                        {copiedResetPassword ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    {forcePasswordChange && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> User will be prompted to change this password on next login.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 rounded-xl font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAdminPasswordReset} className="space-y-4 text-xs">
                {/* User info banner */}
                <div className="p-3 bg-gray-50 dark:bg-gray-950/60 rounded-xl border border-gray-200 dark:border-gray-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                      {userForReset.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">
                        {userForReset.name || userForReset.email}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {userForReset.tenant_name || 'Xarwiz Workspace'} · Role: {userForReset.role}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Generate Strong
                  </button>
                </div>

                {/* New Password Input */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    New Password (Min 12 characters, uppercase, lowercase, number, symbol)
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      minLength={12}
                      value={resetNewPassword}
                      onChange={(e) => {
                        setResetNewPassword(e.target.value);
                        setCopiedResetPassword(false);
                      }}
                      placeholder="Enter new password (min 12 chars)"
                      className="w-full pl-3 pr-20 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:border-amber-500 font-mono text-xs"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {resetNewPassword && (
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(resetNewPassword)}
                          title="Copy Password"
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
                        >
                          {copiedResetPassword ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        title={showResetPassword ? 'Hide password' : 'Show password'}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
                      >
                        {showResetPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Password Strength</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                      {computePasswordStrength(resetNewPassword).label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${computePasswordStrength(resetNewPassword).color}`}
                      style={{ width: computePasswordStrength(resetNewPassword).width }}
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password
                  </label>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white outline-none focus:border-amber-500 font-mono text-xs"
                  />
                  {resetConfirmPassword && resetNewPassword !== resetConfirmPassword && (
                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                      <AlertTriangle size={12} /> Passwords do not match
                    </p>
                  )}
                </div>

                {/* Security options checklist */}
                <div className="p-3 bg-gray-50 dark:bg-gray-950/40 rounded-xl border border-gray-200 dark:border-gray-800/60 space-y-2.5">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={forcePasswordChange}
                      onChange={(e) => setForcePasswordChange(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-gray-800 dark:text-gray-200 block">
                        Force user to change password on next login
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Restricts normal application access until the user creates a new private password.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={revokeSessionsOnReset}
                      onChange={(e) => setRevokeSessionsOnReset(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-gray-800 dark:text-gray-200 block">
                        Invalidate all existing user sessions
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Terminates active sessions across all browsers and devices immediately.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sendEmailNotice}
                      onChange={(e) => setSendEmailNotice(e.target.checked)}
                      className="mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <span className="font-bold text-gray-800 dark:text-gray-200 block">
                        Send email notification to user
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Alerts user that their password was updated (without sending plaintext passwords).
                      </span>
                    </div>
                  </label>
                </div>

                {/* Modal Actions */}
                <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleSendResetEmailLink}
                    disabled={sendingResetLink || submittingReset}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    {sendingResetLink ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Mail className="w-3 h-3" />
                    )}
                    Or email a self-service reset link
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCloseResetModal}
                      className="px-3.5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReset || !resetNewPassword || resetNewPassword.length < 12}
                      className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      {submittingReset ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Key className="w-3.5 h-3.5" />
                      )}
                      Set Password
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Temporary Password Generated Modal */}
      {tempPasswordModalOpen && userForTempPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Temporary Password Generated
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    User: <span className="font-semibold text-gray-800 dark:text-gray-200">{userForTempPassword.email}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTempPasswordModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatingTempPassword ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
                <p className="text-xs text-gray-500">Generating cryptographic temporary password...</p>
              </div>
            ) : generatedTempPassword ? (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <strong>One-Time Display Warning:</strong> This password is only shown right now and is never saved in plaintext. Copy it now to share with the user securely.
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 space-y-2 text-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Temporary Password
                  </span>
                  <div className="text-xl font-mono font-black text-purple-600 dark:text-purple-400 tracking-wider py-1 select-all">
                    {generatedTempPassword}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedTempPassword);
                      setCopiedTempPassword(true);
                      setTimeout(() => setCopiedTempPassword(false), 2500);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    {copiedTempPassword ? (
                      <>
                        <Check className="w-4 h-4" /> Password Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Password
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-950/40 rounded-xl border border-gray-200 dark:border-gray-800/60 text-[11px] text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                    <Lock className="w-3.5 h-3.5" /> Force password change on next login is enabled
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                    <LogOut className="w-3.5 h-3.5" /> Existing sessions have been invalidated
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempPasswordModalOpen(false);
                      setGeneratedTempPassword(null);
                    }}
                    className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 rounded-xl font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Sign Out All Sessions Modal */}
      {signOutModalOpen && userForSignOut && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Sign Out All Sessions
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Target: <span className="font-semibold text-gray-800 dark:text-gray-200">{userForSignOut.email}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300">
              Are you sure you want to terminate all active sessions for this user? This will revoke all refresh tokens and force immediate sign-out across all browsers and devices. Your own admin session will not be affected.
            </p>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSignOutModalOpen(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={signingOutSessions}
                onClick={handleConfirmSignOutSessions}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                {signingOutSessions ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogOut className="w-3.5 h-3.5" />
                )}
                Terminate All Sessions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Password Reset Link Modal */}
      {generatedResetLink && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Password Reset Link Ready
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Target User: <span className="font-semibold text-gray-800 dark:text-gray-200">{generatedResetLink.email}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGeneratedResetLink(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatedResetLink.emailSent ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <div>
                  Reset email successfully dispatched to <strong>{generatedResetLink.email}</strong>. The user can also use the direct link below.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <div className="flex items-start gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>Email delivery skipped (Provider not configured or API key invalid)</span>
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 pl-6">
                  {generatedResetLink.emailError || 'The email provider (Resend/SMTP) is not configured.'} You can copy the secure one-time link below and share it directly with the user.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                One-Time Password Reset Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedResetLink.url}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-800 dark:text-gray-200 select-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedResetLink.url);
                    alert('Password reset link copied to clipboard!');
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                This link is valid for 1 hour and can only be used once.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <a
                href="/admin/emails"
                target="_blank"
                className="text-xs text-indigo-500 hover:underline flex items-center gap-1 font-semibold"
              >
                Configure Email Settings
              </a>
              <button
                type="button"
                onClick={() => setGeneratedResetLink(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
