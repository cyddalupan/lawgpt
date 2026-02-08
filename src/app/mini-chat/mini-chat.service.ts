import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, map } from 'rxjs/operators';

interface MiniChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class MiniChatService {
  private readonly apiUrl = 'https://wisdomvault.welfareph.com/ai_api/fast_ai_api/';
  private readonly authToken = 'YPaFH6XTJhUo0rrstAdxKrzqshCFGxlOr1YIyy2uRHZ8vJhOPilCaUFxWetlWmqz'; // Assuming the same auth token

  // Fixed system message for the mini-chat
  private readonly systemMessage: MiniChatMessage = {
    role: 'system',
    content: 'you are lawGPT, helping lawyers'
  };

  constructor(private http: HttpClient) { }

  sendMessage(userMessage: string, chatHistory: MiniChatMessage[]): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    });

    // Combine system message, chat history, and the new user message
    const messagesToSend: MiniChatMessage[] = [
      this.systemMessage,
      ...chatHistory.filter(msg => msg.role !== 'system'), // Exclude any system messages from chatHistory if they exist
      { role: 'user', content: userMessage }
    ];

    return this.http.post(this.apiUrl, { messages: messagesToSend }, { headers, responseType: 'text' }).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          console.warn(`MiniChatService: AI call failed. Retrying ${retryCount}/3... Error:`, error);
          return timer(retryCount * 1000);
        }
      }),
      map(rawResponse => {
        try {
          const responseBody = JSON.parse(rawResponse);
          // Assuming the AI response will have an ai_message field
          if (responseBody && typeof responseBody.ai_message === 'string') {
            return responseBody.ai_message;
          }
          // If no ai_message field, return the raw response
          return rawResponse;
        } catch (e) {
          // If response is not JSON, return it as is (e.g., plain text or error)
          return rawResponse;
        }
      }),
      catchError((error) => {
        console.error('MiniChatService: API Error after retries:', error);
        return throwError(() => new Error('Mini AI communication failed'));
      })
    );
  }
}
