import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatHistory } from './chat-history';
import { DomSanitizer, SafeHtml, SecurityContext } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../shared/interfaces/chat-message.interface';
import { Component } from '@angular/core'; // <--- ADDED THIS IMPORT

// Mock the global 'marked' object for testing environment
const mockMarked = {
  parse: (markdown: string) => {
    let html = markdown;
    html = html.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>'); // Headings
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
    html = html.replace(/_(.*?)_/g, '<em>$1</em>'); // Italic
    html = html.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join(''); // Basic paragraphs
    return html;
  }
};
(window as any).marked = mockMarked; // Assign to global window scope for the test

// Helper Test Host Component for binding innerHTML
@Component({
  template: `<div [innerHTML]="htmlContent"></div>`,
  standalone: true,
  imports: [CommonModule]
})
class TestHostComponent {
  htmlContent: SafeHtml = '';
}


describe('ChatHistory', () => {
  let component: ChatHistory;
  let fixture: ComponentFixture<ChatHistory>;
  let sanitizer: DomSanitizer;

  beforeEach(async () => {
    TestBed.resetTestingModule(); // Explicitly reset the testing module
    await TestBed.configureTestingModule({
      imports: [ChatHistory, CommonModule],
      // DomSanitizer is provided by platform-browser, no need to mock it unless specific behavior is needed
    }).compileComponents();

    fixture = TestBed.createComponent(ChatHistory);
    component = fixture.componentInstance;
    sanitizer = TestBed.inject(DomSanitizer);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test Case 1: Sanitizes basic malicious HTML.
  it('should sanitize basic malicious HTML in markdown content', () => {
    const maliciousMessageContent = '<script>alert("XSS")</script>Hello';
    const message: ChatMessage = { role: 'assistant', content: maliciousMessageContent, displayInChat: true };
    const safeHtml = component.parseMarkdown(message);

    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.componentInstance.htmlContent = safeHtml;
    hostFixture.detectChanges();
    const renderedDiv = hostFixture.nativeElement.querySelector('div');

    expect(renderedDiv.textContent).not.toContain('alert("XSS")');
    expect(renderedDiv.textContent).toContain('Hello');
    expect(renderedDiv.querySelector('script')).toBeNull(); // Ensure script tag is removed
  });

  // Test Case 2: Sanitizes attributes with malicious content.
  it('should sanitize malicious attributes in markdown content', () => {
    const maliciousMessageContent = '<img src="x" onerror="alert(1)">';
    const message: ChatMessage = { role: 'assistant', content: maliciousMessageContent, displayInChat: true };
    const safeHtml = component.parseMarkdown(message);

    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.componentInstance.htmlContent = safeHtml;
    hostFixture.detectChanges();
    const renderedImg = hostFixture.nativeElement.querySelector('img');

    expect(renderedImg).toBeDefined();
    expect(renderedImg?.hasAttribute('onerror')).toBeFalsy();
    expect(renderedImg?.getAttribute('src')).not.toContain('alert'); // Ensure onerror content is not in src
  });

  // Test Case 3: Allows safe HTML tags and attributes.
  it('should allow safe HTML tags and attributes in markdown content', () => {
    const safeMessageContent = '<b>Hello</b> <a href="http://safe.com">Safe Link</a>';
    const message: ChatMessage = { role: 'assistant', content: safeMessageContent, displayInChat: true };
    const safeHtml = component.parseMarkdown(message);

    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.componentInstance.htmlContent = safeHtml;
    hostFixture.detectChanges();
    const renderedDiv = hostFixture.nativeElement.querySelector('div');

    expect(renderedDiv.querySelector('b')).toBeDefined();
    expect(renderedDiv.querySelector('b')?.textContent).toContain('Hello');
    expect(renderedDiv.querySelector('a')).toBeDefined();
    expect(renderedDiv.querySelector('a')?.getAttribute('href')).toContain('http://safe.com');
  });

  // Test Case 4: Correctly renders final HTML output (isFinalHtml = true).
  it('should render final HTML content directly without markdown processing', () => {
    const finalHtmlContent = '<div class="prose"><h1>Final Output</h1><p>This is <strong>HTML</strong>.</p></div>';
    const message: ChatMessage = { role: 'assistant', content: finalHtmlContent, displayInChat: true, isFinalHtml: true };
    const safeHtml = component.parseMarkdown(message);

    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.componentInstance.htmlContent = safeHtml;
    hostFixture.detectChanges();
    const renderedDiv = hostFixture.nativeElement.querySelector('div');

    expect(renderedDiv.querySelector('h1')?.textContent).toContain('Final Output');
    expect(renderedDiv.querySelector('strong')?.textContent).toContain('HTML');
    expect(renderedDiv.innerHTML).not.toContain('**HTML**'); // Ensure it's not markdown
  });

  // Test Case 5: Correctly renders markdown (isFinalHtml = false).
  it('should render markdown content with markdown processing', () => {
    const markdownContent = '## Markdown Heading\n**Bold** _Italic_';
    const message: ChatMessage = { role: 'assistant', content: markdownContent, displayInChat: true, isFinalHtml: false };
    const safeHtml = component.parseMarkdown(message);

    const hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.componentInstance.htmlContent = safeHtml;
    hostFixture.detectChanges();
    const renderedDiv = hostFixture.nativeElement.querySelector('div');

    expect(renderedDiv.querySelector('h2')).toBeDefined();
    expect(renderedDiv.querySelector('h2')?.textContent).toContain('Markdown Heading');
    expect(renderedDiv.querySelector('strong')).toBeDefined();
    expect(renderedDiv.querySelector('em')).toBeDefined();
  });


  // Test Case 6: filteredMessages should be empty when inResearchMode is true
  it('should return empty filteredMessages when inResearchMode is true', () => {
    component.inResearchMode = true;
    component.messages = [{ role: 'user', content: 'test', displayInChat: true }];
    expect(component.filteredMessages.length).toBe(0);
  });

  // Test Case 7: filteredMessages should contain displayable messages when inResearchMode is false
  it('should return displayable messages when inResearchMode is false', () => {
    component.inResearchMode = false;
    component.messages = [
      { role: 'user', content: 'test1', displayInChat: true },
      { role: 'assistant', content: 'test2', displayInChat: false } // Should be filtered out
    ];
    expect(component.filteredMessages.length).toBe(1);
    expect(component.filteredMessages[0].content).toBe('test1');
  });

  // Tests for rendering with ChatMessage in messages array
  it('should display a regular chat message', async () => {
    component.messages = [{ role: 'user', content: 'Hello from user', displayInChat: true }];
    fixture.detectChanges();
    await fixture.whenStable();

    const userMessageElement = fixture.nativeElement.querySelector('.justify-end .p-3 p');
    expect(userMessageElement).toBeTruthy();
    expect(userMessageElement.textContent).toContain('Hello from user');
  });

  it('should display an assistant chat message with markdown parsing', async () => {
    component.messages = [{ role: 'assistant', content: '## Hello from **LawGPT**', displayInChat: true }];
    fixture.detectChanges();
    await fixture.whenStable();

    const assistantMessageElement = fixture.nativeElement.querySelector('.justify-start .p-3');
    expect(assistantMessageElement).toBeTruthy();
    expect(assistantMessageElement.querySelector('h2')?.textContent).toContain('Hello from LawGPT');
    expect(assistantMessageElement.querySelector('strong')?.textContent).toContain('LawGPT');
  });

  it('should display final HTML output message when isFinalHtml is true', async () => {
    const finalHtml = `<div class="prose"><h1>Research Brief</h1><p>This is a detailed brief.</p></div>`;
    component.messages = [{ role: 'assistant', content: finalHtml, displayInChat: true, isFinalHtml: true }];
    fixture.detectChanges();
    await fixture.whenStable();

    const finalHtmlElement = fixture.nativeElement.querySelector('.justify-start .p-3');
    expect(finalHtmlElement).toBeTruthy();
    expect(finalHtmlElement.querySelector('h1')?.textContent).toContain('Research Brief');
    expect(finalHtmlElement.querySelector('p')?.textContent).toContain('This is a detailed brief.');
    expect(finalHtmlElement.innerHTML).toContain('<h1>Research Brief</h1>'); // Check raw HTML too
  });

  it('should apply Philippine Case Card styling via HTML structure when isFinalHtml is true', async () => {
    const caseCardHtml = `
      <div class="my-4 p-4 bg-slate-50 border-l-4 border-blue-700 rounded-r-md shadow-sm">
        <p class="font-bold text-slate-900">G.R. No. 123456</p>
        <p class="italic text-slate-700">Petitioner v. Respondent</p>
        <p class="text-sm text-slate-600">Date | Division/En Banc</p>
        <hr class="my-2">
        <p class="text-slate-800 text-sm">Short Syllabus/Holding...</p>
      </div>
    `;
    component.messages = [{ role: 'assistant', content: caseCardHtml, displayInChat: true, isFinalHtml: true }];
    fixture.detectChanges();
    await fixture.whenStable();

    const cardDiv = fixture.nativeElement.querySelector('.bg-slate-50');
    expect(cardDiv).not.toBeNull();
    expect(cardDiv.classList).toContain('my-4');
    expect(cardDiv.classList).toContain('p-4');
    expect(cardDiv.classList).toContain('border-l-4');
    expect(cardDiv.classList).toContain('border-blue-700');

    expect(cardDiv.querySelector('p.font-bold')).not.toBeNull();
    expect(cardDiv.querySelector('p.font-bold')?.textContent).toContain('G.R. No. 123456');
  });

  it('should not introduce conflicting font styles in the rendered HTML structure when isFinalHtml is true', async () => {
    const htmlWithText = `<p>Some text</p>`;
    component.messages = [{ role: 'assistant', content: htmlWithText, displayInChat: true, isFinalHtml: true }];
    fixture.detectChanges();
    await fixture.whenStable();

    const pElement = fixture.nativeElement.querySelector('p');
    expect(pElement).not.toBeNull();
    expect(pElement.style.fontFamily).toBe('');
  });
});
