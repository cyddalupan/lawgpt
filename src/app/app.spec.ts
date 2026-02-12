import '../test-setup'; // Explicitly import the global test setup

import { TestBed, ComponentFixture } from '@angular/core/testing';
import { App } from './app'; // Only import App
import { Router, RouterOutlet } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { MiniChatComponent } from './mini-chat/mini-chat';
import { BaseChatComponent } from './base-chat/base-chat';
import { MainChatPageComponent } from './main-chat-page/main-chat-page'; // Import MainChatPageComponent
import { Location, APP_BASE_HREF } from '@angular/common';
import { AppModeSelectorComponent } from './app-mode-selector/app-mode-selector';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App, // The standalone App component
        RouterOutlet, // Required by App's template
        AppModeSelectorComponent, // Required by App's template
        RouterTestingModule.withRoutes([
          { path: '', component: MainChatPageComponent }, // Default route
          { path: 'mini', component: MiniChatComponent },
          { path: 'base', component: BaseChatComponent }
        ])
      ],
      providers: [
        { provide: APP_BASE_HREF, useValue: '/' } // Required for routing tests
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initial change detection
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });
});

describe('App Routing', () => {
  let router: Router;
  let fixture: ComponentFixture<App>;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        RouterOutlet, // Required by App's template
        AppModeSelectorComponent, // Required by App's template
        RouterTestingModule.withRoutes([
          { path: '', component: MainChatPageComponent }, // Default route
          { path: 'mini', component: MiniChatComponent },
          { path: 'base', component: BaseChatComponent }
        ])
      ],
      providers: [
        { provide: APP_BASE_HREF, useValue: '/' }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    fixture.detectChanges(); // Initial detectChanges to trigger ngOnInit and router setup
    await router.navigate(['/']); // Explicitly navigate to the root path
    await fixture.whenStable(); // Wait for router to stabilize
  });

  it('should navigate to "/" (MainChatPageComponent) by default', () => {
    expect(location.path()).toBe('/');
    // Check if MainChatPageComponent is rendered (mock its selector if not available)
    const mainChatElement = fixture.nativeElement.querySelector('app-main-chat-page');
    expect(mainChatElement).toBeTruthy();
  });

  it('should navigate to "mini" and display MiniChatComponent', async () => {
    await router.navigate(['/mini']);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(location.path()).toBe('/mini');
    const miniChatElement = fixture.nativeElement.querySelector('app-mini-chat');
    expect(miniChatElement).toBeTruthy();
  });

  it('should navigate to "base" and display BaseChatComponent', async () => {
    await router.navigate(['/base']);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(location.path()).toBe('/base');
    const baseChatElement = fixture.nativeElement.querySelector('app-base-chat');
    expect(baseChatElement).toBeTruthy();
  });
});