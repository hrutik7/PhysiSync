import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
// import { RadioGroup, RadioGroupItem } from "./ui/radio-group"; // Not used in provided custom forms
import { Checkbox } from "./ui/checkbox";
import { Mic, MicOff, Loader2, Edit2, Trash2, PlusCircle } from "lucide-react"; // Added PlusCircle
import { toast } from "sonner";
import axios from "axios";
import Activepatient from "./activepatient";
import { Table, TableHeader, TableBody, TableCell, TableRow, TableHead } from "./ui/table";
// Optional: Import Dialog components if adding manual entry via dialog
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "./ui/dialog";

// Assume these are correctly configured
const API_URL = import.meta.env.VITE_API_BASE_URL;
const GROQ_API_URL = import.meta.env.VITE_GROQ_API_URL;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const groqApi = axios.create({
  baseURL: GROQ_API_URL,
  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`
    // Content-Type will be set by axios for JSON or FormData as needed
  }
});

type SOAPNoteType = "subjective" | "objective" | "assessment" | "plan";

interface SOAPNote {
  id: number;
  date: string;
  type: SOAPNoteType;
  content: string;
}

// Helper to get doctorId safely
const getDoctorId = (): number | null => {
  try {
    const userData = localStorage.getItem("userData");
    if (!userData) return null;
    const parsedData = JSON.parse(userData);
    return parsedData?.user?.id || null;
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
    return null;
  }
};

const Consultation = () => {
  // --- Voice recording states ---
  const [isRecording, setIsRecording] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [transcription, setTranscription] = useState<string>(""); // Keep for potential display if needed later
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // --- SOAP states ---
  const [soapNotes, setSOAPNotes] = useState<SOAPNote[]>([]);
  const [activeSoapSubTab, setActiveSoapSubTab] = useState<SOAPNoteType>("subjective"); // Track active S-O-A-P sub-tab
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // --- Patient state ---
  const [patientId, setPatientId] = useState<string>("");
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);

  // --- Custom assessment states (Ensure these are updated by `analyzeAndSaveData`) ---
  const [painForm, setPainForm] = useState({ painsevirity: 1, painDiurnal: "none", date: "", painsite: "", painnature: "", painonset: "", painduration: "", painside: "", paintrigger: "", painadl: "", painAggravating: "", painRelieving: "" });
  const [historyForm, setHistoryForm] = useState({ age: "", gender: "", occupation: "", previosmedicalconditions: "", previossurgery: "", currentmedication: "", medications: "", physicalactivitylevel: "", sleeppattern: "", smoking: "", });
  const [chiefComplaintsForm, setChiefComplaintsForm] = useState({ primarycomplaint: "", onset: "", duration: "", assosiatedsymtom: "", stiffness: false, weakness: false, numbness: false, tingling: false, swelling: false });
  const [examinationForm, setExaminationForm] = useState({ posture: "", gaitpattern: "", flexion: "", extension: "", lateralflexionleft: "", lateralflexionright: "", rotationright: "", rotationleft: "" });
  const [motorForm, setMotorForm] = useState({ shoulderflexer: "", shoulderextensors: "", elbowflexer: "", elbowextensors: "", wristflexer: "", wristextensors: "", hipflexer: "", hiprextensors: "", kneeflexer: "", kneeextensors: "", ankleextensors: "", ankleflexer: "", muscletone: "" });
  const [sensoryForm, setSensoryForm] = useState({ touchsensation: "", painsensation: "", tempraturesensation: "", positivesense: "", vibrationsense: "" });
  const [pediatricForm, setPediatricForm] = useState({ grossmotorskills: "", finemotorskills: "", primitivereflex: "", posturalreflex: "", balanceandcoord: "" });

  // --- Get patient info from localStorage ---
  useEffect(() => {
    const storedPatient = localStorage.getItem("activePatient");
    if (storedPatient) {
      try {
        const parsedData = JSON.parse(storedPatient);
        if (parsedData?.id) {
          setPatientId(parsedData.id.toString());
        } else {
          console.error("No patient ID found in activePatient data");
          toast.error("Active patient not found. Please select a patient.");
        }
      } catch (error) {
        console.error("Error parsing patient data from localStorage:", error);
        toast.error("Error loading patient data.");
      }
    } else {
      toast.info("No active patient selected.");
    }
    setIsLoadingPatient(false);
  }, []);

  // --- Helper function to map API response to SOAPNote format ---
  const mapResponseToNotes = (responseData: any[], type: SOAPNoteType): SOAPNote[] => {
    if (!Array.isArray(responseData)) {
      console.warn(`Expected array but received ${typeof responseData} for type ${type}`);
      return [];
    }
    // Filter out any potential null/undefined entries before mapping
    return responseData.filter(Boolean).map(note => ({
      id: note.id,
      date: note.date || new Date().toISOString(),
      type: type,
      content: note.content || "" // Ensure content is always a string
    }));
  };

  // --- Fetch ALL existing SOAP notes for the patient ---
  const fetchAllSOAPNotes = async (currentPatientId: string) => {
    if (!currentPatientId) return;

    setIsLoadingNotes(true);
    console.log(`Fetching SOAP notes for patient ID: ${currentPatientId}`);
    try {
      // Use Promise.allSettled to handle potential errors in individual fetches gracefully
      const results = await Promise.allSettled([
        api.get(`/soap/subjective/${currentPatientId}`),
        api.get(`/soap/objective/${currentPatientId}`),
        api.get(`/soap/assessment/${currentPatientId}`),
        api.get(`/soap/plan/${currentPatientId}`)
      ]);

      const subjectiveNotes = results[0].status === 'fulfilled' ? mapResponseToNotes(results[0].value.data || [], 'subjective') : [];
      if (results[0].status === 'rejected') console.error("Error fetching subjective:", results[0].reason);

      const objectiveNotes = results[1].status === 'fulfilled' ? mapResponseToNotes(results[1].value.data || [], 'objective') : [];
      if (results[1].status === 'rejected') console.error("Error fetching objective:", results[1].reason);

      const assessmentNotes = results[2].status === 'fulfilled' ? mapResponseToNotes(results[2].value.data || [], 'assessment') : [];
      if (results[2].status === 'rejected') console.error("Error fetching assessment:", results[2].reason);

      const planNotes = results[3].status === 'fulfilled' ? mapResponseToNotes(results[3].value.data || [], 'plan') : [];
      if (results[3].status === 'rejected') console.error("Error fetching plan:", results[3].reason);

      const allNotes = [
        ...subjectiveNotes,
        ...objectiveNotes,
        ...assessmentNotes,
        ...planNotes
      ];

      // Sort by date descending
      allNotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log("Fetched SOAP Notes (after sorting):", allNotes);
      setSOAPNotes(allNotes);

    } catch (error) { // Catch errors from Promise.allSettled itself (unlikely here)
      console.error("Failed to fetch SOAP notes:", error);
      toast.error("Could not load SOAP notes history.");
      setSOAPNotes([]);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  // --- Load notes when patientId changes ---
  useEffect(() => {
    if (patientId) {
      fetchAllSOAPNotes(patientId);
    } else {
      setSOAPNotes([]); // Clear notes if patientId is unset
    }
  }, [patientId]);

  // --- Start/Stop Recording ---
   const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Audio recording is not supported by this browser.");
        return;
    }
    if (!GROQ_API_KEY || !GROQ_API_URL) {
        toast.error("Voice input configuration is missing. Cannot record.");
        return;
    }
     if (!patientId) {
         toast.error("Please select an active patient before recording.");
         return;
     }
     if (!getDoctorId()) {
         toast.error("Doctor information missing. Cannot record.");
         return;
     }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm;codecs=opus' }; // Specify mimeType if needed
      let recorder: MediaRecorder;
      try {
          recorder = new MediaRecorder(stream, options);
      } catch (e) {
          console.warn("Requested mimeType 'audio/webm;codecs=opus' not supported, trying default.");
          recorder = new MediaRecorder(stream); // Fallback to browser default
      }

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
           audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop the stream tracks *after* the blob is likely processed
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) {
            console.warn("No audio data collected.");
            toast.warning("No audio data was recorded.");
            setIsParsing(false); // Ensure parsing state is reset
            setIsRecording(false); // Ensure recording state is reset
            return;
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' }); // Use the recorder's mimeType or default
        await processAudioToTranscript(audioBlob);
      };

        recorder.onerror = (event) => {
            console.error("MediaRecorder error:", event);
            toast.error("An error occurred during recording.");
            setIsRecording(false);
            setIsParsing(false);
            stream.getTracks().forEach((track) => track.stop()); // Clean up stream
        };

      recorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
       if (error instanceof DOMException && error.name === "NotAllowedError") {
        toast.error("Microphone access denied. Please allow microphone permissions.");
      } else if (error instanceof DOMException && error.name === "NotFoundError") {
        toast.error("No microphone found. Please ensure a microphone is connected.");
      }
       else {
           toast.error("Could not access microphone. Please check permissions.");
       }
    }
  };

  const stopRecording = () => {
     if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This triggers the onstop handler
      setIsRecording(false); // Set recording to false immediately
      setIsParsing(true); // Indicate processing has started
      // Tracks are stopped in onstop now
      toast.info("Recording stopped, processing..."); // Use info, success comes after processing
    }
  };

  // --- Process audio: Transcribe -> Analyze -> Save -> Update UI ---
  const processAudioToTranscript = async (audioBlob: Blob) => {
    // Double check patient and doctor IDs just before processing
    if (!patientId) {
        toast.error("Cannot process recording: No active patient selected.");
        setIsParsing(false);
        return;
    }
    const doctorId = getDoctorId();
    if (!doctorId) {
        toast.error("Cannot process recording: Doctor ID not found.");
        setIsParsing(false);
        return;
    }

    // No need to set isParsing(true) here, it's set in stopRecording

    setTranscription(""); // Clear previous transcription state (if used for display)

    try {
      console.log("Audio Blob size:", audioBlob.size, "Type:", audioBlob.type);
      if (audioBlob.size === 0) {
        throw new Error("Recorded audio blob is empty.");
      }

      // 1. Get transcription
      const transcriptionResult = await getTranscription(audioBlob);
      setTranscription(transcriptionResult); // Store if needed

      if (!transcriptionResult || transcriptionResult.trim().length === 0) {
          toast.warning("Transcription resulted in empty text. Nothing to process.");
          setIsParsing(false);
          return;
      }

      // 2. Analyze and Save (using the final transcription)
      await analyzeAndSaveData(transcriptionResult, patientId, doctorId);

      // Success message handled within analyzeAndSaveData now

    } catch (error: any) {
      console.error("Error processing audio to transcript:", error);
      toast.error(`Processing failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsParsing(false); // Ensure parsing is set to false at the end
    }
  };

  // --- Get transcription from Groq API ---
 const getTranscription = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append('model', 'whisper-large-v3');
    formData.append('file', audioBlob, 'recording.webm'); // Name is helpful for debugging
    formData.append('response_format', 'text'); // Get plain text

    try {
        console.log("Sending audio to Groq Whisper...");
        const response = await axios.post(
            `${GROQ_API_URL}/audio/transcriptions`,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    // Content-Type is set automatically by axios for FormData
                },
                // Add timeout?
                // timeout: 60000 // 60 seconds
            }
        );
        console.log("Transcription received:", response.data);

        if (typeof response.data === 'string') {
           return response.data.trim(); // Trim whitespace
        } else {
           console.warn("Unexpected transcription response format:", response.data);
           // Attempt to extract text if possible, otherwise return empty
           return String(response.data?.text || "").trim();
        }
    } catch (error: any) {
        console.error("Error transcribing audio:", error.response?.data || error.message);
        // Provide more specific error messages if available
        const errorMessage = error.response?.data?.error?.message || error.message || "Unknown transcription error";
        throw new Error(`Failed to transcribe audio: ${errorMessage}`);
    }
  };

  // --- Analyze transcription, SAVE data, and REFRESH notes list (Refined Function) ---
  const analyzeAndSaveData = async (transcription: string, currentPatientId: string, currentDoctorId: number) => {
    console.log("Analyzing transcription:", transcription);
    let soapSaved = false;
    let customUpdatesMade = false; // Flag to see if any custom data was found
    let customSaveAttempted = false; // Flag to track if we tried to save custom data

    try {
      // --- Groq API call for analysis ---
      const response = await groqApi.post('/chat/completions', {
        model: "llama3-70b-8192", // Or consider llama3-8b-8192 if speed is critical and accuracy is sufficient
        messages: [
           {
            role: "system",
             // --- System prompt defining JSON structure for SOAP and Custom ---
            content: `You are an AI medical documentation specialist for physiotherapy. Analyze the doctor-patient conversation transcript. Extract information for SOAP notes and specific custom assessment fields based ONLY on the provided text. If information for a field isn't mentioned, omit it or use null. Format the response as a single JSON object with top-level keys "soap" and "custom".

Structure:
{
  "soap": {
    "subjective": "...", // Patient's report, history, complaints
    "objective": "...", // Therapist's observations, tests, measurements mentioned
    "assessment": "...", // Therapist's clinical reasoning, diagnosis mentioned
    "plan": "..." // Treatment plan, goals mentioned
  },
  "custom": {
    "pain": {
      "painsevirity": number (1-10) | null, // Convert descriptive terms if possible
      "painDiurnal": "constant" | "intermittent" | "morning" | "evening" | "night" | "none" | null,
      "painsite": string | null,
      "painnature": string | null, // e.g., sharp, dull, aching
      "painonset": string | null, // e.g., sudden, gradual, specific date/event
      "painduration": string | null, // e.g., 2 weeks, constant, intermittent
      "painside": string | null, // e.g., left, right, bilateral
      "paintrigger": string | null, // Activities/positions that trigger
      "painadl": string | null, // Impact on Activities of Daily Living
      "painAggravating": string | null, // Factors that worsen pain
      "painRelieving": string | null // Factors that lessen pain
    },
    "history": {
      "age": string | null,
      "gender": string | null,
      "occupation": string | null,
      "previosmedicalconditions": string | null, // Corrected typo if backend uses this key
      "previossurgery": string | null, // Corrected typo if backend uses this key
      "currentmedication": string | null,
      "physicalactivitylevel": "sedentary" | "light" | "moderate" | "active" | "very_active" | string | null, // Allow specific or general string
      "sleeppattern": string | null, // e.g., normal, disturbed, insomnia
      "smoking": "never" | "former" | "current" | string | null // Allow specific or general string
    },
    "chiefComplaints": {
      "primarycomplaint": string | null,
      "onset": string | null, // e.g., sudden, gradual
      "duration": string | null, // e.g., 3 days, 2 months
      "assosiatedsymtom": string | null, // General text area for other symptoms
      "stiffness": boolean | null,
      "weakness": boolean | null,
      "numbness": boolean | null,
      "tingling": boolean | null,
      "swelling": boolean | null
    },
    "examination": {
      "posture": "normal" | "kyphotic" | "lordotic" | "scoliotic" | string | null,
      "gaitpattern": "normal" | "antalgic" | "ataxic" | "steppage" | string | null,
      "flexion": string | null, // e.g., "90 degrees", "WNL", "Limited"
      "extension": string | null,
      "lateralflexionleft": string | null,
      "lateralflexionright": string | null,
      "rotationright": string | null,
      "rotationleft": string | null
    },
    "motor": {
      "shoulderflexer": string | null, // e.g., "5/5", "4/5"
      "shoulderextensors": string | null,
      "elbowflexer": string | null,
      "elbowextensors": string | null,
      "wristflexer": string | null,
      "wristextensors": string | null,
      "hipflexer": string | null,
      "hiprextensors": string | null, // Ensure key matches state
      "kneeflexer": string | null,
      "kneeextensors": string | null,
      "ankleextensors": string | null, // Dorsiflexors
      "ankleflexer": string | null, // Plantarflexors
      "muscletone": "normal" | "hypotonic" | "hypertonic" | "spastic" | "rigid" | string | null
    },
    "sensory": {
      "touchsensation": "normal" | "decreased" | "absent" | "hyperesthesia" | string | null,
      "painsensation": "normal" | "decreased" | "absent" | "hyperalgesia" | string | null,
      "tempraturesensation": "normal" | "decreased" | "absent" | string | null, // Corrected typo if backend uses this key
      "positivesense": "normal" | "decreased" | "absent" | string | null, // Proprioception
      "vibrationsense": "normal" | "decreased" | "absent" | string | null
    },
    "pediatric": {
      "grossmotorskills": "normal" | "delayed" | "impaired" | string | null,
      "finemotorskills": "normal" | "delayed" | "impaired" | string | null,
      "primitivereflex": "normal" | "persistent" | "absent" | string | null,
      "posturalreflex": "normal" | "delayed" | "absent" | string | null,
      "balanceandcoord": "normal" | "delayed" | "impaired" | string | null // Corrected typo if backend uses this key
    }
  }
}

Important Rules:
- Extract verbatim or very close summaries only from the provided transcript.
- Do NOT infer information not explicitly stated.
- Use null for fields where no information is found in the text.
- For boolean fields (like stiffness), return true if mentioned positively (e.g., "patient reports stiffness"), false if explicitly denied (e.g., "no stiffness"), and null otherwise.
- For numeric fields like painsevirity, try to map descriptive terms (mild: 2-3, moderate: 4-6, severe: 7-8, extreme: 9-10) but prioritize explicit numbers if mentioned. Return null if unstated.
- Ensure the output is a single valid JSON object adhering to the specified structure.
`
          },
          { role: "user", content: transcription }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // Lower temperature for more deterministic extraction
      });

      console.log("Groq Analysis Response Raw:", response.data);

      let extractedData;
      try {
        const messageContent = response.data.choices[0]?.message?.content; // Added safe navigation
        if (!messageContent) {
            throw new Error("No content found in Groq response message.");
        }
        extractedData = typeof messageContent === 'string'
          ? JSON.parse(messageContent)
          : messageContent; // Assume it's already an object if not string
        if (!extractedData || typeof extractedData !== 'object') {
          throw new Error("Parsed content is not a valid object.");
        }
         console.log("Parsed Extracted Data:", extractedData); // Log the full parsed data
      } catch (parseError: any) {
        console.error("Error parsing Groq JSON response:", parseError);
        console.error("Raw content received:", response.data.choices[0]?.message?.content);
        toast.error(`AI analysis returned an invalid format: ${parseError.message}`);
        return; // Stop processing if parsing fails
      }

      // --- Process and SAVE SOAP Notes ---
      if (extractedData.soap && typeof extractedData.soap === 'object') {
        const soapData = extractedData.soap;
        const savePromises: Promise<any>[] = [];
        const date = new Date().toISOString();

        const processAndSaveSoap = (type: SOAPNoteType) => {
          const content = soapData[type];
          // Check if content is a non-empty string after trimming
          if (content && typeof content === 'string' && content.trim()) {
            console.log(`Preparing to save SOAP ${type}:`, content.trim());
            savePromises.push(
              api.post(`/soap/${type}`, { // Assuming /soap/... endpoints are correct
                patientId: currentPatientId,
                content: content.trim(),
                doctorId: currentDoctorId,
                date: date,
                role: "CLINIC"
              })
              .then(res => {
                  console.log(`SOAP ${type} saved successfully:`, res.data);
                  return res; // Pass success result
                })
              .catch(err => {
                console.error(`Failed to save SOAP ${type}:`, err.response?.data || err.message);
                toast.error(`Failed to save SOAP ${type}: ${err.response?.data?.message || err.message}`);
                 // Allow Promise.allSettled or Promise.all to handle, return the error
                 return Promise.reject(err);
              })
            );
          } else {
             console.log(`No valid content found for SOAP ${type}.`);
          }
        };

        processAndSaveSoap('subjective');
        processAndSaveSoap('objective');
        processAndSaveSoap('assessment');
        processAndSaveSoap('plan');

        if (savePromises.length > 0) {
            console.log(`Attempting to save ${savePromises.length} SOAP notes...`);
            // Use Promise.allSettled to wait for all, even if some fail
            const results = await Promise.allSettled(savePromises);
            console.log("SOAP notes saving process completed.", results);

            const successfulSaves = results.filter(r => r.status === 'fulfilled').length;
            const failedSaves = results.length - successfulSaves;

            if (successfulSaves > 0) {
                soapSaved = true;
                console.log(`${successfulSaves} SOAP notes saved successfully.`);
                // Refresh SOAP history ONLY if at least one SOAP note was saved
                console.log("Refreshing SOAP notes history table after SOAP save...");
                await fetchAllSOAPNotes(currentPatientId);
                toast.success(`${successfulSaves} SOAP note(s) saved and history updated.`);
            }
             if (failedSaves > 0) {
                 console.error(`${failedSaves} SOAP notes failed to save.`);
                 // Toast for failures already shown in individual catches
             }

        } else {
          console.log("No valid SOAP content detected in transcript to save.");
        }
      } else {
         console.log("No 'soap' key found or not an object in extracted data.");
      }

      // --- Process and SAVE Custom Assessment Forms ---
      if (extractedData.custom && typeof extractedData.custom === 'object') {
        console.log("Processing custom data:", extractedData.custom); // Log received custom data
        const customData = extractedData.custom;
        const customSavePromises: Promise<any>[] = [];
        const currentISODate = new Date().toISOString(); // Use a consistent date

        // Helper to update form state and prepare API call
        const updateFormStateAndPrepareSave = (
          setter: Function,
          data: object | null | undefined,
          // !!! VERIFY THIS ENDPOINT WITH YOUR BACKEND !!!
          endpoint: string,
          formName: string // For logging
        ) => {
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            // Filter out null/undefined values BEFORE updating state/saving
            const update = Object.fromEntries(
                Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
            );

            // Special handling for boolean fields in chiefComplaints (ensure they are boolean)
             if (formName === 'ChiefComplaints') {
                 const booleanKeys = ['stiffness', 'weakness', 'numbness', 'tingling', 'swelling'] as const;
                 booleanKeys.forEach(key => {
                     if (update[key] !== undefined) {
                         update[key] = Boolean(update[key]); // Ensure it's strictly boolean
                     }
                 });
             }
              // Special handling for painsevirity (ensure it's number 1-10)
              if (formName === 'Pain' && update.painsevirity !== undefined) {
                   const severityNum = Number(update.painsevirity);
                   if (!isNaN(severityNum)) {
                       update.painsevirity = Math.max(1, Math.min(10, Math.round(severityNum))); // Clamp and round
                   } else {
                       delete update.painsevirity; // Remove if not a valid number
                       console.warn("Removed invalid 'painsevirity' value before saving.");
                   }
              }


            if (Object.keys(update).length > 0) {
              console.log(`Updating ${formName} form state with:`, update);
              setter((prev: any) => ({ ...prev, ...update })); // Update React state locally
              customUpdatesMade = true; // Mark that state was updated

              // Prepare API payload - SEND ONLY THE EXTRACTED/UPDATED FIELDS
              const payload = {
                ...update, // Send only the non-null, valid fields extracted
                patientId: currentPatientId,
                doctorId: currentDoctorId,
                date: currentISODate, // Use consistent date
                role: "CLINIC" // Assuming role is needed by backend
              };
              console.log(`Preparing to save to endpoint ${endpoint} with payload:`, payload);

              // Add the API call promise
              customSavePromises.push(
                api.post(endpoint, payload)
                .then(res => {
                    console.log(`✅ Successfully saved ${formName} data via API to ${endpoint}:`, res.data);
                    return res; // Return response for Promise.allSettled
                })
                .catch(err => {
                  console.error(`❌ FAILED to save ${formName} data via API to ${endpoint}:`, err.response?.data || err.message);
                  console.error(`Payload sent for ${formName}:`, payload); // Log payload on error
                  toast.error(`Failed to save ${formName} data: ${err.response?.data?.message || 'Network Error'}`);
                  // Return the error to be caught by Promise.allSettled
                  return Promise.reject(err);
                })
              );
            } else {
               console.log(`No non-null/non-undefined fields found for ${formName} form after filtering.`);
            }
          } else {
             console.log(`No data provided or data is empty/invalid for ${formName} form.`);
          }
        };

        // --- Define Endpoints and Update/Save ---
        // *** CRITICAL: Ensure these endpoints match your backend API routes for POST requests ***
        const endpoints = {
            pain: `${API_URL}/assessment/pain`,
            history: `${API_URL}/assessment/history`,
            chiefComplaints: `${API_URL}/assessment/chief-complaints`,
            examination: `${API_URL}/assessment/examination`,
            motor: `${API_URL}/assessment/motor`,
            sensory: `${API_URL}/assessment/sensory`,
            pediatric: `${API_URL}/assessment/pediatric`,
        };

        updateFormStateAndPrepareSave(setPainForm, customData.pain, endpoints.pain, 'Pain');
        updateFormStateAndPrepareSave(setHistoryForm, customData.history, endpoints.history, 'History');
        updateFormStateAndPrepareSave(setChiefComplaintsForm, customData.chiefComplaints, endpoints.chiefComplaints, 'ChiefComplaints');
        updateFormStateAndPrepareSave(setExaminationForm, customData.examination, endpoints.examination, 'Examination');
        updateFormStateAndPrepareSave(setMotorForm, customData.motor, endpoints.motor, 'Motor');
        updateFormStateAndPrepareSave(setSensoryForm, customData.sensory, endpoints.sensory, 'Sensory');
        updateFormStateAndPrepareSave(setPediatricForm, customData.pediatric, endpoints.pediatric, 'Pediatric');

        // Execute all prepared custom assessment API calls
        if (customSavePromises.length > 0) {
          customSaveAttempted = true;
          console.log(`Attempting to save ${customSavePromises.length} custom assessment forms via API...`);
          // Use Promise.allSettled to wait for all, regardless of success/failure
          const results = await Promise.allSettled(customSavePromises);
          console.log("Custom assessment API calls completed.", results);

          const successfulSaves = results.filter(r => r.status === 'fulfilled').length;
          const failedSaves = results.length - successfulSaves;

          if (successfulSaves > 0) {
            toast.success(`${successfulSaves} Custom assessment form(s) updated and saved successfully.`);
          }
          if (failedSaves > 0) {
            // Specific error toasts are already shown in individual catches
            toast.warning(`${failedSaves} custom assessment form(s) failed to save. Check console for details.`);
          }

        } else {
          console.log("No valid Custom Assessment content detected or extracted to save via API.");
          if (customUpdatesMade) {
               // State was updated locally, but nothing sent to API
               toast.info("Custom assessment form fields updated locally based on transcript.");
           }
        }
      } else {
         console.log("No 'custom' key found or not an object in extracted data.");
      }

      // --- Final Status Message ---
      if (!soapSaved && !customSaveAttempted && !customUpdatesMade) {
           toast.info("Conversation analyzed, but no relevant SOAP or Custom Assessment data was found to update or save.");
      }
      // More specific success/failure messages are handled within the save blocks.

    } catch (error: any) {
      console.error("Error during the overall analysis or saving process:", error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(`Analysis/Save Error: ${error.response.data?.message || error.message}`);
      } else {
        toast.error(`Analysis/Save Error: ${error.message || "An unknown error occurred"}`);
      }
    } finally {
       // Final cleanup if needed, isParsing is handled in processAudioToTranscript
    }
  };


  // --- Handle Edit/Delete for SOAP History Table ---
  const handleEdit = (note: SOAPNote) => {
    // TODO: Implement editing logic (e.g., open a modal pre-filled with note.content)
    console.log("Edit Note:", note);
    toast.info(`Edit functionality for ${note.type} ID ${note.id} needs implementation (e.g., using a Dialog).`);
    // Example: setEditNoteData(note); setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number, type: SOAPNoteType) => {
    if (!patientId) return;

    // Optional: Add confirmation dialog here using ShadCN Alert Dialog
    // Example: Show confirmation dialog, proceed only if confirmed.

    console.log(`Attempting to delete ${type} note with ID: ${id}`);
    try {
      setIsLoadingNotes(true); // Show loading indicator during delete
      // Use the correct endpoint structure based on your API
      await api.delete(`/soap/${type}/${id}`); // Make sure the backend handles DELETE on this route
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} note deleted successfully`);
      // Refresh list after successful delete
      await fetchAllSOAPNotes(patientId);
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast.error(error.response?.data?.message || `Failed to delete ${type} note`);
       // Ensure loading state is reset even on error
       setIsLoadingNotes(false);
    }
    // Note: isLoadingNotes will be set to false by fetchAllSOAPNotes on success
  };

  // --- Helper Component for Rendering SOAP History Table ---
  const SoapHistoryTable = ({ notes, type }: { notes: SOAPNote[], type: SOAPNoteType }) => {
    const filteredNotes = notes.filter(note => note.type === type);

    // Show loader if loading is active FOR THE WHOLE LIST, and this section has no notes yet
    if (isLoadingNotes && filteredNotes.length === 0) {
         return (
             <div className="flex justify-center items-center p-6 min-h-[100px]"> {/* Added min-height */}
                 <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                 <span className="ml-2 text-gray-600">Loading {type} Notes...</span>
             </div>
         );
    }

    if (!isLoadingNotes && filteredNotes.length === 0) {
        return <p className="text-center text-gray-500 py-4 min-h-[100px] flex items-center justify-center">No {type} notes recorded yet.</p>;
    }

    return (
        <div className="overflow-x-auto"> {/* Added for smaller screens */}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead className="w-[100px] text-right pr-2">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredNotes.map((note) => (
                        <TableRow key={`${note.type}-${note.id}`}>
                            <TableCell className="whitespace-nowrap">{new Date(note.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                                {/* Use pre-wrap to respect newlines, clamp for height */}
                                <p className="line-clamp-4 whitespace-pre-wrap" title={note.content}>
                                    {note.content}
                                </p>
                            </TableCell>
                            <TableCell className="text-right pr-1">
                                <div className="flex justify-end gap-1 items-center">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(note)}
                                        title={`Edit ${type} Note`}
                                        className="h-7 w-7 text-blue-600 hover:bg-blue-100" // Smaller icon buttons
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(note.id, note.type)}
                                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-100"
                                        title={`Delete ${type} Note`}
                                        disabled={isLoadingNotes} // Disable while any note operation is in progress
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
  };


  // --- Render Logic ---
  if (isLoadingPatient) {
    return (
        <div className="p-6 flex justify-center items-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin mr-3"/> Loading patient data...
        </div>
    );
  }

  if (!patientId) {
      return (
          <div className="p-4 space-y-4">
              <Activepatient />
              <Card className="mt-4">
                 <CardContent className="pt-6 text-center text-gray-600">
                     Please select an active patient from the list above to start a consultation.
                 </CardContent>
              </Card>
          </div>
      );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      <Activepatient />

      {/* Voice Recording Controls */}
      <Card>
        <CardHeader>
            <CardTitle>Conversation Recording & AI Processing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row justify-end items-center gap-4">
             {isParsing && (
                <div className="flex items-center gap-2 text-blue-600 animate-pulse order-first sm:order-none w-full sm:w-auto justify-center sm:justify-start">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing Conversation... Please wait.</span>
                </div>
             )}
            <Button
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"} // Use default for start
                className={`flex items-center gap-2 min-w-[160px] justify-center ${
                 isRecording ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
                disabled={isParsing || isLoadingPatient || !patientId} // Disable if parsing, loading patient, or no patient
                title={!patientId ? "Select a patient first" : (isRecording ? "Stop Recording" : "Start Recording")}
            >
                {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {isRecording ? "Stop Recording" : "Start Recording"}
            </Button>
        </CardContent>
      </Card>

       {/* Main Content Tabs */}
       <Tabs defaultValue="soap" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="soap" disabled={isParsing}>SOAP Notes History</TabsTrigger>
                <TabsTrigger value="custom" disabled={isParsing}>Custom Assessment Forms</TabsTrigger>
            </TabsList>

            {/* SOAP Notes Tab */}
            <TabsContent value="soap">
                <Card>
                    {/* CardHeader removed as title is in sub-tabs */}
                    <CardContent className="pt-0"> {/* Remove top padding */}
                        {/* S-O-A-P Sub-Tabs */}
                        <Tabs value={activeSoapSubTab} onValueChange={(value) => setActiveSoapSubTab(value as SOAPNoteType)} className="w-full">
                            <TabsList className="grid w-full grid-cols-4 mb-4">
                                <TabsTrigger value="subjective">Subjective</TabsTrigger>
                                <TabsTrigger value="objective">Objective</TabsTrigger>
                                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                                <TabsTrigger value="plan">Plan</TabsTrigger>
                            </TabsList>

                            {/* Content for each S-O-A-P Sub-Tab - Shows History Table */}
                            {(["subjective", "objective", "assessment", "plan"] as SOAPNoteType[]).map((type) => (
                                <TabsContent key={type} value={type} className="mt-0 space-y-2"> {/* Reduced margin */}
                                     {/* Title removed, handled by table or message */}
                                    <SoapHistoryTable notes={soapNotes} type={type} />
                                     {/* Add Manual Button could go here if desired */}
                                     {/* Example:
                                        <div className="flex justify-end mt-2">
                                            <Button variant="outline" size="sm" onClick={() => console.log('Open manual add dialog for', type)}>
                                                <PlusCircle className="h-4 w-4 mr-2" /> Add Manual Note
                                            </Button>
                                        </div>
                                     */}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* Custom Assessment Tab */}
            <TabsContent value="custom">
                 <Card>
                    <CardHeader>
                        <CardTitle>Custom Assessment Forms</CardTitle>
                        {/* Optional: Add description */}
                        {/* <CardDescription>Fill in the details below. Fields may be auto-populated after voice processing.</CardDescription> */}
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="pain" className="w-full">
                             {/* Use scrollable tabs for many sections */}
                             <TabsList className="relative flex w-full overflow-x-auto whitespace-nowrap mb-4 pb-2">
                                <TabsTrigger value="pain">Pain</TabsTrigger>
                                <TabsTrigger value="history">History</TabsTrigger>
                                <TabsTrigger value="chiefComplaints">Chief Complaints</TabsTrigger>
                                <TabsTrigger value="examination">Examination</TabsTrigger>
                                <TabsTrigger value="motor">Motor</TabsTrigger>
                                <TabsTrigger value="sensory">Sensory</TabsTrigger>
                                <TabsTrigger value="pediatric">Pediatric</TabsTrigger>
                             </TabsList>

                            {/* Pain Assessment */}
                            <TabsContent value="pain">
                                 <div className="space-y-6 mt-4 border p-4 rounded-md"> {/* Added border */}
                                    <h3 className="text-lg font-semibold mb-4">Pain Assessment</h3>
                                    {/* Pain Severity and Characteristics */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            {/* <Label className="text-base font-medium">Pain Severity & Characteristics</Label> */}
                                            <div className="space-y-4">
                                                <div>
                                                    <Label>Pain Severity (1-10)</Label>
                                                    <div className="flex items-center gap-4 pt-1">
                                                    <Slider
                                                        value={[painForm.painsevirity]}
                                                        onValueChange={(value) => setPainForm(prev => ({ ...prev, painsevirity: value[0] }))}
                                                        max={10} min={1} step={1} className="flex-1"
                                                        disabled={isParsing} // Disable during parsing
                                                        />
                                                    <span className="text-sm font-medium w-12 text-center">{painForm.painsevirity}/10</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label>Pain Pattern (Diurnal)</Label>
                                                    <Select value={painForm.painDiurnal || ""} onValueChange={(value) => setPainForm(prev => ({ ...prev, painDiurnal: value }))} disabled={isParsing}>
                                                        <SelectTrigger><SelectValue placeholder="Select pain pattern" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None Specific</SelectItem>
                                                            <SelectItem value="constant">Constant</SelectItem>
                                                            <SelectItem value="intermittent">Intermittent</SelectItem>
                                                            <SelectItem value="morning">Morning</SelectItem>
                                                            <SelectItem value="afternoon">Afternoon</SelectItem>
                                                            <SelectItem value="evening">Evening</SelectItem>
                                                            <SelectItem value="night">Night</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                 </div>
                                                 <div>
                                                     <Label>Pain Nature</Label>
                                                     <Select value={painForm.painnature || ""} onValueChange={(value) => setPainForm(prev => ({ ...prev, painnature: value }))} disabled={isParsing}>
                                                         <SelectTrigger><SelectValue placeholder="Select pain nature" /></SelectTrigger>
                                                         <SelectContent>
                                                             <SelectItem value="sharp">Sharp</SelectItem>
                                                             <SelectItem value="dull">Dull</SelectItem>
                                                             <SelectItem value="aching">Aching</SelectItem>
                                                             <SelectItem value="burning">Burning</SelectItem>
                                                             <SelectItem value="throbbing">Throbbing</SelectItem>
                                                             <SelectItem value="shooting">Shooting</SelectItem>
                                                             <SelectItem value="stabbing">Stabbing</SelectItem>
                                                             <SelectItem value="other">Other</SelectItem>
                                                         </SelectContent>
                                                     </Select>
                                                 </div>
                                            </div>
                                        </div>
                                        {/* Pain Location and Timing */}
                                        <div className="space-y-4">
                                            {/* <Label className="text-base font-medium">Pain Location & Timing</Label> */}
                                            <div className="space-y-4">
                                                 <div>
                                                    <Label>Pain Site</Label>
                                                    <Input value={painForm.painsite || ""} onChange={(e) => setPainForm(prev => ({ ...prev, painsite: e.target.value }))} placeholder="e.g., Lower back, Left shoulder" disabled={isParsing}/>
                                                 </div>
                                                <div>
                                                    <Label>Pain Side</Label>
                                                    <Select value={painForm.painside || ""} onValueChange={(value) => setPainForm(prev => ({ ...prev, painside: value }))} disabled={isParsing}>
                                                        <SelectTrigger><SelectValue placeholder="Select side" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="left">Left</SelectItem>
                                                            <SelectItem value="right">Right</SelectItem>
                                                            <SelectItem value="bilateral">Bilateral</SelectItem>
                                                            <SelectItem value="central">Central</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                 <div>
                                                    <Label>Onset</Label>
                                                    <Select value={painForm.painonset || ""} onValueChange={(value) => setPainForm(prev => ({ ...prev, painonset: value }))} disabled={isParsing}>
                                                        <SelectTrigger><SelectValue placeholder="Select onset" /></SelectTrigger>
                                                        <SelectContent>
                                                             <SelectItem value="sudden">Sudden</SelectItem>
                                                             <SelectItem value="gradual">Gradual</SelectItem>
                                                             <SelectItem value="traumatic">Traumatic</SelectItem>
                                                             <SelectItem value="insidious">Insidious</SelectItem> {/* Added */}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                 <div>
                                                    <Label>Duration of Complaint</Label>
                                                    <Input value={painForm.painduration || ""} onChange={(e) => setPainForm(prev => ({ ...prev, painduration: e.target.value }))} placeholder="e.g., 2 weeks, 3 months" disabled={isParsing}/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                     {/* Pain Triggers and Impact */}
                                    <div className="space-y-4 pt-4 border-t"> {/* Added separator */}
                                        <Label className="text-base font-medium">Pain Triggers & Impact</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="space-y-4">
                                                <div>
                                                    <Label>Aggravating Factors</Label>
                                                    <Textarea value={painForm.painAggravating || ""} onChange={(e) => setPainForm(prev => ({ ...prev, painAggravating: e.target.value }))} placeholder="What makes the pain worse? (Activities, positions)" rows={3} disabled={isParsing}/>
                                                </div>
                                                <div>
                                                    <Label>Relieving Factors</Label>
                                                    <Textarea value={painForm.painRelieving || ""} onChange={(e) => setPainForm(prev => ({ ...prev, painRelieving: e.target.value }))} placeholder="What makes the pain better? (Rest, position, medication)" rows={3} disabled={isParsing}/>
                                                </div>
                                            </div>
                                             <div className="space-y-4">
                                                <div>
                                                    <Label>Impact on Daily Activities (ADL)</Label>
                                                    <Textarea value={painForm.painadl || ""} onChange={(e) => setPainForm(prev => ({ ...prev, painadl: e.target.value }))} placeholder="How does pain affect daily activities? (e.g., walking, dressing, work)" rows={3} disabled={isParsing}/>
                                                </div>
                                                <div>
                                                    <Label>Specific Trigger Actions/Positions</Label>
                                                    <Textarea value={painForm.paintrigger || ""} onChange={(e) => setPainForm(prev => ({ ...prev, paintrigger: e.target.value }))} placeholder="Specific movements or positions that provoke pain" rows={3} disabled={isParsing}/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Optional Save Button - Remove if auto-saving */}
                                     {/* <div className="flex justify-end pt-4">
                                         <Button disabled={isParsing} onClick={() => console.log("Manual Save Pain clicked")}>Save Pain Form</Button>
                                     </div> */}
                                </div>
                            </TabsContent>

                             {/* History */}
                            <TabsContent value="history">
                                <div className="space-y-6 mt-4 border p-4 rounded-md">
                                     <h3 className="text-lg font-semibold mb-4">Patient History</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Demographics</Label>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="history-age">Age</Label>
                                                    <Input id="history-age" value={historyForm.age || ""} onChange={(e) => setHistoryForm(prev => ({ ...prev, age: e.target.value }))} disabled={isParsing}/>
                                                </div>
                                                <div>
                                                    <Label htmlFor="history-gender">Gender</Label>
                                                    <Select value={historyForm.gender || ""} onValueChange={(value) => setHistoryForm(prev => ({ ...prev, gender: value }))} disabled={isParsing}>
                                                        <SelectTrigger id="history-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">Male</SelectItem>
                                                            <SelectItem value="female">Female</SelectItem>
                                                            <SelectItem value="other">Other</SelectItem>
                                                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label htmlFor="history-occupation">Occupation</Label>
                                                    <Input id="history-occupation" value={historyForm.occupation || ""} onChange={(e) => setHistoryForm(prev => ({ ...prev, occupation: e.target.value }))} disabled={isParsing}/>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Medical History</Label>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="history-conditions">Previous Medical Conditions</Label>
                                                    <Textarea id="history-conditions" value={historyForm.previosmedicalconditions || ""} onChange={(e) => setHistoryForm(prev => ({ ...prev, previosmedicalconditions: e.target.value }))} rows={3} disabled={isParsing} placeholder="e.g., Diabetes, Hypertension, Arthritis"/>
                                                </div>
                                                <div>
                                                    <Label htmlFor="history-surgery">Previous Surgery</Label>
                                                    <Textarea id="history-surgery" value={historyForm.previossurgery || ""} onChange={(e) => setHistoryForm(prev => ({ ...prev, previossurgery: e.target.value }))} rows={3} disabled={isParsing} placeholder="e.g., Appendectomy (2010), Knee Arthroscopy (2018)"/>
                                                </div>
                                                <div>
                                                    <Label htmlFor="history-medication">Current Medication</Label>
                                                    <Textarea id="history-medication" value={historyForm.currentmedication || ""} onChange={(e) => setHistoryForm(prev => ({ ...prev, currentmedication: e.target.value }))} rows={3} disabled={isParsing} placeholder="List name, dose, frequency"/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t"> {/* Separator */}
                                        <Label className="text-base font-medium">Lifestyle Factors</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                            <div>
                                                <Label htmlFor="history-activity">Physical Activity Level</Label>
                                                <Select value={historyForm.physicalactivitylevel || ""} onValueChange={(value) => setHistoryForm(prev => ({ ...prev, physicalactivitylevel: value }))} disabled={isParsing}>
                                                    <SelectTrigger id="history-activity"><SelectValue placeholder="Select activity level" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="sedentary">Sedentary (Little to no exercise)</SelectItem>
                                                        <SelectItem value="light">Light (Walks 1-3 days/week)</SelectItem>
                                                        <SelectItem value="moderate">Moderate (Exercise 3-5 days/week)</SelectItem>
                                                        <SelectItem value="active">Active (Exercise 6-7 days/week)</SelectItem>
                                                        <SelectItem value="very_active">Very Active (Hard exercise/sports)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="history-sleep">Sleep Pattern</Label>
                                                <Select value={historyForm.sleeppattern || ""} onValueChange={(value) => setHistoryForm(prev => ({ ...prev, sleeppattern: value }))} disabled={isParsing}>
                                                    <SelectTrigger id="history-sleep"><SelectValue placeholder="Select sleep pattern" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="normal">Normal (7-9 hours, restful)</SelectItem>
                                                        <SelectItem value="disturbed">Disturbed (Frequent waking)</SelectItem>
                                                        <SelectItem value="insomnia">Insomnia (Difficulty falling/staying asleep)</SelectItem>
                                                        <SelectItem value="less_than_6">Less than 6 hours</SelectItem>
                                                        <SelectItem value="more_than_9">More than 9 hours</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="history-smoking">Smoking Status</Label>
                                                <Select value={historyForm.smoking || ""} onValueChange={(value) => setHistoryForm(prev => ({ ...prev, smoking: value }))} disabled={isParsing}>
                                                    <SelectTrigger id="history-smoking"><SelectValue placeholder="Select smoking status" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="never">Never Smoked</SelectItem>
                                                        <SelectItem value="former">Former Smoker</SelectItem>
                                                        <SelectItem value="current">Current Smoker</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                     {/* Optional Save Button */}
                                     {/* <div className="flex justify-end pt-4">
                                         <Button disabled={isParsing} onClick={() => console.log("Manual Save History clicked")}>Save History Form</Button>
                                     </div> */}
                                </div>
                            </TabsContent>

                             {/* Chief Complaints */}
                            <TabsContent value="chiefComplaints">
                                 <div className="space-y-6 mt-4 border p-4 rounded-md">
                                     <h3 className="text-lg font-semibold mb-4">Chief Complaints</h3>
                                     <div className="space-y-1">
                                        <Label htmlFor="cc-primary">Primary Complaint</Label>
                                        <Textarea id="cc-primary" value={chiefComplaintsForm.primarycomplaint || ""} onChange={(e) => setChiefComplaintsForm(prev => ({ ...prev, primarycomplaint: e.target.value }))} rows={3} placeholder="Patient's main reason for seeking treatment, in their own words if possible" disabled={isParsing}/>
                                     </div>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                         <div>
                                            <Label htmlFor="cc-onset-select">Onset</Label> {/* Changed ID for Select */}
                                            <Select id="cc-onset-select" value={chiefComplaintsForm.onset || ""} onValueChange={(value) => setChiefComplaintsForm(prev => ({ ...prev, onset: value }))} disabled={isParsing}>
                                                <SelectTrigger><SelectValue placeholder="Select onset" /></SelectTrigger>
                                                <SelectContent>
                                                     <SelectItem value="sudden">Sudden</SelectItem>
                                                     <SelectItem value="gradual">Gradual</SelectItem>
                                                     <SelectItem value="traumatic">Traumatic</SelectItem>
                                                     <SelectItem value="insidious">Insidious</SelectItem>
                                                </SelectContent>
                                            </Select>
                                         </div>
                                          <div>
                                            <Label htmlFor="cc-duration-input">Duration</Label> {/* Changed ID for Input */}
                                            <Input id="cc-duration-input" value={chiefComplaintsForm.duration || ""} onChange={(e) => setChiefComplaintsForm(prev => ({ ...prev, duration: e.target.value }))} placeholder="e.g., 3 days, 2 months" disabled={isParsing}/>
                                         </div>
                                     </div>
                                     {/* Associated Symptoms Checkboxes */}
                                      <div className="space-y-3 pt-4 border-t"> {/* Separator */}
                                        <Label>Associated Symptoms (Check all that apply)</Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
                                            {(["stiffness", "weakness", "numbness", "tingling", "swelling"] as const).map((symptom) => (
                                                <div key={symptom} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`cc-${symptom}`}
                                                    checked={!!chiefComplaintsForm[symptom]} // Ensure boolean evaluation
                                                    onCheckedChange={(checked) =>
                                                      setChiefComplaintsForm(prev => ({ ...prev, [symptom]: !!checked })) // Ensure boolean
                                                    }
                                                    disabled={isParsing}
                                                />
                                                <Label htmlFor={`cc-${symptom}`} className="text-sm capitalize font-normal whitespace-nowrap">
                                                    {symptom}
                                                </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                     {/* Optional: Associated Symptoms Text Area */}
                                     <div className="space-y-1">
                                         <Label htmlFor="cc-associated-text">Other Associated Symptoms / Details</Label>
                                         <Textarea id="cc-associated-text" value={chiefComplaintsForm.assosiatedsymtom || ""} onChange={(e) => setChiefComplaintsForm(prev => ({ ...prev, assosiatedsymtom: e.target.value }))} rows={3} placeholder="Describe any other symptoms or provide more detail on checked symptoms" disabled={isParsing}/>
                                     </div>
                                      {/* Optional Save Button */}
                                     {/* <div className="flex justify-end pt-4">
                                         <Button disabled={isParsing} onClick={() => console.log("Manual Save CC clicked")}>Save Chief Complaints Form</Button>
                                     </div> */}
                                 </div>
                            </TabsContent>

                             {/* Examination */}
                            <TabsContent value="examination">
                                <div className="space-y-6 mt-4 border p-4 rounded-md">
                                    <h3 className="text-lg font-semibold mb-4">Objective Examination</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Observation</Label>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="examination-posture">Posture</Label>
                                                    <Select id="examination-posture" value={examinationForm.posture || ""} onValueChange={(value) => setExaminationForm(prev => ({ ...prev, posture: value }))} disabled={isParsing}>
                                                        <SelectTrigger><SelectValue placeholder="Select posture" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="normal">Normal Alignment</SelectItem>
                                                            <SelectItem value="kyphotic">Kyphotic</SelectItem>
                                                            <SelectItem value="lordotic">Lordotic</SelectItem>
                                                            <SelectItem value="scoliotic">Scoliotic</SelectItem>
                                                            <SelectItem value="flat_back">Flat Back</SelectItem>
                                                            <SelectItem value="sway_back">Sway Back</SelectItem>
                                                            <SelectItem value="other">Other (Describe)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label htmlFor="examination-gait">Gait Pattern</Label>
                                                    <Select id="examination-gait" value={examinationForm.gaitpattern || ""} onValueChange={(value) => setExaminationForm(prev => ({ ...prev, gaitpattern: value }))} disabled={isParsing}>
                                                        <SelectTrigger><SelectValue placeholder="Select gait pattern" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="normal">Normal</SelectItem>
                                                            <SelectItem value="antalgic">Antalgic (Painful)</SelectItem>
                                                            <SelectItem value="ataxic">Ataxic (Uncoordinated)</SelectItem>
                                                            <SelectItem value="steppage">Steppage (Foot Drop)</SelectItem>
                                                            <SelectItem value="trendelenburg">Trendelenburg (Hip Drop)</SelectItem>
                                                            <SelectItem value="shuffling">Shuffling (Parkinsonian)</SelectItem>
                                                            <SelectItem value="other">Other (Describe)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {/* Optional: Add Textarea for general observation notes */}
                                                <div>
                                                    <Label htmlFor="examination-observation-notes">Other Observations</Label>
                                                    <Textarea id="examination-observation-notes" rows={2} placeholder="e.g., Swelling noted at knee, guarding posture..." disabled={isParsing}/>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Range of Motion (Specify Joint)</Label>
                                            <p className="text-xs text-gray-500">Enter values (e.g., "Cervical Flexion: 45 deg", "Shoulder Abd: WNL", "Knee Ext: -10 deg")</p>
                                            <div className="space-y-2">
                                                <Input placeholder="Flexion" value={examinationForm.flexion || ""} onChange={(e) => setExaminationForm(prev => ({ ...prev, flexion: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Extension" value={examinationForm.extension || ""} onChange={(e) => setExaminationForm(prev => ({ ...prev, extension: e.target.value }))} disabled={isParsing}/>
                                                <div className="grid grid-cols-2 gap-2">
                                                     <Input placeholder="Lateral Flexion Left" value={examinationForm.lateralflexionleft || ""} onChange={(e) => setExaminationForm(prev => ({ ...prev, lateralflexionleft: e.target.value }))} disabled={isParsing}/>
                                                     <Input placeholder="Lateral Flexion Right" value={examinationForm.lateralflexionright || ""} onChange={(e) => setExaminationForm(prev => ({ ...prev, lateralflexionright: e.target.value }))} disabled={isParsing}/>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                     <Input placeholder="Rotation Left" value={examinationForm.rotationleft || ""} onChange={(e) => setExaminationForm(prev => ({ ...prev, rotationleft: e.target.value }))} disabled={isParsing}/>
                                                     <Input placeholder="Rotation Right" value={examinationForm.rotationright || ""} onChange={(e) => setExaminationForm(prev => ({ ...prev, rotationright: e.target.value }))} disabled={isParsing}/>
                                                </div>
                                                {/* Add more fields if needed for other common movements like Abduction, Adduction, etc. */}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Optional Save Button */}
                                     {/* <div className="flex justify-end pt-4">
                                         <Button disabled={isParsing} onClick={() => console.log("Manual Save Exam clicked")}>Save Examination Form</Button>
                                     </div> */}
                                </div>
                            </TabsContent>

                            {/* Motor */}
                            <TabsContent value="motor">
                                <div className="space-y-6 mt-4 border p-4 rounded-md">
                                    <h3 className="text-lg font-semibold mb-4">Motor Examination (MMT)</h3>
                                     <p className="text-xs text-gray-500 mb-4">Use MRC scale (0-5) or describe (e.g., WNL, weak). Specify L/R if applicable.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Upper Extremity</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {/* Use Select or Input based on preference */}
                                                <Input placeholder="Shoulder Flexors" value={motorForm.shoulderflexer || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, shoulderflexer: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Shoulder Extensors" value={motorForm.shoulderextensors || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, shoulderextensors: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Elbow Flexors" value={motorForm.elbowflexer || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, elbowflexer: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Elbow Extensors" value={motorForm.elbowextensors || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, elbowextensors: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Wrist Flexors" value={motorForm.wristflexer || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, wristflexer: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Wrist Extensors" value={motorForm.wristextensors || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, wristextensors: e.target.value }))} disabled={isParsing}/>
                                                {/* Add fields for Abd/Add, IR/ER, Grip as needed */}
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Lower Extremity</Label>
                                             <div className="grid grid-cols-2 gap-2">
                                                <Input placeholder="Hip Flexors" value={motorForm.hipflexer || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, hipflexer: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Hip Extensors" value={motorForm.hiprextensors || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, hiprextensors: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Knee Flexors" value={motorForm.kneeflexer || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, kneeflexer: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Knee Extensors" value={motorForm.kneeextensors || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, kneeextensors: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Ankle Dorsiflexors" value={motorForm.ankleextensors || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, ankleextensors: e.target.value }))} disabled={isParsing}/>
                                                <Input placeholder="Ankle Plantarflexors" value={motorForm.ankleflexer || ""} onChange={(e) => setMotorForm(prev => ({ ...prev, ankleflexer: e.target.value }))} disabled={isParsing}/>
                                                {/* Add fields for Abd/Add, Inv/Ev as needed */}
                                             </div>
                                        </div>
                                    </div>
                                    {/* Muscle Tone */}
                                     <div className="pt-4 border-t">
                                        <Label htmlFor="motor-tone" className="text-base font-medium">Muscle Tone</Label>
                                        <Select id="motor-tone" value={motorForm.muscletone || ""} onValueChange={(value) => setMotorForm(prev => ({ ...prev, muscletone: value }))} disabled={isParsing}>
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select muscle tone" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="hypotonic">Hypotonic</SelectItem>
                                                <SelectItem value="hypertonic">Hypertonic</SelectItem>
                                                <SelectItem value="spastic">Spastic (Velocity-dependent)</SelectItem>
                                                <SelectItem value="rigid">Rigid (Lead pipe, Cogwheel)</SelectItem>
                                                <SelectItem value="variable">Variable</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     {/* Optional Save Button */}
                                     {/* <div className="flex justify-end pt-4">
                                         <Button disabled={isParsing} onClick={() => console.log("Manual Save Motor clicked")}>Save Motor Form</Button>
                                     </div> */}
                                </div>
                            </TabsContent>

                            {/* Sensory */}
                            <TabsContent value="sensory">
                                <div className="space-y-6 mt-4 border p-4 rounded-md">
                                    <h3 className="text-lg font-semibold mb-4">Sensory Examination</h3>
                                     <p className="text-xs text-gray-500 mb-4">Assess specific dermatomes or areas. Indicate "Intact", "Impaired", "Absent".</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Superficial Sensations</Label>
                                            <div className="space-y-2">
                                                <div>
                                                    <Label htmlFor="sensory-touch">Light Touch</Label>
                                                    <Input id="sensory-touch" value={sensoryForm.touchsensation || ""} onChange={(e) => setSensoryForm(prev => ({ ...prev, touchsensation: e.target.value }))} placeholder="e.g., Intact BUE, Impaired L L5" disabled={isParsing}/>
                                                </div>
                                                <div>
                                                    <Label htmlFor="sensory-pain">Pain (Sharp/Dull)</Label>
                                                     <Input id="sensory-pain" value={sensoryForm.painsensation || ""} onChange={(e) => setSensoryForm(prev => ({ ...prev, painsensation: e.target.value }))} placeholder="e.g., Intact, Hyperalgesia R C6" disabled={isParsing}/>
                                                </div>
                                                <div>
                                                    <Label htmlFor="sensory-temp">Temperature</Label>
                                                     <Input id="sensory-temp" value={sensoryForm.tempraturesensation || ""} onChange={(e) => setSensoryForm(prev => ({ ...prev, tempraturesensation: e.target.value }))} placeholder="e.g., Intact, Absent below knee" disabled={isParsing}/>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Deep Sensations</Label>
                                             <div className="space-y-2">
                                                <div>
                                                    <Label htmlFor="sensory-proprio">Proprioception (Position Sense)</Label>
                                                    <Input id="sensory-proprio" value={sensoryForm.positivesense || ""} onChange={(e) => setSensoryForm(prev => ({ ...prev, positivesense: e.target.value }))} placeholder="e.g., Intact BUE/BLE, Impaired L Ankle" disabled={isParsing}/>
                                                </div>
                                                <div>
                                                    <Label htmlFor="sensory-vibration">Vibration Sense</Label>
                                                     <Input id="sensory-vibration" value={sensoryForm.vibrationsense || ""} onChange={(e) => setSensoryForm(prev => ({ ...prev, vibrationsense: e.target.value }))} placeholder="e.g., Intact, Absent B distal LE" disabled={isParsing}/>
                                                </div>
                                                {/* Optional: Kinesthesia */}
                                                {/* Optional: Cortical Sensations (Stereognosis, 2-point discrimination) */}
                                             </div>
                                        </div>
                                    </div>
                                     {/* Optional Save Button */}
                                     {/* <div className="flex justify-end pt-4">
                                         <Button disabled={isParsing} onClick={() => console.log("Manual Save Sensory clicked")}>Save Sensory Form</Button>
                                     </div> */}
                                </div>
                            </TabsContent>

                            {/* Pediatric */}
                            <TabsContent value="pediatric">
                                <div className="space-y-6 mt-4 border p-4 rounded-md">
                                    <h3 className="text-lg font-semibold mb-4">Pediatric Assessment</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Motor Skills</Label>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="pediatric-gross">Gross Motor Skills</Label>
                                                    <Select id="pediatric-gross" value={pediatricForm.grossmotorskills || ""} onValueChange={(value) => setPediatricForm(prev => ({ ...prev, grossmotorskills: value }))} disabled={isParsing}>
                                                        <SelectTrigger><SelectValue placeholder="Select gross motor status" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="age_appropriate">Age Appropriate</SelectItem>
                                                            <SelectItem value="delayed">Delayed</SelectItem>
                                                            <SelectItem value="impaired">Impaired</SelectItem>
                                                            <SelectItem value="advanced">Advanced</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                     <Textarea className="mt-1 text-sm" rows={2} placeholder="Notes on milestones, quality..." disabled={isParsing}/>
                                                </div>
                                                <div>
                                                    <Label htmlFor="pediatric-fine">Fine Motor Skills</Label>
                                                    <Select id="pediatric-fine" value={pediatricForm.finemotorskills || ""} onValueChange={(value) => setPediatricForm(prev => ({ ...prev, finemotorskills: value }))} disabled={isParsing}>
                                                        <SelectTrigger><SelectValue placeholder="Select fine motor status" /></SelectTrigger>
                                                        <SelectContent>
                                                             <SelectItem value="age_appropriate">Age Appropriate</SelectItem>
                                                             <SelectItem value="delayed">Delayed</SelectItem>
                                                             <SelectItem value="impaired">Impaired</SelectItem>
                                                             <SelectItem value="advanced">Advanced</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Textarea className="mt-1 text-sm" rows={2} placeholder="Notes on grasp, manipulation..." disabled={isParsing}/>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <Label className="text-base font-medium">Reflexes & Reactions</Label>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="pediatric-primitive">Primitive Reflexes</Label>
                                                    <Select id="pediatric-primitive" value={pediatricForm.primitivereflex || ""} onValueChange={(value) => setPediatricForm(prev => ({ ...prev, primitivereflex: value }))} disabled={isParsing}>
                                                        <SelectTrigger><SelectValue placeholder="Assess primitive reflexes" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="integrated">Integrated</SelectItem>
                                                            <SelectItem value="retained">Retained</SelectItem>
                                                            <SelectItem value="absent">Absent</SelectItem>
                                                            <SelectItem value="not_tested">Not Tested</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Textarea className="mt-1 text-sm" rows={2} placeholder="Specify reflexes tested (e.g., ATNR, STNR)" disabled={isParsing}/>
                                                </div>
                                                <div>
                                                    <Label htmlFor="pediatric-postural">Postural Reactions</Label>
                                                    <Select id="pediatric-postural" value={pediatricForm.posturalreflex || ""} onValueChange={(value) => setPediatricForm(prev => ({ ...prev, posturalreflex: value }))} disabled={isParsing}>
                                                        <SelectTrigger><SelectValue placeholder="Assess postural reactions" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="present_appropriate">Present & Appropriate</SelectItem>
                                                            <SelectItem value="delayed">Delayed Emergence</SelectItem>
                                                            <SelectItem value="absent">Absent</SelectItem>
                                                            <SelectItem value="abnormal">Abnormal Pattern</SelectItem>
                                                            <SelectItem value="not_tested">Not Tested</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                     <Textarea className="mt-1 text-sm" rows={2} placeholder="Specify reactions (Righting, Equilibrium, Protective)" disabled={isParsing}/>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                     <div className="pt-4 border-t">
                                        <Label htmlFor="pediatric-balance" className="text-base font-medium">Balance & Coordination</Label>
                                        <Select id="pediatric-balance-select" className="mt-1" value={pediatricForm.balanceandcoord || ""} onValueChange={(value) => setPediatricForm(prev => ({ ...prev, balanceandcoord: value }))} disabled={isParsing}>
                                            <SelectTrigger><SelectValue placeholder="Select balance/coordination status" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="age_appropriate">Age Appropriate</SelectItem>
                                                <SelectItem value="mildly_impaired">Mildly Impaired</SelectItem>
                                                <SelectItem value="moderately_impaired">Moderately Impaired</SelectItem>
                                                <SelectItem value="severely_impaired">Severely Impaired</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Textarea className="mt-1 text-sm" rows={3} placeholder="Describe observations (static/dynamic balance, specific tests, clumsiness, falls)" disabled={isParsing}/>
                                     </div>
                                      {/* Optional Save Button */}
                                     {/* <div className="flex justify-end pt-4">
                                         <Button disabled={isParsing} onClick={() => console.log("Manual Save Peds clicked")}>Save Pediatric Form</Button>
                                     </div> */}
                                </div>
                            </TabsContent>

                        </Tabs>
                         {/* Removed global Save button for Custom Assessment - handled automatically */}
                    </CardContent>
                </Card>
            </TabsContent>
       </Tabs>

        {/* Optional: Add Dialog component here for manual SOAP entry/edit if needed */}

    </div>
  );
};

export default Consultation;