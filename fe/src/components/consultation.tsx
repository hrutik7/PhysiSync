import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea"; // Still needed for custom forms and potentially edit dialog
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";
// import { RadioGroup, RadioGroupItem } from "./ui/radio-group"; // Not used in provided custom forms
import { Checkbox } from "./ui/checkbox";
import { Mic, MicOff, Loader2, Edit2, Trash2, PlusCircle } from "lucide-react"; // Added PlusCircle
import { toast } from "sonner";
import axios from "axios";
import Activepatient from "./activepatient";
import {
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
} from "./ui/table";
// Optional: Import Dialog components if adding manual entry via dialog
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "./ui/dialog";

// Assume these are correctly configured
const API_URL = import.meta.env.VITE_API_BASE_URL;
const GROQ_API_URL = import.meta.env.VITE_GROQ_API_URL;
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const groqApi = axios.create({
  baseURL: GROQ_API_URL,
  headers: {
    Authorization: `Bearer ${GROQ_API_KEY}`,
  },
});

type SOAPNoteType = "subjective" | "objective" | "assessment" | "plan";

interface SOAPNote {
  id: number;
  date: string;
  type: SOAPNoteType;
  content: string;
}
interface Investigation {
  id: string;
  date: string;
  reporttype: string;
  description: string;
  files?: File[];
}

