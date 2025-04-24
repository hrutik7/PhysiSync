/*
  Warnings:

  - You are about to drop the column `patientID` on the `Investigationpatient` table. All the data in the column will be lost.
  - Added the required column `doctorId` to the `Investigationpatient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientId` to the `Investigationpatient` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Investigationpatient" DROP CONSTRAINT "Investigationpatient_investigationId_fkey";

-- AlterTable
ALTER TABLE "Investigationpatient" DROP COLUMN "patientID",
ADD COLUMN     "doctorId" TEXT NOT NULL,
ADD COLUMN     "patientId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Investigationpatient" ADD CONSTRAINT "Investigationpatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investigationpatient" ADD CONSTRAINT "Investigationpatient_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
