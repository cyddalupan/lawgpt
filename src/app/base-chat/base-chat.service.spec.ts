import { TestBed } from '@angular/core/testing';
import { BaseChatService } from './base-chat.service';
import { AiApiService } from '../ai-api'; // Import AiApiService
import { of, throwError } from 'rxjs';

describe('BaseChatService', () => {
  let service: BaseChatService;
  let mockAiApiService: { sendSimpleChat: jest.Mock };

  beforeEach(() => {
    TestBed.resetTestingModule(); // Explicitly reset the testing module
    mockAiApiService = {
      sendSimpleChat: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        BaseChatService,
        { provide: AiApiService, useValue: mockAiApiService }
      ]
    });
    service = TestBed.inject(BaseChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call aiApiService.sendSimpleChat with the user message and baseApiUrl', () => {
    const userMessage = 'What is certiorari?';
    const mockApiResponse = 'Certiorari is a legal process...';
    mockAiApiService.sendSimpleChat.mockReturnValue(of(mockApiResponse));

    service.sendMessage(userMessage).subscribe(response => {
      expect(response).toBe(mockApiResponse);
    });

    expect(mockAiApiService.sendSimpleChat).toHaveBeenCalledWith(userMessage, service['baseApiUrl']);
  });

  it('should extract ai_message from JSON response if present', () => {
    const userMessage = 'Hello';
    const mockApiResponse = JSON.stringify({ ai_message: 'Hi there!' });
    mockAiApiService.sendSimpleChat.mockReturnValue(of(mockApiResponse));

    service.sendMessage(userMessage).subscribe(response => {
      expect(response).toBe('Hi there!'); // Expect only the ai_message content
    });

    expect(mockAiApiService.sendSimpleChat).toHaveBeenCalledWith(userMessage, service['baseApiUrl']);
  });

  it('should return raw response if it is not JSON or does not contain ai_message', () => {
    const userMessage = 'Hello';
    const rawTextResponse = 'This is a plain text response.';
    mockAiApiService.sendSimpleChat.mockReturnValue(of(rawTextResponse));

    service.sendMessage(userMessage).subscribe(response => {
      expect(response).toBe(rawTextResponse);
    });

    expect(mockAiApiService.sendSimpleChat).toHaveBeenCalledWith(userMessage, service['baseApiUrl']);
  });

  it('should re-throw error from aiApiService.sendSimpleChat', async () => {
    const userMessage = 'Error test';
    const mockError = new Error('API communication failed');
    mockAiApiService.sendSimpleChat.mockReturnValue(throwError(() => mockError));

    await expect(service.sendMessage(userMessage).toPromise()).rejects.toThrow('Base AI communication failed');
  });
});