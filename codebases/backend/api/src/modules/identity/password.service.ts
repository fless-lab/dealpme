import { Injectable } from "@nestjs/common";
import argon2 from "argon2";

/** Hachage des mots de passe : Argon2id (exigence v0). Aucun mot de passe en clair, nulle part. */
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
