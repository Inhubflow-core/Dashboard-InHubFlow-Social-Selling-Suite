export interface ChatMessage {
  id: string;
  unipileChatId?: string;
  senderId: string;
  senderName: string;
  isSender: boolean;
  text: string;
  timestamp: string;
  attachment?: {
    name: string;
    type: "pdf" | "audio" | "image";
    size?: string;
  };
}

export interface ChatConversation {
  id: string;
  unipileChatId?: string;
  leadId: string;
  leadName: string;
  leadTitle: string;
  company: string;
  location: string;
  avatarInitials: string;
  avatarUrl?: string;
  campaignSource: string;
  leadMagnetUsed?: string;
  crmStage: string;
  crmStageId: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  aiSuggestions: string[];
  messages: ChatMessage[];
}
