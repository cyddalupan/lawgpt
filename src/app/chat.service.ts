import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private readonly apiUrl = 'https://wisdomvault.welfareph.com/ai_api/';
  private readonly authToken = 'YPaFH6XTJhUo0rrstAdxKrzqshCFGxlOr1YIyy2uRHZ8vJhOPilCaUFxWetlWmqz';
  private chatHistory: any[] = []; // To store conversation history

  // Regex to capture [key: "value"] pattern
  public tagRegex = /\[(\w+):\s*(".*?"|'.*?'|\[.*?\]|\{.*?\}|[^\]]*)\]/g;

  constructor(private http: HttpClient) {}

  sendMessage(messages: any[]): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    });
    return this.http.post(this.apiUrl, { messages }, { headers });
  }

  parseActionTags(text: string): { [key: string]: string | string[] } {
    const tags: { [key: string]: string | string[] } = {};

    // Use matchAll to get all occurrences of tags
    // The regex is greedy, so it will match the entire line if multiple tags exist.
    // This will be handled by the parsing logic.
    const matches = Array.from(text.matchAll(this.tagRegex));

    for (const match of matches) {
      const key = match[1];
      let rawValue = match[2].trim(); // Get the raw captured value and trim whitespace
      let processedValue: string | string[] = rawValue;

      // 1. Attempt JSON.parse first if it looks like a JSON structure
      if ((rawValue.startsWith('[') && rawValue.endsWith(']')) || (rawValue.startsWith('{') && rawValue.endsWith('}'))) {
        try {
          processedValue = JSON.parse(rawValue);
        } catch (e) {
          // If JSON.parse fails, it's not valid JSON, treat as string
          console.warn(`Could not parse value for tag ${key} as JSON: ${rawValue}`, e);
        }
      } 
      // 2. If not JSON, check for and strip outer quotes
      else if (
        (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'"))
      ) {
        processedValue = rawValue.substring(1, rawValue.length - 1);
      }
      // 3. Otherwise, it's an unquoted string, use as is.

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

  // Potentially add methods to manage work state if needed
}