interface File {
  id: string;
  fileName: string;
  originalName: string;
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
  const [transcription, setTranscription] = useState<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [patientId, setPatientId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedInvestigation, setSelectedInvestigation] =
    useState<Investigation | null>(null);
  const [formData, setFormData] = useState<any>({
    date: new Date().toISOString().split("T")[0],
    reportType: "",
    description: "",
    files: [] as any | null,
    doctorId: "",
    patientId: "",
  });
  // --- SOAP states ---
  const [soapNotes, setSOAPNotes] = useState<SOAPNote[]>([]);
  const [activeSoapSubTab, setActiveSoapSubTab] =
    useState<SOAPNoteType>("subjective"); // Track active S-O-A-P sub-tab
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // --- Patient state ---
  // const [patientId, setPatientId] = useState<string>("");
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);

  // --- Custom assessment states (Ensure these are updated by `analyzeAndSaveData`) ---
  const [painForm, setPainForm] = useState({
    painsevirity: 1,
    painDiurnal: "none",
    date: "",
    painsite: "",
    painnature: "",
    painonset: "",
    painduration: "",
    painside: "",
    paintrigger: "",
    painadl: "",
    painAggravating: "",
    painRelieving: "",
  });
  const [historyForm, setHistoryForm] = useState({
    age: "",
    gender: "",
    occupation: "",
    previosmedicalconditions: "",
    previossurgery: "",
    currentmedication: "",
    medications: "",
    physicalactivitylevel: "",
    sleeppattern: "",
    smoking: "",
  });
  const [chiefComplaintsForm, setChiefComplaintsForm] = useState({
    primarycomplaint: "",
    onset: "",
    duration: "",
    assosiatedsymtom: "",
    stiffness: false,
    weakness: false,
    numbness: false,
    tingling: false,
    swelling: false,
  });
  const [examinationForm, setExaminationForm] = useState({
    posture: "",
    gaitpattern: "",
    flexion: "",
    extension: "",
    lateralflexionleft: "",
    lateralflexionright: "",
    rotationright: "",
    rotationleft: "",
  });
  const [motorForm, setMotorForm] = useState({
    shoulderflexer: "",
    shoulderextensors: "",
    elbowflexer: "",
    elbowextensors: "",
    wristflexer: "",
    wristextensors: "",
    hipflexer: "",
    hiprextensors: "",
    kneeflexer: "",
    kneeextensors: "",
    ankleextensors: "",
    ankleflexer: "",
    muscletone: "",
  });
  const [sensoryForm, setSensoryForm] = useState({
    touchsensation: "",
    painsensation: "",
    tempraturesensation: "",
    positivesense: "",
    vibrationsense: "",
  });
  const [pediatricForm, setPediatricForm] = useState({
    grossmotorskills: "",
    finemotorskills: "",
    primitivereflex: "",
    posturalreflex: "",
    balanceandcoord: "",
  });

  // --- Custom assessment data state ---
  const [customAssessmentData, setCustomAssessmentData] = useState<any>(null);

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
  const mapResponseToNotes = (
    responseData: any[],
    type: SOAPNoteType
  ): SOAPNote[] => {
    if (!Array.isArray(responseData)) {
      console.warn(
        `Expected array but received ${typeof responseData} for type ${type}`
      );
      return [];
    }
    return responseData.map((note) => ({
      id: note.id,
      date: note.date || new Date().toISOString(),
      type: type,
      content: note.content || "",
    }));
  };
  const handleViewInvestigation = (investigation: any) => {
    console.log(investigation);
    setSelectedFile(investigation.fileName);
    setSelectedInvestigation(investigation);
  };

  // --- Fetch ALL existing SOAP notes for the patient ---
  const fetchAllSOAPNotes = async (currentPatientId: string) => {
    if (!currentPatientId) return;

    setIsLoadingNotes(true);
    console.log(`Fetching SOAP notes for patient ID: ${currentPatientId}`);
    try {
      const [subjectiveRes, objectiveRes, assessmentRes, planRes] =
        await Promise.all([
          api.get(`/soap/subjective/${currentPatientId}`).catch((err) => {
            console.error("Error fetching subjective:", err);
            return { data: [] };
          }),
          api.get(`/soap/objective/${currentPatientId}`).catch((err) => {
            console.error("Error fetching objective:", err);
            return { data: [] };
          }),
          api.get(`/soap/assessment/${currentPatientId}`).catch((err) => {
            console.error("Error fetching assessment:", err);
            return { data: [] };
          }),
          api.get(`/soap/plan/${currentPatientId}`).catch((err) => {
            console.error("Error fetching plan:", err);
            return { data: [] };
          }),
        ]);

      const subjectiveNotes = mapResponseToNotes(
        subjectiveRes.data || [],
        "subjective"
      );
      const objectiveNotes = mapResponseToNotes(
        objectiveRes.data || [],
        "objective"
      );
      const assessmentNotes = mapResponseToNotes(
        assessmentRes.data || [],
        "assessment"
      );
      const planNotes = mapResponseToNotes(planRes.data || [], "plan");

      const allNotes = [
        ...subjectiveNotes,
        ...objectiveNotes,
        ...assessmentNotes,
        ...planNotes,
      ];

      allNotes.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      console.log("Fetched SOAP Notes:", allNotes);
      setSOAPNotes(allNotes);
    } catch (error) {
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

  // --- Start/Stop Recording (Keep existing logic) ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: "audio/webm;codecs=opus" }; // Specify mimeType if needed, browsers often choose well
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn(
          "Requested mimeType 'audio/webm;codecs=opus' not supported, trying default."
        );
        recorder = new MediaRecorder(stream); // Fallback to browser default
      }

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Ensure there's data
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          console.warn("No audio data collected.");
          toast.warning("No audio data was recorded.");
          setIsParsing(false); // Ensure parsing state is reset
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType,
        }); // Use the recorder's mimeType
        // setRecordedAudio(audioBlob); // Keep if needed for download/playback feature
        await processAudioToTranscript(audioBlob);
      };

      recorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // This triggers the onstop handler above
      setIsRecording(false);
      // Stop media stream tracks *after* onstop is likely done processing the blob
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      toast.success("Recording stopped, processing...");
    }
  };

  // --- Process audio: Transcribe -> Analyze -> Save -> Update UI (Keep existing logic) ---
  const processAudioToTranscript = async (audioBlob: Blob) => {
    if (!patientId) {
      toast.error("Cannot process recording: No active patient selected.");
      return;
    }
    const doctorId = getDoctorId();
    if (!doctorId) {
      toast.error("Cannot process recording: Doctor ID not found.");
      return;
    }

    setIsParsing(true);
    setTranscription(""); // Clear previous

    try {
      console.log("Audio Blob size:", audioBlob.size, "Type:", audioBlob.type);
      if (audioBlob.size === 0) {
        throw new Error("Recorded audio blob is empty.");
      }

      // 1. Get transcription
      const transcriptionResult = await getTranscription(audioBlob);
      setTranscription(transcriptionResult);

      // Optional: Language detection and translation

      // 2. Analyze and Save (using the final transcription)
      await analyzeAndSaveData(transcriptionResult, patientId, doctorId);

      toast.success("Conversation processed and notes updated.");
    } catch (error: any) {
      console.error("Error processing audio to transcript:", error);
      toast.error(`Processing failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsParsing(false);
    }
  };

  // --- Get transcription from Groq API (Keep existing) ---
  const getTranscription = async (audioBlob: Blob): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("model", "whisper-large-v3");
      // Explicitly name the file with a common extension Whisper might expect
      formData.append("file", audioBlob, "recording.webm"); // Use .webm or .wav
      formData.append("response_format", "text");

      console.log("Sending audio to Groq Whisper...");
      const response = await axios.post(
        `${GROQ_API_URL}/audio/transcriptions`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
        }
      );
      console.log("Transcription received:", response.data);
      if (
        typeof response.data === "string" &&
        response.data.trim().length > 0
      ) {
        return response.data;
      } else if (typeof response.data === "string") {
        console.warn("Transcription result is empty.");
        return ""; // Return empty string if transcription is empty
      } else {
        console.warn(
          "Unexpected transcription response format:",
          response.data
        );
        return response.data?.text || "";
      }
    } catch (error: any) {
      console.error(
        "Error transcribing audio:",
        error.response?.data || error.message
      );
      throw new Error(
        `Failed to transcribe audio: ${
          error.response?.data?.error?.message || error.message
        }`
      );
    }
  };

  // --- Analyze transcription, SAVE data, and REFRESH notes list (Keep existing logic) ---
  // Ensure this function correctly updates the custom form states (setPainForm, setHistoryForm, etc.)
  const analyzeAndSaveData = async (
    transcription: string,
    currentPatientId: string,
    currentDoctorId: number
  ) => {
    console.log("Analyzing transcription:", transcription);
    let soapSaved = false;
    let customUpdatesMade = false;

    try {
      const response = await groqApi.post("/chat/completions", {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `You are an AI medical documentation specialist for physiotherapy. Analyze the doctor-patient conversation transcript. Extract information for SOAP notes and specific custom assessment fields based ONLY on the provided text. If information for a field isn't mentioned, omit it. Format the response as a JSON object with keys "soap" and "custom".

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
      "painsevirity": number (1-10) | null,
      "painDiurnal": "constant" | "intermittent" | ... | null,
      "painsite": string | null,
      "painnature": string | null,
      "painonset": string | null,
      "painduration": string | null,
      "painside": string | null,
      "paintrigger": string | null,
      "painadl": string | null,
      "painAggravating": string | null,
      "painRelieving": string | null
    },
    "history": {
      "age": string | null,
      "gender": string | null,
      "occupation": string | null,
      "previosmedicalconditions": string | null,
      "previossurgery": string | null,
      "currentmedication": string | null,
      "physicalactivitylevel": string | null,
      "sleeppattern": string | null,
      "smoking": string | null
    },
    "chiefComplaints": {
      "primarycomplaint": string | null,
      "onset": string | null,
      "duration": string | null,
      "assosiatedsymtom": string | null,
      "stiffness": boolean | null,
      "weakness": boolean | null,
      "numbness": boolean | null,
      "tingling": boolean | null,
      "swelling": boolean | null
    },
    "examination": {
      "posture": string | null,
      "gaitpattern": string | null,
      "flexion": string | null,
      "extension": string | null,
      "lateralflexionleft": string | null,
      "lateralflexionright": string | null,
      "rotationright": string | null,
      "rotationleft": string | null
    },
    "motor": {
      "shoulderflexer": string | null,
      "shoulderextensors": string | null,
      "elbowflexer": string | null,
      "elbowextensors": string | null,
      "wristflexer": string | null,
      "wristextensors": string | null,
      "hipflexer": string | null,
      "hiprextensors": string | null,
      "kneeflexer": string | null,
      "kneeextensors": string | null,
      "ankleextensors": string | null,
      "ankleflexer": string | null,
      "muscletone": string | null
    },
    "sensory": {
      "touchsensation": string | null,
      "painsensation": string | null,
      "tempraturesensation": string | null,
      "positivesense": string | null,
      "vibrationsense": string | null
    },
    "pediatric": {
      "grossmotorskills": string | null,
      "finemotorskills": string | null,
      "primitivereflex": string | null,
      "posturalreflex": string | null,
      "balanceandcoord": string | null
    }
  }
}

