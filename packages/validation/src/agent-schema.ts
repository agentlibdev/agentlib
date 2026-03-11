export const agentSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://agentlib.dev/schemas/agent.schema.json",
  title: "AgentLib Agent Manifest",
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "kind", "metadata", "spec"],
  properties: {
    apiVersion: {
      type: "string",
      const: "agentlib.dev/v1alpha1"
    },
    kind: {
      type: "string",
      const: "Agent"
    },
    metadata: {
      type: "object",
      additionalProperties: false,
      required: ["namespace", "name", "version", "title", "description"],
      properties: {
        namespace: {
          type: "string",
          pattern: "^[a-z0-9][a-z0-9-]{1,62}$"
        },
        name: {
          type: "string",
          pattern: "^[a-z0-9][a-z0-9-]{1,62}$"
        },
        version: {
          type: "string",
          pattern:
            "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?$"
        },
        title: {
          type: "string",
          minLength: 1,
          maxLength: 120
        },
        description: {
          type: "string",
          minLength: 1,
          maxLength: 500
        },
        license: {
          type: "string",
          minLength: 1
        }
      }
    },
    spec: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: {
          type: "string",
          minLength: 1,
          maxLength: 280
        },
        inputs: {
          type: "array",
          items: {
            $ref: "#/$defs/ioField"
          },
          default: []
        },
        outputs: {
          type: "array",
          items: {
            $ref: "#/$defs/ioField"
          },
          default: []
        },
        tools: {
          type: "array",
          items: {
            type: "string",
            minLength: 1
          },
          default: []
        }
      }
    }
  },
  $defs: {
    ioField: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: {
          type: "string",
          pattern: "^[a-z][a-zA-Z0-9-]{0,63}$"
        },
        description: {
          type: "string",
          minLength: 1,
          maxLength: 280
        }
      }
    }
  }
} as const;
