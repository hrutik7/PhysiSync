import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Form, FormField, FormItem, FormLabel, FormControl } from "./ui/form";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useForm } from "react-hook-form";
import axios from "axios";

interface ConsentFormProps {
  patientId?: string;
  patientName?: string;
}

const ConsentForm = () => {
  const [signature, setSignature] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [consentCheckboxes, setConsentCheckboxes] = useState<any>({
    consent0: false,
    consent1: false,
    consent2: false,
    consent3: false,
    consent4: false
  });
  const [patients, setPatients] = useState<any[]>([]);
  
  const form = useForm({
    defaultValues: {
      name: '',
      age: '',
      gender: '',
      contact: '',
      address: '',
      date: ''
    }
  });

  const { watch, setValue } = form;
  const formValues = watch();
  const API_URL =import.meta.env.VITE_API_BASE_URL
  const patient = JSON.parse(localStorage.getItem("activePatient") || "{}");
  const languages: any = {
    english: {
      title: "Physiotherapy Consent Form",
      patientInfo: "Patient Information",
      name: "Full Name",
      age: "Age",
      gender: "Gender",
      contact: "Contact Number",
      address: "Address",
      consent: [
        "I hereby consent to receive physiotherapy treatment.",
        "I understand that physiotherapy involves physical examination and various physical therapy interventions.",
        "I have been informed about the benefits and potential risks of the treatment.",
        "I understand that I can withdraw my consent at any time.",
        "I agree to inform the physiotherapist about any changes in my physical condition.",
      ],
      signature: "Patient Signature",
      date: "Date",
      submit: "Submit Form",
    },
    hindi: {
      title: "फिजियोथेरेपी सहमति पत्र",
      patientInfo: "रोगी की जानकारी",
      name: "पूरा नाम",
      age: "उम्र",
      gender: "लिंग",
      contact: "संपर्क नंबर",
      address: "पता",
      consent: [
        "मैं फिजियोथेरेपी उपचार प्राप्त करने की सहमति देता/देती हूं।",
        "मैं समझता/समझती हूं कि फिजियोथेरेपी में शारीरिक परीक्षण और विभिन्न फिजिकल थेरेपी हस्तक्षेप शामिल हैं।",
        "मुझे उपचार के लाभों और संभावित जोखिमों के बारे में सूचित किया गया है।",
        "मैं समझता/समझती हूं कि मैं किसी भी समय अपनी सहमति वापस ले सकता/सकती हूं।",
        "मैं अपनी शारीरिक स्थिति में किसी भी बदलाव के बारे में फिजियोथेरेपिस्ट को सूचित करने के लिए सहमत हूं।",
      ],
      signature: "रोगी के हस्ताक्षर",
      date: "दिनांक",
      submit: "फॉर्म जमा करें",
    },
    marathi: {
      title: "फिजिओथेरपी संमती पत्र",
      patientInfo: "रुग्णाची माहिती",
      name: "पूर्ण नाव",
      age: "वय",
      gender: "लिंग",
      contact: "संपर्क क्रमांक",
      address: "पत्ता",
      consent: [
        "मी याद्वारे फिजिओथेरपी उपचार घेण्यास संमती देत आहे।",
        "मला समजते की फिजिओथेरपीमध्ये शारीरिक तपासणी आणि विविध फिजिकल थेरपी उपचार समाविष्ट आहेत।",
        "मला उपचारांचे फायदे आणि संभाव्य धोके याबद्दल माहिती देण्यात आली आहे।",
        "मला समजते की मी कधीही माझी संमती मागे घेऊ शकतो/शकते।",
        "माझ्या शारीरिक स्थितीत कोणताही बदल झाल्यास मी फिजिओथेरपिस्टला कळवण्यास सहमत आहे।",
      ],
      signature: "रुग्णाची सही",
      date: "दिनांक",
      submit: "फॉर्म सबमिट करा",
    },
  };
  const handleCheckboxChange = (index: any) => {
    setConsentCheckboxes((prev :any) => ({
      ...prev,
      [`consent${index}`]: !prev[`consent${index}`]
    }));
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await axios.get(`${API_URL}/add/getpatients`);
        console.log(response.data,"response.data")
        setPatients(response.data);
      } catch (error) {
        console.error("Error fetching patients:", error);
      }
    };

    fetchPatients();
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignature(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  };

  const generatePDF = (formData: any) => {
    // Ensure formData has values

    const patient = JSON.parse(localStorage.getItem("activePatient") || "{}");
    console.log('Form Data:', formData); // For debugging

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .section { margin-bottom: 15px; }
            .signature { margin-top: 20px; }
            .consent-item { margin: 10px 0; }
            .field-label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${languages[selectedLanguage].title}</h1>
          </div>
          
          <div class="section">
            <h2>${languages[selectedLanguage].patientInfo}</h2>
            <p><span class="field-label">${languages[selectedLanguage].name}:</span> ${patient.name || ''}</p>
            <p><span class="field-label">${languages[selectedLanguage].age}:</span> ${patient.age || ''}</p>
            <p><span class="field-label">${languages[selectedLanguage].gender}:</span> ${patient.gender || ''}</p>
            <p><span class="field-label">${languages[selectedLanguage].contact}:</span> ${patient.contact || ''}</p>
            <p><span class="field-label">${languages[selectedLanguage].address}:</span> ${formData.address || ''}</p>
          </div>

          <div class="section">
            <h2>Consent Items</h2>
            ${Object.entries(consentCheckboxes).map(([key, value], index) => 
              `<div class="consent-item">
                ${value ? '☑' : '☐'} ${languages[selectedLanguage].consent[index]}
              </div>`
            ).join('')}
          </div>

          <div class="signature">
            <p><span class="field-label">${languages[selectedLanguage].signature}:</span></p>
            <img src="${signature}" width="200"/>
            <p><span class="field-label">${languages[selectedLanguage].date}:</span> ${patient.date || ''}</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consent_form_${formData.name || ''}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const onSubmit = (data: any) => {
   
    if (Object.values(consentCheckboxes).some(value => !value)) {
      alert("Please agree to all consent items");
      return;
    }
    
    if (!signature) {
      alert("Please provide a signature before submitting");
      return;
    }

    // Make sure we're passing the form data correctly
    const formData = {
      name: data.name,
      age: data.age,
      gender: data.gender,
      contact: data.contact,
      address: data.address,
      date: data.date
    };
    
    generatePDF(formData);
  };

  return (
    <div className="w-full">
      <CardHeader>
        <Tabs defaultValue="english">
          <TabsList className="w-full">
            <TabsTrigger
              value="english"
              onClick={() => setSelectedLanguage("english")}
            >
              English
            </TabsTrigger>
            <TabsTrigger
              value="hindi"
              onClick={() => setSelectedLanguage("hindi")}
            >
              हिंदी
            </TabsTrigger>
            <TabsTrigger
              value="marathi"
              onClick={() => setSelectedLanguage("marathi")}
            >
              मराठी
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <CardTitle className="text-2xl mt-4">
          {languages[selectedLanguage].title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{languages[selectedLanguage].name}</FormLabel>
                  <FormControl>
                    <Input {...field} required  value={patient.name}/>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{languages[selectedLanguage].age}</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} required value={patient.age} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{languages[selectedLanguage].gender}</FormLabel>
                    <FormControl>
                      <Input {...field} required value={patient.gender} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{languages[selectedLanguage].contact}</FormLabel>
                  <FormControl>
                    <Input {...field} required value={patient.contact} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{languages[selectedLanguage].address}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* <FormField
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Patient</FormLabel>
                  <Select onValueChange={field.onChange} required>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            /> */}

            <div className="space-y-4">
              {languages[selectedLanguage].consent.map(
                (item: any, index: any) => (
                  <div key={index} className="flex flex-row items-start space-x-3 space-y-0">
                    <Checkbox
                      checked={consentCheckboxes[`consent${index}`]}
                      onCheckedChange={() => handleCheckboxChange(index)}
                      required
                    />
                    <label className="font-normal">{item}</label>
                  </div>
                )
              )}
            </div>

            <div className="space-y-4">
              <FormLabel>{languages[selectedLanguage].signature}</FormLabel>
              <div className="border rounded-md p-4">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="border border-gray-300 rounded"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-2"
                onClick={clearSignature}
              >
                Clear Signature
              </Button>
              </div>

              <FormField
              name="date"
              render={({ field }) => (
                <FormItem>
                <FormLabel>{languages[selectedLanguage].date}</FormLabel>
                <FormControl>
                  <Input
                  type="date"
                  {...field}
                  required
                  value={new Date().toISOString().split("T")[0]}
                  readOnly
                  />
                </FormControl>
                </FormItem>
              )}
              />
            </div>

            <Button type="submit" className="w-full bg-blue-500">
              {languages[selectedLanguage].submit}
            </Button>
          </form>
        </Form>
      </CardContent>
    </div>
  );
};

export default ConsentForm;