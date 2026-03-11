import Ajv2020 from "ajv/dist/2020.js";
import { agentSchema } from "./agent-schema.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(agentSchema);

export function validateManifest(manifest: unknown): boolean {
  return validate(manifest) === true;
}
