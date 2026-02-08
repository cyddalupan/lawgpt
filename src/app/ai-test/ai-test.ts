import { Component, OnDestroy } from '@angular/core';
import { AiApiService } from '../ai-api';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-ai-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-test.html',
  styleUrl: './ai-test.css'
})
export class AiTestComponent implements OnDestroy {
  aiResponse$: BehaviorSubject<string>; // Declare, but initialize in constructor
  loading: boolean = false;
  error: string | null = null;
  statusMessage$: BehaviorSubject<string | null>; // Declare, but initialize in constructor

  private destroy$ = new Subject<void>();

  constructor(private aiApiService: AiApiService) {
    this.aiResponse$ = new BehaviorSubject<string>('No response yet.');
    this.statusMessage$ = new BehaviorSubject<string | null>(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.aiResponse$.complete();
    this.statusMessage$.complete();
  }

  sendMessageToAi() {
    this.loading = true;
    this.error = null;
    this.aiResponse$.next('Loading...');
    this.statusMessage$.next('🧠 Evaluating your request for legal clarity in Philippine Jurisprudence...');

    const chatMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' }
    ];

    this.aiApiService.getAiResponse(chatMessages).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: response => {
        if (response && response.status_message) {
          this.statusMessage$.next(response.status_message);
        }

        if (response && response.ai_message) {
          this.aiResponse$.next(response.ai_message);
          this.statusMessage$.next(null); // Clear status message once final AI response is received
        } else if (!response.status_message && !response.ai_message) {
          this.aiResponse$.next('Unexpected AI response format: `ai_message` or `status_message` not found.');
          console.warn('Unexpected AI response format:', response);
          this.statusMessage$.next(null);
        }
      },
      error: error => {
        this.statusMessage$.next(null); // Clear status message on error
        this.error = 'Error getting AI response: ' + (error.message || error.statusText || 'Unknown error');
        this.aiResponse$.next(this.error);
        console.error('Error getting AI response:', error);
      },
      complete: () => {
        this.loading = false; // Ensure loading is false when observable completes
      }
    });
  }
}