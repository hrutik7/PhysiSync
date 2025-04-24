export const UserRoles = {
  CLINIC: 'CLINIC',
  PHARMACY: 'PHARMACY'
} as const;

export type UserRole = typeof UserRoles[keyof typeof UserRoles]; 