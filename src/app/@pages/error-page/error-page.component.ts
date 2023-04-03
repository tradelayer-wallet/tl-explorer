import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Route } from '@angular/router';

@Component({
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss']
})
export class ErrorPageComponent implements OnInit {
  public message: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.message = this.route.snapshot.queryParams['message'];
  }
}
