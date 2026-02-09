import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, throwError, timer } from 'rxjs'; // Added throwError, timer
import { map, retry, catchError } from 'rxjs/operators'; // Added retry, catchError

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly apiUrl = 'https://wisdomvault.welfareph.com/ai_api/';
  private readonly authToken = 'YPaFH6XTJhUo0rrstAdxKrzqshCFGxlOr1YIyy2uRHZ8vJhOPilCaUFxWetlWmqz';
  private chatHistory: any[] = []; // To store conversation history

  // State management for UI components
  private inResearchModeSubject = new BehaviorSubject<boolean>(false);
  public inResearchMode$ = this.inResearchModeSubject.asObservable();

  private currentStatusMessageSubject = new BehaviorSubject<string>('');
  public currentStatusMessage$ = this.currentStatusMessageSubject.asObservable();

  private finalHtmlOutputSubject = new BehaviorSubject<string | null>(null);
  public finalHtmlOutput$ = this.finalHtmlOutputSubject.asObservable();

  // This subject will emit raw AI text chunks as they arrive
  private aiResponseStreamSubject = new Subject<string>();
  public aiResponseStream$ = this.aiResponseStreamSubject.asObservable();

  // Buffer for HTML content received during research mode
  private bufferedHtmlOutput: string = '';

  private aiErrorSubject = new BehaviorSubject<any>(null); // NEW: Subject for AI errors
  public aiError$ = this.aiErrorSubject.asObservable(); // NEW: Observable for AI errors

  // Regex to capture [key: "value"] pattern
  public tagRegex = /\[(\w+):\s*(".*?"|'.*?'|\[.*?\]|\{.*?\}|[^\]]*)\]/g; // Reverted to original robust regex

  constructor(private http: HttpClient) {}

  sendMessage(messages: any[]): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    });

    return this.http.post(this.apiUrl, { messages }, { headers, responseType: 'text' }).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          console.warn(`AI call failed. Retrying ${retryCount}/3... Error:`, error);
          this.currentStatusMessageSubject.next(`🚨 AI call failed. Retrying ${retryCount}/3...`);
          return timer(retryCount * 1000);
        }
      }),
      map(rawResponse => {
        this.aiErrorSubject.next(null); // Clear previous errors on successful response
        this.aiResponseStreamSubject.next(rawResponse);
        this.processAiResponse(rawResponse);
        return rawResponse;
      }),
      catchError((error) => {
        console.error('API Error after retries in ChatService:', error);
        this.currentStatusMessageSubject.next('🚨 Error communicating with AI after multiple retries.');
        this.inResearchModeSubject.next(false); // Exit research mode on critical error
        this.aiErrorSubject.next(error); // Emit the error
        return throwError(() => new Error('AI communication failed in ChatService'));
      })
    );
  }

  // New method to process raw AI responses
  private processAiResponse(rawText: string): void {
    let aiMessageContent: string = rawText; // Default to rawText if parsing fails

    try {
      const responseBody = JSON.parse(rawText);
      if (responseBody && typeof responseBody.ai_message === 'string') {
        aiMessageContent = responseBody.ai_message;
      }
    } catch (e) {
      // Fallback: If rawText isn't a JSON object with ai_message, treat it as the message content directly.
    }

    const tags = this.parseActionTags(aiMessageContent); // Parse tags from the extracted ai_message content
    const inResearchMode = this.inResearchModeSubject.value;

    // Handle status_message
    if (tags['status_message']) {
      this.currentStatusMessageSubject.next(tags['status_message'] as string);
    } else if (this.inResearchModeSubject.value && this.currentStatusMessageSubject.value === '') {
      // If we are in research mode, and no status_message came from AI,
      // emit a default initial message to ensure UI isn't blank.
      this.currentStatusMessageSubject.next('🚀 Initiating LawGPT research and evaluating your request...');
    }

    // Handle intake_status
    if (tags['intake_status'] === 'done') {
      console.log('ChatService: intake_status done. Entering research mode.');
      this.inResearchModeSubject.next(true);
      // Reset buffered HTML when research mode starts
      this.bufferedHtmlOutput = '';
      this.finalHtmlOutputSubject.next(null); // Clear any previous final output
    }

    // Handle render_status
    if (tags['render_status'] === 'final') {
      // Clean aiMessageContent to remove status/render tags before extracting HTML
      let cleanHtmlContent = this.removeActionTags(aiMessageContent);
      this.finalHtmlOutputSubject.next(this.extractHtmlContent(cleanHtmlContent)); // Pass the cleaned content
      this.inResearchModeSubject.next(false);
      this.bufferedHtmlOutput = ''; // Clear buffer after final output is taken
      this.currentStatusMessageSubject.next(''); // Clear status message
      return; // Stop further processing as final output is handled
    }

    // If in research mode, and not a final render, buffer all non-tag content
    if (inResearchMode) {
      // Extract content that is not an action tag. This assumes AI will eventually output HTML.
      // We are essentially collecting all text until render_status: "final"
      this.bufferedHtmlOutput += this.removeActionTags(rawText);
    } else {
      // If not in research mode, and not a status message, add to chat history directly
      // This handles initial conversational exchanges before research mode begins
      // Also handles non-research AI messages
      if (!tags['status_message']) {
        this.addMessageToHistory({ role: 'assistant', content: this.removeActionTags(rawText) });
      }
    }
  }

  // Helper to remove action tags from text for buffering or direct display
  public removeActionTags(text: string): string {
    return text.replace(this.tagRegex, '').trim();
  }

  // Helper to extract the pure HTML content from a raw AI response
  // This is specifically for Prompt 6 output which should *only* be the <div>...</div> or <section>...</section>
  private extractHtmlContent(rawAiMessageContent: string): string {
    // First, remove all action tags from the raw AI message content
    let cleanedContent = this.removeActionTags(rawAiMessageContent);

    // Then, attempt to find the main HTML block (e.g., <section> or <div>)
    // This regex looks for either <section> or <div... and captures everything until its closing tag.
    const htmlMatch = cleanedContent.match(/(<section[\s\S]*<\/section>|<div[\s\S]*<\/div>)/);
    if (htmlMatch && htmlMatch[0]) {
      return htmlMatch[0];
    }
    // Fallback: If no specific HTML block is found, return the cleaned content as is.
    return cleanedContent;
  }
  // Existing parseActionTags method remains the same
  parseActionTags(text: string): { [key: string]: string | string[] | Record<string, any> } {
    const tags: { [key: string]: string | string[] | Record<string, any> } = {};
    const matches = Array.from(text.matchAll(this.tagRegex));

    for (const match of matches) {
      const key = match[1];
      let rawValue = match[2].trim(); // Raw value extracted by original regex.

      let processedValue: any = rawValue;

      // Step 1: Attempt to parse as JSON (arrays, objects, or string literals)
      try {
        const parsedJson = JSON.parse(rawValue);
        processedValue = parsedJson;
      } catch (e) {
        // Not a valid JSON string, proceed to string cleanup.
      }

      // Step 2: Final cleanup for plain strings (single quotes, Unicode escapes)
      if (typeof processedValue === 'string') {
        // Remove outer single quotes (if JSON.parse didn't handle it or it wasn't JSON)
        if (processedValue.startsWith("'") && processedValue.endsWith("'")) {
          processedValue = processedValue.substring(1, processedValue.length - 1);
        }
        // Resolve Unicode escapes
        processedValue = processedValue.replace(/\\u([\dA-F]{4})/gi,
          (match: string, grp: string) => String.fromCharCode(parseInt(grp, 16)));
      }

      tags[key] = processedValue;
    }
    return tags;
  }

  getChatHistory(): any[] {
    return this.chatHistory;
  }

  addMessageToHistory(message: any): void {
    this.chatHistory.push(message);
  }

  // New methods for components to interact with the service state
  public getInResearchMode(): boolean {
    return this.inResearchModeSubject.value;
  }

  public getCurrentStatusMessage(): string {
    return this.currentStatusMessageSubject.value;
  }

  public getFinalHtmlOutput(): string | null {
    return this.finalHtmlOutputSubject.value;
  }
}

