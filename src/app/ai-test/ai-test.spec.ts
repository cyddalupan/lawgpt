import '../../test-setup'; // Explicitly import the global test setup

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiTestComponent } from './ai-test';
import { AiApiService } from '../ai-api';
import { of, BehaviorSubject } from 'rxjs';
import { CommonModule } from '@angular/common';
import { vi } from 'vitest'; // Import vi for Vitest utilities

// Define the mock object directly
const mockAiApiService = {
  getAiResponse: vi.fn().mockReturnValue(of({
    ai_message: `[status_message: "🧠 Evaluating your request for legal clarity in Philippine Jurisprudence..."]

Hi — I’m LawGPT, your Philippine law study buddy. How can I help you today?

To point you in the right direction, could you tell me:
1. What area of law are you asking about (criminal, civil, constitutional, labor, family, commercial, taxation, etc.)?
2. Is this for class/research or a real-life situation?
3. Any key facts or documents I should know about?

Once you send that, I’ll get started.`
  }))
};

describe('AiTestComponent', () => {
  let component: AiTestComponent;
  let fixture: ComponentFixture<AiTestComponent>;

  let aiApiService: MockAiApiService; // Local variable to hold the injected mock

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiTestComponent, CommonModule],
      providers: [
        { provide: AiApiService, useValue: mockAiApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AiTestComponent);
    component = fixture.componentInstance;
    aiApiService = TestBed.inject(AiApiService) as MockAiApiService; // Assign to local variable

    fixture.detectChanges();
  });

  it('should display the AI message containing the embedded status message', async () => {
    // Trigger the AI call
    component.sendMessageToAi();

    // Check the component's properties
    expect(mockAiApiService.getAiResponse).toHaveBeenCalled(); // Check the mock directly
    expect(component.loading).toBe(false);
    expect(component.error).toBe(null);

    // Check aiResponse$ and statusMessage$ values
    const expectedAiMessage = `[status_message: "🧠 Evaluating your request for legal clarity in Philippine Jurisprudence..."]

Hi — I’m LawGPT, your Philippine law study buddy. How can I help you today?

To point you in the right direction, could you tell me:
1. What area of law are you asking about (criminal, civil, constitutional, labor, family, commercial, taxation, etc.)?
2. Is this for class/research or a real-life situation?
3. Any key facts or documents I should know about?

Once you send that, I’ll get started.`;

    expect(component.aiResponse$.getValue()).toEqual(expectedAiMessage);
    expect(component.statusMessage$.getValue()).toBe(null);

    fixture.detectChanges(); // Trigger change detection to update the view

    // Check the rendered HTML
    const compiled = fixture.nativeElement as HTMLElement;

    const aiResponseElement = compiled.querySelector('.ai-response');
    expect(aiResponseElement).toBeTruthy('Expected an element with class "ai-response" in the template.');
    expect(aiResponseElement?.textContent).toContain('LawGPT');
    expect(aiResponseElement?.textContent).toContain('Philippine law study buddy');
    expect(aiResponseElement?.textContent).toContain('🧠 Evaluating your request');


    const statusMessageElement = compiled.querySelector('.status-message');
    if (statusMessageElement) {
        expect(statusMessageElement.textContent?.trim()).toEqual('');
    }
  });
});
