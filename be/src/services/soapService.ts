import * as express from "express";

import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from '../middleware/authMiddleware';
const prisma = new PrismaClient();
export class SOAPService {
  constructor() {
    this.addSubjective = this.addSubjective.bind(this);
    this.getSubjective = this.getSubjective.bind(this);
    this.deleteSubjective = this.deleteSubjective.bind(this);
    this.updateSubjective = this.updateSubjective.bind(this);
    this.addObjective = this.addObjective.bind(this);
    this.getObjective = this.getObjective.bind(this);
    this.deleteObjective = this.deleteObjective.bind(this);
    this.updateObjective = this.updateObjective.bind(this);
    this.addAssessment = this.addAssessment.bind(this);
    this.getAssessment = this.getAssessment.bind(this);
    this.deleteAssessment = this.deleteAssessment.bind(this);
    this.updateAssessment = this.updateAssessment.bind(this);
    this.addPlan = this.addPlan.bind(this);
    this.getPlan = this.getPlan.bind(this);
    this.deletePlan = this.deletePlan.bind(this);
    this.updatePlan = this.updatePlan.bind(this);
  }
  // Helper method to validate clinic access
  private async validateClinicAccess(doctorId: string, patientId: any) {
    console.log(doctorId,patientId,"doctorId,patientId")
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { doctorId: true }
    });

    if (!patient || patient.doctorId !== doctorId) {
      throw new Error('Patient not found or access denied');
    }
  }

  // Subjective with clinic validation
  async addSubjective(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
  
    if (!user || user.role !== 'CLINIC') {
      return res.status(403).json({ error: 'Access denied' });
    }
  
    try {
      const { patientId, content } = req.body; // ✅ Correct source
      const doctorId = user.doctorId;
  
      if (!doctorId || !patientId) {
        throw new Error('Doctor ID or Patient ID is missing');
      }
  
      await this.validateClinicAccess(doctorId, patientId);
  
      const subjectiveData = await prisma.subjective.create({
        data: {
          patient: { connect: { id: patientId } },
          content,
          date: new Date().toISOString(),
          doctor: { connect: { id: doctorId } },
        }
      });
  
      return res.status(201).json(subjectiveData);
    } catch (error) {
      console.error(error, "❌❌❌");
      const message = error instanceof Error ? error.message : 'Failed to add subjective';
      return res.status(500).json({ error: message });
    }
  }
  

  // Get subjective with clinic filter
  async getSubjective(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { patientId } = req.params;
// console.log(user,patientId,"user,patientId")
//     if (!user || user.role !== 'CLINIC') {
//       return res.status(403).json({ error: 'Access denied' });
//     }

    try {
      // await this.validateClinicAccess(user.id, user.patientId);

      const subjective = await prisma.subjective.findMany({
        where: { patientId },
        orderBy: { date: 'desc' }
      });

      return res.status(200).json(subjective);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch subjective data' });
    }
  }

  // Delete subjective
  async deleteSubjective(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { id } = req.params;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      // const subjective = await prisma.subjective.findUnique({ where: { id } });
      // if (!subjective || subjective.patientId !== user.id) {
      //   return res.status(404).json({ error: 'Subjective not found or access denied' });
      // }

      await prisma.subjective.delete({ where: { id } });
      return res.status(200).json({ message: 'Subjective deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete subjective' });
    }
  }

  // Update subjective
  async updateSubjective(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { id } = req.params;
    const { content, date } = req.body;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      const subjective = await prisma.subjective.findUnique({ where: { id } });
      // if (!subjective || subjective.id !== user.id) {
      //   return res.status(404).json({ error: 'Subjective not found or access denied' });
      // }

      const updatedSubjective = await prisma.subjective.update({
        where: { id },
        data: { content, date }
      });

      return res.status(200).json(updatedSubjective);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update subjective' });
    }
  }

  // Objective with clinic validation
  async addObjective(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    if (!user || user.role !== 'CLINIC') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientID, content, date } = req.body;

    try {
      const { patientId, content } = req.body; // ✅ Correct source
      const doctorId = user.doctorId;
  
      if (!doctorId || !patientId) {
        throw new Error('Doctor ID or Patient ID is missing');
      }
  
      await this.validateClinicAccess(doctorId, patientId);
      const objectiveData = await prisma.objective.create({
        data: {
          patient: { connect: { id: patientId } },
          content,
          date: new Date().toISOString(),
          doctor: { connect: { id: doctorId } },
        }
      });

      return res.status(201).json(objectiveData);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to add objective';
      return res.status(500).json({ error: message });
    }
  }

  async getObjective(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { patientId } = req.params;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      // await this.validateClinicAccess(user.id, patientId);

      const objective = await prisma.objective.findMany({
        where: { patientId },
        orderBy: { date: 'desc' }
      });

      return res.status(200).json(objective);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch objective data' });
    }
  }

  // Delete objective
  async deleteObjective(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { id } = req.params;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      // const objective = await prisma.objective.findUnique({ where: { id } });
      // if (!objective || objective.id !== user.id) {
      //   return res.status(404).json({ error: 'Objective not found or access denied' });
      // }

      await prisma.objective.delete({ where: { id } });
      return res.status(200).json({ message: 'Objective deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete objective' });
    }
  }

  // Update objective
  async updateObjective(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { id } = req.params;
    const { content, date } = req.body;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      const objective = await prisma.objective.findUnique({ where: { id } });
      // if (!objective || objective.id  !== user.id) {
      //   return res.status(404).json({ error: 'Objective not found or access denied' });
      // }

      const updatedObjective = await prisma.objective.update({
        where: { id },
        data: { content, date }
      });

      return res.status(200).json(updatedObjective);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update objective' });
    }
  }

  // Assessment with clinic validation
  async addAssessment(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    if (!user || user.role !== 'CLINIC') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientID, content, date } = req.body;

    try {
      const { patientId, content } = req.body; // ✅ Correct source
      const doctorId = user.doctorId;
  
      if (!doctorId || !patientId) {
        throw new Error('Doctor ID or Patient ID is missing');
      }
  
      await this.validateClinicAccess(doctorId, patientId);

      const assessmentData = await prisma.assesment.create({
        data: {
          patient : { connect: { id: patientId } },
          content,
          date: new Date().toISOString(),
          doctor: { connect: { id: doctorId } }
        }
      });

      return res.status(201).json(assessmentData);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to add assessment';
      return res.status(500).json({ error: message });
    }
  }

  async getAssessment(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { patientId } = req.params;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      // await this.validateClinicAccess(user.id, patientId);

      const assessment = await prisma.assesment.findMany({
        where: { patientId },
        orderBy: { date: 'desc' }
      });

      return res.status(200).json(assessment);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch assessment data' });
    }
  }

  // Delete assessment
  async deleteAssessment(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { id } = req.params;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      // const assessment = await prisma.assesment.findUnique({ where: { id } });
      // if (!assessment || assessment.id  !== user.id) {
      //   return res.status(404).json({ error: 'Assessment not found or access denied' });
      // }

      await prisma.assesment.delete({ where: { id } });
      return res.status(200).json({ message: 'Assessment deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete assessment' });
    }
  }

  // Update assessment
  async updateAssessment(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { id } = req.params;
    const { content, date } = req.body;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      const assessment = await prisma.assesment.findUnique({ where: { id } });
      // if (!assessment || assessment.id  !== user.id) {
      //   return res.status(404).json({ error: 'Assessment not found or access denied' });
      // }

      const updatedAssessment = await prisma.assesment.update({
        where: { id },
        data: { content, date }
      });

      return res.status(200).json(updatedAssessment);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update assessment' });
    }
  }

  // Plan with clinic validation
  async addPlan(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    if (!user || user.role !== 'CLINIC') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { patientID, content, date } = req.body;

    try {
      const { patientId, content } = req.body; // ✅ Correct source
      const doctorId = user.doctorId;
  console.log(doctorId,patientId,"✅ Correct source")
      if (!doctorId || !patientId) {
        throw new Error('Doctor ID or Patient ID is missing');
      }
      await this.validateClinicAccess(doctorId, patientId);

      const planData = await prisma.plan.create({
        data: {
          patient : { connect: { id: patientId } },
          content,
          date: new Date().toISOString(),
          doctor: { connect: { id: doctorId} }
        }
      });

      return res.status(201).json(planData);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Failed to add plan';
      return res.status(500).json({ error: message });
    }
  }

  async getPlan(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { patientId } = req.params;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      // await this.validateClinicAccess(user.id, patientId);

      const plan = await prisma.plan.findMany({
        where: { patientId },
        orderBy: { date: 'desc' }
      });

      return res.status(200).json(plan);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch plan data' });
    }
  }

  // Delete plan
  async deletePlan(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { id } = req.params;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      // const plan = await prisma.plan.findUnique({ where: { id } });
      // if (!plan || plan.id  !== user.id) {
      //   return res.status(404).json({ error: 'Plan not found or access denied' });
      // }

      await prisma.plan.delete({ where: { id } });
      return res.status(200).json({ message: 'Plan deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to delete plan' });
    }
  }

  // Update plan
  async updatePlan(req: AuthenticatedRequest, res: express.Response) {
    const user = req.user;
    const { id } = req.params;
    const { content, date } = req.body;

    // if (!user || user.role !== 'CLINIC') {
    //   return res.status(403).json({ error: 'Access denied' });
    // }

    try {
      // const plan = await prisma.plan.findUnique({ where: { id } });
      // if (!plan || plan.id  !== user.id) {
      //   return res.status(404).json({ error: 'Plan not found or access denied' });
      // }

      const updatedPlan = await prisma.plan.update({
        where: { id },
        data: { content, date }
      });

      return res.status(200).json(updatedPlan);
    } catch (error) {
      return res.status(500).json({ error: 'Failed to update plan' });
    }
  }
}