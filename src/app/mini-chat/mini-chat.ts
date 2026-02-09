import { Component, signal, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatInput } from '../chat-input/chat-input';
import { MiniChatService } from './mini-chat.service'; // Import MiniChatService
import { Header } from '../shared/header'; // Import Header component

interface MiniChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'app-mini-chat',
  standalone: true,
  imports: [CommonModule, ChatInput, Header],
  templateUrl: './mini-chat.html',
  styleUrl: './mini-chat.css'
})
export class MiniChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  messages = signal<MiniChatMessage[]>([]);
  loading = signal(false);

  constructor(private miniChatService: MiniChatService) {} // Inject MiniChatService

  ngOnInit(): void {
    this.messages.update(msgs => [...msgs, {
      role: 'assistant',
      content: 'Hello! I am LawGPT Fast. How can I assist you today?',
    }]);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      // Use setTimeout to ensure the DOM has updated before scrolling
      setTimeout(() => {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      }, 0);
    } catch (err) { }
  }

  handleMessageSent(message: string) {
    this.messages.update(msgs => [...msgs, { role: 'user', content: message }]);
    this.loading.set(true);

    this.miniChatService.sendMessage(message).subscribe({
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