/**
 * Hand-rolled JSON-Schema emitter for our sprint contracts.
 * Avoids adding `zod-to-json-schema` as a runtime dep — we only emit
 * three shapes, and they are stable.
 *
 * Output conforms to JSON Schema Draft 2020-12 (subset).
 */
import {
  SPRINT_CONTRACT_VERSION,
  sprintContractV1,
  auditEventContractV1,
  AUDIT_CONTRACT_VERSION,
} from "./index.js";
import type { z } from "zod";

interface JsonSchema {
  $schema: string;
  $id: string;
  title: string;
  type: "object";
  additionalProperties: boolean;
  required?: string[];
  properties: Record<string, unknown>;
}

interface StringDef { typeName: "ZodString"; minLength?: number; default?: unknown }
interface NumberDef { typeName: "ZodNumber" }
interface EnumDef { typeName: "ZodEnum"; values: readonly string[] }
interface NullDef { typeName: "ZodNull" }
interface RecordDef { typeName: "ZodRecord" }
interface ObjectDef { typeName: "ZodObject"; shape: Record<string, ZodLike> }
interface OptionalDef { typeName: "ZodOptional"; innerType: ZodLike }
interface DefaultDef { typeName: "ZodDefault"; innerType: ZodLike; defaultValue: () => unknown }
interface NullableDef { typeName: "ZodNullable"; innerType: ZodLike }
interface UnknownDef { typeName: string }

interface ZodLike {
  _def: StringDef | NumberDef | EnumDef | NullDef | RecordDef | ObjectDef | OptionalDef | DefaultDef | NullableDef | UnknownDef;
  isOptional?: () => boolean;
}

function nameOf(z: ZodLike): string {
  return (z._def as UnknownDef).typeName ?? "Unknown";
}

function inner(z: ZodLike): ZodLike {
  const def = z._def as OptionalDef | DefaultDef | NullableDef;
  if (def.innerType) return def.innerType;
  throw new Error(`Cannot extract inner type from ${nameOf(z)}`);
}

function emitType(z: ZodLike): Record<string, unknown> {
  const n = nameOf(z);
  if (n === "ZodString") {
    const def = z._def as StringDef;
    const schema: Record<string, unknown> = { type: "string" };
    if (typeof def.minLength === "number") schema.minLength = def.minLength;
    if (typeof def.default !== "undefined") schema.default = def.default;
    return schema;
  }
  if (n === "ZodNumber") return { type: "number" };
  if (n === "ZodEnum") {
    const def = z._def as EnumDef;
    return { type: "string", enum: [...def.values] };
  }
  if (n === "ZodNull") return { type: "null" };
  if (n === "ZodRecord") return { type: "object", additionalProperties: true };
  if (n === "ZodObject") {
    const def = z._def as ObjectDef;
    return emitObject(def.shape, "inner", "inner") as unknown as Record<string, unknown>;
  }
  if (n === "ZodOptional" || n === "ZodDefault" || n === "ZodNullable") {
    return emitType(inner(z));
  }
  if (n === "ZodUnknown" || n === "ZodAny") {
    return {};
  }
  return {};
}

function emitObject(shape: Record<string, ZodLike>, id: string, title: string): JsonSchema {
  const required: string[] = [];
  const properties: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(shape)) {
    const n = nameOf(value);
    // ZodOptional → truly optional; ZodDefault → required (has a default).
    const optional = n === "ZodOptional";
    if (!optional) required.push(key);
    properties[key] = emitType(value);
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: id,
    title,
    type: "object",
    additionalProperties: false,
    required: required.length ? required : undefined,
    properties,
  };
}

function asZodLike(schema: z.ZodTypeAny): ZodLike {
  return schema as unknown as ZodLike;
}

export function buildSprintJsonSchema(): JsonSchema {
  const schema = sprintContractV1 as unknown as { shape: Record<string, ZodLike> };
  return emitObject(
    schema.shape,
    `https://miro-workflows.dev/contracts/sprint.v${SPRINT_CONTRACT_VERSION}.json`,
    `MiroWorkflows.Sprint.v${SPRINT_CONTRACT_VERSION}`,
  );
}

export function buildAuditJsonSchema(): JsonSchema {
  const schema = auditEventContractV1 as unknown as { shape: Record<string, ZodLike> };
  return emitObject(
    schema.shape,
    `https://miro-workflows.dev/contracts/audit.v${AUDIT_CONTRACT_VERSION}.json`,
    `MiroWorkflows.AuditEvent.v${AUDIT_CONTRACT_VERSION}`,
  );
}

// Touch helper so esbuild keeps the unused import path live (used by build_contracts.ts).
export function _selfCheck(): ZodLike {
  return asZodLike(auditEventContractV1);
}
