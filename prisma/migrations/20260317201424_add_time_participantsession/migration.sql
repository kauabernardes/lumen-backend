/*
  Warnings:

  - Added the required column `time` to the `ParticipantSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ParticipantSession" ADD COLUMN     "time" BIGINT NOT NULL;
