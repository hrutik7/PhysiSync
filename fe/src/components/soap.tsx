import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl } from "./ui/form";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { useForm, FormProvider } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Edit2, Trash2, Mic, MicOff, Loader2 } from "lucide-react";
import Activepatient from "./activepatient";
import { toast } from "sonner";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";


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
  }
});

const soapSchema = z.object({
  date: z.string().min(1, "Date is required"),
  subjective: z.string(), // Remove min requirement to allow empty fields
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
});

interface SOAPFormProps {
  patientId?: string;
  patientName?: string;
  onSubmit?: (data: z.infer<typeof soapSchema>) => void;
}

interface SOAPNote {
  id: number;
  date: string;
  type: "subjective" | "objective" | "assessment" | "plan";
  content: string;
}

const SOAPForm = ({ patientName, onSubmit }: SOAPFormProps) => {
  const [activeTab, setActiveTab] = useState<string>("subjective");
  const [soapNotes, setSOAPNotes] = useState<SOAPNote[]>([]);
  const [patientId, setPatientId] = useState<string>("");
  const [editingNote, setEditingNote] = useState<SOAPNote | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [transcription, setTranscription] = useState<string>("");
  const [transcriptionLanguage, setTranscriptionLanguage] = useState<string>("en");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  
  const form = useForm<z.infer<typeof soapSchema>>({
    resolver: zodResolver(soapSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
    },
  });

  // Update useEffect to handle localStorage
  useEffect(() => {
    const storedPatient = localStorage.getItem("activePatient");
    if (storedPatient) {
      try {
        const parsedData = JSON.parse(storedPatient);
        setPatientId(parsedData.id || "");
      } catch (error) {
        console.error("Error parsing patient data from localStorage");
      }
    }
  }, []); // Run once on mount

  // Update useEffect for fetching SOAP notes
  useEffect(() => {
    const fetchSOAPNotes = async () => {
      if (!patientId) return;
      
      setIsLoading(true); // Start loader
      try {
        const [subjective, objective, assessment, plan] = await Promise.all([
          api.get(`/soap/subjective/${patientId}`).catch(() => ({ data: [] })),
          api.get(`/soap/objective/${patientId}`).catch(() => ({ data: [] })),
          api.get(`/soap/assessment/${patientId}`).catch(() => ({ data: [] })),
          api.get(`/soap/plan/${patientId}`).catch(() => ({ data: [] }))
        ]);

        const allNotes = [
          ...mapResponseToNotes(subjective.data, 'subjective'),
          ...mapResponseToNotes(objective.data, 'objective'),
          ...mapResponseToNotes(assessment.data, 'assessment'),
          ...mapResponseToNotes(plan.data, 'plan')
        ];

        setSOAPNotes(allNotes);
      } catch (error: any) {
        console.error('Error fetching notes:', error);
        toast.error(error.response?.data?.message || "Failed to fetch SOAP notes. Please try again.");
      } finally {
        setIsLoading(false); // Stop loader
      }
    };

    fetchSOAPNotes();
  }, [patientId]);

  // Helper function to map API response to SOAPNote format
  const mapResponseToNotes = (data: any[], type: SOAPNote['type']) => {
    return data.map(note => ({
      id: note.id,
      date: note.date,
      type: type,
      content: note.content
    }));
  };

  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        await processAudioToTranscript(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Could not access microphone. Please check your permissions.");
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks on the active stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      toast.success("Recording stopped");
    }
  };

  // Process audio to transcript only
  const processAudioToTranscript = async (audioBlob: Blob) => {
    setIsParsing(true);
    
    try {
      // Get transcription using multipart/form-data
      const transcriptionResult = await getTranscription(audioBlob);
      setTranscription(transcriptionResult);
      
      // Detect language of transcription
      const detectedLanguage = await detectLanguage(transcriptionResult);
      setTranscriptionLanguage(detectedLanguage);
      
      // If not English, translate to English
      let englishTranscription = transcriptionResult;
      if (detectedLanguage !== "en") {
        englishTranscription = await translateToEnglish(transcriptionResult, detectedLanguage);
      }
      
      // Process the English version for SOAP notes
      await saveTranscriptToSOAP(englishTranscription);
      
      toast.success("Transcript processed and SOAP notes updated automatically");
    } catch (error) {
      console.error("Error processing audio to transcript:", error);
      toast.error("Failed to process the recorded conversation");
    } finally {
      setIsParsing(false);
    }
  };
  
  // Get transcription from Groq API using FormData
  const getTranscription = async (audioBlob: Blob): Promise<string> => {
    try {
      // Create FormData object
      const formData = new FormData();
      formData.append('model', 'whisper-large-v3');
      formData.append('file', audioBlob, 'recording.wav');
      formData.append('response_format', 'text');
      
      // Send with multipart/form-data content type (axios sets this automatically with FormData)
      const response = await axios.post(
        `${GROQ_API_URL}/audio/transcriptions`, 
        formData, 
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            // No need to set Content-Type as axios sets it with the boundary
          }
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error("Error transcribing audio:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      throw new Error("Failed to transcribe audio");
    }
  };
  
  // Detect language of transcription
  const detectLanguage = async (text: string): Promise<string> => {
    try {
      const response = await groqApi.post('/chat/completions', {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: "Detect the language of the following text. Return only the language code (en for English, hi for Hindi, mr for Marathi)."
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "text" }
      });
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error detecting language:", error);
      return "en"; // Default to English if detection fails
    }
  };

  // Translate text to English
  const translateToEnglish = async (text: string, sourceLanguage: string): Promise<string> => {
    try {
      const response = await groqApi.post('/chat/completions', {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `Translate the following text from ${sourceLanguage} to English. Maintain the original meaning and medical terminology.`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "text" }
      });
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Error translating text:", error);
      return text; // Return original text if translation fails
    }
  };
  
  // New function to automatically save transcript to SOAP notes via API
  const saveTranscriptToSOAP = async (transcript: string) => {
    if (!patientId) {
      toast.error("No patient selected");
      return;
    }
    
    try {
      // First analyze the transcript to extract SOAP components
      const soapData = await analyzeSoapContent(transcript);
      
      // Doctor ID from local storage
      const doctorId = JSON.parse(localStorage.getItem("userData") || "{}")?.user?.id;
      
      // Check if we have actual content from the analysis
      const date = new Date().toISOString().split("T")[0];
      
      // Create an array of promises for each SOAP component
      const savePromises = [];
      
      // For each SOAP component with content, create a save promise
      if (soapData.subjective && soapData.subjective.trim()) {
        savePromises.push(
          api.post(`/soap/subjective`, {
            patientId,
            content: soapData.subjective.trim(),
            doctorId,
            role: "CLINIC"
          })
        );
      }
      
      if (soapData.objective && soapData.objective.trim()) {
        savePromises.push(
          api.post(`/soap/objective`, {
            patientId,
            content: soapData.objective.trim(),
            doctorId,
            role: "CLINIC"
          })
        );
      }
      
      if (soapData.assessment && soapData.assessment.trim()) {
        savePromises.push(
          api.post(`/soap/assessment`, {
            patientId,
            content: soapData.assessment.trim(),
            doctorId,
            role: "CLINIC"
          })
        );
      }
      
      if (soapData.plan && soapData.plan.trim()) {
        savePromises.push(
          api.post(`/soap/plan`, {
            patientId,
            content: soapData.plan.trim(),
            doctorId,
            role: "CLINIC"
          })
        );
      }
      
      // Execute all save operations in parallel
      if (savePromises.length > 0) {
        await Promise.all(savePromises);
        
        // Refresh SOAP notes to show the new entries
        const [subjective, objective, assessment, plan] = await Promise.all([
          api.get(`/soap/subjective/${patientId}`).catch(() => ({ data: [] })),
          api.get(`/soap/objective/${patientId}`).catch(() => ({ data: [] })),
          api.get(`/soap/assessment/${patientId}`).catch(() => ({ data: [] })),
          api.get(`/soap/plan/${patientId}`).catch(() => ({ data: [] }))
        ]);

        const allNotes = [
          ...mapResponseToNotes(subjective.data, 'subjective'),
          ...mapResponseToNotes(objective.data, 'objective'),
          ...mapResponseToNotes(assessment.data, 'assessment'),
          ...mapResponseToNotes(plan.data, 'plan')
        ];

        setSOAPNotes(allNotes);
        
        // Clear form values after successful processing
        form.setValue('subjective', '');
        form.setValue('objective', '');
        form.setValue('assessment', '');
        form.setValue('plan', '');
        
        toast.success("SOAP notes automatically updated from transcript");
      } else {
        toast.warning("No valid SOAP content detected in transcript");
      }
      
    } catch (error: any) {
      console.error("Error saving transcript to SOAP:", error);
      toast.error("Failed to save transcript to SOAP notes");
    }
  };
  
  // Analyze transcription to extract SOAP elements
  const analyzeSoapContent = async (transcription: string): Promise<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }> => {
    try {
      const response = await groqApi.post('/chat/completions', {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content: `You are an AI medical documentation specialist. Your task is to analyze the doctor-patient conversation and classify the information into SOAP note components. Follow these specific guidelines:

1. Subjective (S):
   - Patient's symptoms, complaints, and concerns
   - Patient's medical history
   - Patient's description of pain (location, intensity, duration)
   - Patient's functional limitations
   - Patient's goals and expectations
   - Any relevant social or psychological factors
   - Use direct patient quotes when appropriate

2. Objective (O):
   - Physical examination findings
   - Range of motion measurements
   - Strength testing results
   - Special tests performed
   - Palpation findings
   - Posture and gait observations
   - Any measurable data (e.g., pain scale, functional scores)
   - Use specific measurements and observations

3. Assessment (A):
   - Clinical diagnosis
   - Problem list
   - Progress since last visit
   - Analysis of findings
   - Clinical reasoning
   - Any complications or concerns
   - Use medical terminology appropriately

4. Plan (P):
   - Treatment interventions
   - Exercise prescription
   - Frequency and duration of treatment
   - Goals for next session
   - Home exercise program
   - Follow-up schedule
   - Any referrals needed
   - Use specific, actionable items

Format your response as a JSON object with these exact keys:
{
  "subjective": "Patient's symptoms and history",
  "objective": "Examination findings",
  "assessment": "Clinical assessment",
  "plan": "Treatment plan"
}

Ensure each section contains only relevant information. If a section has no relevant content, leave it as an empty string.`
          },
          {
            role: "user",
            content: transcription
          }
        ],
        response_format: { type: "json_object" }
      });
      
      const content = response.data.choices[0].message.content;
      return typeof content === 'string' ? JSON.parse(content) : content;
    } catch (error) {
      console.error("Error analyzing SOAP content:", error);
      throw new Error("Failed to analyze conversation for SOAP notes");
    }
  };

  // Update handleSubmit function
  const handleSubmit = async (data: z.infer<typeof soapSchema>) => {
    if (!patientId) {
      toast.error("No patient selected");
      return false;
    }
    
    const activeTabContent = data[activeTab as keyof typeof data];
    const doctorId = JSON.parse(localStorage.getItem("userData") || "{}")?.user?.id;
    if (activeTabContent !== "") {
      setIsLoading(true); // Start loader
      // console.log("loading...")
      // toast.loading("Saving note...");
      try {
        const payload = {
          patientId: patientId,
          content: activeTabContent,
          doctorId: doctorId,
          role: "CLINIC"
        };
        
        const response = await api.post(`/soap/${activeTab}`, payload);

        if (response.data) {
          const newNote: SOAPNote = {
            id: response.data.id,
            date: data.date,
            type: activeTab as "subjective" | "objective" | "assessment" | "plan",
            content: activeTabContent,
          };

          setSOAPNotes((prevNotes) => [...prevNotes, newNote]);
          form.setValue(activeTab as keyof typeof data, "");
          toast.success(`${activeTab} note saved successfully`);
        }
      } catch (error: any) {
        console.error('Error saving note:', error);
        toast.error(error.response?.data?.message || `Failed to save ${activeTab} note. Please try again.`);
      } finally {
        setIsLoading(false); // Stop loader
      }
    }

    return false;
  };

  // Update handleDelete function
  const handleDelete = async (id: number, type: string) => {
    try {
      await api.delete(`/soap/${type}/${id}`);
      setSOAPNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
      toast.success(`${type} note deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast.error(error.response?.data?.message || `Failed to delete ${type} note`);
    }
  };

  // Update handleEdit function
  const handleEdit = async (note: SOAPNote) => {
    setEditingNote(note);
    setIsEditDialogOpen(true);
    form.setValue(note.type, note.content);
    form.setValue("date", note.date);
  };

  const handleEditSubmit = async (data: z.infer<typeof soapSchema>) => {
    if (!patientId || !editingNote) {
      toast.error("No patient selected or note to edit");
      return;
    }

    try {
      const payload = {
        patientID: patientId,
        date: new Date(data.date).toISOString(),
        content: data[editingNote.type]
      };

      const response = await api.put(`/soap/${editingNote.type}/${editingNote.id}`, payload);

      if (response.data) {
        setSOAPNotes((prevNotes) => 
          prevNotes.map((n) => 
            n.id === editingNote.id 
              ? { ...n, content: payload.content, date: payload.date }
              : n
          )
        );
        form.setValue(editingNote.type, "");
        setIsEditDialogOpen(false);
        setEditingNote(null);
        toast.success(`${editingNote.type} note updated successfully`);
      }
    } catch (error: any) {
      console.error('Error updating note:', error);
      toast.error(error.response?.data?.message || `Failed to update ${editingNote.type} note`);
    }
  };

  // Filter notes for the current active tab
  const filteredNotes = soapNotes.filter((note) => note.type === activeTab);

  return (
    <div className="mx-5 my-4">
      <Activepatient />

      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <div>
              <CardTitle className="text-2xl">SOAP Notes</CardTitle>
              {patientName && (
                <div className="text-sm text-muted-foreground">
                  Active Patient: {patientName} (ID: {patientId})
                </div>
              )}
            </div>
            
            {/* Recording Controls */}
            <div className="flex items-center gap-2">
              {isParsing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="text-sm">Processing conversation...</span>
                </div>
              ) : isRecording ? (
                <Button 
                  onClick={stopRecording} 
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <MicOff className="h-5 w-5" />
                  Stop Recording
                </Button>
              ) : (
                <Button 
                  onClick={startRecording}
                  variant="outline"
                  className="flex items-center gap-2 border-blue-500 text-blue-500 hover:bg-blue-50"
                >
                  <Mic className="h-5 w-5" />
                  Start Recording
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* {transcription && (
            <div className="mb-6 p-4 bg-slate-50 rounded-md border">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-md font-medium">Conversation Transcript</h3>
                <span className="text-sm text-gray-500">
                  {transcriptionLanguage === "en" ? "English" : 
                   transcriptionLanguage === "hi" ? "Hindi" : 
                   transcriptionLanguage === "mr" ? "Marathi" : "Unknown"}
                </span>
              </div>
              <p className="text-sm text-gray-600">{transcription}</p>
            </div>
          )} */}
          
          {isLoading ? ( // Show loader when loading
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : (
            <FormProvider {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit, (e: any) => {
                  e?.preventDefault();
                  return false;
                })}
                className="space-y-6"
              >
                <Tabs
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="subjective">Subjective</TabsTrigger>
                    <TabsTrigger value="objective">Objective</TabsTrigger>
                    <TabsTrigger value="assessment">Assessment</TabsTrigger>
                    <TabsTrigger value="plan">Plan</TabsTrigger>
                  </TabsList>


                  <div className="w-[150px] mt-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="date" {...field} className="w-[150px]" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Tab contents */}
                  {["subjective", "objective", "assessment", "plan"].map((type) => (
                    <TabsContent key={type} value={type}>
                      <FormField
                        control={form.control}
                        name={type as keyof z.infer<typeof soapSchema>}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </FormLabel>
                            <div className="text-sm text-muted-foreground mb-2">
                              {type === "subjective" &&
                                "Patient's symptoms, complaints, and history as described by the patient"}
                              {type === "objective" &&
                                "Measurable and observable findings from examination"}
                              {type === "assessment" &&
                                "Clinical assessment, diagnosis, and analysis of the condition"}
                              {type === "plan" &&
                                "Treatment plan, goals, and next steps"}
                            </div>
                            <FormControl>
                              <Textarea
                                placeholder={`Enter ${type} information...`}
                                className="min-h-[200px]"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  ))}
                </Tabs>

                <Button type="submit" className="w-full bg-blue-500">
                  Save SOAP Notes
                </Button>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Edit {editingNote?.type} Note</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={editingNote?.type || ""}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-lg font-semibold">
                              {editingNote?.type ? editingNote.type.charAt(0).toUpperCase() + editingNote.type.slice(1) : ""}
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={`Enter ${editingNote?.type} information...`}
                                className="min-h-[200px]"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEditDialogOpen(false);
                            setEditingNote(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Save Changes</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Notes History Table */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Notes
                    History
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr No.</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNotes.map((note, index) => (
                        <TableRow key={note.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{new Date(note.date).toLocaleDateString('en-GB')}</TableCell>
                          <TableCell className="max-w-md truncate">
                            {note.content}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(note)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(note.id, note.type)}
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
              </form>
            </FormProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SOAPForm;