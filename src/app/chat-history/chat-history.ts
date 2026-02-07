import { Component, Input, SecurityContext } from '@angular/core'; // Import SecurityContext
import { CommonModule } from '@angular/common'; // Import CommonModule for ngFor
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'; // Import DomSanitizer
import { ChatMessage } from '../app'; // Import ChatMessage interface

// Declare 'marked' as a global variable since it's loaded via CDN
declare const marked: any;

@Component({
  selector: 'app-chat-history',
  standalone: true,
  imports: [CommonModule], // Add CommonModule to imports
  templateUrl: './chat-history.html',
  // styleUrl: './chat-history.css', // Removed as per instructions
})
export class ChatHistory {
  @Input() messages: ChatMessage[] = [];

  constructor(private sanitizer: DomSanitizer) {}

  get filteredMessages(): ChatMessage[] {
    // Filter messages: only show if displayInChat is true or undefined (default to true)
    return this.messages.filter(message => message.displayInChat !== false);
  }

  parseMarkdown(content: string): SafeHtml {
    if (content.includes('[status_message:') || content.includes('[intake_status:') || content.includes('[tasks:') || content.includes('[summary_status:') || content.includes('[validation_status:') || content.includes('[synthesis_status:') || content.includes('[render_status:')) {
      // If action tags are still present, do not parse as markdown, just sanitize
      // This ensures action tags are not misinterpreted by markdown parser if they are not removed upstream
      return this.sanitizer.bypassSecurityTrustHtml(content);
    }
    // Convert markdown to HTML and sanitize
    return this.sanitizer.bypassSecurityTrustHtml(this.sanitizer.sanitize(SecurityContext.HTML, marked.parse(content)) || '');
  }
}