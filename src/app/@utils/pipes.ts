import { Pipe, PipeTransform } from '@angular/core';

// Absent or empty is a placeholder. Zero and false are values, and a dash for
// them would hide data (a fixed issuance of 0 is not missing).
export const isBlank = (value: unknown): boolean =>
  value === null || value === undefined || value === '';

@Pipe({
  name: 'dash'
})
export class DashPipe implements PipeTransform {
  transform(value: unknown): unknown {
    return isBlank(value) ? '-' : value;
  }
}

@Pipe({
  name: 'headers'
})
export class TableHeadersPipe implements PipeTransform {
  transform(data: any[][]): string[] {
    return  Object.keys((data || [])[0] || {});
  }
}

@Pipe({
  name: 'entries'
})
export class TableBodyPipe implements PipeTransform {
  transform(data: any[][]): string[][][] {
    return data.map(entry => Object.entries(entry));
  }
}
