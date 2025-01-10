import { AuthUser } from "../user";

export {};

declare global {
  namespace Express {
    export interface Request {
      user?: AuthUser;
    }
  }
}
