import React, { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "./ui/table";
import Activepatient from "./activepatient";
import axios from "axios";
import { useToast } from "./ui/use-toast";

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

const InvestigationForm = () => {
  const { toast } = useToast();
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
    doctorId : "",
    patientId : "",
  });
  const API_URL = import.meta.env.VITE_API_BASE_URL
  useEffect(() => {
    const activePatient = localStorage.getItem("activePatient");
    if (activePatient) {
      const parsed = JSON.parse(activePatient);
      setPatientId(parsed.id);
      fetchInvestigations(parsed.id);
    }
  }, []);

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
      toast({
        title: "Error",
        description: "Failed to load investigation records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  const handleViewInvestigation = (investigation: any) => {
    console.log(investigation);
    setSelectedFile(investigation.fileName);
    setSelectedInvestigation(investigation);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.reportType) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: "Investigation record added successfully",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "Failed to add investigation record",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev:any) => ({
      ...prev,
      files: e.target.files,
    }));
  };

  // const handleViewInvestigation = async (id: string) => {
  //   try {
  //     const response = await axios.get(`/api/investigations/detail/${id}`);
  //     console.log(response.data);
  //   } catch (error) {
  //     console.error("Error fetching investigation details:", error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to load investigation details",
  //       variant: "destructive",
  //     });
  //   }
  // };

  const handleDeleteInvestigation = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this investigation?")) {
      try {
        await axios.delete(
          `${API_URL}/investigate/deleteinvestigation/${id}`
        );
        fetchInvestigations(patientId);
        toast({
          title: "Success",
          description: "Investigation record deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting investigation:", error);
        toast({
          title: "Error",
          description: "Failed to delete investigation record",
          variant: "destructive",
        });
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
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto p-6 space-y-6">
      <Activepatient />
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
                <p>{selectedInvestigation.description || "No description"}</p>
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
                  <TableCell colSpan={5} className="text-center text-gray-500">
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
                        <span className="text-sm text-gray-500">No files</span>
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
                          onClick={() => handleDeleteInvestigation(record.id)}
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
  );
};

export default InvestigationForm;
