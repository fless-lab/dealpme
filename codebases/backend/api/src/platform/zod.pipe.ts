import { Injectable, PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/** Validation des entrées par les schémas de @dealpme/contracts. Une erreur zod devient VALIDATION_FAILED (400). */
@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    return this.schema.parse(value);
  }
}

export const validate = <T>(schema: ZodType<T>) => new ZodPipe(schema);
