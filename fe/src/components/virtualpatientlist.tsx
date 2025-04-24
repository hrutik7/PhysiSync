import React, { useEffect, useState } from "react";
import { Switch } from "../components/ui/switch";
import { Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
// Import the Multiselect component
import Multiselect from 'multiselect-react-dropdown';
// Remove Checkbox import if no longer needed elsewhere
// import { Checkbox } from "../components/ui/checkbox";
import CountdownTimer from "./CountdownTimer"; // Assuming this is used elsewhere or can be removed if not needed here

// --- Interfaces remain the same ---
interface VirtualPatient {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  referral: string;
}

interface PatientData {
  [key: string]: any;
}

// No need for 'selected' property directly in the source options anymore
interface TreatmentItem {
  id: string;
  name: string;
  description: string;
  // selected: boolean; // Removed
}

// Simplified TreatmentRecommendations state
interface TreatmentRecommendations {
    frequency: string;
    additionalInstructions: string;
}
const activePatientDataLocal = JSON.parse(localStorage.getItem("activePatient") || "{}") || null; // Assuming this is used elsewhere or can be removed if not needed here
const VirtualPatientList = () => {
  const [patients, setPatients] = useState<VirtualPatient[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<VirtualPatient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [enabledPatientIds, setEnabledPatientIds] = useState<string[]>([]);
  const [patientData, setPatientData] = useState<PatientData>({});

  // --- Source Options (without 'selected' flag) ---
  const [exerciseOptions] = useState<TreatmentItem[]>([
    { id: "ex1", name: "Hamstring Stretches", description: "30 seconds hold, 3 repetitions" },
    { id: "ex2", name: "Quadriceps Stretches", description: "30 seconds hold, 3 repetitions" },
    { id: "ex3", name: "Lumbar Rotation", description: "10 repetitions each side" },
    { id: "ex4", name: "Calf Raises", description: "3 sets of 15 repetitions" },
    { id: "ex5", name: "Pelvic Tilts", description: "2 sets of 10 repetitions" },
    { id: "ex6", name: "Cat-Cow Stretch", description: "10 repetitions, hold 5 seconds each" },
    { id: "ex7", name: "Wall Slides", description: "3 sets of 10 repetitions" },
    { id: "ex8", name: "Glute Bridges", description: "3 sets of 12 repetitions" },
    { id: "ex9", name: "Bird Dog", description: "3 sets of 10 repetitions each side" },
    { id: "ex10", name: "Planks", description: "3 sets of 30 seconds hold" },
  ]);

  const [dietOptions] = useState<TreatmentItem[]>([
    { id: "d1", name: "Anti-inflammatory Diet", description: "Focus on omega-3 fatty acids, fruits and vegetables" },
    { id: "d2", name: "Increased Protein Intake", description: "1.6-2.0g per kg of body weight daily" },
    { id: "d3", name: "Calcium-rich Foods", description: "For bone health and recovery" },
    { id: "d4", name: "Hydration Increase", description: "Minimum 2-3 liters of water daily" },
    { id: "d5", name: "Vitamin D Supplements", description: "For bone health and muscle function" },
    { id: "d6", name: "Magnesium-rich Foods", description: "For muscle relaxation and recovery" },
  ]);

  const [homeTherapyOptions] = useState<TreatmentItem[]>([
    { id: "ht1", name: "Hot Pack Application", description: "15-20 minutes, 2-3 times daily" },
    { id: "ht2", name: "Cold Pack Application", description: "15-20 minutes, every 2-3 hours" },
    { id: "ht3", name: "Contrast Bath", description: "Alternating hot and cold water" },
    { id: "ht4", name: "Self-Massage", description: "Using foam roller or massage ball" },
    { id: "ht5", name: "TENS Unit", description: "15-30 minutes, 2-3 times daily" },
    { id: "ht6", name: "Therapeutic Ultrasound", description: "Home device, 5-10 minutes per area" },
    { id: "ht7", name: "Compression Therapy", description: "Using compression bandages or sleeves" },
    { id: "ht8", name: "Elevation", description: "Elevate affected limb when resting" },
  ]);

  // --- State for *Selected* Items ---
  const [selectedExercises, setSelectedExercises] = useState<TreatmentItem[]>([]);
  const [selectedDiet, setSelectedDiet] = useState<TreatmentItem[]>([]);
  const [selectedHomeTherapy, setSelectedHomeTherapy] = useState<TreatmentItem[]>([]);

  // --- State for Frequency and Instructions ---
  const [treatmentRecommendations, setTreatmentRecommendations] = useState<TreatmentRecommendations>({
    frequency: "daily",
    additionalInstructions: "",
  });

  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const doctorId = JSON.parse(localStorage.getItem("userData") || "{}")?.user?.id;

  useEffect(() => {
    // ... (fetch patient list logic remains the same) ...
    setIsInitialLoading(true);
    fetch(`${API_URL}/add/getpatients?doctorId=${doctorId}`)
      .then((response) => {
        if (!response.ok) throw new Error("Network response was not ok");
        return response.json();
      })
      .then((data: VirtualPatient[]) => {
        setPatients(data);
        setIsInitialLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching patient list:", error);
        setIsInitialLoading(false);
      });
  }, [API_URL, doctorId]); // Added dependencies

  // --- Handlers for Multiselect (onSelect and onRemove update the state) ---
  const handleExerciseSelect = (selectedList: TreatmentItem[]) => {
    setSelectedExercises(selectedList);
  };
  const handleExerciseRemove = (selectedList: TreatmentItem[]) => {
    setSelectedExercises(selectedList);
  };

  const handleDietSelect = (selectedList: TreatmentItem[]) => {
    setSelectedDiet(selectedList);
  };
  const handleDietRemove = (selectedList: TreatmentItem[]) => {
    setSelectedDiet(selectedList);
  };

  const handleHomeTherapySelect = (selectedList: TreatmentItem[]) => {
    setSelectedHomeTherapy(selectedList);
  };
  const handleHomeTherapyRemove = (selectedList: TreatmentItem[]) => {
    setSelectedHomeTherapy(selectedList);
  };

  // --- Handlers for Frequency and Instructions ---
  const handleAdditionalInstructionsChange = (value: string) => {
    setTreatmentRecommendations(prev => ({
      ...prev,
      additionalInstructions: value
    }));
  };

  const handleFrequencyChange = (value: string) => {
    setTreatmentRecommendations(prev => ({
      ...prev,
      frequency: value
    }));
  };

  // --- Reset Function ---
  const resetTreatmentSelections = () => {
    setSelectedExercises([]);
    setSelectedDiet([]);
    setSelectedHomeTherapy([]);
    setTreatmentRecommendations({
      frequency: "daily",
      additionalInstructions: "",
    });
  };

  // --- fetchPatientData remains the same ---
  const fetchPatientData = async (patientId: string) => {
    setIsLoading(true);
    const endpoints = [
      `custom/history/${patientId}`,
      `custom/chief-complaints/${patientId}`,
      `custom/pain/${patientId}`,
      `custom/examination/${patientId}`,
      `custom/motor-examination/${patientId}`,
      `custom/sensory-examination/${patientId}`,
      `custom/pediatric-examination/${patientId}`,
      `intervention/interventionProtocol/${patientId}`,
    ];

    try {
      const responses = await Promise.all(
        endpoints.map((endpoint) =>
          fetch(`${API_URL}/${endpoint}`).then((res) => {
            if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
            // Handle potential empty responses or non-JSON responses gracefully
            return res.text().then(text => text ? JSON.parse(text) : null);
          }).catch(err => {
             console.error(`Error fetching or parsing ${endpoint}:`, err);
             return null; // Return null or default data if fetch fails
          })
        )
      );

      // Filter out null responses before setting state
      const validResponses = responses.filter(data => data !== null);

      setPatientData((prevData) => ({
        ...prevData,
        [patientId]: validResponses, // Store the array of valid responses
      }));

      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching patient data:", error);
      setIsLoading(false); // Ensure loading state is turned off on error
    }
  };


  // --- enableAIAssistant (updated payload) ---
  const enableAIAssistant = async () => {
    if (!selectedPatient || !selectedPatientId) return;

    setIsProcessing(true);

    try {
      const patientDataForId = patientData[selectedPatientId];
      if (!patientDataForId || !Array.isArray(patientDataForId)) { // Check if it exists and is an array
          console.error("Patient data not found or not in expected format for ID:", selectedPatientId);
          // Optionally, try fetching again or show an error
          if (!patientData[selectedPatientId]) {
             await fetchPatientData(selectedPatientId);
             // Re-check after fetch - add a small delay or re-render logic if needed
             // This immediate re-check might still fail if fetch is async and state hasn't updated
             if (!patientData[selectedPatientId]) {
                throw new Error("Patient data could not be loaded.");
             }
          } else {
             throw new Error("Patient data is not in the expected array format.");
          }
      }

      // Helper function to safely access array elements
      const getDataFromArray = (index: number, property: string, defaultValue: any = "") => {
         const dataSet = patientDataForId[index];
         // Check if dataSet is an array and has the element, then access property
         if (Array.isArray(dataSet) && dataSet.length > 0 && dataSet[0] && typeof dataSet[0] === 'object') {
            return dataSet[0][property] || defaultValue;
         }
         // Check if dataSet itself is the object (if endpoint returned single object instead of array)
         else if (dataSet && typeof dataSet === 'object' && !Array.isArray(dataSet)) {
             return dataSet[property] || defaultValue;
         }
         return defaultValue;
      };


      // Extract data using the helper function
      const historyData = {
          occupation: getDataFromArray(0, 'occupation'),
          previosmedicalconditions: getDataFromArray(0, 'previosmedicalconditions'),
          previossurgery: getDataFromArray(0, 'previossurgery'),
          currentmedication: getDataFromArray(0, 'currentmedication'),
          physicalactivitylevel: getDataFromArray(0, 'physicalactivitylevel'),
          sleeppattern: getDataFromArray(0, 'sleeppattern'),
          smoking: getDataFromArray(0, 'smoking'),
      };
      const chiefComplaintsData = {
          primarycomplaint: getDataFromArray(1, 'primarycomplaint'),
          onset: getDataFromArray(1, 'onset'),
          duration: getDataFromArray(1, 'duration'),
          assosiatedsymtom: getDataFromArray(1, 'assosiatedsymtom'),
      };
      const painData = {
          painsite: getDataFromArray(2, 'painsite'),
          painsevirity: getDataFromArray(2, 'painsevirity'),
          painnature: getDataFromArray(2, 'painnature'),
          painonset: getDataFromArray(2, 'painonset'),
          painduration: getDataFromArray(2, 'painduration'),
          painside: getDataFromArray(2, 'painside'),
          paintrigger: getDataFromArray(2, 'paintrigger'),
          painadl: getDataFromArray(2, 'painadl'),
          painDiurnal: getDataFromArray(2, 'painDiurnal'),
          painAggravating: getDataFromArray(2, 'painAggravating'),
          painRelieving: getDataFromArray(2, 'painRelieving'),
      };
      const examinationData = {
          posture: getDataFromArray(3, 'posture'),
          gaitpattern: getDataFromArray(3, 'gaitpattern'),
          flexion: getDataFromArray(3, 'flexion'),
          extension: getDataFromArray(3, 'extension'),
          lateralflexionrightasd: getDataFromArray(3, 'lateralflexionrightasd'),
          lateralflexionleft: getDataFromArray(3, 'lateralflexionleft'),
          rotationright: getDataFromArray(3, 'rotationright'),
          rotationleft: getDataFromArray(3, 'rotationleft'),
      };
      const motorExaminationData = {
          shoulderextensors: getDataFromArray(4, 'shoulderextensors'),
          hipflexer: getDataFromArray(4, 'hipflexer'),
          kneeextensors: getDataFromArray(4, 'kneeextensors'),
          ankleflexer: getDataFromArray(4, 'ankleflexer'),
          muscletone: getDataFromArray(4, 'muscletone'),
      };
       const sensoryExaminationData = {
          touchsensation: getDataFromArray(5, 'touchsensation'),
          painsensation: getDataFromArray(5, 'painsensation'),
          tempraturesensation: getDataFromArray(5, 'tempraturesensation'),
          positivesense: getDataFromArray(5, 'positivesense'), // Typo? Should it be 'proprioception' or similar?
          vibrationsense: getDataFromArray(5, 'vibrationsense'),
       };


      // Extract selected treatments from the *new* state variables
      const selectedExercisesPayload = selectedExercises.map(ex => `${ex.name} - ${ex.description}`);
      const selectedDietPayload = selectedDiet.map(d => `${d.name} - ${d.description}`);
      const selectedHomeTherapyPayload = selectedHomeTherapy.map(ht => `${ht.name} - ${ht.description}`);

      // Construct the payload for the external API
      const payload = {
        phone: `+91${selectedPatient.contact}`,
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender,
        occupation: historyData.occupation,
        previosmedicalconditions: historyData.previosmedicalconditions,
        previossurgery: historyData.previossurgery,
        currentmedication: historyData.currentmedication,
        physicalactivitylevel: historyData.physicalactivitylevel,
        sleeppattern: historyData.sleeppattern,
        smoking: historyData.smoking,
        patientID: selectedPatient.patientId,
        primarycomplaint: chiefComplaintsData.primarycomplaint,
        onset: chiefComplaintsData.onset,
        duration: chiefComplaintsData.duration,
        assosiatedsymtom: chiefComplaintsData.assosiatedsymtom,
        painsite: painData.painsite,
        painsevirity: painData.painsevirity,
        painnature: painData.painnature,
        painonset: painData.painonset,
        painduration: painData.painduration,
        painside: painData.painside,
        paintrigger: painData.paintrigger,
        painadl: painData.painadl,
        painDiurnal: painData.painDiurnal,
        painAggravating: painData.painAggravating,
        painRelieving: painData.painRelieving,
        posture: examinationData.posture,
        gaitpattern: examinationData.gaitpattern,
        flexion: examinationData.flexion,
        extension: examinationData.extension,
        lateralflexionrightasd: examinationData.lateralflexionrightasd,
        lateralflexionleft: examinationData.lateralflexionleft,
        rotationright: examinationData.rotationright,
        rotationleft: examinationData.rotationleft,
        shoulderextensors: motorExaminationData.shoulderextensors,
        hipflexer: motorExaminationData.hipflexer,
        kneeextensors: motorExaminationData.kneeextensors,
        ankleflexer: motorExaminationData.ankleflexer,
        muscletone: motorExaminationData.muscletone,
        touchsensation: sensoryExaminationData.touchsensation,
        painsensation: sensoryExaminationData.painsensation,
        tempraturesensation: sensoryExaminationData.tempraturesensation,
        positivesense: sensoryExaminationData.positivesense,
        vibrationsense: sensoryExaminationData.vibrationsense,
        type: "register",
        // Add treatment recommendations to payload
        physiotherapistRecommendations: {
          exercises: selectedExercisesPayload,
          diet: selectedDietPayload,
          homeTherapy: selectedHomeTherapyPayload,
          frequency: treatmentRecommendations.frequency,
          additionalInstructions: treatmentRecommendations.additionalInstructions,
        }
      };

      console.log("Sending payload:", JSON.stringify(payload, null, 2)); // Log payload for debugging

      // Send POST request to external API
      
      console.log(patientData,"asdasdas",activePatientDataLocal)
      const aiPayload = {
        diet: selectedDiet.map(d => ({ id: d.id, name: d.name, description: d.description })),
        exercise: selectedExercises.map(ex => ({ id: ex.id, name: ex.name, description: ex.description })),
        hometherapy: selectedHomeTherapy.map(ht => ({ id: ht.id, name: ht.name, description: ht.description })),
        additional: {
          frequency: treatmentRecommendations.frequency,
          additionalInstructions: treatmentRecommendations.additionalInstructions,
        },
        doctorId : doctorId,
        patientId: activePatientDataLocal.id,
      };

      const response = await fetch(`${API_URL}/ai/enable-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aiPayload),
      });

      


      // If successful, add to enabled patients
      setEnabledPatientIds((prev) => [...prev, selectedPatientId]);

      // Reset treatment selections
      resetTreatmentSelections();

      // Close dialog only on success
       setIsDialogOpen(false);
       setSelectedPatientId(null);
       setSelectedPatient(null);

    } catch (error) {
      console.error("Error enabling AI assistant:", error);
      // Optionally show an error message to the user here
      alert(`Error enabling AI Assistant: ${error.message}`); // Simple alert for feedback
    } finally {
      setIsProcessing(false);
      // Don't close dialog or reset patient if there was an error, allow user to retry/cancel
      // setIsDialogOpen(false);
      // setSelectedPatientId(null);
      // setSelectedPatient(null);
    }
  };

  // --- handleToggleSwitch (updated reset) ---
  const handleToggleSwitch = async (patient: VirtualPatient) => {
    setSelectedPatientId(patient.id);
    setSelectedPatient(patient);

    // Reset selections for the new patient *before* opening dialog/fetching
    resetTreatmentSelections();

    // Fetch patient data if not already loaded or if force refresh is needed
    // Consider adding logic here if you want to refresh data every time
    if (!patientData[patient.id]) {
      await fetchPatientData(patient.id); // Fetch data before opening dialog
    }

    setIsDialogOpen(true); // Open dialog after data fetch attempt
  };

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Style object for Multiselect (optional, adjust as needed) ---
  const multiselectStyle = {
    chips: {
      background: '#3182ce', // Example: Use primary color from shadcn/ui theme
      color: 'hsl(var(--primary-foreground))',
    },
    searchBox: {
      border: '1px solid hsl(var(--border))',
      borderRadius: 'calc(var(--radius) - 2px)', // Match shadcn/ui input border radius
      minHeight: '40px', // Ensure sufficient height
      padding: '0.5rem 0.75rem', // Match shadcn/ui input padding
    },
    inputField: { // Adjust input field within the search box if needed
        margin: '0px',
        fontSize: '0.875rem', // Match shadcn/ui input font size
    },
    optionContainer: {
      border: '1px solid hsl(var(--border))',
      borderRadius: 'calc(var(--radius) - 2px)',
      background: 'hsl(var(--background))', // Match background
    },
    option: {
        color: 'hsl(var(--foreground))', // Match text color
        '&:hover': {
            background: 'hsl(var(--accent))', // Match hover color
        }
    },
    groupHeading:{ // If using groups
       // Style group headings if necessary
    },
    // Add other keys like multiselectContainer, etc., as needed
  };

  return (
    <div className="rounded-md mx-10 my-10 border">
      {/* --- Search Bar remains the same --- */}
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Enable Virtual Therapist</h2>
        <input
          type="text"
          placeholder="Search by name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-md w-full" // Use shadcn input style if available: className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* --- Loading Indicator remains the same --- */}
      {isInitialLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mr-2" />
          <p className="text-gray-600">Loading patient list...</p>
        </div>
      ) : (
        // --- Table remains the same ---
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Patient ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPatients.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-gray-500"
                >
                  {searchTerm
                    ? "No patients match your search"
                    : "No patients found"}
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => (
                <tr key={patient.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {patient.patientId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {patient.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {patient.contact}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Switch
                      checked={enabledPatientIds.includes(patient.id)}
                      onCheckedChange={(checked) => {
                        // Only trigger dialog opening when switching *to* checked
                        if (checked && !enabledPatientIds.includes(patient.id)) {
                          handleToggleSwitch(patient);
                        }
                        // Optional: Add logic to disable/remove if unchecked
                        // else if (!checked && enabledPatientIds.includes(patient.id)) {
                        //   // Handle disabling logic here (e.g., call another API endpoint)
                        //   // setEnabledPatientIds(prev => prev.filter(id => id !== patient.id));
                        // }
                      }}
                       // Disable switch if already enabled to prevent re-opening dialog via switch click
                       // You might need a different mechanism to *disable* the assistant
                       disabled={enabledPatientIds.includes(patient.id) || isProcessing}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* --- Dialog Content Updated --- */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => !isProcessing && setIsDialogOpen(open)} // Prevent closing while processing
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {isLoading ? "Loading Patient Data..." : `Treatment Recommendations for ${selectedPatient?.name || ''}`}
            </DialogTitle>
            {/* Optional: Add close button if needed */}
             {/* <button onClick={() => setIsDialogOpen(false)} className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
               <X className="h-4 w-4" />
               <span className="sr-only">Close</span>
             </button> */}
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center gap-4 py-8 min-h-[300px]"> {/* Added min-height */}
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Please wait, we are loading patient data...</p>
            </div>
          ) : isProcessing ? (
            <div className="flex items-center justify-center gap-4 py-8 min-h-[300px]"> {/* Added min-height */}
              <Loader2 className="h-6 w-6 animate-spin" />
              <p>Please wait, enabling AI assistant...</p> {/* Simplified message */}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Select treatment recommendations for this patient to share with the AI assistant.
              </p>

              <Tabs defaultValue="exercises" className="w-full">
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="exercises">Exercises</TabsTrigger>
                  <TabsTrigger value="diet">Diet</TabsTrigger> {/* Shortened */}
                  <TabsTrigger value="homeTherapy">Home Therapy</TabsTrigger>
                  <TabsTrigger value="additional">Additional</TabsTrigger>
                </TabsList>

                {/* --- Exercises Tab with Multiselect --- */}
                <TabsContent value="exercises" className="space-y-4 min-h-[250px] overflow-y-auto"> {/* Add scroll if needed */}
                  <div className="space-y-2">
                    <Label htmlFor="exercises-select">Recommended Exercises</Label>
                    <Multiselect
                      id="exercises-select"
                      options={exerciseOptions} // Source options
                      selectedValues={selectedExercises} // Controlled component state
                      onSelect={handleExerciseSelect}
                      onRemove={handleExerciseRemove}
                      displayValue="name" // Property to display in the options/chips
                      placeholder="Select exercises..."
                      showCheckbox={true} // Optional: show checkboxes in dropdown list
                      style={multiselectStyle} // Apply custom styles
                      // Optional: Customize option/chip rendering if needed
                      // customChipRenderer={({ value }) => <span>{value.name}</span>}
                      // optionRenderer={option => <div>{option.name} <span className="text-xs text-muted-foreground">{option.description}</span></div>}
                      avoidHighlightFirstOption={true}
                    />
                    {/* Display descriptions for selected items below the dropdown */}
                    {selectedExercises.length > 0 && (
                        <div className="mt-2 p-2 border rounded-md bg-muted/50 space-y-1">
                             <p className="text-xs font-medium text-muted-foreground">Selected Exercise Details:</p>
                            {selectedExercises.map(ex => (
                                <p key={ex.id} className="text-xs"><strong>{ex.name}:</strong> {ex.description}</p>
                            ))}
                        </div>
                    )}
                  </div>
                </TabsContent>

                {/* --- Diet Tab with Multiselect --- */}
                <TabsContent value="diet" className="space-y-4 min-h-[250px] overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="diet-select">Diet & Hydration Recommendations</Label>
                    <Multiselect
                      id="diet-select"
                      options={dietOptions}
                      selectedValues={selectedDiet}
                      onSelect={handleDietSelect}
                      onRemove={handleDietRemove}
                      displayValue="name"
                      placeholder="Select diet/hydration advice..."
                      showCheckbox={true}
                      style={multiselectStyle}
                       avoidHighlightFirstOption={true}
                    />
                     {selectedDiet.length > 0 && (
                        <div className="mt-2 p-2 border rounded-md bg-muted/50 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Selected Diet/Hydration Details:</p>
                            {selectedDiet.map(d => (
                                <p key={d.id} className="text-xs"><strong>{d.name}:</strong> {d.description}</p>
                            ))}
                        </div>
                    )}
                  </div>
                </TabsContent>

                {/* --- Home Therapy Tab with Multiselect --- */}
                <TabsContent value="homeTherapy" className="space-y-4 min-h-[250px] overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="therapy-select">Home Treatment Modalities</Label>
                    <Multiselect
                      id="therapy-select"
                      options={homeTherapyOptions}
                      selectedValues={selectedHomeTherapy}
                      onSelect={handleHomeTherapySelect}
                      onRemove={handleHomeTherapyRemove}
                      displayValue="name"
                      placeholder="Select home therapies..."
                      showCheckbox={true}
                      style={multiselectStyle}
                       avoidHighlightFirstOption={true}
                    />
                      {selectedHomeTherapy.length > 0 && (
                        <div className="mt-2 p-2 border rounded-md bg-muted/50 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Selected Home Therapy Details:</p>
                            {selectedHomeTherapy.map(ht => (
                                <p key={ht.id} className="text-xs"><strong>{ht.name}:</strong> {ht.description}</p>
                            ))}
                        </div>
                    )}
                  </div>
                </TabsContent>

                {/* --- Additional Tab remains the same --- */}
                <TabsContent value="additional" className="space-y-4 min-h-[250px]">
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Treatment Frequency</Label>
                    <select
                      id="frequency"
                      value={treatmentRecommendations.frequency}
                      onChange={(e) => handleFrequencyChange(e.target.value)}
                      // Use shadcn select styles if available, otherwise basic styling:
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="daily">Daily</option>
                      <option value="twice-daily">Twice Daily</option>
                      <option value="every-other-day">Every Other Day</option>
                      <option value="three-times-weekly">Three Times Weekly</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom (Specify in instructions)</option>
                    </select>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="additional">Additional Instructions</Label>
                    <Textarea
                      id="additional"
                      placeholder="Include activity modifications, ergonomic advice, rest recommendations, custom frequency details, or other instructions"
                      value={treatmentRecommendations.additionalInstructions}
                      onChange={(e) => handleAdditionalInstructionsChange(e.target.value)}
                      className="min-h-32" // Or use shadcn Textarea styling
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* --- Selected Items Summary (using new state) --- */}
              <div className="mt-6 space-y-2 border-t pt-4"> {/* Added separator */}
                <Label>Summary of Recommendations</Label>
                <div className="flex flex-wrap gap-1"> {/* Reduced gap */}
                  {[...selectedExercises, ...selectedDiet, ...selectedHomeTherapy].length === 0 ? (
                     <span className="text-sm text-muted-foreground italic">No recommendations selected yet.</span>
                  ) : (
                    <>
                       {selectedExercises.map(ex => (
                         <Badge key={ex.id} variant="outline" className="px-2 py-0.5 text-xs"> {/* Smaller badge */}
                           Ex: {ex.name}
                         </Badge>
                       ))}
                       {selectedDiet.map(d => (
                         <Badge key={d.id} variant="outline" className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 border-blue-300"> {/* Different color example */}
                           Diet: {d.name}
                         </Badge>
                       ))}
                       {selectedHomeTherapy.map(ht => (
                         <Badge key={ht.id} variant="outline" className="px-2 py-0.5 text-xs bg-green-100 text-green-800 border-green-300"> {/* Different color example */}
                           HT: {ht.name}
                         </Badge>
                       ))}
                    </>
                  )}
                </div>
                {treatmentRecommendations.frequency !== 'daily' && (
                   <p className="text-xs text-muted-foreground">Frequency: {treatmentRecommendations.frequency.replace('-', ' ')}</p>
                )}
                 {treatmentRecommendations.additionalInstructions && (
                   <p className="text-xs text-muted-foreground">Instructions: {treatmentRecommendations.additionalInstructions.substring(0, 50)}{treatmentRecommendations.additionalInstructions.length > 50 ? '...' : ''}</p>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button className="bg-blue-600" onClick={enableAIAssistant} disabled={isLoading || isProcessing || (!selectedExercises.length && !selectedDiet.length && !selectedHomeTherapy.length && !treatmentRecommendations.additionalInstructions) }> {/* Disable if nothing selected/entered */}
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enable AI Assistant
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VirtualPatientList;