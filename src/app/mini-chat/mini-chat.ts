import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatInput } from '../chat-input/chat-input';
import { MiniChatService } from './mini-chat.service'; // Import MiniChatService

interface MiniChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-mini-chat',
  standalone: true,
  imports: [CommonModule, ChatInput],
  templateUrl: './mini-chat.html',
  styleUrl: './mini-chat.css'
})
export class MiniChatComponent {
  messages = signal<MiniChatMessage[]>([]);
  loading = signal(false);

  constructor(private miniChatService: MiniChatService) {} // Inject MiniChatService

  handleMessageSent(message: string) {
    this.messages.update(msgs => [...msgs, { role: 'user', content: message }]);
    this.loading.set(true);

    this.miniChatService.sendMessage(message, this.messages()).subscribe({
      next: (aiResponse) => {
        this.messages.update(msgs => [...msgs, { role: 'assistant', content: aiResponse }]);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('MiniChatComponent: Error sending message:', err);
        this.messages.update(msgs => [...msgs, { role: 'assistant', content: 'Error: Could not get a response from AI.' }]);
        this.loading.set(false);
      }
    });
  }
}