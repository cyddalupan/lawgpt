import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class AiApiService {
  private apiUrl = 'https://wisdomvault.welfareph.com/ai_api/'; // Adjust if your Angular app is served from a different base path
  private authToken = 'YPaFH6XTJhUo0rrstAdxKrzqshCFGxlOr1YIyy2uRHZ8vJhOPilCaUFxWetlWmqz';

  constructor(private http: HttpClient) { }

  /**
   * Sends messages to the AI API and gets a chat completion response.
   * @param messages An array of chat messages in OpenAI format.
   * @returns An Observable with the AI's response.
   */
  getAiResponse(messages: any[], customApiUrl?: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    });

    const body = { messages: messages };
    const targetUrl = customApiUrl || this.apiUrl;

    return this.http.post(targetUrl, body, { headers, responseType: 'text' }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
    if (error.error instanceof ErrorEvent) {
      // Client-side errors
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side errors
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
    }
    console.error('AiApiService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Sends a single message to a specified AI endpoint for a chat response.
   * This method is generic for single-turn interactions and allows specifying the API URL.
   * @param message The user's message as a string.
   * @param apiUrl The URL of the AI endpoint to send the message to.
   * @returns An Observable with the AI's response as a string.
   */
  sendSimpleChat(message: string, apiUrl: string): Observable<string> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    });

    const body = {
      messages: [{ role: 'user', content: message }]
    };

    return this.http.post(apiUrl, body, { headers, responseType: 'text' }).pipe(
      catchError(this.handleError)
    );
  }
}