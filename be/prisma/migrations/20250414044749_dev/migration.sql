/*
  Warnings:

  - Added the required column `goal` to the `InterventionTreatmentProtocol` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InterventionTreatmentProtocol" ADD COLUMN     "goal" TEXT NOT NULL;
