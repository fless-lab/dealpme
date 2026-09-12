import { z } from "zod";

export const SendMessageSchema = z.object({
  body: z.string().trim().min(2).max(4000),
  conversationId: z.uuid().optional(),
}).strict(); // Ni destinataire libre, ni pièce jointe, ni usurpation de l'auteur.

export const MessageQuerySchema = z.object({
  conversationId: z.uuid().optional(),
  before: z.uuid().optional(),
  scope: z.enum(["conversation", "legacy"]).default("conversation"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export interface ConversationSummary {
  id: string;
  label: string;
  createdAt: string;
}
export interface ConversationMessage {
  id: string;
  conversationId: string | null;
  body: string;
  createdAt: string;
  mine: boolean;
}
export interface MessagePage {
  conversationId: string | null;
  items: ConversationMessage[];
  nextCursor: string | null;
  legacyCount: number;
}
export interface SentMessage {
  messageId: string;
  conversationId: string;
  message: ConversationMessage;
}
