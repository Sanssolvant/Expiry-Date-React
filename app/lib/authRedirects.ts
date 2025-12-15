export const AUTH_REDIRECTS = {
  
  FORGOT_PASSWORD_SUCCESS: '/?status=forgot-password',
  PASSWORD_RESET_SUCCESS: '/?status=password-reset',

  ERROR_INVALID_CREDENTIALS: '/?error=invalid-credentials',
  ERROR_EMAIL_NOT_VERIFIED: '/?error=email-not-verified',
  ERROR_USER_ALREADY_EXISTS: '/?error=user-already-exists',

  REGISTER_SUCCESS: '/?status=registered',
  REGISTER_ERROR_USER_ALREADY_EXISTS: '/register?error=user-already-exists',
  REGISTER_GENERIC_ERROR: '/register?error=register-failed',

  ERROR_GENERIC: '/?error=unknown',
};
