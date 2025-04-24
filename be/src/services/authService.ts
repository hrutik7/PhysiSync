import { PrismaClient } from "@prisma/client";
import * as express from "express";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Define valid roles based on your schema
const VALID_ROLES = ['CLINIC', 'CORPORATE', 'INDIVIDUAL'];

export class AuthService {
    private readonly JWT_SECRET = process.env.JWT || 'your-secret-key';

    async register(data: { 
        name: string; 
        email: string; 
        password: string; 
        contact: string; 
        role: string; 
        doctorName: string;
        subRole?: string;
        hospitalDetails?: {
            name: string;
            address: string;
            contact: string;
            email?: string;
        };
    }) {
        const { 
            name, 
            email, 
            password, 
            contact, 
            role, 
            doctorName,
            subRole, 
            hospitalDetails 
        } = data;

        // Validate role
        if (!VALID_ROLES.includes(role)) {
            throw new Error('Invalid role. Must be CLINIC, CORPORATE, or INDIVIDUAL');
        }

        // For CLINIC role, require hospital details
        if (role === 'CLINIC' && !hospitalDetails) {
            throw new Error('Hospital details are required for CLINIC role');
        }

        // Check if the user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user with transaction to ensure data consistency
        return prisma.$transaction(async (tx) => {
            // Create the user
            const newUser = await tx.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    contact,
                    role,
                    DoctorName: doctorName, // Required field from schema
                    subRole: subRole || null,
                },
            });

            // If role is CLINIC, create hospital record
            if (role === 'CLINIC' && hospitalDetails) {
                await tx.hospoital.create({
                    data: {
                        name: hospitalDetails.name,
                        address: hospitalDetails.address,
                        contact: hospitalDetails.contact,
                        email: hospitalDetails.email || null,
                        password: hashedPassword, // Using same password as user
                        doctor: {
                            connect: {
                                id: newUser.id
                            }
                        }
                    }
                });
            }

            // Generate a JWT token
            const token = this.generateToken(newUser.id, newUser.role);

            // Return user (without password) and token
            const { password: _, ...userWithoutPassword } = newUser;
            return { user: userWithoutPassword, token };
        });
    }

    async login(data: { email: string; password: string; }) {
        const { email, password } = data;

        // Find the user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });
        
        if (!user) {
            throw new Error('User not found');
        }

        // Compare the provided password with the hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid password');
        }

        // Generate a JWT token
        const token = this.generateToken(user.id, user.role);

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return { token, user: userWithoutPassword };
    }

    private generateToken(userId: string, role: any): string {
        return jwt.sign({ userId, role }, this.JWT_SECRET);
    }
}