import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Header } from './header';
import { RouterTestingModule } from '@angular/router/testing';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    // Removed fixture.detectChanges() and fixture.whenStable() from here
  });

  it('should create', () => {
    fixture.detectChanges(); // Call detectChanges here for this test
    expect(component).toBeTruthy();
  });

  it('should display the correct appName', () => {
    const testAppName = 'My Custom App';
    component.appName = testAppName;
    fixture.detectChanges();
    const h1Element: HTMLElement = fixture.nativeElement.querySelector('h1');
    expect(h1Element.textContent).toContain(testAppName);
  });

  it('should apply the correct headerBgClass', () => {
    const testBgClass = 'bg-red-500';
    component.headerBgClass = testBgClass;
    fixture.detectChanges();
    const headerElement: HTMLElement = fixture.nativeElement.querySelector('header');
    expect(headerElement.classList).toContain(testBgClass);
  });

  it('should have a "Professional" navigation link pointing to "/"', () => {
    fixture.detectChanges(); // Call detectChanges here for this test
    const professionalLink = fixture.debugElement.query(By.css('nav a[routerLink="/"]'));
    expect(professionalLink).toBeTruthy();
    expect(professionalLink.nativeElement.textContent).toContain('Professional');
  });

  it('should have a "Fast" navigation link pointing to "/mini"', () => {
    fixture.detectChanges(); // Call detectChanges here for this test
    const fastLink = fixture.debugElement.query(By.css('nav a[routerLink="/mini"]'));
    expect(fastLink).toBeTruthy();
    expect(fastLink.nativeElement.textContent).toContain('Fast');
  });
});


