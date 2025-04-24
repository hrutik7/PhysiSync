import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import mime from "mime";
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

export const InvestigateService = {
  async investigateSave(req: any, res: express.Response) {
    try {
      console.log(req.body,"regdfjoiiiiiiiiiiiiim")
      const { patientId,doctorId, date, reporttype, description } = req.body;

      // First create the investigation record
      const investigation = await prisma.investigationpatient.create({
        data: {
          patient : {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
          date,
          reporttype,
          description,
          // investigationId: "b2fcc0ad-95b3-47f8-8362-10100cedbfce",
          // Remove hardcoded investigationId
        },
      });

      if (req.files) {
        const filePromises = req.files.map((file: any) => {
          return prisma.file.create({
            data: {
              fileName: file.filename,
              originalName: file.originalname,
              path: file.path,
              mimetype: file.mimetype,
              size: file.size,
              // Use the generated ID from the investigation record
              investigationId: investigation.id,
            },
          });
        });

        await Promise.all(filePromises);
      }

      res.status(201).json({
        success: true,
        message: "Investigation created successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "An error occurred while saving the investigation",
      });
    }
  },
  // Update the getInvestigation method
  async getInvestigation(req: express.Request, res: express.Response) {
    try {
      const investigations = await prisma.investigationpatient.findMany({
        include: { files: true },
        where: {
          patientId: Array.isArray(req.query.patientId)
            ? req.query.patientId[0]
            : req.query.patientId,
        }, // Changed to use query parameter
      });

      res.status(200).json(investigations);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ success: false, message: "Error fetching investigations" });
    }
  },

  // Update deleteInvestigation in service
  async deleteInvestigation(req: express.Request, res: express.Response) {
    try {
      // First delete associated files
      await prisma.file.deleteMany({
        where: { investigationId: req.params.id },
      });

      // Then delete investigation
      await prisma.investigationpatient.delete({
        where: { id: req.params.id },
      });

      res.status(200).json({ success: true, message: "Investigation deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Delete failed" });
    }
  },

  // async viewFile(req: express.Request, res: express.Response) {
  //   try {
  //     const file = await prisma.file.findUnique({
  //       where: { id: req.params.id },
  //     });
  
  //     if (!file) {
  //       return res.status(404).json({ success: false, message: "File not found" });
  //     }
  
  //     // Set the correct Content-Type header for the file
  //     const mimeType = mime.getType(file.originalName); // Use the `mime` package
  //     if (mimeType) {
  //       res.setHeader("Content-Type", mimeType);
  //     }
  
  //     // Stream the file for viewing (not download)
  //     res.sendFile(file.path);
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ success: false, message: "Failed to view file" });
  //   }
  // }
};

export const uploadMiddleware = upload.array("files");
