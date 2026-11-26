/**
 * Conversation schema - a person's conversation with an AI agent
 *
 * What the person asked, what the agent answered and what each of its tools returned, kept so the
 * conversation can be shown and resumed: an agent sends it back to the model on every call. It is
 * one Model, since its messages have no identity, lifecycle or permissions apart from it: they are
 * created with it, read with it and deleted with it.
 *
 * A resumed conversation has to be the one the model produced. The model's provider binds its
 * reasoning to everything sent before it, the system prompt, the tools and every earlier message,
 * in order, and refuses a request whose history changed, or drops the reasoning. So nothing in it
 * is rewritten, and its order is a value:
 * - `setup` is written once, with what the conversation keeps for its life: the model, the version
 *   of the platform's own instructions, and the agent's system prompt and tools as first sent;
 * - `messages` only grows, and so do a message's parts, a tool result's content and `about`;
 * - each message holds its place in the conversation, and each part its place in what holds it
 *   (`index`), so a reader orders by it, and two writers can't both add the next message;
 * - an instruction that changes partway is a `system` message, added where it starts to hold.
 *
 * Each part of a message is one content block of the provider's messages format: its `kind` is
 * the block's type as the provider writes it, and each value of the block is a field of its own,
 * named as the provider names it, so the store checks every write and a reader takes a
 * conversation apart without parsing the provider's format. Four values take a name that says what
 * they are here: a tool call's `id` is its `tool_use_id`, the name its result already uses; its
 * `name` is `tool`; a redacted reasoning's `data` is `redacted`; and a block's file is its `image`
 * or its `document`. Two values are opaque, held as `json`: a tool call's `input`, shaped by its
 * tool's `input_schema`, which differs from tool to tool; and that `input_schema`, a JSON Schema the
 * provider reads.
 *
 * A writer keeps every value of a block it stores, as it was sent, and refuses a block holding one
 * this schema has no field for, so nothing is dropped on the way in. It writes a message whole, its
 * parts and their content with it, and never adds to it later. A text holds no U+0000, which the
 * store refuses, so a writer keeps it out of what it sends, its tools' results included. A kind or
 * a value the provider adds comes as a choice or a field added in a later version, and every
 * stored conversation stays valid.
 *
 * Its text is kept as it was written, in its own language: nothing in it is translatable. It
 * holds no date of its own: when an entry last changed is kept for every entry, and orders a
 * person's list.
 *
 * Who reads it: its person, and in an organization the people who administer it, since belonging
 * to the organization opens none of its entries (`open_to_members: false`). Anyone else reads one
 * when it is shared with them, and then reads what the agent read in it: its tool results are
 * copies of pages and records. Nothing references a conversation (`linkable: false`), so its card,
 * the title the agent gives it, travels on no reference.
 *
 * Left out: what the agent changed on a site, which the platform keeps a record of; what the
 * model's calls cost; and credentials, which have doors of their own.
 */

/** A part's value its kind needs, required on every part of that kind. */
const needs = (field, kind) => ({ kind: 'required_when', field, when: { field: 'kind', equals: kind } })

/** A part's place among the parts that hold it with it, unique there. */
const placed = { kind: 'unique_field', field: 'index', scope: 'siblings' }

const IMAGE_TYPES = ['image/*']
const DOCUMENT_TYPES = ['application/pdf', 'text/*']

