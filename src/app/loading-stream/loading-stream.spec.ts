import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingStream } from './loading-stream';

describe('LoadingStream', () => {
  let component: LoadingStream;
  let fixture: ComponentFixture<LoadingStream>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingStream]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadingStream);
    component = fixture.componentInstance;
    // await fixture.whenStable(); // Removed to prevent ExpressionChangedAfterItHasBeenCheckedError
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the statusMessage when input is provided', () => {
    const testMessage = 'Loading data...';
    component.statusMessage = testMessage;
    fixture.detectChanges(); // Trigger change detection for input binding
    const pElement = fixture.nativeElement.querySelector('p');
    expect(pElement?.textContent).toContain(testMessage);
  });

  it('should display an empty string in the paragraph element when statusMessage is empty', () => {
    component.statusMessage = '';
    fixture.detectChanges(); // Trigger change detection
    const pElement = fixture.nativeElement.querySelector('p');
    // We expect the <p> tag itself to be empty or contain only whitespace from rendering {{ '' }}
    expect(pElement?.textContent?.trim()).toBe(''); 
  });
});