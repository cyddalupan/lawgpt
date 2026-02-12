import { Component, signal, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'; // Import DomSanitizer and SafeHtml
import { ChatInput } from '../chat-input/chat-input';
import { BaseChatService } from './base-chat.service'; // Import BaseChatService
import { Header } from '../shared/header'; // Import Header component

interface BaseChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isHtml?: boolean; // New property to indicate HTML content
}

@Component({
  selector: 'app-base-chat',
  standalone: true,
  imports: [CommonModule, ChatInput, Header],
  templateUrl: './base-chat.html',
  styleUrl: './base-chat.css'
})
export class BaseChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  messages = signal<BaseChatMessage[]>([]);
  loading = signal(false);

  constructor(private baseChatService: BaseChatService, private sanitizer: DomSanitizer) {} // Inject DomSanitizer

  // Method to mark HTML as safe for rendering
  getSafeHtml(content: string): SafeHtml {
    // Apply final cleanup to remove any remaining action tags before displaying the HTML.
    const processedHtml = this.baseChatService.removeActionTags(this.processCitations(content));
    return this.sanitizer.bypassSecurityTrustHtml(processedHtml);
  }

  // Method to process citations and replace markers with styled HTML
  private processCitations(content: string): string {
    const citationRegex = /\[\[CITATION:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\]\]/g;
    return content.replace(citationRegex, (match, grNo, petitioner, date, division, syllabus) => {
                const processedGrNo = grNo;
                const processedPetitioner = petitioner;
                const processedDate = date;
                const processedDivision = division;
                const processedSyllabus = syllabus;
                return `
                  <div class="my-4 p-4 bg-slate-50 border-l-4 border-blue-700 rounded-r-md shadow-sm">
                    <p class="font-bold text-slate-900">${processedGrNo}</p>
                    <p class="italic text-slate-700">${processedPetitioner}</p>
                    <p class="text-sm text-slate-600">${processedDate} | ${processedDivision}</p>
                    <hr class="my-2">
                    <p class="text-slate-800 text-sm">${processedSyllabus}</p>
                  </div>
                `;    });
  }


  ngOnInit(): void {
    this.messages.update(msgs => [...msgs, {
      role: 'assistant',
      content: 'Hello! I am LawGPT Base. How can I assist you today?',
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

    this.baseChatService.sendMessage(message).subscribe({
      next: (rawAiResponse) => {
        // Assume rawAiResponse is already the ai_message content from the service
        const isHtml = rawAiResponse.trim().startsWith('<') && rawAiResponse.trim().endsWith('>');
        this.messages.update(msgs => [...msgs, {
          role: 'assistant',
          content: rawAiResponse,
          isHtml: isHtml
        }]);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('BaseChatComponent: Error sending message:', err);
        this.messages.update(msgs => [...msgs, { role: 'assistant', content: 'Error: Could not get a response from AI.' }]);
        this.loading.set(false);
      }
    });
  }
}