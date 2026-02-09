import { Injectable } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, map } from 'rxjs/operators';
import { AiApiService } from '../ai-api'; // Import AiApiService

interface MiniChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class MiniChatService {
  private readonly fastApiUrl = 'https://wisdomvault.welfareph.com/ai_api/fast_ai_api/'; // Dedicated fast AI endpoint

  // Fixed system message for the mini-chat
  private readonly systemMessage: MiniChatMessage = {
    role: 'system',
    content: 'you are lawGPT, helping lawyers'
  };

  constructor(private aiApiService: AiApiService) { } // Inject AiApiService

  sendMessage(userMessage: string): Observable<string> {
    // The AiApiService.sendSimpleChat method already handles headers and basic message structure.
    // We only need to pass the user's message and the specific fast API URL.
    return this.aiApiService.sendSimpleChat(userMessage, this.fastApiUrl).pipe(
      // MiniChatService should not add its own retry logic here if AiApiService already has it
      // For now, let's assume AiApiService handles retries internally if needed by that service.
      map(rawResponse => {
        try {
          const responseBody = JSON.parse(rawResponse);
          if (responseBody && typeof responseBody.ai_message === 'string') {
            return responseBody.ai_message;
          }
          return rawResponse;
        } catch (e) {
          return rawResponse;
        }
      }),
      catchError((error) => {
        console.error('MiniChatService: API Error:', error);
        return throwError(() => new Error('Mini AI communication failed'));
      })
    );
  }
}
