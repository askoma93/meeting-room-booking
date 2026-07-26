import { Component, input } from '@angular/core';

@Component({
  selector: 'mrb-area-placeholder',
  template: `
    <div class="placeholder-panel">
      <div class="section-rail" aria-hidden="true">{{ rail() }}</div>
      <div class="empty-copy">
        <span class="empty-mark" aria-hidden="true">{{ mark() }}</span>
        <ng-content />
      </div>
    </div>
  `,
})
export class AreaPlaceholder {
  readonly rail = input.required<string>();
  readonly mark = input.required<string>();
}
