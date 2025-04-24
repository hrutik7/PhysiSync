import * as express from "express";

import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
export class patientService {
  async addPatient(req: AuthenticatedRequest, res: express.Response) {
    const prisma = new PrismaClient();

    const user = req.user;
    console.log("Received add-patient request:", req.user);
    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { name, age, gender, contact, referral, aadharCard, doctorId } = user;

    // if (
    //   !user?.name ||
    //   !user.age ||
    //   !user.gender ||
    //   !user.contact ||
    //   !user.aadharCard
    // ) {
    //   return res.status(400).json({ error: "Required fields are missing" });
    // }

    try {
      // Find the last patient by patientId instead of id
      const lastPatient = await prisma.patient.findFirst({
        orderBy: {
          patientId: "desc",
        },
      });

      // Generate new ID based on patientId field
      const newId: any = lastPatient
        ? `P${(parseInt(lastPatient.patientId.slice(1)) + 1)
            .toString()
            .padStart(3, "0")}`
        : "P001";

      console.log("Last patient:", lastPatient);
      console.log("Generated new ID:", newId);

      const newPatient = await prisma.patient.create({
        data: {
          name,
          age: parseInt(age, 10),
          gender,
          contact,
          referral,
          aadharCard,
          patientId: newId,
          doctor: {
            connect: {
              id: doctorId,
            },
          },
        },
      });
      res.status(201).json(newPatient);
    } catch (error) {
      console.error("Error adding patient:", error);
      res.status(500).json({ error: "Error adding patient" });
    } finally {
      await prisma.$disconnect();
    }
  }

  async getPatients(req: express.Request, res: express.Response) {
    const prisma = new PrismaClient();
    try {
      const doctorId = req.query.doctorId;

      if (!doctorId) {
        return res.status(400).json({ error: "Doctor ID is required" });
      }

      const patients = await prisma.patient.findMany({
        where: {
          doctorId: typeof doctorId === "string" ? doctorId : undefined,
        },
        orderBy: {
          patientId: "desc",
        },
      });

      console.log(patients, " patients data");
      res.status(200).json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ error: "Error fetching patients" });
    } finally {
      await prisma.$disconnect();
    }
  }

  async updatePatient(req: express.Request, res: express.Response) {
    const prisma = new PrismaClient();
    const { id } = req.params;
    const patientBody = req.body;
    console.log("Received update-patient request:", req.body);
    if (!id) {
      return res.status(400).json({ error: "Patient ID is required" });
    }
    try {
      const updatedPatient = await prisma.patient.update({
        where: {
          id: id,
        },
        data: patientBody,
      });
      res.status(200).json(updatedPatient);
    } catch (error) {
      console.error("Error updating patient:", error);
      res.status(500).json({ error: "Error updating patient" });
    }
  }
}
