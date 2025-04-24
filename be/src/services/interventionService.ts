import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const InterventionService = {
  async createInterventiondiagnosis(req: any, res: express.Response) {
    try {
      const { patientId, date, diagnosis, doctorId } = req.body;

      // First create the intervention record
      const intervention = await prisma.interventionDiagnosis.create({
        data: {
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          date,
          diagnosis,

          // Remove hardcoded interventionId
        },
      });

      res.status(201).json(intervention);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getInterventiondiagnosis(req: any, res: express.Response) {
    try {
      const { patientId } = req.params;

      const interventions = await prisma.interventionDiagnosis.findMany({
        where: { patientId: patientId },
      });

      if (!interventions || interventions.length === 0) {
        return res
          .status(404)
          .json({ error: "Intervention diagnoses not found" });
      }

      res.status(200).json(interventions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateInterventiondiagnosis(req: any, res: express.Response) {
    try {
      const { id } = req.params;
      const { patientId, date, diagnosis } = req.body;

      const intervention = await prisma.interventionDiagnosis.update({
        where: { id },
        data: {
          patientId,
          date,
          diagnosis,
        },
      });

      res.status(200).json(intervention);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteInterventiondiagnosis(req: any, res: express.Response) {
    try {
      const { id } = req.params;

      await prisma.interventionDiagnosis.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async createInterventionGoal(req: any, res: express.Response) {
    try {
      const { patientId, doctorId, date, goaltype, goaldescription } = req.body;

      // First create the intervention record
      const intervention = await prisma.interventionGoals.create({
        data: {
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          date,
          goaltype,
          goaldescription,
        },
      });

      res.status(201).json(intervention);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getInterventionGoal(req: any, res: express.Response) {
    try {
      const { patientId } = req.params;

      const goals = await prisma.interventionGoals.findMany({
        where: { patientId: patientId },
      });

      if (!goals || goals.length === 0) {
        return res.status(404).json({ error: "Intervention goals not found" });
      }

      res.status(200).json(goals);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateInterventionGoal(req: any, res: express.Response) {
    try {
      const { id } = req.params;
      const { patientId, date, goaltype, goaldescription } = req.body;

      const goal = await prisma.interventionGoals.update({
        where: { id },
        data: {
          patientId,
          date,
          goaltype,
          goaldescription,
        },
      });

      res.status(200).json(goal);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteInterventionGoal(req: any, res: express.Response) {
    try {
      const { id } = req.params;

      await prisma.interventionGoals.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async createInterventionTreatmentEncounter(req: any, res: express.Response) {
    try {
      const {
        patientId,
        date,
        time,
        treatmenttype,
        duration,
        subjectiveassessment,
        treatmentprovided,
        progressnotes,
        price,
        doctorId,
      } = req.body;

      // First create the intervention record
      const intervention = await prisma.interventionTreatmentEncounter.create({
        data: {
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          date,
          time,
          treatmenttype,
          duration,
          subjectiveassessment,
          treatmentprovided,
          progressnotes,
          price,
          // interventionId: "b2fcc0ad-95b3-47f8-8362-10100cedbfce",
          // Remove hardcoded interventionId
        },
      });

      res.status(201).json(intervention);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getInterventionTreatmentEncounter(req: any, res: express.Response) {
    try {
      const { patientId } = req.params;

      const encounters = await prisma.interventionTreatmentEncounter.findMany({
        where: { patientId: patientId },
      });

      if (!encounters || encounters.length === 0) {
        return res
          .status(404)
          .json({ error: "Treatment encounters not found" });
      }

      res.status(200).json(encounters);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateInterventionTreatmentEncounter(req: any, res: express.Response) {
    try {
      const { id } = req.params;
      const {
        patientId,
        doctorId,
        date,
        time,
        treatmenttype,
        duration,
        subjectiveassessment,
        treatmentprovided,
        progressnotes,
        price,
      } = req.body;

      const encounter = await prisma.interventionTreatmentEncounter.update({
        where: { id },
        data: {
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          date,
          time,
          treatmenttype,
          duration,
          subjectiveassessment,
          treatmentprovided,
          progressnotes,
          price,
        },
      });

      res.status(200).json(encounter);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteInterventionTreatmentEncounter(req: any, res: express.Response) {
    try {
      const { id } = req.params;

      await prisma.interventionTreatmentEncounter.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async createInterventionTreatmentProtocol(req: any, res: express.Response) {
    try {
      const { patientId, doctorId, dates, treatment, numberofsessions, price } =
        req.body;

      // First create the intervention record
      const intervention = await prisma.interventionTreatmentProtocols.create({
        data: {
          // id: new Date().toISOString(), // or any unique identifier
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          dates,
          treatment,
          numberofsessions,
          price,
          // interventionId: "b2fcc0ad-95b3-47f8-8362-10100cedbfce",
          // Remove hardcoded interventionId
        },
      });

      res.status(201).json(intervention);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getInterventionTreatmentProtocol(req: any, res: express.Response) {
    try {
      const { patientId } = req.params;

      const protocols = await prisma.interventionTreatmentProtocols.findMany({
        where: { patientId: patientId },
      });

      if (!protocols || protocols.length === 0) {
        return res.status(404).json({ error: "Treatment protocols not found" });
      }

      res.status(200).json(protocols);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateInterventionTreatmentProtocol(req: any, res: express.Response) {
    try {
      const { id } = req.params;
      const { patientId, doctorId, date, treatment, numberofsessions, price, status } =
        req.body;

      const result = await prisma.interventionTreatmentProtocol.updateMany({
        where: {
          patientId,
          doctorId,
          date,
          treatment,
          numberofsessions,
          price,
        },
        data: {
          status,
        },
      });

      if (result.count === 0) {
        throw new Error("No matching treatment protocol found");
      }

      res.status(200).json(result);
    } catch (error) {
      console.error("Error updating treatment protocol:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteInterventionTreatmentProtocol(req: any, res: express.Response) {
    try {
      const { id } = req.params;

      await prisma.interventionTreatmentProtocols.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async createInterventionProtocol(req: any, res: express.Response) {
    try {
      const {
        patientId,
        doctorId,
        status,
        date,
        treatment,
        numberofsessions,
        price,
        goal
      } = req.body;

      // First create the intervention record
      const intervention = await prisma.interventionTreatmentProtocol.create({
        data: {
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          status,
          date,
          treatment,
          numberofsessions,
          price,
          goal
          // interventionId: "b2fcc0ad-95b3-47f8-8362-10100cedbfce",
          // Remove hardcoded interventionId
        },
      });

      res.status(201).json(intervention);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async getInterventionProtocol(req: any, res: express.Response) {
    try {
      const { patientId } = req.params;

      const protocols = await prisma.interventionTreatmentProtocol.findMany({
        where: { patientId: patientId },
      });

      if (!protocols || protocols.length === 0) {
        return res.status(404).json({ error: "Treatment protocols not found" });
      }

      res.status(200).json(protocols);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateInterventionProtocol(req: any, res: express.Response) {
    try {
      const { id } = req.params;
      const {
        patientId,
        doctorId,
        status,
        date,
        treatment,
        numberofsessions,
        price,
      } = req.body;

      const protocol = await prisma.interventionTreatmentProtocol.update({
        where: { id },
        data: {
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          status,
          date,
          treatment,
          numberofsessions,
          price,
        },
      });

      res.status(200).json(protocol);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async deleteInterventionProtocol(req: any, res: express.Response) {
    try {
      const { id } = req.params;

      await prisma.interventionTreatmentProtocol.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
