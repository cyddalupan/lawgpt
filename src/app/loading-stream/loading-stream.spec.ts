import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingStream } from './loading-stream';
import { DomSanitizer, SecurityContext } from '@angular/platform-browser';
import { CommonModule } from '@angular/common'; // Import CommonModule for ngIf, etc.

// Mock DomSanitizer
class MockDomSanitizer {
  bypassSecurityTrustHtml(value: string): string {
    return value;
  }
  sanitize(context: SecurityContext, value: any): string {
    return value;
  }
}

describe('LoadingStream', () => {
  let component: LoadingStream;
  let fixture: ComponentFixture<LoadingStream>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingStream, CommonModule],
      providers: [
        { provide: DomSanitizer, useClass: MockDomSanitizer },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingStream);
    component = fixture.componentInstance;
    // Do NOT call fixture.detectChanges() here initially to allow inputs to be set first.
  });

  it('should create', () => {
    fixture.detectChanges(); // Detect changes after component is created
    expect(component).toBeTruthy();
  });

  it('should display the statusMessage passed via input', () => {
    const testMessage = '🧠 Evaluating your request...';
    component.statusMessage = testMessage;
    component.inResearchMode = false; // Ensure not in initial loading mode
    fixture.detectChanges(); // Trigger ngOnChanges and update view

    const pElement: HTMLElement = fixture.nativeElement.querySelector('p');
    expect(pElement.innerHTML).toContain(component.getSafeDisplayMessage().toString());
  });



  it('should remove surrounding quotes from statusMessage if present', () => {
    component.statusMessage = '"Message with quotes"';
    component.inResearchMode = false; // Ensure not in initial loading mode
    fixture.detectChanges(); // Initial detectChanges to apply inputs and trigger ngOnChanges

    const pElement: HTMLElement = fixture.nativeElement.querySelector('p');
    expect(pElement.innerHTML).not.toContain('"'); // Still checking for absence of quotes
    expect(pElement.innerHTML).toContain(component.getSafeDisplayMessage().toString());
  });

  it('should update displayMessage correctly via ngOnChanges when statusMessage changes', () => {
    const testMessage = 'Hello World';
    component.statusMessage = testMessage;
    component.inResearchMode = false; // Does not trigger initial message logic

    // Manually trigger ngOnChanges for the initial input change
    component.ngOnChanges({
      statusMessage: {
        currentValue: testMessage,
        previousValue: '',
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(component.displayMessage).toBe(testMessage);

    const newMessage = '"Quoted message"';
    component.statusMessage = newMessage;
    component.inResearchMode = false;

    // Manually trigger ngOnChanges for the subsequent change
    component.ngOnChanges({
      statusMessage: {
        currentValue: newMessage,
        previousValue: testMessage,
        firstChange: false,
        isFirstChange: () => false
      }
    });

    expect(component.displayMessage).toBe('Quoted message'); // Expect quotes to be removed
  });

});