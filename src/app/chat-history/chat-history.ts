import { Component, Input, SecurityContext, ElementRef, ViewChild, AfterViewChecked } from '@angular/core'; // Import new modules
import { CommonModule } from '@angular/common'; // Import CommonModule for ngFor
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'; // Import DomSanitizer
import { ChatMessage } from '../shared/interfaces/chat-message.interface'; // Import ChatMessage interface

// Declare 'marked' as a global variable since it's loaded via CDN
declare const marked: any;

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [CommonModule], // Add CommonModule to imports
  templateUrl: './chat-history.html',
  // styleUrl: './chat-history.css', // Removed as per instructions
})
export class ChatHistory implements AfterViewChecked { // Implement AfterViewChecked
  @Input() messages: ChatMessage[] = [];
  @Input() inResearchMode: boolean = false; // NEW INPUT
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef; // Add ViewChild

  constructor(public sanitizer: DomSanitizer) {}

  get filteredMessages(): ChatMessage[] {
    const filtered = this.messages.filter(message => message.displayInChat !== false);
    if (this.inResearchMode) {
      return []; // Hide regular chat messages when in research mode
    }
    // Filter messages: only show if displayInChat is true or undefined (default to true)
    return filtered;
  }

  parseMarkdown(message: ChatMessage): SafeHtml {
    const content = message.content;
    if (message.isFinalHtml) {
      // If it's already final HTML, bypass marked.parse and directly sanitize
      return this.sanitizer.bypassSecurityTrustHtml(content || '');
    } else {
      // For other messages, parse markdown as usual
      return this.sanitizer.bypassSecurityTrustHtml(marked.parse(content) || '');
    }
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    if (this.scrollContainer && this.scrollContainer.nativeElement) {
      try {
        // Use setTimeout to ensure the scroll happens after the DOM has updated
        setTimeout(() => {
          this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
        }, 0);
      } catch (err) {
        console.error('Scroll to bottom failed:', err);
      }
    }
  }
}