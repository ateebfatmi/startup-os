import { z } from "zod";

export const CreateMessageSchema = z.object({
  workspaceId: z.string().uuid(),
  channelId: z.string().uuid().optional(),
  recipientId: z.string().uuid().optional(),
  content: z.string().min(1).max(4000),
  attachments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    size: z.number().optional(),
    type: z.string().optional(),
  })).default([]),
});

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;

export interface ChatMessage {
  id: string;
  workspaceId: string;
  channelId?: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  content: string;
  attachments?: Array<{ id: string; name: string; url: string }>;
  reactions?: Record<string, string[]>;
  createdAt: number;
}

export interface ChatChannel {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  unreadCount?: number;
}
