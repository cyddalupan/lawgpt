import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MiniChatComponent } from './mini-chat';
import { signal } from '@angular/core';
import { MiniChatService } from './mini-chat.service';
import { of, timer } from 'rxjs'; // Import timer
import { map } from 'rxjs/operators'; // Import map

describe('MiniChatComponent', () => {
  let component: MiniChatComponent;
  let fixture: ComponentFixture<MiniChatComponent>;
  let mockMiniChatService: { sendMessage: jest.Mock };

  beforeEach(async () => {
    mockMiniChatService = {
      // Mock sendMessage to return an observable that emits asynchronously
      sendMessage: vi.fn().mockReturnValue(timer(10).pipe(map(() => 'Mock AI Response'))) // Emit after a small delay
    };

    await TestBed.configureTestingModule({
      imports: [MiniChatComponent],
      providers: [
        { provide: MiniChatService, useValue: mockMiniChatService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MiniChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display user message and AI response after handleMessageSent', async () => {
    const testMessage = 'Hello mini chat!';
    component.handleMessageSent(testMessage);
    fixture.detectChanges();

    // Check if the loading indicator is shown immediately after sending a message
    // console.log('Current loading state:', component.loading()); // Diagnostic log
    expect(component.loading()).toBe(true);
    expect(component.messages().length).toBe(1); // Only user message should be present initially

    // Expect sendMessage to have been called on the mock service
    expect(mockMiniChatService.sendMessage).toHaveBeenCalledWith(testMessage, [{ role: 'user', content: testMessage }]);

    // Wait for the asynchronous mock service response to complete
    await new Promise(resolve => setTimeout(resolve, 50)); // Wait longer than the timer(10) delay
    fixture.detectChanges();

    // After the mock service returns, both user message and AI response should be present
    expect(component.messages().length).toBe(2);
    expect(component.messages()[0].content).toBe(testMessage);
    expect(component.messages()[0].role).toBe('user');
    expect(component.messages()[1].content).toBe('Mock AI Response');
    expect(component.messages()[1].role).toBe('assistant');
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