export default {
  name: 'conversation',
  version: '1.0.0',
  plural: 'Conversations',
  icon: 'lu-messages-square',
  description: 'A person’s conversation with an AI agent: what they asked, what it answered and what its tools returned',
  linkable: false,
  open_to_members: false,

  sections: {
    brief: {
      brief: true,
      fields: {
        title: {
          type: 'string',
          translatable: false,
          max_length: 200,
          description: 'What it is about, in a few words, which the agent names it by after its first exchange',
        },
      },
    },

    about: {
      many: true,
      append_only: true,
      constraints: [{ kind: 'unique_field', field: 'site' }],
      fields: {
        site: {
          ref: '@uniweb/site-content',
          required: true,
          description: 'A site it worked on, which it opened or made',
        },
      },
    },

    setup: {
      many: true,
      append_only: true,
      constraints: [{ kind: 'max_items', value: 1 }],
      fields: {
        model: {
          type: 'string',
          required: true,
          translatable: false,
          description: 'The model it is held with, from its first message to its last',
        },
        instructions_version: {
          type: 'integer',
          required: true,
          min: 1,
          description: 'The version of the platform’s own instructions it began with, which each of its calls names',
        },
        system: {
          type: 'text',
          translatable: false,
          description: 'The agent’s system prompt, as first sent',
        },
      },
      sections: {
        tools: {
          many: true,
          append_only: true,
          constraints: [{ kind: 'unique_field', field: 'name' }],
          fields: {
            name: { type: 'string', required: true, translatable: false, description: 'The tool’s name, which its calls name' },
            description: { type: 'text', translatable: false, description: 'What the model is told the tool does' },
            input_schema: { type: 'json', required: true, description: 'The JSON Schema of what a call to it takes' },
            strict: { type: 'boolean', description: 'Its calls are held to its input schema' },
            eager_input_streaming: { type: 'boolean', description: 'A call’s input streams as the model writes it' },
          },
        },
      },
    },

    messages: {
      many: true,
      append_only: true,
      constraints: [{ kind: 'unique_field', field: 'index' }],
      fields: {
        index: { type: 'integer', required: true, min: 0, description: 'Its place in the conversation, from 0' },
        role: {
          type: 'string',
          required: true,
          translatable: false,
          enum: ['user', 'assistant', 'system'],
          description: 'Who it is from: user for what the person sent and what the tools returned, assistant for the model, system for an instruction added partway',
        },
        at: { type: 'datetime', required: true, description: 'When it was added' },
        stop_reason: {
          type: 'string',
          translatable: false,
          description: 'For one from the model, why it stopped, as the provider says it, such as end_turn, tool_use, max_tokens or refusal',
        },
      },
      sections: {
        parts: {
          many: true,
          append_only: true,
          constraints: [
            placed,
            needs('image', 'image'),
            needs('document', 'document'),
            needs('signature', 'thinking'),
            needs('redacted', 'redacted_thinking'),
            needs('tool_use_id', 'tool_use'),
            needs('tool', 'tool_use'),
            needs('input', 'tool_use'),
            needs('tool_use_id', 'tool_result'),
            // A call is made once and answered once.
            { kind: 'unique_field', field: 'tool_use_id', when: { field: 'kind', equals: 'tool_use' } },
            { kind: 'unique_field', field: 'tool_use_id', when: { field: 'kind', equals: 'tool_result' } },
          ],
          fields: {
            index: { type: 'integer', required: true, min: 0, description: 'Its place in its message, from 0' },
            kind: {
              type: 'string',
              required: true,
              translatable: false,
              enum: ['text', 'image', 'document', 'thinking', 'redacted_thinking', 'tool_use', 'tool_result'],
              description: 'The content block it is, as the provider names its type',
            },
            text: { type: 'text', translatable: false, description: 'A text part’s text, as it was sent, empty if it was' },
            image: { type: 'image', mime_types: IMAGE_TYPES, description: 'An image part’s picture' },
            document: { type: 'file', mime_types: DOCUMENT_TYPES, description: 'A document part’s file, a PDF or a text' },
            thinking: { type: 'text', translatable: false, description: 'A thinking part’s reasoning, as the provider shows it, empty where it shows none' },
            signature: { type: 'text', translatable: false, description: 'A thinking part’s signature, which binds it to the conversation that produced it' },
            redacted: { type: 'text', translatable: false, description: 'A redacted_thinking part’s reasoning, which the provider encrypted' },
            tool_use_id: { type: 'string', translatable: false, description: 'The call a tool_use part makes, and the call a tool_result part answers' },
            tool: { type: 'string', translatable: false, description: 'The tool a tool_use part calls' },
            input: { type: 'json', description: 'What a tool_use part passes its tool, shaped by the tool’s input schema' },
            is_error: { type: 'boolean', description: 'A tool_result part answers with an error' },
          },
          sections: {
            content: {
              many: true,
              append_only: true,
              constraints: [placed, needs('image', 'image'), needs('document', 'document')],
              fields: {
                index: { type: 'integer', required: true, min: 0, description: 'Its place in its tool result, from 0' },
                kind: {
                  type: 'string',
                  required: true,
                  translatable: false,
                  enum: ['text', 'image', 'document'],
                  description: 'The content block it is, as the provider names its type',
                },
                text: { type: 'text', translatable: false, description: 'A text part’s text, as it was sent, empty if it was' },
                image: { type: 'image', mime_types: IMAGE_TYPES, description: 'An image part’s picture' },
                document: { type: 'file', mime_types: DOCUMENT_TYPES, description: 'A document part’s file, a PDF or a text' },
              },
            },
          },
        },
      },
    },
  },
}
