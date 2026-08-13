import { AccessTokenPayload } from "../modules/auth/token.service";

declare global {
  namespace Express {
    interface Request {
      /** Populated by authGuard middleware after verifying the access token. */
      auth?: AccessTokenPayload;
      /** Raw request body bytes, captured by express.json()'s verify hook in
       * app.ts. Needed for webhook signature verification (Paystack), which
       * requires hashing the exact bytes sent, not the re-serialized JSON. */
      rawBody?: Buffer;
    }
  }
}

export {};
