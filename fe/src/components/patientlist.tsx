import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { io } from "socket.io-client";
import { Loader2 } from "lucide-react"; // Import Loader icon

interface Patient {
  id?: string;
  patientId?: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  referral: string;
}

// Move socket initialization outside component to prevent recreation
const socket = io("wss://100.120.140.24:3000", {
  withCredentials: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
});

const PatientList = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true); // Page loading state
  const [fetchError, setFetchError] = useState(false); // Error state for fetch
  const [newPatient, setNewPatient] = useState({
    id: "",
    name: "",
    age: "",
    gender: "",
    contact: "",
    referral: "",
    aadhar: "",
  });

  // Handle search filtering
  useEffect(() => {
    const filtered = patients.filter((patient) =>
      Object.values(patient).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredPatients(filtered);
  }, [searchTerm, patients]);

  // Handle WebSocket setup
  // useEffect(() => {
  //   const handleNewPatient = (newPatient: Patient) => {
  //     console.log("New patient received:", newPatient);
  //     setPatients(prevPatients => {
  //       // Check if patient already exists to prevent duplicates
  //       if (prevPatients.some(p => p.id === newPatient.id || p.patientId === newPatient.patientId)) {
  //         return prevPatients;
  //       }
  //       return [...prevPatients, newPatient];
  //     });
  //   };

  //   socket.on("connect", () => {
  //     console.log("Connected to WebSocket server:", socket.id);
  //   });

  //   socket.on("patient-added", handleNewPatient);

  //   socket.on("connect_error", (err: Error) => {
  //     console.error("WebSocket Connection Error:", err.message);
  //     console.error("Error details:", err);
  //   });

  //   // Cleanup listeners on unmount
  //   return () => {
  //     socket.off("connect");
  //     socket.off("patient-added", handleNewPatient);
  //     socket.off("connect_error");
  //   };
  // }, []);

  // Initial data fetch
  useEffect(() => {
    fetchPatients();
  }, []);
  const API_URL = import.meta.env.VITE_API_BASE_URL;
  const fetchPatients = async () => {
    // Set page loading state
    setPageLoading(true);
    setFetchError(false);

    try {
      const doctorId = JSON.parse(localStorage.getItem("userData") || "{}")
        ?.user?.id;
      console.log(localStorage.getItem("userData"), "asdklads");
      if (!doctorId) {
        throw new Error("Doctor ID not found in localStorage");
      }

      const response = await fetch(
        `${API_URL}/add/getpatients?doctorId=${doctorId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error("Error fetching patients:", error);
      toast.error("Failed to fetch patients. Please try again.");
      setFetchError(true);
    } finally {
      setPageLoading(false);
    }
  };

  const handlePatientActivation = (patient: any) => {
    localStorage.setItem("activePatient", JSON.stringify(patient));

    toast.success(`Patient ${patient?.patientId} activated successfully`);

    navigate("/profile");
  };

  const generatePatientId = () => {
    const existingIds = patients.map((p) => {
      // Handle both id and patientId properties
      console.log(p,"popi")
      const idStr = p.patientId;
      const idString = idStr?.toString().replace("P", "");
      return idString ? parseInt(idString) : 0;
    });
    const highestId = Math.max(...existingIds, 0);
    const newNumericId = highestId + 1;
    return `P${newNumericId.toString().padStart(3, "0")}`;
  };

  const handleAddPatient = async () => {
    if (
      !newPatient.name ||
      !newPatient.age ||
      !newPatient.gender ||
      !newPatient.contact
    ) {
      console.log("in toast");
      toast.error("Please fill all required fields");
      return;
    }

    // Set loading state to true before API call
    setIsLoading(true);

    try {
      const newId = generatePatientId();
      const doctorId = JSON.parse(localStorage.getItem("userData") || "{}")
        ?.user?.id;
      // Create patient object with both id and patientId
      const patientToAdd = {
        id: newId,
        patientId: newId, // Add patientId to match the table display
        name: newPatient.name,
        age: parseInt(newPatient.age),
        gender: newPatient.gender,
        contact: newPatient.contact,
        referral: newPatient.referral || "Self",
        aadhar: newPatient.aadhar || "N/A",
        doctorId: doctorId,
      };

      // Show loading toast
      const loadingToast = toast.loading("Adding new patient...");

      // Add to local state first to immediately show in UI
      setPatients((prev) => [patientToAdd, ...prev]);
console.log(patientToAdd,"patientToAdd")
      // Send to server
      const response = await fetch(`${API_URL}/add/add-patient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // id: patientToAdd.id,
          name: patientToAdd.name,
          age: patientToAdd.age,
          gender: patientToAdd.gender,
          contact: patientToAdd.contact,
          referral: patientToAdd.referral,
          aadhar: patientToAdd.aadhar,
          doctorId: patientToAdd.doctorId,
        }),
      });

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      const data = await response.json();
      console.log("New patient added:", data);

      // If server returns a different ID structure, update the patient in state
      // if (data.id && data.id !== patientToAdd.id) {
      //   console.log(data,"dattu")
      //   setPatients((prev) =>
      //     prev.map((p) =>
      //       p.id === patientToAdd.id
      //         ? { ...p, id: data.id, patientId: data.id }
      //         : p
      //     )
      //   );
      // }

      // Reset form and close dialog
      setIsAddingPatient(false);
      setNewPatient({
        id: "",
        name: "",
        age: "",
        gender: "",
        contact: "",
        referral: "",
        aadhar: "",
      });

      toast.success("Patient added successfully");
    } catch (error) {
      console.error("Error adding patient:", error);
      toast.error("Failed to add patient. Please try again.");
    } finally {
      // Set loading state to false after API call completes
      setIsLoading(false);
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      <p className="mt-4 text-gray-500">Loading patients data...</p>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      <div className="text-red-500 text-xl mb-4">Something went wrong</div>
      <p className="text-gray-500 mb-4">We couldn't load the patient data.</p>
      <Button onClick={fetchPatients} className="bg-blue-500">
        Try Again
      </Button>
    </div>
  );

  return (
    <div className="p-2 md:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl md:text-2xl">Patient List</CardTitle>
            <Dialog open={isAddingPatient} onOpenChange={setIsAddingPatient}>
              <DialogTrigger asChild>
                <Button className="bg-blue-500 w-full sm:w-auto">
                  Add New Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-auto w-[95%] rounded-lg">
                <DialogHeader>
                  <DialogTitle>Add New Patient</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newPatient.name}
                      onChange={(e) =>
                        setNewPatient((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Patient name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      value={newPatient.age}
                      onChange={(e) =>
                        setNewPatient((prev) => ({
                          ...prev,
                          age: e.target.value,
                        }))
                      }
                      placeholder="Age"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={newPatient.gender}
                      onValueChange={(value) =>
                        setNewPatient((prev) => ({ ...prev, gender: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      value={newPatient.contact}
                      onChange={(e) =>
                        setNewPatient((prev) => ({
                          ...prev,
                          contact: e.target.value,
                        }))
                      }
                      placeholder="Contact number"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="referral">Referral</Label>
                    <Input
                      id="referral"
                      value={newPatient.referral}
                      onChange={(e) =>
                        setNewPatient((prev) => ({
                          ...prev,
                          referral: e.target.value,
                        }))
                      }
                      placeholder="Referral source (optional)"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingPatient(false)}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="bg-blue-500 w-full sm:w-auto"
                    onClick={handleAddPatient}
                    disabled={isLoading}
                  >
                    {isLoading ? "Adding..." : "Add Patient"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-4 w-full">
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </CardHeader>
        <CardContent className="px-1 md:px-6">
          {pageLoading ? (
            <LoadingSpinner />
          ) : fetchError ? (
            <ErrorState />
          ) : (
            <div className="overflow-x-auto pb-2">
              {" "}
              {/* Added pb-2 for scrollbar spacing */}
              <Table className="min-w-[700px] md:min-w-full">
                {" "}
                {/* Minimum width for small screens */}
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 whitespace-nowrap">ID</TableHead>
                    <TableHead className="whitespace-nowrap">Name</TableHead>
                    <TableHead className="w-12 whitespace-nowrap">
                      Age
                    </TableHead>
                    <TableHead className="whitespace-nowrap">Gender</TableHead>
                    <TableHead className="whitespace-nowrap">Contact</TableHead>
                    <TableHead className="hidden md:table-cell whitespace-nowrap">
                      Referral
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients
                    .slice()
                    .reverse()
                    .map((patient: any) => (
                      <TableRow
                        key={patient.patientId}
                        // ... (keep existing event handlers)
                        onDoubleClick={() => handlePatientActivation(patient)}
                        onClick={() => {
                          // On mobile, single tap should activate
                          if (window.innerWidth < 768) {
                            handlePatientActivation(patient);
                          }
                        }}

                        className="cursor-pointer hover:bg-gray-100"
                      >
                        <TableCell className="text-xs md:text-sm whitespace-nowrap px-2 py-2">
                          {patient.patientId}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm font-medium whitespace-nowrap px-2 py-2">
                          {patient.name}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm whitespace-nowrap px-2 py-2">
                          {patient.age}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm whitespace-nowrap px-2 py-2">
                          {patient.gender}
                        </TableCell>
                        <TableCell className="text-xs md:text-sm whitespace-nowrap px-2 py-2">
                          {patient.contact}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs md:text-sm whitespace-nowrap px-2 py-2">
                          {patient.referral}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientList;