Important: Extract verbatim or very close summaries. Do NOT infer information not present in the text. Use null for fields not found. For boolean fields (like stiffness), return true if mentioned positively, false if explicitly denied, and null otherwise.`,
          },
          {
            role: "user",
            content: transcription,
          },
        ],
        response_format: { type: "json_object" },
      });

      console.log("Groq Analysis Response:", response.data);

      let extractedData;
      try {
        const messageContent = response.data.choices[0].message.content;
        extractedData =
          typeof messageContent === "string"
            ? JSON.parse(messageContent)
            : messageContent;
        if (!extractedData || typeof extractedData !== "object") {
          throw new Error("Parsed content is not a valid object.");
        }
      } catch (parseError) {
        console.error("Error parsing Groq JSON response:", parseError);
        console.error("Raw content:", response.data.choices[0].message.content);
        toast.error("AI analysis returned an invalid format.");
        return;
      }

      // --- Process and SAVE SOAP Notes ---
      if (extractedData.soap && typeof extractedData.soap === "object") {
        const soapData = extractedData.soap;
        const savePromises: Promise<any>[] = [];
        const date = new Date().toISOString();

        const processAndSave = (type: SOAPNoteType) => {
          const content = soapData[type];
          if (content && String(content).trim()) {
            console.log(`Saving ${type}:`, String(content).trim());
            savePromises.push(
              api
                .post(`/soap/${type}`, {
                  patientId: currentPatientId,
                  content: String(content).trim(),
                  doctorId: currentDoctorId,
                  date: date,
                  role: "CLINIC",
                })
                .catch((err) => {
                  console.error(
                    `Failed to save ${type}:`,
                    err.response?.data || err.message
                  );
                  throw err;
                })
            );
          }
        };

        processAndSave("subjective");
        processAndSave("objective");
        processAndSave("assessment");
        processAndSave("plan");

        if (savePromises.length > 0) {
          await Promise.all(savePromises);
          soapSaved = true;
          console.log("SOAP notes saved successfully via API.");
        } else {
          console.log("No valid SOAP content detected in transcript to save.");
        }
      }

      // --- Process and Update Custom Assessment Forms ---
      if (extractedData.custom && typeof extractedData.custom === "object") {
        const customData = extractedData.custom;
        setCustomAssessmentData(customData);

        // Update form states without API calls
        updateFormState(setPainForm, customData.pain);
        updateFormState(setHistoryForm, customData.history);
        updateFormState(setChiefComplaintsForm, customData.chiefComplaints);
        updateFormState(setExaminationForm, customData.examination);
        updateFormState(setMotorForm, customData.motor);
        updateFormState(setSensoryForm, customData.sensory);
        updateFormState(setPediatricForm, customData.pediatric);

        toast.info(
          "Custom assessment forms populated. Click 'Save Custom Assessments' to save."
        );
      }

      // --- REFRESH the SOAP Notes History Table ---
      if (soapSaved) {
        console.log("Refreshing SOAP notes history table...");
        await fetchAllSOAPNotes(currentPatientId);
        toast.success("SOAP notes history updated.");
      }
    } catch (error: any) {
      console.error("Error during analysis or saving:", error);
      if (axios.isAxiosError(error) && error.response) {
        toast.error(
          `Analysis/Save Error: ${
            error.response.data?.message || error.message
          }`
        );
      } else {
        toast.error(
          `Analysis/Save Error: ${error.message || "An unknown error occurred"}`
        );
      }
    }
  };

  // Helper to update form state without API calls
  const updateFormState = (
    setter: Function,
    data: object | null | undefined
  ) => {
    if (data && typeof data === "object") {
      // Convert null/undefined values to empty strings and ensure all fields exist
      const processedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === null || value === undefined ? "" : value,
        ])
      );

      // Update form state with processed data
      setter((prev: any) => {
        const updatedState = { ...prev };
        Object.entries(processedData).forEach(([key, value]) => {
          updatedState[key] = value;
        });
        return updatedState;
      });

      console.log(`Updated form state:`, processedData);
    }
  };

  // Function to save all custom assessments
  const saveCustomAssessments = async () => {
    if (!customAssessmentData) {
      toast.error("No custom assessment data to save");
      return;
    }

    try {
      const savePromises: Promise<any>[] = [];
      const date = new Date().toISOString();

      const saveAssessment = (data: any, endpoint: string) => {
        if (data && typeof data === "object") {
          // Convert all null/undefined values to empty strings
          const processedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [
              key,
              value === null || value === undefined ? "" : value,
            ])
          );

          const payload = {
            ...processedData,
            patientId: patientId,
            doctorId: getDoctorId(),
            date: date,
            role: "CLINIC",
          };

          console.log(`Saving to ${endpoint}:`, payload);

          savePromises.push(
            api.post(endpoint, payload).catch((err) => {
              console.error(
                `Failed to save ${endpoint}:`,
                err.response?.data || err.message
              );
              throw err;
            })
          );
        }
      };

      // Save each assessment type
      saveAssessment(customAssessmentData.pain, `${API_URL}/custom/pain`);
      saveAssessment(customAssessmentData.history, `${API_URL}/custom/history`);
      saveAssessment(
        customAssessmentData.chiefComplaints,
        `${API_URL}/custom/chief-complaints`
      );
      saveAssessment(
        customAssessmentData.examination,
        `${API_URL}/custom/examination`
      );
      saveAssessment(
        customAssessmentData.motor,
        `${API_URL}/custom/motor-examination`
      );
      saveAssessment(
        customAssessmentData.sensory,
        `${API_URL}/custom/sensory-examination`
      );
      saveAssessment(
        customAssessmentData.pediatric,
        `${API_URL}/custom/pediatric-examination`
      );

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        toast.success("Custom assessments saved successfully");
      } else {
        toast.warning("No custom assessment data to save");
      }
    } catch (error: any) {
      console.error("Error saving custom assessments:", error);
      toast.error(`Failed to save custom assessments: ${error.message}`);
    }
  };

  // --- Handle Edit/Delete for SOAP History Table (Keep existing logic) ---
  const handleEdit = (note: SOAPNote) => {
    // TODO: Implement editing logic (e.g., open a modal pre-filled with note.content)
    console.log("Edit Note:", note);
    toast.info(
      `Edit functionality for ${note.type} ID ${note.id} needs implementation (e.g., using a Dialog).`
    );
    // Example: setEditNoteData(note); setIsEditDialogOpen(true);
  };

  const fetchInvestigations = async (patientId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/investigate/getinvestigation?patientId=${patientId}`
      );

      console.log(response);
      setRecords(response.data);
    } catch (error) {
      console.error("Error fetching investigations:", error);
      toast.error("Failed to fetch investigations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvestigation = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this investigation?")) {
      try {
        await axios.delete(
          `${API_URL}/investigate/deleteinvestigation/${id}`
        );
        fetchInvestigations(patientId);
        toast.success("Investigation deleted successfully");
      } catch (error) {
        console.error("Error deleting investigation:", error);
        toast.error("Failed to delete investigation. Please try again.");
      }
    }
  };
  const downloadFile = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download file. Please try again.');
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
  
      if (!formData.date || !formData.reportType) {
        toast.error("Please fill in all required fields.");
        return;
      }
  
      try {
        setLoading(true);
        const doctorId = JSON.parse(localStorage.getItem("user") || "{}")?.user?.id;
        const submitData = new FormData();
        
        submitData.set("patientId", patientId);
        submitData.set("doctorId", doctorId);
        submitData.set("date", formData.date);
        submitData.set("reporttype", formData.reportType);
        submitData.set("description", formData.description);
        
        if (formData.files) {
          for (let i = 0; i < formData.files.length; i++) {
            submitData.append("files", formData.files[i]);
          }
        }
       
        await axios.post(
          `${API_URL}/investigate/investigatepatient`,
          submitData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
  
        fetchInvestigations(patientId);
  
        setFormData({
          date: new Date().toISOString().split("T")[0],
          reportType: "",
          description: "",
          files: null,
        });
  
        toast.success("Investigation record added successfully");
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Failed to add investigation record. Please try again.");
      } finally {
        setLoading(false);
      }
    };

  const handleDelete = async (id: number, type: SOAPNoteType) => {
    if (!patientId) return;
    console.log(`Attempting to delete ${type} note with ID: ${id}`);
    // Optional: Add confirmation dialog here
    try {
      setIsLoadingNotes(true); // Show loading indicator during delete
      await api.delete(`/soap/${type}/${id}`);
      toast.success(`${type} note deleted successfully`);
      await fetchAllSOAPNotes(patientId); // Refresh list after delete
    } catch (error: any) {
      console.error("Error deleting note:", error);
      toast.error(
        error.response?.data?.message || `Failed to delete ${type} note`
      );
      setIsLoadingNotes(false); // Ensure loading state is reset on error
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev:any) => ({
        ...prev,
        files: e.target.files,
      }));
    };

