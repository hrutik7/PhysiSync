import express from "express";
import { PrismaClient } from "@prisma/client";
// import { AccessToken } from "livekit-server-sdk";

const prisma = new PrismaClient();
// const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
//     const LIVEKIT_SECRET = process.env.LIVEKIT_SECRET;
export class AiService {
  // Generate a LiveKit token
  // private async generateLiveKitToken(identity: string, room: string): Promise<string> {
    

  //   try {
  //     const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_SECRET, {
  //         identity: identity,
  //         // Optional: Set a name for the participant
  //         // name: `User-${identity.substring(0, 5)}`,
  //         // Optional: Add metadata
  //         // metadata: JSON.stringify({ role: 'user' }),
  //     });

  //     // Grant permission to join the specified room
  //     at.addGrant({
  //         roomJoin: true,
  //         room: room,
  //         canPublish: true,      // Allow user to publish tracks (audio/video)
  //         canSubscribe: true,    // Allow user to subscribe to tracks
  //         canPublishData: true, // IMPORTANT: Allow user to send data messages
  //         // canUpdateMetadata: true,
  //     });

  //     const token = await at.toJwt();
  //     console.log(`Generated LiveKit token for identity "${identity}" in room "${room}"`);
  //     return token;

  // } catch (error) {
  //     console.error('Error generating LiveKit token:', error);
  //     throw new Error('Failed to generate LiveKit token');
  // }
  // }

  async enableAi(req: express.Request, res: express.Response) {
    const { patientId, doctorId, exercise, diet, hometherapy, additional } =
      req.body;
    try {
      const aiData = await prisma.aiAssistant.create({
        data: {
          exercise,
          diet,
          hometherapy,
          additional,
          patient: {
            connect: { id: patientId },
          },
          doctor: {
            connect: { id: doctorId },
          },
        },
      });
      return res.status(201).json(aiData);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  async getAI(req: express.Request, res: express.Response) {
    const { patientId } = req.params;
    try {
      const aiData = await prisma.aiAssistant.findMany({
        where: {
          patientId: patientId,
        },
      });
      return res.status(200).json(aiData);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }

  // async voiceAi(req: express.Request, res: express.Response) {
  //   const { text, room, identity } = req.body;

  //   if (!text) {
  //     return res.status(400).json({ error: "Text is required" });
  //   }

  //   if (!room || !identity) {
  //     return res.status(400).json({ error: "Room name and identity are required" });
  //   }

  //   console.log("LiveKit Integration: Generating audio for text");

  //   try {
  //     // Generate LiveKit token
  //     const token = this.generateLiveKitToken(identity, room);
  //     console.log("Generated Token:", token);

  //     // Simulate audio generation (replace this with actual TTS logic)
  //     const audioBuffer = Buffer.from(`Simulated audio for: ${text}`);

  //     // Send the token and audio buffer to the client
  //     res.status(200).json({
  //       token,
  //       audio: audioBuffer.toString("base64"), // Send audio as Base64
  //     });
  //   } catch (error) {
  //     console.error("Error during LiveKit integration:", error);
  //     return res.status(500).json({ error: "Internal Server Error" });
  //   }
  // }
}
