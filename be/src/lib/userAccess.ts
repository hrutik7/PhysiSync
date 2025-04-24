// src/lib/userAccess.ts

import { PrismaClient } from '@prisma/client';

// Define Role type manually
type Role = 'CLINIC' | 'CORPORATE' | 'INDIVIDUAL';
const prisma = new PrismaClient();

/**
 * Get user data with role-specific relations
 * @param userId User ID
 * @param role User role (CLINIC, CORPORATE, INDIVIDUAL)
 */
export async function getUserWithRoleData(userId: string, role: Role) {
  // Base user fields to include for all roles
  const baseInclude = {
    // Common data all roles need
    patients: true,
  };
  
  // Role-specific includes
  const roleSpecificIncludes = {
    CLINIC: {
      hospital: true,
      interventiondiagnosis: true,
      interventiontreatmentencounter: true,
      interventiongoals: true,
      interventiontreatmentprotocols: true,
      interventiontreatmentprotocol: true,
      investigationpatient: true,
      history: true,
      chiefcomplaint: true,
      painsevirity: true,
      examination: true,
      motorexamination: true,
      sensoryexamination: true,
      pediatric: true,
      subjective: true,
      objective: true,
      assesment: true,
      plan: true,
      AXtemplate: true,
      CustomAX: true,
      Intervention: true,
      axhipAssesment: true,
      axkneeAssesment: true,
      axShoulderAssesment: true,
      axFootAssesment: true,
    },
    CORPORATE: {
      // Add corporate-specific relations here
      Intervention: true,
      // Other fields that make sense for corporate users
    },
    INDIVIDUAL: {
      // Add individual-specific relations here
      // For example, maybe they only need access to their own data:
      history: true,
      painsevirity: true,
      // Other fields that make sense for individual users
    }
  };

  // Combine base includes with role-specific includes
  const includeOptions = {
    ...baseInclude,
    ...roleSpecificIncludes[role]
  };

  // Fetch user with appropriate relations
  return prisma.user.findUnique({
    where: { id: userId },
    include: includeOptions,
  });
}

/**
 * Check if user has access to specific data type
 * @param role User role
 * @param dataType Type of data being accessed
 */
export function canAccessData(role: Role, dataType: string): boolean {
  // Define permissions for each role
  const permissions = {
    CLINIC: [
      'hospital', 'interventiondiagnosis', 'interventiontreatmentencounter',
      'interventiongoals', 'interventiontreatmentprotocols',
      'interventiontreatmentprotocol', 'investigationpatient', 'history',
      'chiefcomplaint', 'painsevirity', 'examination', 'motorexamination',
      'sensoryexamination', 'pediatric', 'subjective', 'objective',
      'assesment', 'plan', 'AXtemplate', 'CustomAX', 'Intervention',
      'patients', 'axhipAssesment', 'axkneeAssesment', 'axShoulderAssesment',
      'axFootAssesment'
    ],
    CORPORATE: [
      'patients', 'Intervention'
      // Add more permissions as needed
    ],
    INDIVIDUAL: [
      'history', 'painsevirity'
      // Add more permissions as needed
    ]
  };

  return permissions[role].includes(dataType);
}

/**
 * Example usage in an API endpoint for fetching patient data
 */
// In your API route:

export default async function handler(req:any, res:any) {
  const userId = req.query.userId;
  const userRole = req.user.role; // From your auth middleware
  
  if (!canAccessData(userRole, 'patients')) {
    return res.status(403).json({ message: 'Access denied' });
  }
  
  // Continue with fetching data...
}
