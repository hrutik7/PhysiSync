![github-submission-banner](https://github.com/user-attachments/assets/a1493b84-e4e2-456e-a791-ce35ee2bcf2f)

# 🚀 PhysiSync

> Your Clinic’s AI Co-Pilot for Better Patient Outcomes.

---

## 📌 Problem Statement

**Problem Statement 1 – Weave AI magic with Groq**

---

## 🎯 Objective
Now-a-days , Due to long sitting hours Lower back pain and neck pain is becoming very common which may lead to some serious issues like slip disk 💀


![image](https://github.com/user-attachments/assets/314e4eed-8067-4044-bfe6-6b5c71e48e9a)


so patient visit physiotherapy clinics .
Most patients abandon physiotherapy once the pain reduces, leading to frequent relapses and ineffective recovery. Clinics lack real-time tools to guide, monitor, and motivate patients beyond appointments.

What It Solves:

✅ Eliminates manual data entry with real-time transcription during diagnosis.

✅ Converts doctor’s advice into digital, personalized care plans.

✅ Sends WhatsApp reminders to ensure patients follow through.

✅ Offers a 24/7 virtual physiotherapist for ongoing support and correction.

✅ Reduces relapses and boosts clinic efficiency through intelligent automation.

In short: It turns passive recovery into active healing — continuously, personally, and intelligently.

---


### Your Approach:  

### Why We Chose This Problem

We noticed a recurring pattern in physiotherapy — patients often stop their rehab midway once the pain reduces. This leads to relapses, wasted clinic effort, and incomplete recovery. Simultaneously, physiotherapists spend too much time on manual data entry during appointments instead of focusing on the patient. We saw an opportunity to reimagine the physio experience using voice, AI, and automation.

### Key Challenges We Addressed

- Eliminating manual SOAP note-taking via real-time voice transcription (using Whisper + Groq).

- Building a virtual physiotherapy assistant that guides and corrects posture using MediaPipe.

- Delivering WhatsApp-based care reminders for patients post-visit.

- Creating a personalized care flow without needing the physio to touch a computer.

- Making sure it's HIPAA-compliant and encrypted by design.

### Pivots, Brainstorms & Breakthroughs

- Initially, we tried sensor-based posture correction, but quickly pivoted to MediaPipe due to accessibility and scalability.

- Realized that transcription accuracy was key — we moved to Groq’s ultra-fast inference with Whisper, which significantly improved speed and usability.

- Focused on reducing patient dropouts by introducing gamified, scheduled stretches and clinic-branded AI assistants.

Used voice-first design so physiotherapists can focus on healing, not screens.

---

## 🛠️ Tech Stack

### Core Technologies Used:
- Frontend: react js , tailwind , shadcn e.t.c
- Backend: nodejs , express , prisma ORM
- Database: postgress 
- APIs: groq , web speech , vapi , twillio , e.t.c
- Hosting: vercel , railway 

### Sponsor Technologies Used (if any):
- [✅ ] **Groq:** _How you used Groq_  
- [ ] **Monad:** _Your blockchain implementation_  
- [ ] **Fluvio:** _Real-time data handling_  
- [ ] **Base:** _AgentKit / OnchainKit / Smart Wallet usage_  
- [ ] **Screenpipe:** _Screen-based analytics or workflows_  
- [ ] **Stellar:** _Payments, identity, or token usage_

---

## ✨ Key Features

- ✅ Virtual physio assistant
  ![image](https://github.com/user-attachments/assets/27a0f5d3-2f3a-4704-bec0-fdca1db4d985)
  
- ✅ realtime voice assistant
  ![Screenshot 2025-04-24 203844](https://github.com/user-attachments/assets/95952971-ebed-4bf0-91c8-10a42b7ce534)

- ✅ patient recovery dashboard
  ![Screenshot 2025-04-24 203916](https://github.com/user-attachments/assets/90ba5cff-960b-40c6-a1bb-013261fed1b7)

- ✅  voice based EHR ( patient diagnosis record system )
  ![Screenshot 2025-04-24 203959](https://github.com/user-attachments/assets/19d110a1-3a38-4505-a132-183c22f8c4ad)


---

## 📽️ Demo & Deliverables

- **Demo Video Link:** [demo](https://www.youtube.com/watch?v=4Oyn7u9E0UM)  
- **Pitch Deck / PPT Link:** [PPT](https://www.canva.com/design/DAGljRD_Css/slmX0EE4sTTh4PCHdZ056w/view#1)
- **Product Demo Link:** : [doctor portal](https://app.physisync.com)

   [patient portal](https://ai.physisync.com)
  
credentials for doctor :
Email : ram@gmail.com
password : ram@123

right now auth is not set for patient  : you just have to click on sign in 
---

## ✅ Tasks & Bonus Checklist

- [ ✅] **All members of the team completed the mandatory task - Followed at least 2 of our social channels and filled the form** (Details in Participant Manual)  
- [✅ ] **All members of the team completed Bonus Task 1 - Sharing of Badges and filled the form (2 points)**  (Details in Participant Manual)
- [ ✅] **All members of the team completed Bonus Task 2 - Signing up for Sprint.dev and filled the form (3 points)**  (Details in Participant Manual)


---

## 🧪 How to Run the Project

### Requirements:
- Node.js 
- API Keys (
-  if any)
- .env
env for backend

```bash
# Connect to Supabase via connection pooling.
DATABASE_URL=""
JWT_SECRET="your-super-secret-key-here"
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
db_pass = 
PORT = 3000
VITE_API_URL=http://localhost:3000
```

env for frontend

```bash
VITE_API_BASE_URL= 
VITE_GROQ_API_URL=
VITE_GROQ_API_KEY=
```

### Local Setup:

```bash
# Clone the repo
git clone https://github.com/hrutik7/PhysiSync

# frontend
# Install dependencies
cd fe
npm install
npm run dev

# backend
# Install dependencies
cd be
npm install
npm run dev

# patient portal
# Install dependencies
cd postal-pal-assistant
npm install
npm run dev

```


---

## 🧬 Future Scope

( PhysiSync is out for beta test on 4 physio clinics )

-  More exercise libraries  
-  Android and IOS app for patient beacuse of smooth ux   


---

## 📎 Resources / Credits

- mediapipe  
- vapi , 11venlabs  
- groq (backbone of physisync) , llama
- twillio
- neon.tech
-   

---

## 🏁 Final Words

Big shoutout to groq I was looking for something similar while building my project that namespace community 🫂 for organnising this event and introducing me to groq

---
