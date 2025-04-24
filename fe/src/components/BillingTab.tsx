// import React from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
// import { Label } from "./ui/label";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "./ui/table";
// import { useRecoilValue } from "recoil";
// import { serviceAtom } from "../atom/serviceAtom";
// import { Checkbox } from "./ui/checkbox";
// import { useState } from "react";
// import { useEffect } from "react";
// interface BillingTabProps {
//   activePatient: Patient | null;
//   bills: Bill[];
//   payments: Payment[];
//   setBills: React.Dispatch<React.SetStateAction<Bill[]>>;
// }
// interface BillingItem {
//   fee: string | number;
//   count: string | number;
// }
// export const BillingTab: React.FC<BillingTabProps> = ({
//   activePatient,
//   bills,
//   payments,
//   setBills,
// }) => {
//   const serviceData = useRecoilValue(serviceAtom);
//   const [wholetotal, setWholeTotal] = useState(0);
//   const [paidAmount, setPaidAmount] = useState(0);
//   useEffect(() => {
//     console.log(activePatient, "activePatientddddd");
//     // const billData = activePatient
//     const total =
//       serviceData[0]?.billingData?.reduce((acc, item: BillingItem, index) => {
//         const count = Number(item.count);
//         const fee = Number(item.fee);
//         console.log(count,fee,"sdjnjmoisdn")
//         // Skip invalid entries
//         if (isNaN(count) || isNaN(fee)) {
//           console.log(`Skipping invalid entry at index ${index}`);
//           return acc;
//         }

//         const subtotal = count * fee;
//         return acc + subtotal;
//       }, 0);

//     console.log(serviceData[0]?.billingData,"Final totaldd:", total);
//     setWholeTotal(total);
//     // console.log(total,"serviceDataserviceData")
//   }, []);

//   if (!activePatient) {
//     return <div className="p-4">Please select a patient first</div>;
//   }

//   const patientBills = bills.filter(
//     (bill) => bill.patientId === activePatient.registryNumber
//   );
//   const balance = activePatient?.deposit - paidAmount;

//   const handleCheckboxChange = (index: number) => {
//     setBills((prevBills) => {
//       const updatedBills = [...prevBills];
//       const bill = updatedBills[index];
//       bill.isPaid = !bill.isPaid; // Toggle isPaid status
//       return updatedBills;
//     });
//   };

//   const printInvoice = () => {
//     const invoiceContent = `
//       <div style="font-family: Arial, sans-serif; margin: 20px;">
//         <h2 style="text-align: center;">PhysioPoint</h2>
//         <p style="text-align: center; margin: 0;">तपस्या कॉम्प्लेक्स, बदवेश्वर, रोड - भोकरदन रोड, जालना ☎ 9552121633</p>
//         <hr />
//         <h3>IPD Final Bill</h3>
//         <p><strong>Patient Name:</strong> ${activePatient.name}</p>
//         <p><strong>Age/Sex:</strong> ${activePatient.age}/${
//       activePatient.gender
//     }</p>
//         <p><strong>Registry Number:</strong> ${activePatient.registryNumber}</p>
//         <p><strong>Admission Date:</strong> 13-Dec-2024</p>
//         <p><strong>Discharge Date:</strong> 15-Dec-2024</p>
//         <hr />
//         <table style="width: 100%; border-collapse: collapse;">
//           <thead>
//             <tr>
//               <th style="border: 1px solid black; padding: 5px;">Service</th>
//               <th style="border: 1px solid black; padding: 5px;">Count</th>
//               <th style="border: 1px solid black; padding: 5px;">Price</th>
//               <th style="border: 1px solid black; padding: 5px;">Total</th>
//             </tr>
//           </thead>
//           <tbody>
//             ${serviceData[0]?.billingData
//               .map(
//                 (bill) => `
//                   <tr>
//                     <td style="border: 1px solid black; padding: 5px;">${
//                       bill.service
//                     }</td>
//                     <td style="border: 1px solid black; padding: 5px;">${
//                       bill.count
//                     }</td>
//                     <td style="border: 1px solid black; padding: 5px;">₹${
//                       bill.price
//                     }</td>
//                     <td style="border: 1px solid black; padding: 5px;">₹${
//                       bill.count * bill.price
//                     }</td>
//                   </tr>
//                 `
//               )
//               .join("")}
//           </tbody>
//         </table>
//         <hr />
//         <p><strong>Total Billed:</strong> ₹${wholetotal}</p>
//         <p><strong>Deposit:</strong> ₹${activePatient?.deposit}</p>
//         <p><strong>Paid:</strong> ₹${paidAmount}</p>
//         <p><strong>Balance:</strong> ₹${
//           balance > 0 ? balance.toFixed(2) : balance.toFixed(2).replace("-", "")
//         }</p>
//         <hr />
//         // <p style="text-align: center;">For Niramay Multispeciality Hospital</p>
//       </div>
//     `;

