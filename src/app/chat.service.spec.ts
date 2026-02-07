import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { ChatService } from './chat.service';
import { of } from 'rxjs'; // Import 'of' for observable
import { vi } from 'vitest'; // Import vi from vitest for mocking

// Manual Mock for HttpClient
class MockHttpClient {
  post = vi.fn((url: string, body: any, options?: any) => of({ ai_message: 'Mock AI response' }));
}

describe('ChatService', () => {
  let service: ChatService;
  let mockHttpClient: MockHttpClient; // Use the mock

  beforeEach(() => {
    TestBed.resetTestingModule(); // Reset TestBed before each test
    TestBed.configureTestingModule({
      providers: [
        ChatService,
        { provide: HttpClient, useClass: MockHttpClient } // Provide the mock HttpClient
      ],
    });
    service = TestBed.inject(ChatService);
    mockHttpClient = TestBed.inject(HttpClient) as unknown as MockHttpClient; // Inject the mock
  });

  afterEach(() => {
    // No httpTestingController.verify() needed for manual mock
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('sendMessage should make a POST request to the correct URL', () => {
    const testMessages = [{ role: 'user', content: 'Hello' }];
    const mockResponse = { ai_message: 'Mock AI response' }; // This is controlled by MockHttpClient

    service.sendMessage(testMessages).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    // Assert against the mockHttpClient.post spy
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      'https://wisdomvault.welfareph.com/ai_api/',
      { messages: testMessages },
      expect.any(Object) // Check that options object is passed (headers)
    );
  });

  it('parseActionTags should correctly parse [key: "value"] tags', () => {
    const text = 'Some message [status_message: "Loading..."] more text.';
    const tags = service.parseActionTags(text);
    expect(tags).toEqual({ status_message: 'Loading...' });
  });

  it('parseActionTags should correctly parse [key: \'value\'] tags with single quotes', () => {
    const text = 'Some message [intake_status: \'done\'] more text.';
    const tags = service.parseActionTags(text);
    expect(tags).toEqual({ intake_status: 'done' });
  });

  it('parseActionTags should correctly parse [key: value] tags without quotes', () => {
    const text = 'Some message [intake_status: done] more text.';
    const tags = service.parseActionTags(text);
    expect(tags).toEqual({ intake_status: 'done' }); // Still parses as string 'done'
  });

  it('parseActionTags should correctly parse [key: ["val1", "val2"]] array tags', () => {
    const text = 'Tasks: [tasks: ["Task A", "Task B"]] complete.';
    const tags = service.parseActionTags(text);
    expect(tags).toEqual({ tasks: ['Task A', 'Task B'] });
  });

  it('parseActionTags should handle multiple tags', () => {
    const text = '[status_message: "Starting..."] [intake_status: "done"]';
    const tags = service.parseActionTags(text);
    expect(tags).toEqual({ status_message: 'Starting...', intake_status: 'done' });
  });

  it('parseActionTags should return empty object if no tags are found', () => {
    const text = 'No tags in this message.';
    const tags = service.parseActionTags(text);
    expect(tags).toEqual({});
  });

  it('addMessageToHistory should add a message to chat history', () => {
    const message = { role: 'user', content: 'Test message' };
    service.addMessageToHistory(message);
    expect(service.getChatHistory()).toEqual([message]);
  });

  it('getChatHistory should return the current chat history', () => {
    const message1 = { role: 'user', content: 'Message 1' };
    const message2 = { role: 'assistant', content: 'Response 1' };
    service.addMessageToHistory(message1);
    service.addMessageToHistory(message2);
    expect(service.getChatHistory()).toEqual([message1, message2]);
  });

  it('parseActionTags should correctly parse JSON-like string values', () => {
    const text = '[data: {"name": "test", "value": 123}]';
    const tags = service.parseActionTags(text);
    expect(tags).toEqual({ data: { name: 'test', value: 123 } }); // Expect actual parsed object
  });
});