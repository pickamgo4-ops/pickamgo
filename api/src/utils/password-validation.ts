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

export function validatePasswordOrThrow(password: string): void {
  const result = validatePassword(password);
  if (!result.isValid) {
    const issues: string[] = [];
    if (!result.minLength) issues.push("at least 8 characters");
    if (!result.hasUpperCase) issues.push("one uppercase letter");
    if (!result.hasNumber) issues.push("one number");
    if (!result.hasSpecialChar) issues.push("one special character (!@#$%^&*)");
    throw new Error(`Password must contain ${issues.join(", ")}`);
  }
}