//     const printWindow = window.open("", "", "width=800,height=600");
//     printWindow?.document.write(invoiceContent);
//     printWindow?.document.close();
//     printWindow?.print();
//   };

//   return (
//     <div className="space-y-4">
//       <Card>
//         <CardHeader>
//           <CardTitle>
//             Billing Summary - {activePatient.name} -{" "}
//             {activePatient?.registryNumber}
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-4 gap-4 mb-4">
//             <div>
//               <Label>Total Billed</Label>
//               <div className="text-2xl font-bold">₹{wholetotal}</div>
//             </div>
//             <div>
//               <Label>Deposit</Label>
//               <div className="text-2xl font-bold text-yellow-500">
//                 ₹{activePatient?.deposit}
//               </div>
//             </div>
//             <div>
//               <Label>Paid</Label>
//               <div className="text-2xl font-bold text-green-600">
//                 ₹{paidAmount}
//               </div>
//             </div>
//             <div>
//               <Label>Total</Label>
//               {balance > 0 ? (
//                 <div className="text-2xl font-bold text-red-600">
//                   ₹{balance.toFixed(2)}
//                 </div>
//               ) : (
//                 <div className="text-2xl font-bold text-green-600">
//                   ₹{balance.toFixed(2).replace("-", "")}
//                 </div>
//               )}
//             </div>
//           </div>
//           <button
//             onClick={printInvoice}
//             className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//           >
//             Print Invoice
//           </button>

//           <div className="space-y-4">
//             <h3 className="text-lg font-semibold">Bill Details</h3>
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>Sr No.</TableHead>
//                   <TableHead>Service</TableHead>
//                   <TableHead>Count</TableHead>
//                   <TableHead>Price</TableHead>
//                   <TableHead>Status</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {serviceData[0]?.billingData?.map(
//                   (bill: any, index: number) => (
//                     <TableRow key={index}>
//                       {bill.service.length !== 0 && (
//                         <TableCell>{index + 1}</TableCell>
//                       )}
//                       {bill.service.length !== 0 && (
//                         <TableCell>{bill.service}</TableCell>
//                       )}
//                       {bill.service.length !== 0 && (
//                         <TableCell>{bill.count}</TableCell>
//                       )}
//                       {bill.service.length !== 0 && (
//                         <TableCell>₹{bill.price}</TableCell>
//                       )}
//                       {bill.service.length !== 0 && (
//                         <TableCell>
//                           <Checkbox
//                             onChange={() => handleCheckboxChange(index)}
//                             onValueChange={() => {
//                               console.log("first");
//                             }}
//                             checked={bill.isPaid}
//                             onCheckedChange={(e: any) => {
//                               const total = bill.price * bill.count;
//                               if (e) {
//                                 setPaidAmount(paidAmount + total);
//                               } else {
//                                 setPaidAmount(paidAmount - total);
//                               }
//                               console.log(e, "demoas");
//                             }}
//                           />
//                         </TableCell>
//                       )}
//                     </TableRow>
//                   )
//                 )}
//               </TableBody>
//             </Table>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };
