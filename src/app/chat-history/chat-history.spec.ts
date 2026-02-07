import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatHistory } from './chat-history';
import { ChatMessage } from '../app'; // Import ChatMessage
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'; // Import DomSanitizer for mocking
import { SecurityContext } from '@angular/core';

// Mock the global 'marked' object for tests
declare const marked: any;

// Mock DomSanitizer
class MockDomSanitizer {
  bypassSecurityTrustHtml(value: string): SafeHtml {
    return value as SafeHtml;
  }
  sanitize(context: SecurityContext, value: string): string {
    return value; // In a mock, we can just return the value
  }
}

describe('ChatHistory', () => {
  let component: ChatHistory;
  let fixture: ComponentFixture<ChatHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatHistory],
      providers: [
        { provide: DomSanitizer, useClass: MockDomSanitizer }
      ]
    })
    .compileComponents();

    Object.defineProperty(window, 'marked', {
      value: {
        parse: (content: string) => content, // Mock marked.parse to just return its input
      },
      writable: true,
      configurable: true,
    });

    fixture = TestBed.createComponent(ChatHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filteredMessages should return all messages if displayInChat is true or undefined', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Message 1', displayInChat: true },
      { role: 'assistant', content: 'Message 2', displayInChat: true },
      { role: 'user', content: 'Message 3' }, // displayInChat is undefined
    ];
    component.messages = messages;
    expect(component.filteredMessages.length).toBe(3);
    expect(component.filteredMessages).toEqual(messages);
  });

  it('filteredMessages should exclude messages where displayInChat is false', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Visible Message', displayInChat: true },
      { role: 'assistant', content: 'Hidden Message', displayInChat: false },
      { role: 'user', content: 'Another Visible Message' }, // displayInChat is undefined
      { role: 'system', content: 'Internal System Message', displayInChat: false },
    ];
    component.messages = messages;
    const expectedMessages = [
      { role: 'user', content: 'Visible Message', displayInChat: true },
      { role: 'user', content: 'Another Visible Message' },
    ];
    expect(component.filteredMessages.length).toBe(2);
    expect(component.filteredMessages).toEqual(expectedMessages);
  });

  it('parseMarkdown should return sanitized HTML without processing action tags if action tags are present', () => {
    const markdownContent = 'Hello **world** [status_message: "thinking..."]';
    const parsedHtml = component.parseMarkdown(markdownContent);
    // Expect marked.parse to not be called on content with action tags
    expect(parsedHtml.toString()).toContain('Hello **world** [status_message: "thinking..."]');
    // In this mock setup, sanitization is also mocked to return content as-is
    expect(parsedHtml.toString()).not.toContain('<h1>'); // Example of something markdown would parse
  });

  it('parseMarkdown should return sanitized HTML for regular markdown', () => {
    const markdownContent = '# Heading\n\nHello **world**';
    const parsedHtml = component.parseMarkdown(markdownContent);
    // With mocked 'marked.parse', it just returns the content
    expect(parsedHtml.toString()).toEqual(markdownContent);
  });
});