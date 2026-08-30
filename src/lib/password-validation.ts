export interface PasswordRequirements {
  minLength: boolean;
  hasUpperCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export interface PasswordValidationResult extends PasswordRequirements {
  isValid: boolean;
}

export function validatePassword(password: string): PasswordValidationResult {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);

  return {
    minLength,
    hasUpperCase,
    hasNumber,
    hasSpecialChar,
    isValid: minLength && hasUpperCase && hasNumber && hasSpecialChar,
  };
}
