export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Where “Enter facility” sends internal admins (production Helix admin sign-in). */
export const HELIX_ADMIN_FACILITY_ENTRY_URL = (
    process.env.NEXT_PUBLIC_HELIX_ADMIN_FACILITY_ENTRY_URL || 'https://admin.helixhealth.app/internal/login'
).replace(/\/+$/, '');

/** Full URL to open a facility in Helix admin (`facility_id` for post-login / deep-link handling). */
export function getHelixAdminFacilityEntryUrl(facilityId: string): string {
    try {
        const u = new URL(HELIX_ADMIN_FACILITY_ENTRY_URL);
        u.searchParams.set('facility_id', facilityId);
        return u.toString();
    } catch {
        const sep = HELIX_ADMIN_FACILITY_ENTRY_URL.includes('?') ? '&' : '?';
        return `${HELIX_ADMIN_FACILITY_ENTRY_URL}${sep}facility_id=${encodeURIComponent(facilityId)}`;
    }
}

export const API_ENDPOINTS = {
  // Auth endpoints - use local proxy to avoid CORS
  LOGIN: `/api/proxy/auth/login`,
  /** Internal platform admin — password then optional email OTP. */
  INTERNAL_LOGIN: `/api/proxy/auth/internal/login`,
  INTERNAL_VERIFY_OTP: `/api/proxy/auth/internal/verify-otp`,
  /** @deprecated Facility admin OTP flow; internal admin does not use OTP. */
  ADMIN_LOGIN: `/api/proxy/auth/admin/login`,
  LOGOUT: `/api/proxy/auth/logout`,
  CHANGE_PASSWORD: `/api/proxy/auth/change-password`,
  RENEW: `/api/proxy/auth/renew`,
  REQUEST_RESET: `/api/proxy/auth/request-reset`,
  RESET_PASSWORD: `/api/proxy/auth/reset-password`,
  SEND_OTP: `/api/proxy/auth/send-otp`,
  VERIFY_OTP: `/api/proxy/auth/admin/verify-otp`,
  ADMIN_VERIFY_OTP: `/api/proxy/auth/admin/verify-otp`,
  SETUP: `/api/proxy/auth/setup`,
  SETUP_PREFILL: `/api/proxy/auth/setup-prefill`,
  ADMIN_RESET: (staffId: string) => `/api/proxy/auth/admin-reset/${staffId}`,
  AUTH_ME: `/api/proxy/auth/me`,
  AUTH_USER: `/api/proxy/auth/user`,
  AUTH_SETTINGS: `/api/proxy/auth/settings`,
  AUTH_SESSIONS: `/api/proxy/auth/sessions`,
  AUTH_SESSION: (sessionId: string) => `/api/proxy/auth/sessions/${sessionId}`,

  // Departments
  DEPARTMENTS: `/api/proxy/departments`,
  DEPARTMENT: (id: string) => `/api/proxy/departments/${id}`,
  DEPARTMENT_WARDS: (id: string) => `/api/proxy/departments/${id}/wards`,

  // Hospital
  HOSPITAL: `/api/proxy/hospital`,
  FACILITIES: `/api/proxy/facilities`,
  FACILITY: (id: string) => `/api/proxy/facilities/${id}`,

  // Roles
  ROLES: `/api/proxy/roles`,
  ROLE: (id: string) => `/api/proxy/roles/${id}`,
  ROLE_SIGN_IN_USER: (id: string) => `/api/proxy/roles/${id}/sign-in-user`,

  // Escalation Policies
  ESCALATION_POLICIES: `/api/proxy/escalation-policies`,
  ESCALATION_POLICY: (id: string) => `/api/proxy/escalation-policies/${id}`,
  ESCALATION_POLICY_BY_ROLE: (roleId: string) => `/api/proxy/escalation-policies/by-role/${roleId}`,
  ESCALATION_POLICY_STEPS: (id: string) => `/api/proxy/escalation-policies/${id}/steps`,
  ESCALATION_POLICY_STEPS_BULK: (id: string) => `/api/proxy/escalation-policies/${id}/steps/bulk`,
  ESCALATION_POLICY_STEP: (id: string, stepId: string) => `/api/proxy/escalation-policies/${id}/steps/${stepId}`,

  // Internal metrics
  INTERNAL_FACILITIES_METRICS: `/api/proxy/internal/facilities/metrics`,
  INTERNAL_AUDIT_LOGS: `/api/proxy/internal/audit-logs`,
};
