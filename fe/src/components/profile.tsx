import  { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Activepatient from "./activepatient";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_BASE_URL;
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  age: z.string(),
  gender: z.string(),
  contact: z.string(),
  patientType: z.string(),
  referral: z.string(),
  aadharCard: z.string(),
});

const Profile = () => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      age: "",
      gender: "",
      contact: "",
      patientType: "",
      referral: "",
      aadharCard: "",
    },
  });
  const navigate = useNavigate();
  useEffect(() => {
    // Get active patient from localStorage
    const storedPatient = localStorage.getItem('activePatient');
    if (storedPatient) {
      const patient = JSON.parse(storedPatient);
      
      // Set form values with patient data
      form.reset({
        name: patient.name || "",
        age: patient.age?.toString() || "",
        gender: patient.gender || "",
        contact: patient.contact || "",
        patientType: patient.patientType || "",
        referral: patient.referral || "",
        aadharCard: patient.aadharCard || "",
      });
    }
  }, [form]);

  const onSubmit = async (data:any) => {
    setIsLoading(true);
    try {
      // Update patient data in localStorage
      const storedPatient = localStorage.getItem('activePatient');
      if (storedPatient) {
        const patient = JSON.parse(storedPatient);
      
        const updatedPatient = {
          ...patient,
          ...data,
          age: parseInt(data.age), // Convert age to number
        };

        await axios.put(`${API_URL}/add/updatePatient/${patient.id}`, updatedPatient);

        localStorage.setItem('activePatient', JSON.stringify(updatedPatient));
      }
      console.log("Updated data:", data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 p-4 md:p-10">
      <Activepatient />
      <Card className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Patient name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Age" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="patientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select patient type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Inpatient">Inpatient</SelectItem>
                        <SelectItem value="Outpatient">Outpatient</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Contact number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referral"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referral</FormLabel>
                    <FormControl>
                      <Input placeholder="Referral source" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="aadharCard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar Card</FormLabel>
                    <FormControl>
                      <Input placeholder="Aadhar card number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-4 justify-start mt-6">
              <Button 
                className="bg-blue-500 w-full sm:w-auto" 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Profile"}
              </Button>

                <Button 
                className="bg-blue-500 w-full sm:w-auto" 
                type="button" 
                disabled={isLoading}
                onClick={() => {
                  navigate("/consent");
                }}
                >
                Take Consent
                </Button>

                <Button 
                className="bg-blue-500 w-full sm:w-auto" 
                type="button" 
                disabled={isLoading}
                onClick={() => {
                  navigate("/Consultation");
                }}
                >
              Consultation
                </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default Profile;