import express from "express";
import { PrismaClient } from "@prisma/client";
import e from "express";

const prisma = new PrismaClient();

export class customService {
  async patientHistory(req: express.Request, res: express.Response) {
    const {
      age,
      gender,
      occupation,
      previosmedicalconditions,
      previossurgery,
      currentmedication,
      physicalactivitylevel,
      sleeppattern,
      smoking,
      patientId,
      doctorId,
    } = req.body;

    try {
      const historydata = await prisma.history.create({
        data: {
          // historyId: doctorId,
          age,
          gender,
          occupation,
          previosmedicalconditions,
          previossurgery,
          currentmedication,
          physicalactivitylevel,
          sleeppattern,
          smoking,
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
        },
      });

      return res.status(201).json(historydata);
    } catch (error) {
      console.error(error);
    }
  }

  async patientchiefComplanits(req: express.Request, res: express.Response) {
    const {
      patientId,
      doctorId,
      primarycomplaint,
      onset,
      duration,
      assosiatedsymtom,
      age,
      gender
    } = req.body;

    try {
      const chiefcomplaintsdata = await prisma.chiefComplaint.create({
        data: {
          doctor: {
            connect: { id: doctorId },
          },
          patient: {
            connect: { id: patientId },
          },
          // chiefcomplaintId: doctorId,
          // age,
          // gender,
          primarycomplaint,
          onset,
          duration,
          assosiatedsymtom,
        },
      });

      return res.status(201).json(chiefcomplaintsdata);
    } catch (error) {
      console.error(error);
    }
  }

  async patientPain(req: express.Request, res: express.Response) {
    const {
      // patientID       ,
      date,
      painsite,
      painsevirity,
      painnature,
      painonset,
      painduration,
      painside,
      paintrigger,
      painadl,
      painDiurnal,
      painAggravating,
      painRelieving,
      patientId,
      doctorId,
    } = req.body;
    try {
      const patientPainData = await prisma.pain.create({
        data: {
          doctor: {
            connect: { id: doctorId },
          },
          patient: {
            connect: { id: patientId },
          },
          date,
          painsite,
          painsevirity,
          painnature,
          painonset,
          painduration,
          painside,
          paintrigger,
          painadl,
          painDiurnal,
          painAggravating,
          painRelieving,
          // patientId,
        },
      });

      return res.status(201).json(patientPainData);
    } catch (error) {
      console.error(error);
    }
  }

  async patientExamination(req: express.Request, res: express.Response) {
    const {
      patientId,
      doctorId,
      posture,
      gaitpattern,
      flexion,
      extension,
      lateralflexionright,
      lateralflexionleft,
      rotationright,
      rotationleft,
    } = req.body;

    try {
      const patientExaminationData = await prisma.examination.create({
        data: {
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          posture,
          gaitpattern,
          flexion,
          extension,
          lateralflexionright,
          lateralflexionleft,
          rotationright,
          rotationleft,
        },
      });

      return res.status(201).json(patientExaminationData);
    } catch (error) {
      console.error(error);
    }
  }

  async patientmotorExamination(req: express.Request, res: express.Response) {
    const {
      patientId,
      doctorId,
      shoulderflexer,
      shoulderextensors,
      elbowflexer,
      elbowextensors,
      wristextensors,
      wristflexer,
      hipflexer,
      hiprextensors,
      kneeflexer,
      kneeextensors,
      ankleextensors,
      ankleflexer,
      muscletone,
    } = req.body;

    try {
      const motorExaminationData = await prisma.motorExamination.create({
        data: {
          doctor: {
            connect: { id: doctorId },
          },
          patient: {
            connect: { id: patientId },
          },

          shoulderflexer,
          shoulderextensors,
          elbowflexer,
          elbowextensors,
          wristextensors,
          wristflexer,
          hipflexer,
          hiprextensors,
          kneeflexer,
          kneeextensors,
          ankleextensors,
          ankleflexer,
          muscletone,
        },
      });
      return res.status(201).json(motorExaminationData);
    } catch (error) {
      console.error(error);
    }
  }

  async patientsensoryExamination(req: express.Request, res: express.Response) {
    const {
      patientId,
      doctorId,
      touchsensation,
      painsensation,
      tempraturesensation,
      positivesense,
      vibrationsense,
    } = req.body;

    try {
      const sensoryExaminationData = await prisma.sensoryExamination.create({
        data: {
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },

          touchsensation,
          painsensation,
          tempraturesensation,
          positivesense,
          vibrationsense,
        },
      });

      return res.status(201).json(sensoryExaminationData);
    } catch (error) {
      console.error(error);
    }
  }

  async patientPediatrics(req: express.Request, res: express.Response) {
    const {
      patientId,
      doctorId,
      grossmotorskills,
      finemotorskills,
      primitivereflex,
      posturalreflex,
      balanceandcoord,
    } = req.body;

    try {
      const pediatricsData = await prisma.pediatric.create({
        data: {
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          grossmotorskills,
          finemotorskills,
          primitivereflex,
          posturalreflex,
          balanceandcoord,
        },
      });
      return res.status(201).json(pediatricsData);
    } catch (error) {
      console.error(error);
    }
  }

  async getPatientHistory(req: express.Request, res: express.Response) {
    const { patientId } = req.params;
    try {
      const historyData = await prisma.history.findMany({
        where: { patientId },
      });
      return res.status(200).json(historyData);
    } catch (error) {
      console.error(error);
    }
  }

  async getPatientChiefComplaints(req: express.Request, res: express.Response) {
    const { patientId } = req.params;
    try {
      const chiefComplaintsData = await prisma.chiefComplaint.findMany({
        where: { patientId },
      });
      return res.status(200).json(chiefComplaintsData);
    } catch (error) {
      console.error(error);
    }
  }

  async getPatientPain(req: express.Request, res: express.Response) {
    const { patientId } = req.params;
    try {
      const painData = await prisma.pain.findMany({
        where: { patientId },
      });
      return res.status(200).json(painData);
    } catch (error) {
      console.error(error);
    }
  }

  async getPatientExamination(req: express.Request, res: express.Response) {
    const { patientId } = req.params;
    try {
      const examinationData = await prisma.examination.findMany({
        where: { patientId },
      });
      return res.status(200).json(examinationData);
    } catch (error) {
      console.error(error);
    }
  }

  async getPatientMotorExamination(
    req: express.Request,
    res: express.Response
  ) {
    const { patientId } = req.params;
    try {
      const motorExaminationData = await prisma.motorExamination.findMany({
        where: { patientId },
      });
      return res.status(200).json(motorExaminationData);
    } catch (error) {
      console.error(error);
    }
  }

  async getPatientSensoryExamination(
    req: express.Request,
    res: express.Response
  ) {
    const { patientId } = req.params;
    try {
      const sensoryExaminationData = await prisma.sensoryExamination.findMany({
        where: { patientId },
      });
      return res.status(200).json(sensoryExaminationData);
    } catch (error) {
      console.error(error);
    }
  }

  async getPatientPediatrics(req: express.Request, res: express.Response) {
    const { patientId } = req.params;
    try {
      const pediatricsData = await prisma.pediatric.findMany({
        where: { patientId },
      });
      return res.status(200).json(pediatricsData);
    } catch (error) {
      console.error(error);
    }
  }
}
