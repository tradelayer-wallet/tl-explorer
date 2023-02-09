import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'headers'
})
export class TableHeadersPipe implements PipeTransform {
  transform(data: any[][]): string[] {
    return  Object.keys((data || [])[0] || {});
  }
}

@Pipe({
  name: 'values'
})
export class TableBodyPipe implements PipeTransform {
  transform(data: any[][]): string[][] {
    return data.map(entry => Object.values(entry));
  }
}
