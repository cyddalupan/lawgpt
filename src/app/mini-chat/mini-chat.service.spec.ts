import { TestBed } from '@angular/core/testing';
import { MiniChatService } from './mini-chat.service';
import { AiApiService } from '../ai-api'; // Import AiApiService
import { of, throwError } from 'rxjs';

describe('MiniChatService', () => {
  let service: MiniChatService;
  let mockAiApiService: { sendSimpleChat: jest.Mock };

  beforeEach(() => {
    mockAiApiService = {
      sendSimpleChat: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        MiniChatService,
        { provide: AiApiService, useValue: mockAiApiService }
      ]
    });
    service = TestBed.inject(MiniChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call aiApiService.sendSimpleChat with the user message and fastApiUrl', () => {
    const userMessage = 'What is certiorari?';
    const mockApiResponse = 'Certiorari is a legal process...';
    mockAiApiService.sendSimpleChat.mockReturnValue(of(mockApiResponse));

    service.sendMessage(userMessage).subscribe(response => {
      expect(response).toBe(mockApiResponse);
    });

    expect(mockAiApiService.sendSimpleChat).toHaveBeenCalledWith(userMessage, service['fastApiUrl']);
  });

  it('should extract ai_message from JSON response if present', () => {
    const userMessage = 'Hello';
    const mockApiResponse = JSON.stringify({ ai_message: 'Hi there!' });
    mockAiApiService.sendSimpleChat.mockReturnValue(of(mockApiResponse));

    service.sendMessage(userMessage).subscribe(response => {
      expect(response).toBe('Hi there!'); // Expect only the ai_message content
    });

    expect(mockAiApiService.sendSimpleChat).toHaveBeenCalledWith(userMessage, service['fastApiUrl']);
  });

  it('should return raw response if it is not JSON or does not contain ai_message', () => {
    const userMessage = 'Hello';
    const rawTextResponse = 'This is a plain text response.';
    mockAiApiService.sendSimpleChat.mockReturnValue(of(rawTextResponse));

    service.sendMessage(userMessage).subscribe(response => {
      expect(response).toBe(rawTextResponse);
    });

    expect(mockAiApiService.sendSimpleChat).toHaveBeenCalledWith(userMessage, service['fastApiUrl']);
  });

  it('should re-throw error from aiApiService.sendSimpleChat', async () => {
    const userMessage = 'Error test';
    const mockError = new Error('API communication failed');
    mockAiApiService.sendSimpleChat.mockReturnValue(throwError(() => mockError));

    await expect(service.sendMessage(userMessage).toPromise()).rejects.toThrow('Mini AI communication failed');
  });
});