const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev:any) => ({
      ...prev,
      [name]: value,
    }));
  };
  // --- Helper Component for Rendering SOAP History Table ---
  const SoapHistoryTable = ({
    notes,
    type,
  }: {
    notes: SOAPNote[];
    type: SOAPNoteType;
  }) => {
    const filteredNotes = notes.filter((note) => note.type === type);

    if (isLoadingNotes && filteredNotes.length === 0) {
      // Show loader only if list is empty during load
      return (
        <div className="flex justify-center items-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading {type} Notes...</span>
        </div>
      );
    }

    if (!isLoadingNotes && filteredNotes.length === 0) {
      return (
        <p className="text-center text-gray-500 py-4">
          No {type} notes recorded yet.
        </p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Date</TableHead>
            <TableHead>Content</TableHead>
            <TableHead className="w-[100px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredNotes.map((note) => (
            <TableRow key={`${note.type}-${note.id}`}>
              <TableCell>{new Date(note.date).toLocaleDateString()}</TableCell>
              <TableCell>
                <p className="line-clamp-3" title={note.content}>
                  {" "}
                  {/* Allow more lines */}
                  {note.content}
                </p>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon" // Make buttons smaller icons
                    onClick={() => handleEdit(note)}
                    title={`Edit ${type} Note`}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(note.id, note.type)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-100"
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
    );
  };

  // --- Render Logic ---
  if (isLoadingPatient) {
    return <div className="p-4">Loading patient data...</div>;
  }

  if (!patientId) {
    return (
      <div className="p-4">
        <Activepatient />
        <p className="mt-4 text-center text-gray-500">
          Please select an active patient to proceed.
        </p>
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
        <CardContent className="flex justify-center items-center gap-4">
          {isParsing && (
            <div className="flex items-center gap-2 text-blue-600 animate-pulse">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing Conversation...</span>
            </div>
          )}
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "outline"}
            className={`flex items-center gap-2 ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "border-blue-500 text-blue-500 hover:bg-blue-50"
            }`}
            disabled={isParsing || !patientId}
            title={
              !patientId
                ? "Select a patient first"
                : isRecording
                ? "Stop Recording"
                : "Start Recording"
            }
          >
            {isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
            {isRecording ? "Stop Recording" : "Start Recording"}
          </Button>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="soap" className="w-full">
        {/* Only SOAP and Custom Assessment Tabs */}
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="investigate">Investigate</TabsTrigger>
          <TabsTrigger value="soap">SOAP Notes</TabsTrigger>
          <TabsTrigger value="custom">Custom Assessment</TabsTrigger>
        </TabsList>

        {/* SOAP Notes Tab */}

        <TabsContent value="investigate">
          <div>
            <Dialog
              open={!!selectedInvestigation}
              onOpenChange={() => setSelectedInvestigation(null)}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Investigation Details</DialogTitle>
                </DialogHeader>

                {selectedInvestigation && (
                  <div className="space-y-4">
                    <div>
                      <label className="font-medium">Date:</label>
                      <p>{selectedInvestigation.date}</p>
                    </div>
                    <div>
                      <label className="font-medium">Report Type:</label>
                      <p>{selectedInvestigation.reporttype}</p>
                    </div>
                    <div>
                      <label className="font-medium">Description:</label>
                      <p>
                        {selectedInvestigation.description || "No description"}
                      </p>
                    </div>
                    <div>
                      <label className="font-medium">Files:</label>
                      {selectedInvestigation.files?.length ? (
                        <div className="mt-2 space-y-2">
                          {selectedInvestigation.files.map((file) => (
                            <a
                              key={file.id}
                              onClick={() =>
                                downloadFile(
                                  `${API_URL}/investigate/download/${file.fileName}`,
                                  file.originalName
                                )
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 hover:text-blue-800"
                            >
                              <span className="mr-2">📄</span>
                              {file.originalName}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No files attached</p>
                      )}
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Card>
              {/* {selectedFile.originalName.match(/\.(jpe?g|png|gif)$/i) && (
  <img 
    src={`${API_URL}/uploads/${selectedFile.fileName}`} 
    alt="Preview" 
    className="mt-2 max-h-40 object-contain"
  />
)} */}
              <CardContent className="p-6">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="font-medium">Date</label>
                      <Input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-medium">Report Type</label>
                      <Input
                        type="text"
                        name="reportType"
                        placeholder="Eg: Scan, X-Ray, Blood Report"
                        value={formData.reportType}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-medium">Documents</label>
                    <Input
                      type="file"
                      className="cursor-pointer"
                      multiple
                      onChange={handleFileChange}
                    />
                    {formData.files && formData.files.length > 0 && (
                      <div className="text-sm text-gray-500">
                        {Array.from(formData.files).map((file: any, index) => (
                          <div key={index}>
                            {file.name} ({Math.round(file.size / 1024)} KB)
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="font-medium">Description</label>
                    <Textarea
                      className="min-h-[100px]"
                      placeholder="Enter description here..."
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFormData({
                            date: new Date().toISOString().split("T")[0],
                            reportType: "",
                            description: "",
                            files: null,
                          });
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-blue-600 text-white hover:bg-blue-700"
                        disabled={loading}
                      >
                        {loading ? "Submitting..." : "Submit"}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Report Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : records.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-gray-500"
                        >
                          No investigation records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      records?.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.date}</TableCell>
                          <TableCell>{record.reporttype}</TableCell>
                          <TableCell>{record.description}</TableCell>
                          <TableCell>
                            {record.files && record.files.length > 0 ? (
                              <span className="text-sm">
                                {record.files.length} file(s)
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">
                                No files
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-800"
                                onClick={() => handleViewInvestigation(record)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  className="lucide lucide-eye"
                                >
                                  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                                onClick={() =>
                                  handleDeleteInvestigation(record.id)
                                }
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  className="lucide lucide-trash-2"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  <line x1="10" x2="10" y1="11" y2="17" />
                                  <line x1="14" x2="14" y1="11" y2="17" />
                                </svg>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="soap">
          <Card>
            <CardHeader>
              {/* Removed static CardTitle, title comes from sub-tabs */}
            </CardHeader>
            <CardContent>
              {/* S-O-A-P Sub-Tabs */}
              <Tabs
                value={activeSoapSubTab}
                onValueChange={(value) =>
                  setActiveSoapSubTab(value as SOAPNoteType)
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="subjective">Subjective</TabsTrigger>
                  <TabsTrigger value="objective">Objective</TabsTrigger>
                  <TabsTrigger value="assessment">Assessment</TabsTrigger>
                  <TabsTrigger value="plan">Plan</TabsTrigger>
                </TabsList>

                {/* Content for each S-O-A-P Sub-Tab - Shows History Table */}
                {(
                  [
                    "subjective",
                    "objective",
                    "assessment",
                    "plan",
                  ] as SOAPNoteType[]
                ).map((type) => (
                  <TabsContent
                    key={type}
                    value={type}
                    className="mt-4 space-y-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xl font-semibold capitalize">
                        {type} History
                      </h3>
                      {/* Optional: Add button to trigger manual entry dialog */}
                      {/* <Button variant="outline" size="sm" onClick={() => openManualAddDialog(type)}>
                                             <PlusCircle className="h-4 w-4 mr-2" />
                                             Add Manual {type.charAt(0).toUpperCase() + type.slice(1)} Note
                                         </Button> */}
                    </div>
                    <SoapHistoryTable notes={soapNotes} type={type} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Assessment Tab (Content remains the same) */}
        <TabsContent value="custom">
          <Card>
            <CardHeader className="flex justify-between flex-row">
              <CardTitle className="py-2">Custom Assessment</CardTitle>
              <Button
                onClick={saveCustomAssessments}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save Custom Assessments
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pain" className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="pain">Pain</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="chiefComplaints">
                    Chief Complaints
                  </TabsTrigger>
                  <TabsTrigger value="examination">Examination</TabsTrigger>
                  <TabsTrigger value="motor">Motor</TabsTrigger>
                  <TabsTrigger value="sensory">Sensory</TabsTrigger>
                  <TabsTrigger value="pediatric">Pediatric</TabsTrigger>
                </TabsList>

                {/* Pain Assessment */}
                <TabsContent value="pain">
                  <div className="space-y-6 mt-4">
                    {/* Pain Severity and Characteristics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Pain Severity & Characteristics
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label>Pain Severity (1-10)</Label>
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[painForm.painsevirity]}
                                onValueChange={(value) =>
                                  setPainForm((prev) => ({
                                    ...prev,
                                    painsevirity: value[0],
                                  }))
                                }
                                max={10}
                                min={1}
                                step={1}
                                className="flex-1"
                              />
                              <span className="text-sm font-medium">
                                {painForm.painsevirity}/10
                              </span>
                            </div>
                          </div>
                          {/* ... other pain fields using painForm ... */}
                          <div>
                            <Label>Pain Pattern</Label>
                            <Select
                              value={painForm.painDiurnal || ""}
                              onValueChange={(value) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  painDiurnal: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select pain pattern" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* ... options ... */}
                                <SelectItem value="constant">
                                  Constant
                                </SelectItem>
                                <SelectItem value="intermittent">
                                  Intermittent
                                </SelectItem>
                                {/* etc */}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Pain Nature</Label>
                            <Select
                              value={painForm.painnature || ""}
                              onValueChange={(value) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  painnature: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select pain nature" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* ... options ... */}
                                <SelectItem value="sharp">Sharp</SelectItem>
                                <SelectItem value="dull">Dull</SelectItem>
                                {/* etc */}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      {/* Pain Location and Timing */}
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Pain Location & Timing
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label>Pain Site</Label>
                            <Input
                              value={painForm.painsite || ""}
                              onChange={(e) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  painsite: e.target.value,
                                }))
                              }
                              placeholder="e.g., Lower back"
                            />
                          </div>
                          {/* ... other pain fields ... */}
                          <div>
                            <Label>Pain Side</Label>
                            <Select
                              value={painForm.painside || ""}
                              onValueChange={(value) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  painside: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select side" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* ... options ... */}
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Onset</Label>
                            <Select
                              value={painForm.painonset || ""}
                              onValueChange={(value) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  painonset: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select onset" />
                              </SelectTrigger>
                              <SelectContent>
                                {/* ... options ... */}
                                <SelectItem value="sudden">Sudden</SelectItem>
                                <SelectItem value="gradual">Gradual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Duration</Label>
                            <Input
                              value={painForm.painduration || ""}
                              onChange={(e) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  painduration: e.target.value,
                                }))
                              }
                              placeholder="e.g., 2 weeks"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Pain Triggers and Impact */}
                    <div className="space-y-4">
                      <Label className="text-base font-medium">
                        Pain Triggers & Impact
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label>Aggravating Factors</Label>
                            <Textarea
                              value={painForm.painAggravating || ""}
                              onChange={(e) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  painAggravating: e.target.value,
                                }))
                              }
                              placeholder="What makes the pain worse?"
                            />
                          </div>
                          <div>
                            <Label>Relieving Factors</Label>
                            <Textarea
                              value={painForm.painRelieving || ""}
                              onChange={(e) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  painRelieving: e.target.value,
                                }))
                              }
                              placeholder="What makes the pain better?"
                            />
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label>Impact on Daily Activities (ADL)</Label>
                            <Textarea
                              value={painForm.painadl || ""}
                              onChange={(e) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  painadl: e.target.value,
                                }))
                              }
                              placeholder="How does pain affect daily activities?"
                            />
                          </div>
                          <div>
                            <Label>Trigger Points/Actions</Label>
                            <Textarea
                              value={painForm.paintrigger || ""}
                              onChange={(e) =>
                                setPainForm((prev) => ({
                                  ...prev,
                                  paintrigger: e.target.value,
                                }))
                              }
                              placeholder="Specific movements or positions"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* History */}
                <TabsContent value="history">
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Demographics
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="history-age">Age</Label>
                            <Input
                              id="history-age"
                              value={historyForm.age || ""}
                              onChange={(e) =>
                                setHistoryForm((prev) => ({
                                  ...prev,
                                  age: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="history-gender">Gender</Label>
                            <Select
                              value={historyForm.gender || ""}
                              onValueChange={(value) =>
                                setHistoryForm((prev) => ({
                                  ...prev,
                                  gender: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="history-occupation">
                              Occupation
                            </Label>
                            <Input
                              id="history-occupation"
                              value={historyForm.occupation || ""}
                              onChange={(e) =>
                                setHistoryForm((prev) => ({
                                  ...prev,
                                  occupation: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Medical History
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="history-conditions">
                              Previous Medical Conditions
                            </Label>
                            <Textarea
                              id="history-conditions"
                              value={historyForm.previosmedicalconditions || ""}
                              onChange={(e) =>
                                setHistoryForm((prev) => ({
                                  ...prev,
                                  previosmedicalconditions: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="history-surgery">
                              Previous Surgery
                            </Label>
                            <Textarea
                              id="history-surgery"
                              value={historyForm.previossurgery || ""}
                              onChange={(e) =>
                                setHistoryForm((prev) => ({
                                  ...prev,
                                  previossurgery: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="history-medication">
                              Current Medication
                            </Label>
                            <Textarea
                              id="history-medication"
                              value={historyForm.currentmedication || ""}
                              onChange={(e) =>
                                setHistoryForm((prev) => ({
                                  ...prev,
                                  currentmedication: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Lifestyle Factors
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="history-activity">
                              Physical Activity Level
                            </Label>
                            <Select
                              value={historyForm.physicalactivitylevel || ""}
                              onValueChange={(value) =>
                                setHistoryForm((prev) => ({
                                  ...prev,
                                  physicalactivitylevel: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select activity level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sedentary">
                                  Sedentary
                                </SelectItem>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="moderate">
                                  Moderate
                                </SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="very_active">
                                  Very Active
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="history-sleep">Sleep Pattern</Label>
                            <Select
                              value={historyForm.sleeppattern || ""}
                              onValueChange={(value) =>
                                setHistoryForm((prev) => ({
                                  ...prev,
                                  sleeppattern: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select sleep pattern" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="disturbed">
                                  Disturbed
                                </SelectItem>
                                <SelectItem value="insomnia">
                                  Insomnia
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="history-smoking">
                              Smoking Status
                            </Label>
                            <Select
                              value={historyForm.smoking || ""}
                              onValueChange={(value) =>
                                setHistoryForm((prev) => ({
                                  ...prev,
                                  smoking: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select smoking status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="never">
                                  Never Smoked
                                </SelectItem>
                                <SelectItem value="former">
                                  Former Smoker
                                </SelectItem>
                                <SelectItem value="current">
                                  Current Smoker
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Chief Complaints */}
                <TabsContent value="chiefComplaints">
                  <div className="space-y-6 mt-4">
                    <div className="space-y-1">
                      <Label htmlFor="cc-primary">Primary Complaint</Label>
                      <Textarea
                        id="cc-primary"
                        value={chiefComplaintsForm.primarycomplaint || ""}
                        onChange={(e) =>
                          setChiefComplaintsForm((prev) => ({
                            ...prev,
                            primarycomplaint: e.target.value,
                          }))
                        }
                      />
                    </div>
                    {/* Onset, Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* ... */}
                    </div>
                    {/* Associated Symptoms Checkboxes */}
                    <div className="space-y-3">
                      <Label>Associated Symptoms</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
                        {" "}
                        {/* Adjusted grid cols */}
                        {(
                          [
                            "stiffness",
                            "weakness",
                            "numbness",
                            "tingling",
                            "swelling",
                          ] as const
                        ).map((symptom) => (
                          <div
                            key={symptom}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`cc-${symptom}`}
                              checked={!!chiefComplaintsForm[symptom]} // Ensure boolean evaluation
                              onCheckedChange={
                                (checked) =>
                                  setChiefComplaintsForm((prev) => ({
                                    ...prev,
                                    [symptom]: !!checked,
                                  })) // Ensure boolean
                              }
                            />
                            <Label
                              htmlFor={`cc-${symptom}`}
                              className="text-sm capitalize font-normal whitespace-nowrap"
                            >
                              {symptom}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Optional: Associated Symptoms Text Area */}
                    <div className="space-y-1">
                      <Label htmlFor="cc-associated-text">
                        Other Associated Symptoms
                      </Label>
                      <Textarea
                        id="cc-associated-text"
                        value={chiefComplaintsForm.assosiatedsymtom || ""}
                        onChange={(e) =>
                          setChiefComplaintsForm((prev) => ({
                            ...prev,
                            assosiatedsymtom: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Examination */}
                <TabsContent value="examination">
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Posture & Gait
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="examination-posture">Posture</Label>
                            <Select
                              value={examinationForm.posture || ""}
                              onValueChange={(value) =>
                                setExaminationForm((prev) => ({
                                  ...prev,
                                  posture: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select posture" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="kyphotic">
                                  Kyphotic
                                </SelectItem>
                                <SelectItem value="lordotic">
                                  Lordotic
                                </SelectItem>
                                <SelectItem value="scoliotic">
                                  Scoliotic
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="examination-gait">
                              Gait Pattern
                            </Label>
                            <Select
                              value={examinationForm.gaitpattern || ""}
                              onValueChange={(value) =>
                                setExaminationForm((prev) => ({
                                  ...prev,
                                  gaitpattern: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select gait pattern" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="antalgic">
                                  Antalgic
                                </SelectItem>
                                <SelectItem value="ataxic">Ataxic</SelectItem>
                                <SelectItem value="steppage">
                                  Steppage
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Range of Motion
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="examination-flexion">Flexion</Label>
                            <Input
                              id="examination-flexion"
                              value={examinationForm.flexion || ""}
                              onChange={(e) =>
                                setExaminationForm((prev) => ({
                                  ...prev,
                                  flexion: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="examination-extension">
                              Extension
                            </Label>
                            <Input
                              id="examination-extension"
                              value={examinationForm.extension || ""}
                              onChange={(e) =>
                                setExaminationForm((prev) => ({
                                  ...prev,
                                  extension: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="examination-lateral-left">
                                Left Lateral Flexion
                              </Label>
                              <Input
                                id="examination-lateral-left"
                                value={examinationForm.lateralflexionleft || ""}
                                onChange={(e) =>
                                  setExaminationForm((prev) => ({
                                    ...prev,
                                    lateralflexionleft: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="examination-lateral-right">
                                Right Lateral Flexion
                              </Label>
                              <Input
                                id="examination-lateral-right"
                                value={
                                  examinationForm.lateralflexionright || ""
                                }
                                onChange={(e) =>
                                  setExaminationForm((prev) => ({
                                    ...prev,
                                    lateralflexionright: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="examination-rotation-left">
                                Left Rotation
                              </Label>
                              <Input
                                id="examination-rotation-left"
                                value={examinationForm.rotationleft || ""}
                                onChange={(e) =>
                                  setExaminationForm((prev) => ({
                                    ...prev,
                                    rotationleft: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="examination-rotation-right">
                                Right Rotation
                              </Label>
                              <Input
                                id="examination-rotation-right"
                                value={examinationForm.rotationright || ""}
                                onChange={(e) =>
                                  setExaminationForm((prev) => ({
                                    ...prev,
                                    rotationright: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Motor */}
                <TabsContent value="motor">
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Upper Extremity
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="motor-shoulder-flex">
                              Shoulder Flexors
                            </Label>
                            <Select
                              value={motorForm.shoulderflexer || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  shoulderflexer: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-shoulder-ext">
                              Shoulder Extensors
                            </Label>
                            <Select
                              value={motorForm.shoulderextensors || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  shoulderextensors: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-elbow-flex">
                              Elbow Flexors
                            </Label>
                            <Select
                              value={motorForm.elbowflexer || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  elbowflexer: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-elbow-ext">
                              Elbow Extensors
                            </Label>
                            <Select
                              value={motorForm.elbowextensors || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  elbowextensors: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-wrist-flex">
                              Wrist Flexors
                            </Label>
                            <Select
                              value={motorForm.wristflexer || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  wristflexer: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-wrist-ext">
                              Wrist Extensors
                            </Label>
                            <Select
                              value={motorForm.wristextensors || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  wristextensors: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Lower Extremity
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="motor-hip-flex">Hip Flexors</Label>
                            <Select
                              value={motorForm.hipflexer || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  hipflexer: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-hip-ext">Hip Extensors</Label>
                            <Select
                              value={motorForm.hiprextensors || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  hiprextensors: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-knee-flex">
                              Knee Flexors
                            </Label>
                            <Select
                              value={motorForm.kneeflexer || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  kneeflexer: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-knee-ext">
                              Knee Extensors
                            </Label>
                            <Select
                              value={motorForm.kneeextensors || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  kneeextensors: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-ankle-flex">
                              Ankle Flexors
                            </Label>
                            <Select
                              value={motorForm.ankleflexer || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  ankleflexer: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-ankle-ext">
                              Ankle Extensors
                            </Label>
                            <Select
                              value={motorForm.ankleextensors || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  ankleextensors: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">
                                  0 - No contraction
                                </SelectItem>
                                <SelectItem value="1">
                                  1 - Flicker of contraction
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Movement with gravity eliminated
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Movement against gravity
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Movement against some resistance
                                </SelectItem>
                                <SelectItem value="5">
                                  5 - Normal power
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="motor-tone">Muscle Tone</Label>
                            <Select
                              value={motorForm.muscletone || ""}
                              onValueChange={(value) =>
                                setMotorForm((prev) => ({
                                  ...prev,
                                  muscletone: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select muscle tone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="hypotonic">
                                  Hypotonic
                                </SelectItem>
                                <SelectItem value="hypertonic">
                                  Hypertonic
                                </SelectItem>
                                <SelectItem value="spastic">Spastic</SelectItem>
                                <SelectItem value="rigid">Rigid</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Sensory */}
                <TabsContent value="sensory">
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Sensory Assessment
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="sensory-touch">
                              Touch Sensation
                            </Label>
                            <Select
                              value={sensoryForm.touchsensation || ""}
                              onValueChange={(value) =>
                                setSensoryForm((prev) => ({
                                  ...prev,
                                  touchsensation: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select touch sensation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="decreased">
                                  Decreased
                                </SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="hyperesthesia">
                                  Hyperesthesia
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="sensory-pain">Pain Sensation</Label>
                            <Select
                              value={sensoryForm.painsensation || ""}
                              onValueChange={(value) =>
                                setSensoryForm((prev) => ({
                                  ...prev,
                                  painsensation: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select pain sensation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="decreased">
                                  Decreased
                                </SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="hyperalgesia">
                                  Hyperalgesia
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="sensory-temp">
                              Temperature Sensation
                            </Label>
                            <Select
                              value={sensoryForm.tempraturesensation || ""}
                              onValueChange={(value) =>
                                setSensoryForm((prev) => ({
                                  ...prev,
                                  tempraturesensation: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select temperature sensation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="decreased">
                                  Decreased
                                </SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="sensory-proprio">
                              Proprioception
                            </Label>
                            <Select
                              value={sensoryForm.positivesense || ""}
                              onValueChange={(value) =>
                                setSensoryForm((prev) => ({
                                  ...prev,
                                  positivesense: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select proprioception" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="decreased">
                                  Decreased
                                </SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="sensory-vibration">
                              Vibration Sense
                            </Label>
                            <Select
                              value={sensoryForm.vibrationsense || ""}
                              onValueChange={(value) =>
                                setSensoryForm((prev) => ({
                                  ...prev,
                                  vibrationsense: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select vibration sense" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="decreased">
                                  Decreased
                                </SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Pediatric */}
                <TabsContent value="pediatric">
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Motor Skills
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="pediatric-gross">
                              Gross Motor Skills
                            </Label>
                            <Select
                              value={pediatricForm.grossmotorskills || ""}
                              onValueChange={(value) =>
                                setPediatricForm((prev) => ({
                                  ...prev,
                                  grossmotorskills: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select gross motor skills" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="delayed">Delayed</SelectItem>
                                <SelectItem value="impaired">
                                  Impaired
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="pediatric-fine">
                              Fine Motor Skills
                            </Label>
                            <Select
                              value={pediatricForm.finemotorskills || ""}
                              onValueChange={(value) =>
                                setPediatricForm((prev) => ({
                                  ...prev,
                                  finemotorskills: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select fine motor skills" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="delayed">Delayed</SelectItem>
                                <SelectItem value="impaired">
                                  Impaired
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-base font-medium">
                          Reflexes
                        </Label>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="pediatric-primitive">
                              Primitive Reflexes
                            </Label>
                            <Select
                              value={pediatricForm.primitivereflex || ""}
                              onValueChange={(value) =>
                                setPediatricForm((prev) => ({
                                  ...prev,
                                  primitivereflex: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select primitive reflexes" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="persistent">
                                  Persistent
                                </SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="pediatric-postural">
                              Postural Reflexes
                            </Label>
                            <Select
                              value={pediatricForm.posturalreflex || ""}
                              onValueChange={(value) =>
                                setPediatricForm((prev) => ({
                                  ...prev,
                                  posturalreflex: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select postural reflexes" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="delayed">Delayed</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="pediatric-balance">
                              Balance & Coordination
                            </Label>
                            <Select
                              value={pediatricForm.balanceandcoord || ""}
                              onValueChange={(value) =>
                                setPediatricForm((prev) => ({
                                  ...prev,
                                  balanceandcoord: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select balance & coordination" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="delayed">Delayed</SelectItem>
                                <SelectItem value="impaired">
                                  Impaired
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              {/* Optional: Add a Save Button here for all Custom Assessment forms if not saving automatically */}
              <div className="flex justify-end mt-4"></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Optional: Add Dialog component here for manual SOAP entry/edit if needed */}
    </div>
  );
};

export default Consultation;
