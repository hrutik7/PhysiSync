import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog"
import { Button } from "./ui/button"
import { Printer, CheckCircle, XCircle } from 'lucide-react';

const VerificationDialog = ({ 
  isOpen, 
  onClose, 
  patient, 
  onConfirm, 
  onPrint 
}:any) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Verify Patient Details</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <h3 className="font-semibold">Personal Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Registry No:</span> {patient?.registryNumber}</p>
              <p><span className="font-medium">Name:</span> {patient?.name}</p>
              <p><span className="font-medium">Age/Gender:</span> {patient?.age} / {patient?.gender}</p>
              <p><span className="font-medium">Phone:</span> {patient?.phone}</p>
              <p><span className="font-medium">Address:</span> {patient?.address}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold">Admission Details</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Ward/Bed:</span> {patient?.wardNumber}/{patient?.bedNumber}</p>
              <p><span className="font-medium">Doctor:</span> {patient?.attendingDoctor}</p>
              <p><span className="font-medium">Admission Date:</span> {new Date(patient?.admissionDate).toLocaleDateString()}</p>
              <p><span className="font-medium">Diagnosis:</span> {patient?.diagnosis}</p>
              <p><span className="font-medium">Emergency Contact:</span> {patient?.emergencyContact}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Confirm & Register
            </Button>
          </div>
          <Button
            onClick={onPrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Printer className="w-4 h-4" />
            Print Admission Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VerificationDialog;