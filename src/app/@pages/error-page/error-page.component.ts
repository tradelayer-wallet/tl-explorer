import { Component, OnInit } from '@angular/core';

const DEFAULT_MESSAGE = 'An unexpected error occurred.';

@Component({
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss']
})
export class ErrorPageComponent implements OnInit {
  public message: string = DEFAULT_MESSAGE;

  ngOnInit(): void {
    // Only navigation state set by the app is shown. Text in the URL (query
    // parameters) is ignored, so a crafted link cannot make this page say anything.
    const state = typeof history !== 'undefined' ? history.state : null;
    const message = state && typeof state.message === 'string' ? state.message.slice(0, 300) : '';
    this.message = message || DEFAULT_MESSAGE;
  }
}
