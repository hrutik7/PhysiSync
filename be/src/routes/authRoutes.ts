import * as express from "express";
import { AuthService } from "../services/authService";

const router = express.Router();
const authService = new AuthService();

// Define valid roles based on your schema
const VALID_ROLES = ['CLINIC', 'CORPORATE', 'INDIVIDUAL'];

router.get('/', (req, res) => {
    res.send('Hello from auth');
});

router.post('/register', async (req, res) => {
    console.log("Registration request received");
    try {
        const { 
            name, 
            email, 
            password, 
            contact, 
            role, 
            doctorName,
            subRole, 
            hospitalDetails 
        } = req.body;

        // Validate required fields
        if (!name || !email || !password || !contact || !role || !doctorName) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate role 
        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: 'Invalid role. Must be CLINIC, CORPORATE, or INDIVIDUAL' });
        }

        // Validate CLINIC-specific fields
        if (role === 'CLINIC' && (!hospitalDetails || !hospitalDetails.name || !hospitalDetails.address || !hospitalDetails.contact)) {
            return res.status(400).json({ error: 'Hospital details are required for CLINIC role' });
        }

        const result = await authService.register({
            name,
            email,
            password,
            contact,
            role,
            doctorName,
            subRole,
            hospitalDetails
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('Error registering user:', error);
        
        // Better error handling with specific messages
        if (error instanceof Error) {
            if (error.message === 'User already exists') {
                return res.status(409).json({ error: 'User with this email already exists' });
            }
        }
        
        res.status(500).json({ error: 'Error registering user' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const result = await authService.login({ email, password });
        res.status(200).json(result);
    } catch (error) {
        console.error('Error logging in:', error);
        
        // Better error handling with specific messages
        if (error instanceof Error) {
            if (error.message === 'User not found') {
                return res.status(404).json({ error: 'User not found' });
            } else if (error.message === 'Invalid password') {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }
        
        res.status(500).json({ error: 'Error logging in' });
    }
});

export default router;