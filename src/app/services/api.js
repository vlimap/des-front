import { API_BASE_URL, getStoredAuthToken } from '@/app/config/runtime';

class ApiClientError extends Error {
  constructor(message, statusCode, data) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

const parseJsonResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

const buildHeaders = ({ auth = false, json = true, headers = {} } = {}) => {
  const finalHeaders = new Headers(headers);

  if (json && !finalHeaders.has('Content-Type')) {
    finalHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getStoredAuthToken();
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`);
  }

  return finalHeaders;
};

const apiRequest = async (path, { method = 'GET', body, auth = false, json = true, headers } = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: buildHeaders({ auth, json, headers }),
    body,
  });

  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new ApiClientError(data.error || 'request_failed', response.status, data);
  }

  return data;
};

export const createJob = async (jobData) =>
  apiRequest('/jobs', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(jobData),
  });

export const getCompanyJobs = async (companyId) =>
  apiRequest(`/jobs/company/${companyId}`, { auth: true });

export const getAllJobs = async () =>
  apiRequest('/jobs');

export const updateJob = async (jobId, jobData) =>
  apiRequest(`/jobs/${jobId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(jobData),
  });

export const deleteJob = async (jobId) =>
  apiRequest(`/jobs/${jobId}`, {
    method: 'DELETE',
    auth: true,
  });

export const applyToJob = async (applicationData) =>
  apiRequest('/applications', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(applicationData),
  });

export const getCompanyApplications = async (companyId) =>
  apiRequest(`/applications/company/${companyId}`, { auth: true });

export const updateApplicationStatus = async (applicationId, status) =>
  apiRequest(`/applications/${applicationId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify({ status }),
  });

export const approveApplication = async (applicationId) => updateApplicationStatus(applicationId, 'approved');
export const rejectApplication = async (applicationId) => updateApplicationStatus(applicationId, 'rejected');

export const deleteApplication = async (applicationId) =>
  apiRequest(`/applications/${applicationId}`, {
    method: 'DELETE',
    auth: true,
  });

export const uploadResume = async (file) => {
  if (!file) throw new Error('file_required');

  const body = await file.arrayBuffer();
  return apiRequest('/upload-resume', {
    method: 'POST',
    auth: true,
    json: false,
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-filename': file.name || 'curriculum.pdf',
    },
    body,
  });
};

export const requestPasswordReset = async (email) =>
  apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const resetPassword = async ({ userId, email, code, password }) =>
  apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ userId, email, code, password }),
  });

export const getUserProfile = async (userId) =>
  apiRequest(`/users/${userId}`, { auth: true });

export const updateUserProfile = async (userId, payload) =>
  apiRequest(`/users/${userId}`, {
    method: 'PUT',
    auth: true,
    body: JSON.stringify(payload),
  });

export const getSecurityStatus = async (userId) =>
  apiRequest(`/auth/security/${userId}`, { auth: true });

export const requestEmailVerification = async (payload) =>
  apiRequest('/auth/request-email-verification', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const verifyEmail = async (payload) =>
  apiRequest('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const requestOtp = async (payload) =>
  apiRequest('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const verifyOtp = async (payload) =>
  apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const setupTwoFactor = async (payload) =>
  apiRequest('/auth/otp/setup', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });

export const verifyTwoFactor = async (payload) =>
  apiRequest('/auth/otp/enable', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });

export const disableTwoFactor = async (payload) =>
  apiRequest('/auth/otp/disable', {
    method: 'POST',
    auth: true,
    body: JSON.stringify(payload),
  });

export { ApiClientError, API_BASE_URL };
