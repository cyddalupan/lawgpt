import { Component, Input, OnChanges, SimpleChanges, SecurityContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-loading-stream',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-stream.html',
})
export class LoadingStream implements OnChanges {
  @Input() statusMessage: string = '';
  @Input() inResearchMode: boolean = false; // NEW Input
  @Input() currentPhase: string = '';
  @Input() totalPhases: number = 0;
  @Input() tasks: string[] = [];
  @Input() currentTaskIndex: number = 0;
  @Input() researchSubPhase: string = '';

  displayMessage: string = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(changes: SimpleChanges): void {
    this.updateDisplayMessage();
  }

  private updateDisplayMessage(): void {
    let message = this.statusMessage;

    // Attempt to JSON.parse if it looks like a stringified string with escaped Unicode
    if (message.startsWith('"') && message.endsWith('"')) {
      try {
        // JSON.parse will automatically unescape Unicode characters and remove the outer quotes
        message = JSON.parse(message);
      } catch (e) {
        // If JSON.parse fails, it might just be a string with literal quotes,
        // so fall back to simple quote removal
        message = message.substring(1, message.length - 1);
      }
    } else {
      // Original logic: simple quote removal if not already handled
      if (message.startsWith('"') && message.endsWith('"')) {
        message = message.substring(1, message.length - 1);
      }
    }
    this.displayMessage = message;
  }
  // Helper to map currentPhase string to a numerical value for progress display
  public currentPhaseMapValue(): number {
    const phaseOrder = ['intake', 'strategy', 'summarizer', 'research', 'synthesis', 'styling'];
    return phaseOrder.indexOf(this.currentPhase) + 1;
  }

  // New method to return sanitized message for innerHTML binding
  public getSafeDisplayMessage(): SafeHtml {
    const sanitizedContent = this.sanitizer.sanitize(SecurityContext.HTML, this.displayMessage) || '';
    return this.sanitizer.bypassSecurityTrustHtml(sanitizedContent);
  }
}