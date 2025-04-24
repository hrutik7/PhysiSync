import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import Activepatient from "./activepatient";
import { format } from "date-fns";
import { Calendar } from "./ui/calendar";
import { cn } from "../lib/utils";
import axios from "axios";
import { useToast } from "./ui/use-toast";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Slider } from "./ui/slider";

interface DiagnosisEntry {
  id: string;
  date: string;
  diagnosis: string;
}

interface Treatment {
  id: number;
  date: string;
  treatment: string;
  quantity: number;
  price: number;
  consultant: string;
  invoiceGenerated?: boolean;
}

interface TreatmentEncounter {
  id: string;
  date: string;
  time: string;
  treatmenttype: string;
  duration: number;
  subjectiveassessment: string;
  treatmentprovided: string;
  progressnotes: string;
  price: number;
}

interface TreatmentProtocol {
  id: string;
  patientID: string;
  date: string;
  treatment: string;
  numberofsessions: number;
  price: number;
  consultant?: string;
  status: boolean;
  goal : string
}

interface UpdatePayload {
  patientID: string;
  dates: string;
  treatment?: string;
  numberofsessions?: string;
  price?: string;
}
const genAI = new GoogleGenerativeAI("AIzaSyDDwXcjyUFLYM-kAqv4A2JJEECLGRIr29g");
const Intervention = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<
    | {
        protocolId: string;
        dateIndex: number;
        field: "date" | "treatment" | "sessions" | "price" | "status";
      }
    | any
  >(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [goalForm, setGoalForm] = useState({
    targetDate: "",
    goalType: "short",
    description: "",
  });
  const [diagnosisForm, setDiagnosisForm] = useState({
    date: "",
    diagnosis: "",
  });
  const [diagnosisList, setDiagnosisList] = useState<DiagnosisEntry[]>([]);
  const [selectedDiagnosis, setSelectedDiagnosis] =
    useState<DiagnosisEntry | null>(null);
  const [selectedDates, setSelectedDates] = useState<any>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [treatmentForm, setTreatmentForm] = useState<any>({
    treatment: "",
    sessions: 1,
    price: 0,
    consultant: "",
    dates: "",
    goal : ""
  });
  const [treatmentEncounters, setTreatmentEncounters] = useState<
    TreatmentEncounter[]
  >([]);
  const [treatmentEncounterForm, setTreatmentEncounterForm] = useState({
    date: "",
    time: "",
    treatmenttype: "initial",
    duration: 15,
    subjectiveassessment: "",
    treatmentprovided: "",
    progressnotes: "",
    price: 0,
  });
  const [treatmentProtocols, setTreatmentProtocols] = useState<
    TreatmentProtocol[]
  >([]);
  const [editingProtocol, setEditingProtocol] = useState<any>(null);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editingField, setEditingField] = useState<{
    row: number;
    field?: "treatment" | "sessions" | "price" | "date" | "status";
  } | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const activePatient = localStorage.getItem("activePatient");
    if (activePatient) {
      const parsed = JSON.parse(activePatient);
      // fetchInterventionGoals(parsed.id);
      // fetchInterventionDiagnosis(parsed.id);
      // fetchInterventionTreatmentEncounters(parsed.id);
      fetchInterventionTreatmentProtocols(parsed.id);
      fetchInterventionProtocols(parsed.id); // Fetch intervention protocols
    }
  }, []);

  useEffect(() => {
    const completed = treatmentProtocols.filter(
      (protocol) => protocol.status
    ).length;
    const total = treatmentProtocols.length;
    setProgress(total === 0 ? 0 : (completed / total) * 100);
  }, [treatmentProtocols]);
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const doctorId =
    JSON.parse(localStorage.getItem("userData") || "{}")?.user?.id || null;
  const doctorName = JSON.parse(localStorage.getItem("userData") || "{}")?.user?.DoctorName || null;
  const handleUpdateProtocol = async () => {
    if (!editingCell) return;

    try {
      await axios.put(
        `${API_URL}/intervention/updateInterventionTreatmentProtocol/${editingCell.protocolId}`, // Correct endpoint
        {
          [editingCell.field]: treatmentForm[editingCell.field],
        }
      );
      // Update local state...
      setTreatmentProtocols((prev) =>
        prev.map((protocol) =>
          protocol.id === editingCell.protocolId
            ? {
                ...protocol,
                [editingCell.field]: treatmentForm[editingCell.field],
              }
            : protocol
        )
      );
      setEditingCell(null); // Reset editing cell
    } catch (error) {
      // Handle error
    }
  };

  const generateFollowUpMessage = async (
    progress: number,
    treatment: string,
    nextDate: Date
  ) => {
    const model = genAI.getGenerativeModel({
      model: "models/gemini-1.5-pro-001",
    });

    const prompt = `Generate a persuasive follow-up message for a physiotherapy patient with these details:
    - Current progress: ${progress}%
    - Last treatment: ${treatment}
    - Next appointment: ${format(nextDate, "dd/MM/yyyy")}
    
    The message should:
    1. Acknowledge their progress
    2. Create mild anxiety about potential regression
    3. Emphasize the importance of the next session
    4. Be professional but urgent
    5. Be under 160 characters
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating message:", error);
      return "Your next physiotherapy session is scheduled. Please ensure you attend to maintain your progress.";
    }
  };

  const scheduleFollowUpMessage = async (
    recipient: string,
    message: string,
    date: Date
  ) => {
    try {
      const followUpTime = new Date(date);
      followUpTime.setHours(7, 35, 0, 0); // Set to 6 AM

      const payload = [
        {
          time: format(followUpTime, "yyyy-MM-dd HH:mm"),
          recipient: `+91${recipient}`, // Add +91 before recipient
          message,
        },
      ];

      await axios.post(`${API_URL}/schedule-messages`, payload);

      toast({
        title: "Success",
        description: "Follow-up message scheduled",
      });
    } catch (error) {
      console.error("Error scheduling message:", error);
      toast({
        title: "Error",
        description: "Failed to schedule follow-up message",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (protocolId: string, status: boolean) => {
    try {
      const activePatient = JSON.parse(localStorage.getItem("activePatient")!);
      const doctorId =
        JSON.parse(localStorage.getItem("userData") || "{}")?.user?.id || null;

      await axios.put(
        `${API_URL}/intervention/interventionProtocol/${protocolId}`,
        {
          patientId: activePatient.id,
          doctorId: doctorId,
          status: status,
          date: new Date().toISOString().split("T")[0],
          treatment:
        treatmentProtocols.find((p) => p.id === protocolId)?.treatment ||
        "",
          numberofsessions: (
        treatmentProtocols.find((p) => p.id === protocolId)
          ?.numberofsessions || 1
          ).toString(),
          price: (
        treatmentProtocols.find((p) => p.id === protocolId)?.price || 0
          ).toString(),
        }
      );

      setTreatmentProtocols((prev) =>
        prev.map((protocol) =>
          protocol.id === protocolId ? { ...protocol, status } : protocol
        )
      );

      // If treatment is completed, schedule follow-up message
      if (status) {
        const protocol = treatmentProtocols.find((p) => p.id === protocolId);
        if (protocol) {
          const nextDate = new Date(protocol.date);
          nextDate.setDate(nextDate.getDate() + 1); // Next day follow-up

          const message = await generateFollowUpMessage(
            progress,
            protocol.treatment,
            nextDate
          );

          await scheduleFollowUpMessage(
            activePatient.contact,
            message,
            nextDate
          );
        }
      }

      toast({
        title: "Success",
        description: status
          ? "Treatment marked as completed"
          : "Treatment marked as pending",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const fetchInterventionDiagnosis = async (patientId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/intervention/getInterventiondiagnosis/${patientId}`
      );
      setDiagnosisList(response.data);
      console.log(
        response.data,
        "getInterventiondiagnosisgetInterventiondiagnosis"
      );
    } catch (error) {
      console.error("Error fetching diagnosis:", error);
      toast({
        title: "Error",
        description: "Failed to fetch diagnosis",
        variant: "destructive",
      });
    }
  };

  const fetchInterventionGoals = async (patientId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/intervention/getInterventionGoal/${patientId}`
      );
      setGoals(response.data);
      console.log(response.data);
    } catch (error) {
      console.error("Error fetching goals:", error);
      toast({
        title: "Error",
        description: "Failed to fetch goals",
        variant: "destructive",
      });
    }
  };

  const fetchInterventionTreatmentEncounters = async (patientId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/intervention/getInterventionTreatmentEncounter/${patientId}`
      );
      setTreatmentEncounters(response.data);
      console.log(response.data);
    } catch (error) {
      console.error("Error fetching treatment encounters:", error);
      toast({
        title: "Error",
        description: "Failed to fetch treatment encounters",
        variant: "destructive",
      });
    }
  };

  const fetchInterventionTreatmentProtocols = async (patientId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/intervention/getInterventionTreatmentProtocol/${patientId}`
      );
      setTreatmentProtocols(response.data);
      console.log(response.data);
    } catch (error) {
      console.error("Error fetching treatment protocols:", error);
      toast({
        title: "Error",
        description: "Failed to fetch treatment protocols",
        variant: "destructive",
      });
    }
  };

  const fetchInterventionProtocols = async (patientId: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/intervention/interventionProtocol/${patientId}`
      );
      setTreatmentProtocols(response.data);
      console.log(response.data);
    } catch (error) {
      console.error("Error fetching intervention protocols:", error);
      toast({
        title: "Error",
        description: "Failed to fetch intervention protocols",
        variant: "destructive",
      });
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const patientId: any = localStorage.getItem("activePatient");
    if (!patientId) {
      toast({
        title: "Error",
        description: "No active patient selected",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/intervention/createInterventionGoal`,
        {
          ...goalForm,
          doctorId: doctorId,
          patientId: JSON.parse(patientId).patientId,
          date: goalForm.targetDate,
          goaltype: goalForm.goalType,
          goaldescription: goalForm.description,
        }
      );

      // Add the new goal to the local state
      setGoals((prevGoals) => [
        ...prevGoals,
        {
          id: response.data.id,
          date: goalForm.targetDate,
          goalType: goalForm.goalType,
          description: goalForm.description,
          status: "Pending",
        },
      ]);

      // Reset form
      setGoalForm({
        targetDate: "",
        goalType: "short",
        description: "",
      });

      toast({
        title: "Success",
        description: "Goal added successfully",
      });
    } catch (error) {
      console.error("Error adding goal:", error);
      toast({
        title: "Error",
        description: "Failed to add goal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoalDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this goal?")) {
      try {
        await axios.delete(
          `${API_URL}/intervention/deleteInterventionGoal/${id}`
        );
        setGoals(goals.filter((goal) => goal.id !== id));
        toast({
          title: "Success",
          description: "Goal deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting goal:", error);
        toast({
          title: "Error",
          description: "Failed to delete goal",
          variant: "destructive",
        });
      }
    }
  };

  const handleDiagnosisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (diagnosisForm.date && diagnosisForm.diagnosis) {
      try {
        setLoading(true);
        const activePatient = localStorage.getItem("activePatient");
        if (activePatient) {
          const parsed = JSON.parse(activePatient);
          if (selectedDiagnosis) {
            // Update existing diagnosis
            await axios.put(
              `${API_URL}/intervention/updateInterventiondiagnosis/${selectedDiagnosis.id}`,
              {
                patientId: parsed.patientId,
                doctorId: doctorId,
                date: diagnosisForm.date,
                diagnosis: diagnosisForm.diagnosis,
              }
            );
            setDiagnosisList((prev) =>
              prev.map((diag) =>
                diag.id === selectedDiagnosis.id
                  ? {
                      ...diag,
                      date: diagnosisForm.date,
                      diagnosis: diagnosisForm.diagnosis,
                    }
                  : diag
              )
            );
            toast({
              title: "Success",
              description: "Diagnosis updated successfully",
            });
          } else {
            // Create new diagnosis

            const response = await axios.post(
              `${API_URL}/intervention/createInterventiondiagnosis`,
              {
                patientId: parsed.id,
                date: diagnosisForm.date,
                diagnosis: diagnosisForm.diagnosis,
                doctorId: doctorId,
              }
            );
            setDiagnosisList([...diagnosisList, response.data]);
            toast({
              title: "Success",
              description: "Diagnosis added successfully",
            });
          }
          setDiagnosisForm({
            date: "",
            diagnosis: "",
          });
          setSelectedDiagnosis(null);
        }
      } catch (error) {
        console.error("Error adding/updating diagnosis:", error);
        toast({
          title: "Error",
          description: "Failed to add/update diagnosis",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditDiagnosis = (diagnosis: DiagnosisEntry) => {
    setSelectedDiagnosis(diagnosis);
    setDiagnosisForm({
      date: diagnosis.date,
      diagnosis: diagnosis.diagnosis,
    });
  };

  const handleDeleteDiagnosis = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this diagnosis?")) {
      try {
        await axios.delete(
          `${API_URL}/intervention/deleteInterventiondiagnosis/${id}`
        );
        setDiagnosisList(diagnosisList.filter((diag) => diag.id !== id));
        toast({
          title: "Success",
          description: "Diagnosis deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting diagnosis:", error);
        toast({
          title: "Error",
          description: "Failed to delete diagnosis",
          variant: "destructive",
        });
      }
    }
  };

  const handleCancel = () => {
    setDiagnosisForm({
      date: "",
      diagnosis: "",
    });
    setSelectedDiagnosis(null);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDates((prev: any) => {
      const dateExists = prev.some(
        (d: any) => d.toDateString() === date.toDateString()
      );

      if (dateExists) {
        return prev.filter(
          (d: any) => d.toDateString() !== date.toDateString()
        );
      } else {
        return [...prev, date];
      }
    });
  };

  const handleTreatmentSubmit = async () => {
    if (!treatmentForm.treatment || selectedDates.length === 0) {
      alert("Please fill all required fields and select dates");
      return;
    }
    try {
      // Format dates to be ISO strings for consistent storage and parsing
      const formattedDates = selectedDates.map((date: any) =>
        date.toISOString()
      );

      const response = await axios.post(
        `${API_URL}/intervention/createInterventionTreatmentProtocol`,
        {
          ...treatmentForm,
          price: treatmentForm.price.toString(),
          numberofsessions: treatmentForm.sessions.toString(),
          patientID: JSON.parse(localStorage.getItem("activePatient")!)
            .patientId,
          dates: JSON.stringify(formattedDates), // Store as proper JSON
          goal : treatmentForm.goal
        }
      );

      // Add treatment protocols to local state
      setTreatmentProtocols((prev: any) => [
        ...prev,
        {
          id: response.data.id,
          dates: JSON.stringify(formattedDates),
          treatment: treatmentForm.treatment,
          numberofsessions: treatmentForm.sessions,
          price: treatmentForm.price,
        },
      ]);

      // Reset form
      setTreatmentForm({
        treatment: "",
        sessions: 1,
        price: 0,
        consultant: "",
        dates: "",
        goal : ""
      });
      setSelectedDates([]);

      toast({
        title: "Success",
        description: "Treatment protocol added successfully",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to add treatment protocol",
        variant: "destructive",
      });
    }
  };

  const handleTreatmentProtocolDelete = async (id: string) => {
    if (
      window.confirm("Are you sure you want to delete this treatment protocol?")
    ) {
      try {
        await axios.delete(
          `${API_URL}/intervention/interventionProtocol/${id}`
        );
        setTreatmentProtocols(
          treatmentProtocols.filter((protocol) => protocol.id !== id)
        );
        toast({
          title: "Success",
          description: "Treatment protocol deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting treatment protocol:", error);
        toast({
          title: "Error",
          description: "Failed to delete treatment protocol",
          variant: "destructive",
        });
      }
    }
  };

  const handleTreatmentEncounterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const patientId: any = localStorage.getItem("activePatient");
    if (!patientId) {
      toast({
        title: "Error",
        description: "No active patient selected",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/intervention/createInterventionTreatmentEncounter`,
        {
          date: treatmentEncounterForm.date,
          time: treatmentEncounterForm.time.toString(),
          treatmenttype: treatmentEncounterForm.treatmenttype,
          duration: treatmentEncounterForm.duration.toString(),
          subjectiveassessment: treatmentEncounterForm.subjectiveassessment,
          treatmentprovided: treatmentEncounterForm.treatmentprovided,
          progressnotes: treatmentEncounterForm.progressnotes,
          price: treatmentEncounterForm.price.toString(),
          doctorId: doctorId,
          patientId: JSON.parse(patientId).id,
        }
      );

      // Add the new treatment encounter to the local state
      setTreatmentEncounters((prevEncounters) => [
        ...prevEncounters,
        response.data,
      ]);

      // Reset form
      setTreatmentEncounterForm({
        date: "",
        time: "",
        treatmenttype: "initial",
        duration: 15,
        subjectiveassessment: "",
        treatmentprovided: "",
        progressnotes: "",
        price: 0,
      });

      toast({
        title: "Success",
        description: "Treatment encounter added successfully",
      });
    } catch (error) {
      console.error("Error adding treatment encounter:", error);
      toast({
        title: "Error",
        description: "Failed to add treatment encounter",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTreatmentEncounterDelete = async (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this treatment encounter?"
      )
    ) {
      try {
        await axios.delete(
          `${API_URL}/intervention/deleteInterventionTreatmentEncounter/${id}`
        );
        setTreatmentEncounters(
          treatmentEncounters.filter((encounter) => encounter.id !== id)
        );
        toast({
          title: "Success",
          description: "Treatment encounter deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting treatment encounter:", error);
        toast({
          title: "Error",
          description: "Failed to delete treatment encounter",
          variant: "destructive",
        });
      }
    }
  };

  const handleProtocolAction = (
    protocol: TreatmentProtocol,
    dateIndex: string,
    field: "date" | "treatment" | "sessions" | "price" | "status"
  ) => {
    if (
      editingCell?.protocolId === protocol.id &&
      editingCell?.dateIndex === dateIndex
    ) {
      // Update logic here
      setEditingCell(null);
    } else {
      setEditingCell({ protocolId: protocol.id, dateIndex, field });
      setTreatmentForm({
        treatment: protocol.treatment,
        sessions: protocol.numberofsessions,
        price: protocol.price,
        consultant: protocol.consultant || "",
        date: protocol?.date || "",
        status: protocol.status,
        goal : protocol.goal
      });
    }
  };

  const resetProtocolForm = () => {
    setEditingProtocol(null);
    setEditingDate(null);
    setEditingRow(null);
    setEditingField(null);
    setTreatmentForm({
      treatment: "",
      sessions: 1,
      price: 0,
      consultant: "",
      dates: "",
      status: false,
    });
    setSelectedDates([]);
  };

  const handleDeleteProtocolDate = async (protocolId: string, date: string) => {
    if (
      window.confirm("Are you sure you want to delete this treatment date?")
    ) {
      try {
        const protocol = treatmentProtocols.find((p) => p.id === protocolId);
        if (!protocol) return;

        let dateArray = [];
        try {
          dateArray = JSON.parse(protocol.date);
        } catch (e) {
          dateArray = protocol.date
            .replace(/\[|\]|"/g, "")
            .split(",")
            .filter((d: any) => d.trim());
        }

        const updatedDates = dateArray.filter((d: any) => d !== date);

        await axios.delete(`${API_URL}/interventionProtocol/${protocolId}`);
        setTreatmentProtocols(
          treatmentProtocols.filter((p) => p.id !== protocolId)
        );

        toast({
          title: "Success",
          description: "Treatment date deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting treatment date:", error);
        toast({
          title: "Error",
          description: "Failed to delete treatment date",
          variant: "destructive",
        });
      }
    }
  };

  const handleSingleTreatmentSubmit = async () => {
    if (!treatmentForm.treatment || !selectedDates[0]) {
      alert("Please fill all required fields and select a date");
      return;
    }
    try {
      const formattedDate = selectedDates[0].toISOString();

      const response = await axios.post(
        `${API_URL}/intervention/interventionProtocol`,
        {
          ...treatmentForm,
          price: treatmentForm.price.toString(),
          numberofsessions: treatmentForm.sessions.toString(),
          patientId: JSON.parse(localStorage.getItem("activePatient")!).id,
          date: formattedDate,
          doctorId: doctorId,
          status: false,
          goal : treatmentForm.goal,
          consultant : doctorName
        }
      );

      // Add the new protocol to the local state
      setTreatmentProtocols((prev) => [
        ...prev,
        {
          id: response.data.id,
          patientID: response.data.patientID,
          date: formattedDate,
          treatment: treatmentForm.treatment,
          numberofsessions: treatmentForm.sessions,
          price: treatmentForm.price,
          status: false,
          goal : treatmentForm.goal
        },
      ]);

      // Reset form
      setTreatmentForm({
        treatment: "",
        sessions: 1,
        price: 0,
        consultant: "",
        dates: "",
        goal :""
      });
      setSelectedDates([]);

      toast({
        title: "Success",
        description: "Treatment protocol added successfully",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to add treatment protocol",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-2 sm:mx-5 my-4 max-w-full">
      <Activepatient />
      <Card className="w-full">
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="TREATMENT_PROTOCOL_1" className="w-full">
            <TabsList className="flex flex-nowrap overflow-x-auto w-full gap-2">
              {/* <TabsTrigger value="DIAGNOSIS" className="flex-shrink-0">
                DIAGNOSIS
              </TabsTrigger> */}
              {/* <TabsTrigger value="GOALS" className="flex-shrink-0">
                GOALS
              </TabsTrigger> */}
              <TabsTrigger
                value="TREATMENT_PROTOCOL_1"
                className="flex-shrink-0 whitespace-nowrap"
              >
                TREATMENT PROTOCOL
              </TabsTrigger>
              {/* <TabsTrigger
                value="TREATMENT_ENCOUNTER"
                className="flex-shrink-0 whitespace-nowrap"
              >
                TREATMENT ENCOUNTER
              </TabsTrigger> */}
            </TabsList>

            {/* <TabsContent value="DIAGNOSIS" className="mt-4">
              <div className="space-y-4">
                <form onSubmit={handleDiagnosisSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="block text-sm font-medium mb-1">
                        Date
                      </Label>
                      <Input
                        type="date"
                        name="date"
                        value={diagnosisForm.date}
                        onChange={(e) =>
                          setDiagnosisForm({
                            ...diagnosisForm,
                            date: e.target.value,
                          })
                        }
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-1">
                        Diagnosis
                      </Label>
                      <Input
                        type="text"
                        name="diagnosis"
                        value={diagnosisForm.diagnosis}
                        onChange={(e) =>
                          setDiagnosisForm({
                            ...diagnosisForm,
                            diagnosis: e.target.value,
                          })
                        }
                        placeholder="Enter diagnosis"
                        required
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-500"
                      disabled={loading}
                    >
                      {loading ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Diagnosis</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {diagnosisList.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="text-center text-muted-foreground"
                          >
                            No More Records.
                          </TableCell>
                        </TableRow>
                      ) : (
                        diagnosisList.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.diagnosis}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800 mr-2"
                                onClick={() => handleEditDiagnosis(item)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                                onClick={() => handleDeleteDiagnosis(item.id)}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="GOALS" className="mt-4">
              <div className="space-y-4">
                <form className="space-y-4" onSubmit={handleGoalSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Target Date</Label>
                      <Input
                        type="date"
                        value={goalForm.targetDate}
                        onChange={(e) =>
                          setGoalForm((prev) => ({
                            ...prev,
                            targetDate: e.target.value,
                          }))
                        }
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label>Goal Type</Label>
                      <Select
                        value={goalForm.goalType}
                        onValueChange={(value) =>
                          setGoalForm((prev) => ({ ...prev, goalType: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select goal type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short Term</SelectItem>
                          <SelectItem value="long">Long Term</SelectItem>
                          <SelectItem value="functional">Functional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input
                        type="text"
                        value={goalForm.description}
                        onChange={(e) =>
                          setGoalForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Enter goal description"
                        required
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setGoalForm({
                          targetDate: "",
                          goalType: "short",
                          description: "",
                        })
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-500"
                      disabled={loading}
                    >
                      {loading ? "Adding..." : "Add Goal"}
                    </Button>
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Target Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {goals.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No Goals Added
                          </TableCell>
                        </TableRow>
                      ) : (
                        goals.map((goal) => (
                          <TableRow key={goal.id}>
                            <TableCell>{goal.date}</TableCell>
                            <TableCell className="capitalize">
                              {goal.goaltype}
                            </TableCell>
                            <TableCell>{goal.goaldescription}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                Pending
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                                onClick={() => handleGoalDelete(goal.id)}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent> */}

            <TabsContent value="TREATMENT_PROTOCOL_1" className="mt-4">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="col-span-1">
                    <Label className="block text-sm font-medium mb-2">
                      Select Date
                    </Label>
                    <div className="border rounded-lg p-2 sm:p-4 bg-gray-50 w-full max-w-xs mx-auto">
                      <Calendar
                        mode="single"
                        selected={selectedDates[0]}
                        onSelect={(date) =>
                          setSelectedDates(date ? [date] : [])
                        }
                        className="rounded-md border w-full"
                      />
                    </div>
                    {selectedDates[0] && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <span>{format(selectedDates[0], "dd/MM/yyyy")}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDates([])}
                            className="text-red-500 h-auto p-1"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2 space-y-4">
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Treatments
                      </Label>
                      <Input
                        type="text"
                        value={treatmentForm.treatment}
                        onChange={(e) =>
                          setTreatmentForm((prev: any) => ({
                            ...prev,
                            treatment: e.target.value,
                          }))
                        }
                        placeholder="Enter treatment details"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Goal
                      </Label>
                      <Input
                        type="text"
                        value={treatmentForm.goal}
                        onChange={(e) =>
                          setTreatmentForm((prev: any) => ({
                            ...prev,
                            goal: e.target.value,
                          }))
                        }
                        placeholder="Enter goal"
                        className="w-full"
                      />
                    </div>


                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        No of Sessions (for each day)
                      </Label>
                      <Input
                        type="number"
                        value={treatmentForm.sessions}
                        onChange={(e) =>
                          setTreatmentForm((prev: any) => ({
                            ...prev,
                            sessions: parseInt(e.target.value) || 1,
                          }))
                        }
                        placeholder="Enter No Of Sessions"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-2">
                        Price
                      </Label>
                      <Input
                        type="number"
                        value={treatmentForm.price}
                        onChange={(e) =>
                          setTreatmentForm((prev: any) => ({
                            ...prev,
                            price: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="Enter Price"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDates([]);
                      setTreatmentForm({
                        treatment: "",
                        sessions: 1,
                        price: 0,
                        consultant: "",
                        dates: "",
                        goal :""
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-600"
                    onClick={handleSingleTreatmentSubmit}
                    disabled={!selectedDates[0] || !treatmentForm.treatment}
                  >
                    Submit
                  </Button>
                </div>

                <div>
                  <Label>Progress</Label>
                  <Slider
                    value={[progress]}
                    max={100}
                    disabled
                    className="w-full"
                  />
                  <div className="text-right text-sm text-muted-foreground">
                    {progress.toFixed(2)}%
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Treatment</TableHead>
                        <TableHead>Goal</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Consultant</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {treatmentProtocols.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground"
                          >
                            No treatments added
                          </TableCell>
                        </TableRow>
                      ) : (
                        treatmentProtocols.map((protocol: any) => (
                          <TableRow key={protocol.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={protocol.status}
                                onChange={(e) =>
                                  handleUpdateStatus(
                                    protocol.id,
                                    e.target.checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {editingCell?.protocolId === protocol.id &&
                              editingCell?.field === "date" ? (
                                <Input
                                  type="date"
                                  value={treatmentForm.date}
                                  onChange={(e) =>
                                    setTreatmentForm((prev: any) => ({
                                      ...prev,
                                      date: e.target.value,
                                    }))
                                  }
                                  onBlur={handleUpdateProtocol}
                                  className="w-full"
                                />
                              ) : (
                                protocol.date?.split("T")[0]
                              )}
                            </TableCell>
                            <TableCell>
                              {editingCell?.protocolId === protocol.id &&
                              editingCell?.field === "treatment" ? (
                                <Input
                                  value={treatmentForm.treatment}
                                  onChange={(e) =>
                                    setTreatmentForm((prev: any) => ({
                                      ...prev,
                                      treatment: e.target.value,
                                    }))
                                  }
                                  onBlur={handleUpdateProtocol}
                                  className="w-full"
                                />
                              ) : (
                                protocol.treatment
                              )}
                            </TableCell>
                            <TableCell>
                              {editingCell?.protocolId === protocol.id &&
                              editingCell?.field === "goal" ? (
                                <Input
                                  value={treatmentForm.goal}
                                  onChange={(e) =>
                                    setTreatmentForm((prev: any) => ({
                                      ...prev,
                                      goal: e.target.value,
                                    }))
                                  }
                                  onBlur={handleUpdateProtocol}
                                  className="w-full"
                                />
                              ) : (
                                protocol.goal
                              )}
                            </TableCell>
                            <TableCell>
                              {editingCell?.protocolId === protocol.id &&
                              editingCell?.field === "sessions" ? (
                                <Input
                                  type="number"
                                  value={treatmentForm.sessions}
                                  onChange={(e) =>
                                    setTreatmentForm((prev: any) => ({
                                      ...prev,
                                      sessions: parseInt(e.target.value) || 1,
                                    }))
                                  }
                                  onBlur={handleUpdateProtocol}
                                  className="w-full"
                                />
                              ) : (
                                protocol.numberofsessions
                              )}
                            </TableCell>
                            <TableCell>
                              {editingCell?.protocolId === protocol.id &&
                              editingCell?.field === "price" ? (
                                <Input
                                  type="number"
                                  value={treatmentForm.price}
                                  onChange={(e) =>
                                    setTreatmentForm((prev: any) => ({
                                      ...prev,
                                      price: parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  onBlur={handleUpdateProtocol}
                                  className="w-full"
                                />
                              ) : (
                                protocol.price
                              )}
                            </TableCell>
                            <TableCell>Dr. {doctorName}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {editingCell?.protocolId === protocol.id ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-500"
                                      onClick={handleUpdateProtocol}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500"
                                      onClick={resetProtocolForm}
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-blue-500"
                                      onClick={() =>
                                        handleProtocolAction(
                                          protocol,
                                          protocol.date,
                                          "treatment"
                                        )
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500"
                                      onClick={() =>
                                        handleTreatmentProtocolDelete(
                                          protocol.id
                                        )
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* <TabsContent value="TREATMENT_ENCOUNTER" className="mt-4">
              <div className="space-y-4">
                <form
                  className="space-y-4"
                  onSubmit={handleTreatmentEncounterSubmit}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="block text-sm font-medium mb-1">
                        Date & Time
                      </Label>
                      <Input
                        type="datetime-local"
                        value={`${treatmentEncounterForm.date}T${treatmentEncounterForm.time}`}
                        onChange={(e) => {
                          const [date, time] = e.target.value.split("T");
                          setTreatmentEncounterForm((prev) => ({
                            ...prev,
                            date,
                            time,
                          }));
                        }}
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-1">
                        Treatment Type
                      </Label>
                      <select
                        className="w-full rounded-md border border-input px-3 py-2"
                        value={treatmentEncounterForm.treatmenttype}
                        onChange={(e) =>
                          setTreatmentEncounterForm((prev) => ({
                            ...prev,
                            treatmenttype: e.target.value,
                          }))
                        }
                      >
                        <option value="initial">Initial Assessment</option>
                        <option value="follow">Follow-up</option>
                        <option value="discharge">Discharge</option>
                      </select>
                    </div>
                    <div>
                      <Label className="block text-sm font-medium mb-1">
                        Duration (minutes)
                      </Label>
                      <Input
                        type="number"
                        min="15"
                        step="15"
                        value={treatmentEncounterForm.duration}
                        onChange={(e) =>
                          setTreatmentEncounterForm((prev) => ({
                            ...prev,
                            duration: parseInt(e.target.value) || 15,
                          }))
                        }
                        required
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-1">
                      Subjective Assessment
                    </Label>
                    <Input
                      type="text"
                      value={treatmentEncounterForm.subjectiveassessment}
                      onChange={(e) =>
                        setTreatmentEncounterForm((prev) => ({
                          ...prev,
                          subjectiveassessment: e.target.value,
                        }))
                      }
                      placeholder="Enter subjective assessment"
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-1">
                      Treatment Provided
                    </Label>
                    <Input
                      type="text"
                      value={treatmentEncounterForm.treatmentprovided}
                      onChange={(e) =>
                        setTreatmentEncounterForm((prev) => ({
                          ...prev,
                          treatmentprovided: e.target.value,
                        }))
                      }
                      placeholder="Enter treatment provided"
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-1">
                      Progress Notes
                    </Label>
                    <Input
                      type="text"
                      value={treatmentEncounterForm.progressnotes}
                      onChange={(e) =>
                        setTreatmentEncounterForm((prev) => ({
                          ...prev,
                          progressnotes: e.target.value,
                        }))
                      }
                      placeholder="Enter progress notes"
                      required
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="block text-sm font-medium mb-1">
                      Price
                    </Label>
                    <Input
                      type="number"
                      value={treatmentEncounterForm.price}
                      onChange={(e) =>
                        setTreatmentEncounterForm((prev) => ({
                          ...prev,
                          price: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="Enter price"
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setTreatmentEncounterForm({
                          date: "",
                          time: "",
                          treatmenttype: "initial",
                          duration: 15,
                          subjectiveassessment: "",
                          treatmentprovided: "",
                          progressnotes: "",
                          price: 0,
                        })
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-500"
                      disabled={loading}
                    >
                      {loading ? "Adding..." : "Add Encounter"}
                    </Button>
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Therapist</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {treatmentEncounters.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No Encounters Recorded
                          </TableCell>
                        </TableRow>
                      ) : (
                        treatmentEncounters.map((encounter) => (
                          <TableRow key={encounter.id}>
                            <TableCell>{`${encounter.date} ${encounter.time}`}</TableCell>
                            <TableCell>{encounter.treatmenttype}</TableCell>
                            <TableCell>{encounter.duration} minutes</TableCell>
                            <TableCell>Dr. {doctorName}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-800"
                                onClick={() =>
                                  handleTreatmentEncounterDelete(encounter.id)
                                }
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent> */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Intervention;
