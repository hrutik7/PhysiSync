import express from 'express';
import https from 'https';
import fs from 'fs';
import { Server } from 'socket.io';
import cors from 'cors';
import addPatientRoutes from './src/routes/addPatientRoutes';
import authRoutes from './src/routes/authRoutes';
import soapRotes from './src/routes/soapRoutes'
import axRoutes from './src/routes/axRoutes';
import customRoutes from './src/routes/customRoutes';
import investigateRoutes from './src/routes/investigateRoutes';
import interventionRoutes from './src/routes/interventionRoutes';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import schedule from 'node-schedule';
import moment from 'moment-timezone';
import  aiRoutes  from './src/routes/aiRoutes';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const app = express();
// const port = 3000;


interface ScheduledMessage {
  time: string;
  recipient: string;
  message: string;
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const PORT  = process.env.PORT || 3000;
// SSL configuration
const options = {
  key: fs.readFileSync('./localhost+3-key.pem'),
  cert: fs.readFileSync('./localhost+3.pem')
};

interface ScheduledMessage {
  time: string;
  recipient: string;
  message: string;
}

// Create a message scheduler module (add this before routes)
const setupWhatsAppScheduler = () => {
  const scheduledJobs = new Map();

  const sendMessage = async (recipient: string, message: string) => {
    try {
      const result = await twilioClient.messages.create({
        body: message,
        from: 'whatsapp:+14155238886', // Your Twilio number
        to: `whatsapp:${recipient}`
      });
      console.log(`Message sent to ${recipient}: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return false;
    }
  };

  const scheduleMessages = (messages: ScheduledMessage[]) => {
    messages.forEach(({ time, recipient, message }) => {
      const jobDate = moment.tz(time, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata').toDate();
      const job = schedule.scheduleJob(jobDate, async () => {
        await sendMessage(recipient, message);
        scheduledJobs.delete(recipient + time);
      });
      
      scheduledJobs.set(recipient + time, job);
      console.log(`Scheduled message for ${recipient} at ${jobDate}`);
    });
  };

  return {
    scheduleMessages,
    cancelAllJobs: () => {
      scheduledJobs.forEach(job => job.cancel());
      scheduledJobs.clear();
    }
  };
};

// Initialize the scheduler (add this after middleware setup)
const whatsAppScheduler = setupWhatsAppScheduler();

// Enhanced request logging with device info
const requestLogger = (req :any, res:any, next:any) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.headers['user-agent'];
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  console.log(`User Agent: ${userAgent}`);
  next();
};

// const setupWhatsAppScheduler = () => {
//   const scheduledJobs = new Map();

//   const sendMessage = async (recipient: string, message: string) => {
//     try {
//       const result = await twilioClient.messages.create({
//         body: message,
//         from: 'whatsapp:+14155238886', // Your Twilio number
//         to: `whatsapp:${recipient}`
//       });
//       console.log(`Message sent to ${recipient}: ${result.sid}`);
//       return true;
//     } catch (error) {
//       console.error('Failed to send WhatsApp message:', error);
//       return false;
//     }
//   };

//   const scheduleMessages = (messages: ScheduledMessage[]) => {
//     messages.forEach(({ time, recipient, message }) => {
//       const jobDate = moment.tz(time, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata').toDate();
//       const job = schedule.scheduleJob(jobDate, async () => {
//         await sendMessage(recipient, message);
//         scheduledJobs.delete(recipient + time);
//       });
      
//       scheduledJobs.set(recipient + time, job);
//       console.log(`Scheduled message for ${recipient} at ${jobDate}`);
//     });
//   };

//   return {
//     scheduleMessages,
//     cancelAllJobs: () => {
//       scheduledJobs.forEach(job => job.cancel());
//       scheduledJobs.clear();
//     }
//   };
// };

// Initialize the scheduler (add this after middleware setup)
// const whatsAppScheduler = setupWhatsAppScheduler();



// CORS configuration with explicit headers
const corsOptions = {

  origin: ["https://ai.physisync.com", "http://localhost:5173","https://app.physisync.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(requestLogger);
app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }))
// Required for Railway's proxy
app.set('trust proxy', 1);
app.use("/auth",authRoutes)
// Test endpoint for connection verification
app.get("/test", (req, res) => {
  res.json({
    status: "ok",
    message: "Server is reachable",
    userAgent: req.headers['user-agent']
  });
});
app.use("/investigate",investigateRoutes)
app.use("/add",addPatientRoutes)
app.use("/custom",customRoutes)
app.use("/soap",soapRotes)
app.use("/ax", axRoutes);
app.use("/ai",aiRoutes)

app.use('/intervention', interventionRoutes);
// Your existing routes...
app.get("/api", (req, res) => {
  res.send("Hello from hrutik");
});
app.post('/schedule-messages', (req, res) => {
  try {
    const messages: ScheduledMessage[] = req.body;
    
    // Basic validation
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Expected array of messages' });
    }

    whatsAppScheduler.scheduleMessages(messages);
    res.json({ 
      status: 'scheduled',
      count: messages.length,
      scheduledAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error scheduling messages:', error);
    res.status(500).json({ error: 'Failed to schedule messages' });
  }
});
app.post('/add-patient', (req, res) => {
  console.log('Received add-patient request:', req.body);
  const { name, age, gender, contact, referral, aadhar } = req.body;

  if (!name || !age || !gender || !contact || !aadhar) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  const newPatient = { 
    // id: Date.now(), 
    name, 
    age, 
    gender, 
    contact, 
    referral, 
    aadhar,
    timestamp: new Date().toISOString()
  };

  console.log('New patient added:', newPatient);
  res.status(201).json(newPatient);
});

// Add a new route for scheduling messages (add this with your other routes)
app.post('/schedule-messages', (req, res) => {
  console.log('Received body:', req.body);
  try {
    const messages: ScheduledMessage[] = req.body;
    
    // Basic validation
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Expected array of messages' });
    }

    whatsAppScheduler.scheduleMessages(messages);
    res.json({ 
      status: 'scheduled',
      count: messages.length,
      scheduledAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error scheduling messages:', error);
    res.status(500).json({ error: 'Failed to schedule messages' });
  }
});

const server = https.createServer(options, app);

// Enhanced Socket.io configuration for mobile compatibility
const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowUpgrades: true,
  cookie: false,
  connectTimeout: 45000,
  // Add explicit transport options
  allowEIO3: true,
  maxHttpBufferSize: 1e8,
  path: '/socket.io'
});

// Enhanced connection handling with device detection
io.on('connection', (socket) => {
  const userAgent :any= socket.handshake.headers['user-agent'];
  const isMobile = /Mobile|Android|iPhone/i.test(userAgent);
  
  console.log('New connection details:', {
    socketId: socket.id,
    clientIp: socket.handshake.address,
    transport: socket.conn.transport.name,
    isMobile: isMobile,
    userAgent: userAgent
  });

  // Send immediate acknowledgment to client
  socket.emit('connection-ack', { 
    status: 'connected',
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  socket.on('add-patient', (patientData) => {
    console.log('Received add-patient event:', patientData);
    try {
      socket.broadcast.emit('patient-added', patientData);
      // Send acknowledgment back to sender
      socket.emit('patient-add-ack', {
        status: 'success',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error broadcasting patient data:', error);
      socket.emit('error', {
        message: 'Failed to broadcast patient data',
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected:`, {
      socketId: socket.id,
      reason: reason,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('error', (error) => {
    console.error('Socket error:', {
      socketId: socket.id,
      error: error,
      timestamp: new Date().toISOString()
    });
  });
});

// Enhanced error handling for the server
server.on('error', (err:any) => {
  console.error('Server error:', {
    error: err.message,
    code: err.code,
    timestamp: new Date().toISOString()
  });
});

// Start server with enhanced logging
// server.listen(Number(PORT), '0.0.0.0', () => {
//   console.log(`Server started at ${new Date().toISOString()}`);
//   console.log(`HTTPS server: https://100.120.140.24:${PORT}}`);
//   console.log(`WebSocket server: wss://100.120.140.24:${PORT}`);
//   console.log('Server configuration:', {
//     corsOrigins: corsOptions.origin,
//     transports: ['websocket', 'polling'],
//     pingTimeout: 60000,
//     pingInterval: 25000
//   });
app.listen(PORT, () => {
  console.log(`Server started at ${new Date().toISOString()}`);
  console.log(`HTTPS server: https://localhost:${PORT}`);
  console.log(`WebSocket server: ws://localhost:${PORT}`);
  console.log('Server configuration:', {
    corsOrigins: corsOptions.origin,
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  process.on('SIGTERM', () => {
    whatsAppScheduler.cancelAllJobs();
    server.close();
  });

  process.on('SIGINT', () => {
    whatsAppScheduler.cancelAllJobs();
    server.close();
  });

});
