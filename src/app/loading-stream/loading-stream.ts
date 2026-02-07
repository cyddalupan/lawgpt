import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-stream',
  standalone: true, // Needs to be standalone for imports
  imports: [],
  templateUrl: './loading-stream.html',
})
export class LoadingStream {
  @Input() statusMessage: string = '';
}
