import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BaseChatComponent } from './base-chat';
import { signal } from '@angular/core';
import { BaseChatService } from './base-chat.service';
import { of, timer } from 'rxjs'; // Import timer
import { map } from 'rxjs/operators'; // Import map
import { By } from '@angular/platform-browser'; // Import By
import { RouterTestingModule } from '@angular/router/testing'; // Import RouterTestingModule
import { Header } from '../shared/header'; // Import Header component

describe('BaseChatComponent', () => {
  let component: BaseChatComponent;
  let fixture: ComponentFixture<BaseChatComponent>;
  let mockBaseChatService: { sendMessage: jest.Mock };

  beforeEach(async () => {
    TestBed.resetTestingModule(); // Explicitly reset the testing module
    mockBaseChatService = {
      // Mock sendMessage to return an observable that emits asynchronously
      sendMessage: vi.fn().mockReturnValue(timer(10).pipe(map(() => 'Mock AI Response'))) // Emit after a small delay
    };

    await TestBed.configureTestingModule({
      imports: [BaseChatComponent, RouterTestingModule, Header], // Add RouterTestingModule and Header
      providers: [
        { provide: BaseChatService, useValue: mockBaseChatService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BaseChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render the HeaderComponent with correct inputs', () => {
    const headerElement = fixture.debugElement.query(By.css('app-header'));
    expect(headerElement).toBeTruthy();

    const h1Element = fixture.nativeElement.querySelector('app-header h1');
    expect(h1Element).toBeTruthy();
    expect(h1Element.textContent).toContain('LawGPT Base');

    const headerContainer = fixture.nativeElement.querySelector('app-header header');
    expect(headerContainer).toBeTruthy();
    expect(headerContainer.classList).toContain('bg-red-600');
  });

  it('should display user message and AI response after handleMessageSent', async () => {
    const testMessage = 'Hello base chat!';
    component.handleMessageSent(testMessage);
    fixture.detectChanges();

    // Check if the loading indicator is shown immediately after sending a message
    // console.log('Current loading state:', component.loading()); // Diagnostic log
    expect(component.loading()).toBe(true);
    expect(component.messages().length).toBe(2); // Initial assistant message + user message

    // Expect sendMessage to have been called on the mock service
    expect(mockBaseChatService.sendMessage).toHaveBeenCalledWith(testMessage);

    // Wait for the asynchronous mock service response to complete
    await new Promise(resolve => setTimeout(resolve, 50)); // Wait longer than the timer(10) delay
    fixture.detectChanges();

    // After the mock service returns, both user message and AI response should be present
    expect(component.messages().length).toBe(3);
    expect(component.messages()[0].content).toBe('Hello! I am LawGPT Base. How can I assist you today?'); // Initial assistant message
    expect(component.messages()[1].content).toBe(testMessage); // User message
    expect(component.messages()[1].role).toBe('user');
    expect(component.messages()[2].content).toBe('Mock AI Response'); // AI response
    expect(component.messages()[2].role).toBe('assistant');
    expect(component.loading()).toBe(false);

    // Check if the messages are rendered in the HTML
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain(testMessage);
    expect(compiled.textContent).toContain('Mock AI Response');
  });

  it('should show typing indicator when loading is true', () => {
    component.loading.set(true);
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).toContain('Typing...');
  });

  it('should hide typing indicator when loading is false', () => {
    component.loading.set(false);
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.textContent).not.toContain('Typing...');
  });
});