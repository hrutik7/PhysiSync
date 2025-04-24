import * as express from 'express'
import { PrismaClient } from '@prisma/client'
import {AuthenticatedRequest} from '../middleware/authMiddleware'
const prisma = new PrismaClient()

export class axService {
    async addHipAx(req: AuthenticatedRequest, res: express.Response) {
        const {doctorId, patientId, diagnosis,treatment ,action , date , painsevirity} = req.body
        console.log(req.body)
        const user = req.user 
        // const doctorId = user?.doctorId;
        try {
            
            const hipAxData = await prisma.aXhipAssesment.create({
                data: {
                    doctor:  { connect : { id: doctorId } },
                    patient: { connect: { id: patientId } },
                    diagnosis,
                    treatment,
                    action,
                    date: date,
                    painsevirity
                }
            })
            return res.status(201).json(hipAxData)
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: "Failed to add hipAx data" })
        }

    }

    async getHipAx(req: express.Request, res: express.Response) {
        const patientId = req.params.patientId
        try {
            const hipAxData = await prisma.aXhipAssesment.findMany({
                where: {
                    patientId
                }
            })
            return res.status(200).json(hipAxData)
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: "Failed to get hipAx data" })
        }
    }

    async addKneeAx(req: AuthenticatedRequest, res: express.Response) {
        const { patientId, doctorId,diagnosis, treatment, action, date, painsevirity } = req.body
        console.log(req.body)
        const user = req.user
        // const doctorId = user?.doctorId;
        try {
            const kneeAxData = await prisma.aXkneeAssesment.create({
                data: {
                    doctor : { connect : { id: doctorId } },
                    patient: { connect: { id: patientId } },
                
                    diagnosis,
                    treatment,
                    action,
                    date: date,
                    painsevirity
                }
            })
            return res.status(201).json(kneeAxData)
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: "Failed to add kneeAx data" })
        }
    }

    async getKneeAx(req: express.Request, res: express.Response) {
        const patientId = req.params.patientId
        try {
            const kneeAxData = await prisma.aXkneeAssesment.findMany({
                where: {
                    patientId
                }
            })
            return res.status(200).json(kneeAxData)
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: "Failed to get kneeAx data" })
        }
    }

    async addShoulderAx(req: AuthenticatedRequest, res: express.Response) {
        const {doctorId, patientId, diagnosis, treatment, action, date, painsevirity } = req.body
        
        const user = req.user
        // const doctorId = user?.doctorId;
        try {
            const shoulderAxData = await prisma.aXShoulderAssesment.create({
                data: {
                    doctor : { connect : { id: doctorId } },
                    patient: { connect: { id: patientId } },
                    diagnosis,
                    treatment,
                    action,
                    date: date,
                    painsevirity
                }
            })
            return res.status(201).json(shoulderAxData)
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: "Failed to add shoulderAx data" })
        }
    }

    async getShoulderAx(req: express.Request, res: express.Response) {
        const patientId = req.params.patientId
        try {
            const shoulderAxData = await prisma.aXShoulderAssesment.findMany({
                where: {
                    patientId
                }
            })
            return res.status(200).json(shoulderAxData)
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: "Failed to get shoulderAx data" })
        }
    }

    async addFootAx(req: express.Request, res: express.Response) {
        const {doctorId, patientId, diagnosis, treatment, action, date, painsevirity } = req.body
        console.log(req.body)
        const user = req.user
        // const doctorId = user?.doctorId;
        try {
            const footAxData = await prisma.aXFootAssesment.create({
                data: {
                    // doctorId: "b2fcc0ad-95b3-47f8-8362-10100cedbfce",
                    patient: { connect: { id: patientId } },
                    doctor: { connect: { id: doctorId } },
                    diagnosis,
                    treatment,
                    action,
                    date: date,
                    painsevirity
                }
            })
            return res.status(201).json(footAxData)
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: "Failed to add footAx data" })
        }
    }

    async getFootAx(req: express.Request, res: express.Response) {
        const patientId = req.params.patientId
        try {
            const footAxData = await prisma.aXFootAssesment.findMany({
                where: {
                    patientId
                }
            })
            return res.status(200).json(footAxData)
        } catch (error) {
            console.log(error)
            return res.status(500).json({ error: "Failed to get footAx data" })
        }
    }
}