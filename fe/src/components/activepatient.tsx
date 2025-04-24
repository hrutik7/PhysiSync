import { Card } from "./ui/card"
import { Label } from "./ui/label"
import { useEffect, useState } from "react"

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  contact: string;
  email: string;
}

const Activepatient = () => {
  const [activePatient, setActivePatient] = useState<any | null>(null);

  useEffect(() => {
    // Get active patient from localStorage
    const storedPatient = localStorage.getItem('activePatient');
    if (storedPatient) {
      setActivePatient(JSON.parse(storedPatient));
    }

    // Add event listener for storage changes
    const handleStorageChange = () => {
      const updatedPatient = localStorage.getItem('activePatient');
      if (updatedPatient) {
        setActivePatient(JSON.parse(updatedPatient));
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (!activePatient) {
    return (
      <div className="mb-5">
        <Card>
          <div className="p-4">
            <Label>No Active Patient</Label>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <Card>
        <div className="p-4">
          <div className="flex flex-row gap-12">
            <Label className="font-bold text-blue-600">Active Patient</Label>
            <Label>ID: {activePatient?.patientId}</Label>
            <Label>Name: {activePatient.name}</Label>
            <Label>Age: {activePatient.age}</Label>
            <Label>Gender: {activePatient.gender}</Label>
            <Label>Contact: {activePatient.contact}</Label>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Activepatient;