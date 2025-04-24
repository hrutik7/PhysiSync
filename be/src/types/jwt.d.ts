// src/types/jwt.d.ts
declare namespace JWT {
    interface Payload {
      userId: string;
      role: string;
      doctorName: string;
    }
  }