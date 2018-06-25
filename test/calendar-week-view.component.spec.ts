import {
  inject,
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush
} from '@angular/core/testing';
import moment from 'moment';
import { expect } from 'chai';
import {
  CalendarEventTitleFormatter,
  CalendarEvent,
  CalendarMomentDateFormatter,
  CalendarDateFormatter,
  CalendarModule,
  MOMENT,
  CalendarEventTimesChangedEvent,
  DAYS_OF_WEEK,
  CalendarWeekViewComponent,
  DateAdapter
} from '../src';
import { DragAndDropModule } from 'angular-draggable-droppable';
import { Subject } from 'rxjs';
import * as sinon from 'sinon';
import { triggerDomEvent, ExternalEventComponent } from './util';
import { take } from 'rxjs/operators';
import { adapterFactory } from '../src/date-adapters/date-fns';

describe('calendarWeekView component', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        CalendarModule.forRoot(
          {
            provide: DateAdapter,
            useFactory: adapterFactory
          },
          {
            dateFormatter: {
              provide: CalendarDateFormatter,
              useClass: CalendarMomentDateFormatter
            }
          }
        ),
        DragAndDropModule
      ],
      declarations: [ExternalEventComponent],
      providers: [{ provide: MOMENT, useValue: moment }]
    });
  });

  let eventTitle: CalendarEventTitleFormatter;
  beforeEach(inject([CalendarEventTitleFormatter], _eventTitle_ => {
    eventTitle = _eventTitle_;
  }));

  it('should generate the week view', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-29');
    fixture.componentInstance.ngOnChanges({ viewDate: {} });
    expect(fixture.componentInstance.days.length).to.equal(7);
    expect(fixture.componentInstance.days[0].date).to.deep.equal(
      moment('2016-06-26').toDate()
    );
  });

  it('should generate the week view without excluded days', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-29');
    fixture.componentInstance.excludeDays = [0, 6];
    fixture.componentInstance.ngOnChanges({ viewDate: {} });
    expect(fixture.componentInstance.days.length).to.equal(5);
    fixture.destroy();
  });

  it('should update the week view when excluded days changed', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-29');
    fixture.componentInstance.excludeDays = [0, 6];
    fixture.componentInstance.ngOnChanges({ excludeDays: {} });
    expect(fixture.componentInstance.days.length).to.equal(5);
    expect(fixture.nativeElement.querySelector('.cal-weekend')).to.equal(null);

    fixture.componentInstance.excludeDays = [1];
    fixture.componentInstance.ngOnChanges({ excludeDays: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.days.length).to.equal(6);
    expect(fixture.nativeElement.querySelector('.cal-weekend')).not.to.equal(
      null
    );

    fixture.destroy();
  });

  it('should generate the week view with default colors for events', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.ngOnInit();
    fixture.componentInstance.viewDate = new Date('2016-06-01');
    fixture.componentInstance.events = [
      {
        start: new Date('2016-05-30'),
        end: new Date('2016-06-02'),
        title: 'foo'
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();

    const computedStyles: CSSStyleDeclaration = window.getComputedStyle(
      fixture.nativeElement.querySelector('.cal-event')
    );
    expect(computedStyles.getPropertyValue('background-color')).to.equal(
      'rgb(209, 232, 255)'
    );
    expect(computedStyles.getPropertyValue('border-color')).to.equal(
      'rgb(30, 144, 255)'
    );
    expect(computedStyles.getPropertyValue('color')).to.equal(
      'rgb(30, 144, 255)'
    );
    fixture.destroy();
  });

  it('should emit on the dayHeaderClicked output', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-29');
    fixture.componentInstance.ngOnChanges({ viewDate: {} });
    fixture.detectChanges();
    fixture.componentInstance.dayHeaderClicked.subscribe(val => {
      expect(val).to.deep.equal({
        day: fixture.componentInstance.days[0]
      });
    });
    fixture.nativeElement.querySelector('.cal-header').click();
  });

  it('should add a custom CSS class to events', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-01');
    fixture.componentInstance.events = [
      {
        start: new Date('2016-05-30'),
        end: new Date('2016-06-02'),
        cssClass: 'foo',
        title: 'foo',
        color: {
          primary: 'blue',
          secondary: ''
        }
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelector('.cal-event-container')
        .classList.contains('foo')
    ).to.equal(true);
    fixture.destroy();
  });

  it('should call the event clicked callback', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-01');
    fixture.componentInstance.events = [
      {
        start: new Date('2016-05-30'),
        end: new Date('2016-06-02'),
        title: '<span>foo</span>',
        color: {
          primary: 'blue',
          secondary: ''
        }
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    const title: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-title'
    );
    expect(title.innerHTML).to.equal('<span>foo</span>');
    fixture.componentInstance.eventClicked.subscribe(val => {
      expect(val).to.deep.equal({ event: fixture.componentInstance.events[0] });
    });
    title.click();
  });

  it('should refresh the view when the refresh observable is emitted on', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.refresh = new Subject();
    fixture.componentInstance.ngOnInit();
    fixture.componentInstance.viewDate = new Date('2016-06-01');
    fixture.componentInstance.ngOnChanges({ viewDate: {} });
    const event: CalendarEvent = {
      start: new Date('2016-06-01'),
      end: new Date('2016-06-02'),
      title: 'foo',
      color: {
        primary: 'blue',
        secondary: 'lightblue'
      }
    };
    fixture.componentInstance.events.push(event);
    fixture.componentInstance.refresh.next(true);
    expect(
      fixture.componentInstance.view.eventRows[0].row[0].event
    ).to.deep.equal(event);
    fixture.destroy();
  });

  it('should allow the event title to be customised by the calendarConfig provider', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    eventTitle.week = (event: CalendarEvent) => {
      return `foo ${event.title}`;
    };
    fixture.componentInstance.viewDate = new Date('2016-06-01');
    fixture.componentInstance.events = [
      {
        start: new Date('2016-05-30'),
        end: new Date('2016-06-02'),
        title: 'bar',
        color: {
          primary: 'blue',
          secondary: ''
        }
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    const title: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-title'
    );
    expect(title.innerHTML).to.equal('foo bar');
  });

  it('should allow the locale to be changed', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.locale = 'de';
    fixture.componentInstance.viewDate = new Date();
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.cal-header b').innerHTML.trim()
    ).to.equal('Sonntag');
  });

  it(
    'should show a tooltip on mouseover of the event',
    fakeAsync(() => {
      const fixture: ComponentFixture<
        CalendarWeekViewComponent
      > = TestBed.createComponent(CalendarWeekViewComponent);
      eventTitle.weekTooltip = (e: CalendarEvent) => {
        return `title: ${e.title}`;
      };
      fixture.componentInstance.viewDate = new Date('2016-06-01');
      fixture.componentInstance.events = [
        {
          start: new Date('2016-05-30'),
          end: new Date('2016-06-02'),
          title: 'foo <b>bar</b>',
          color: {
            primary: 'blue',
            secondary: ''
          }
        }
      ];
      fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
      fixture.detectChanges();
      const event: HTMLElement = fixture.nativeElement.querySelector(
        '.cal-event'
      );
      triggerDomEvent('mouseenter', event);
      fixture.detectChanges();
      flush();
      const tooltip: HTMLElement = document.body.querySelector(
        '.cal-tooltip'
      ) as HTMLElement;
      expect(tooltip.querySelector('.cal-tooltip-inner').innerHTML).to.equal(
        'title: foo <b>bar</b>'
      );
      expect(tooltip.classList.contains('cal-tooltip-top')).to.equal(true);
      expect(!!tooltip.style.top).to.equal(true);
      expect(!!tooltip.style.left).to.equal(true);
      triggerDomEvent('mouseleave', event);
      fixture.detectChanges();
      expect(!!document.body.querySelector('.cal-tooltip')).to.equal(false);
    })
  );

  it(
    'should disable the tooltip',
    fakeAsync(() => {
      const fixture: ComponentFixture<
        CalendarWeekViewComponent
      > = TestBed.createComponent(CalendarWeekViewComponent);
      eventTitle.weekTooltip = () => '';
      fixture.componentInstance.viewDate = new Date('2016-06-01');
      fixture.componentInstance.events = [
        {
          start: new Date('2016-05-30'),
          end: new Date('2016-06-02'),
          title: 'foo <b>bar</b>',
          color: {
            primary: 'blue',
            secondary: ''
          }
        }
      ];
      fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
      fixture.detectChanges();
      const event: HTMLElement = fixture.nativeElement.querySelector(
        '.cal-event'
      );
      triggerDomEvent('mouseenter', event);
      fixture.detectChanges();
      flush();
      expect(!!document.body.querySelector('.cal-tooltip')).to.equal(false);
    })
  );

  it('should allow the start of the week to be changed', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.weekStartsOn = 1;
    fixture.componentInstance.ngOnChanges({ viewDate: {} });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.cal-day-headers b').innerText
    ).to.deep.equal('Monday');
    fixture.destroy();
  });

  it('should resize the event by dragging from the left edge', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.events = [
      {
        title: 'foo',
        color: { primary: '', secondary: '' },
        start: moment('2016-06-27')
          .add(4, 'hours')
          .toDate(),
        end: moment('2016-06-27')
          .add(6, 'hours')
          .toDate(),
        resizable: {
          beforeStart: true
        }
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const event: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-container'
    );
    const dayWidth: number = event.parentElement.offsetWidth / 7;
    const rect: ClientRect = event.getBoundingClientRect();
    let resizeEvent: CalendarEventTimesChangedEvent;
    fixture.componentInstance.eventTimesChanged.subscribe(e => {
      resizeEvent = e;
    });
    triggerDomEvent('mousedown', document.body, {
      clientX: rect.left,
      clientY: rect.top
    });
    fixture.detectChanges();
    triggerDomEvent('mousemove', document.body, {
      clientX: rect.left - dayWidth,
      clientY: rect.top
    });
    fixture.detectChanges();
    expect(Math.round(event.getBoundingClientRect().left)).to.equal(
      Math.round(rect.left - dayWidth)
    );
    expect(Math.round(event.getBoundingClientRect().width)).to.equal(
      Math.round(rect.width + dayWidth)
    );
    triggerDomEvent('mouseup', document.body, {
      clientX: rect.left - dayWidth,
      clientY: rect.top
    });
    fixture.detectChanges();
    fixture.destroy();
    expect(resizeEvent).to.deep.equal({
      event: fixture.componentInstance.events[0],
      newStart: moment('2016-06-27')
        .add(4, 'hours')
        .subtract(1, 'day')
        .toDate(),
      newEnd: moment('2016-06-27')
        .add(6, 'hours')
        .toDate()
    });
  });

  it('should resize the event by dragging from the right edge', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.events = [
      {
        title: 'foo',
        color: { primary: '', secondary: '' },
        start: moment('2016-06-27')
          .add(4, 'hours')
          .toDate(),
        end: moment('2016-06-27')
          .add(6, 'hours')
          .toDate(),
        resizable: {
          afterEnd: true
        }
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const event: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-container'
    );
    const dayWidth: number = event.parentElement.offsetWidth / 7;
    const rect: ClientRect = event.getBoundingClientRect();
    let resizeEvent: CalendarEventTimesChangedEvent;
    fixture.componentInstance.eventTimesChanged.subscribe(e => {
      resizeEvent = e;
    });
    triggerDomEvent('mousedown', document.body, {
      clientX: rect.right,
      clientY: rect.top
    });
    fixture.detectChanges();
    triggerDomEvent('mousemove', document.body, {
      clientX: rect.right + dayWidth,
      clientY: rect.top
    });
    fixture.detectChanges();
    expect(Math.round(event.getBoundingClientRect().left)).to.equal(
      Math.round(rect.left)
    );
    expect(Math.round(event.getBoundingClientRect().width)).to.equal(
      Math.round(rect.width + dayWidth)
    );
    triggerDomEvent('mouseup', document.body, {
      clientX: rect.right + dayWidth,
      clientY: rect.top
    });
    fixture.detectChanges();
    fixture.destroy();
    expect(resizeEvent).to.deep.equal({
      event: fixture.componentInstance.events[0],
      newStart: moment('2016-06-27')
        .add(4, 'hours')
        .toDate(),
      newEnd: moment('2016-06-27')
        .add(6, 'hours')
        .add(1, 'day')
        .toDate()
    });
  });

  it('should resize events with no end date', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.events = [
      {
        title: 'foo',
        color: { primary: '', secondary: '' },
        start: moment('2016-06-27')
          .add(4, 'hours')
          .toDate(),
        resizable: {
          afterEnd: true
        }
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const event: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-container'
    );
    const dayWidth: number = event.parentElement.offsetWidth / 7;
    const rect: ClientRect = event.getBoundingClientRect();
    let resizeEvent: CalendarEventTimesChangedEvent;
    fixture.componentInstance.eventTimesChanged.subscribe(e => {
      resizeEvent = e;
    });
    triggerDomEvent('mousedown', document.body, {
      clientX: rect.right,
      clientY: rect.top
    });
    fixture.detectChanges();
    triggerDomEvent('mousemove', document.body, {
      clientX: rect.right + dayWidth,
      clientY: rect.top
    });
    fixture.detectChanges();
    expect(Math.round(event.getBoundingClientRect().left)).to.equal(
      Math.round(rect.left)
    );
    expect(Math.round(event.getBoundingClientRect().width)).to.equal(
      Math.round(rect.width + dayWidth)
    );
    triggerDomEvent('mouseup', document.body, {
      clientX: rect.right + dayWidth,
      clientY: rect.top
    });
    fixture.detectChanges();
    fixture.destroy();
    expect(resizeEvent).to.deep.equal({
      event: fixture.componentInstance.events[0],
      newStart: moment('2016-06-27')
        .add(4, 'hours')
        .toDate(),
      newEnd: moment('2016-06-27')
        .add(4, 'hours')
        .add(1, 'day')
        .toDate()
    });
  });

  it('should allow 2 events next to each other to be resized at the same time', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.events = [
      {
        title: 'event 1',
        color: { primary: '', secondary: '' },
        start: moment('2016-06-27')
          .add(4, 'hours')
          .toDate(),
        end: moment('2016-06-27')
          .add(6, 'hours')
          .toDate(),
        resizable: {
          beforeStart: true,
          afterEnd: true
        }
      },
      {
        title: 'event 2',
        color: { primary: '', secondary: '' },
        start: moment('2016-06-28')
          .add(4, 'hours')
          .toDate(),
        end: moment('2016-06-29')
          .add(6, 'hours')
          .toDate(),
        resizable: {
          beforeStart: true,
          afterEnd: true
        }
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const event1: HTMLElement = fixture.nativeElement.querySelectorAll(
      '.cal-event-container'
    )[0];
    const event2: HTMLElement = fixture.nativeElement.querySelectorAll(
      '.cal-event-container'
    )[1];
    const dayWidth: number = event1.parentElement.offsetWidth / 7;
    const event1Rect: ClientRect = event1.getBoundingClientRect();
    const event2Rect: ClientRect = event2.getBoundingClientRect();
    const resizeEvents: CalendarEventTimesChangedEvent[] = [];
    fixture.componentInstance.eventTimesChanged.subscribe(event => {
      resizeEvents.push(event);
    });
    triggerDomEvent('mousedown', document.body, {
      clientX: event1Rect.right,
      clientY: event1Rect.top
    });
    fixture.detectChanges();
    triggerDomEvent('mousemove', document.body, {
      clientX: event1Rect.right + dayWidth,
      clientY: event1Rect.top
    });
    fixture.detectChanges();
    expect(Math.round(event1.getBoundingClientRect().left)).to.equal(
      Math.round(event1Rect.left)
    );
    expect(Math.round(event1.getBoundingClientRect().width)).to.equal(
      Math.round(event1Rect.width + dayWidth)
    );
    expect(Math.round(event2.getBoundingClientRect().left)).to.equal(
      Math.round(event2Rect.left + dayWidth)
    );
    expect(Math.round(event2.getBoundingClientRect().width)).to.equal(
      Math.round(event2Rect.width - dayWidth)
    );
    triggerDomEvent('mouseup', document.body, {
      clientX: event1Rect.right + dayWidth,
      clientY: event1Rect.top
    });
    fixture.detectChanges();
    fixture.destroy();
    expect(resizeEvents[0]).to.deep.equal({
      event: fixture.componentInstance.events[0],
      newStart: moment('2016-06-27')
        .add(4, 'hours')
        .toDate(),
      newEnd: moment('2016-06-27')
        .add(6, 'hours')
        .add(1, 'day')
        .toDate()
    });
    expect(resizeEvents[1]).to.deep.equal({
      event: fixture.componentInstance.events[1],
      newStart: moment('2016-06-28')
        .add(1, 'day')
        .add(4, 'hours')
        .toDate(),
      newEnd: moment('2016-06-29')
        .add(6, 'hours')
        .toDate()
    });
  });

  it('should allow the event to be dragged and dropped', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-12-08');
    fixture.componentInstance.events = [
      {
        title: 'foo',
        color: { primary: '', secondary: '' },
        start: moment('2016-12-08')
          .add(4, 'hours')
          .toDate(),
        end: moment('2016-12-08')
          .add(6, 'hours')
          .toDate(),
        draggable: true
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    // remove the header as it was causing the test to fail
    const header: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-day-headers'
    );
    header.parentNode.removeChild(header);
    const event: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-container'
    );
    const dayWidth: number = event.parentElement.offsetWidth / 7;
    const eventPosition: ClientRect = event.getBoundingClientRect();
    const eventDropped = sinon.spy();
    fixture.componentInstance.eventTimesChanged.subscribe(eventDropped);
    triggerDomEvent('mousedown', event, {
      clientX: eventPosition.left,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    triggerDomEvent('mousemove', document.body, {
      clientX: eventPosition.left - 100,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    const ghostElement = event.nextSibling as HTMLElement;
    expect(Math.round(ghostElement.getBoundingClientRect().left)).to.equal(
      Math.round(eventPosition.left - dayWidth)
    );
    triggerDomEvent('mouseup', document.body, {
      clientX: eventPosition.left - dayWidth,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    fixture.destroy();
    expect(eventDropped.getCall(0).args[0]).to.deep.equal({
      event: fixture.componentInstance.events[0],
      newStart: moment('2016-12-07')
        .add(4, 'hours')
        .toDate(),
      newEnd: moment('2016-12-07')
        .add(6, 'hours')
        .toDate()
    });
    expect(eventDropped).to.have.been.calledOnce;
  });

  it('should allow events to be dragged outside of the calendar', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-12-08');
    fixture.componentInstance.events = [
      {
        title: 'foo',
        color: { primary: '', secondary: '' },
        start: moment('2016-12-08')
          .add(4, 'hours')
          .toDate(),
        end: moment('2016-12-08')
          .add(6, 'hours')
          .toDate(),
        draggable: true
      }
    ];
    fixture.componentInstance.snapDraggedEvents = false;
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    // remove the header as it was causing the test to fail
    const header: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-day-headers'
    );
    header.parentNode.removeChild(header);
    const event: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-container'
    );
    const eventPosition: ClientRect = event.getBoundingClientRect();
    const calendarPosition: ClientRect = fixture.nativeElement.getBoundingClientRect();
    const eventDropped = sinon.spy();
    fixture.componentInstance.eventTimesChanged.subscribe(eventDropped);
    triggerDomEvent('mousedown', event, {
      clientX: eventPosition.left,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    triggerDomEvent('mousemove', document.body, {
      clientX: eventPosition.left - 50,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    const ghostElement = event.nextSibling as HTMLElement;
    expect(Math.round(ghostElement.getBoundingClientRect().left)).to.equal(
      Math.round(eventPosition.left - 50)
    );
    triggerDomEvent('mousemove', document.body, {
      clientX: calendarPosition.left - 50,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    triggerDomEvent('mouseup', document.body, {
      clientX: calendarPosition.left - 50,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    fixture.destroy();
    expect(eventDropped).not.to.have.been.called;
  });

  it('should round event drag sizes to the event snap size when dragging and dropping non snapped events', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-12-08');
    fixture.componentInstance.events = [
      {
        title: 'foo',
        color: { primary: '', secondary: '' },
        start: moment('2016-12-08')
          .add(4, 'hours')
          .toDate(),
        end: moment('2016-12-08')
          .add(6, 'hours')
          .toDate(),
        draggable: true
      }
    ];
    fixture.componentInstance.snapDraggedEvents = false;
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    // remove the header as it was causing the test to fail
    const header: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-day-headers'
    );
    header.parentNode.removeChild(header);
    const event: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-container'
    );
    const eventPosition: ClientRect = event.getBoundingClientRect();
    const eventDropped = sinon.spy();
    fixture.componentInstance.eventTimesChanged.subscribe(eventDropped);
    triggerDomEvent('mousedown', event, {
      clientX: eventPosition.left,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    const dragLeft = event.parentElement.offsetWidth / 7 + 50;
    triggerDomEvent('mousemove', document.body, {
      clientX: eventPosition.left - dragLeft,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    triggerDomEvent('mouseup', document.body, {
      clientX: eventPosition.left - dragLeft,
      clientY: eventPosition.top
    });
    fixture.detectChanges();
    fixture.destroy();
    expect(eventDropped.getCall(0).args[0]).to.deep.equal({
      event: fixture.componentInstance.events[0],
      newStart: moment('2016-12-07')
        .add(4, 'hours')
        .toDate(),
      newEnd: moment('2016-12-07')
        .add(6, 'hours')
        .toDate()
    });
    expect(eventDropped).to.have.been.calledOnce;
  });

  it('should not allow events to be resized smaller than 1 day', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.events = [
      {
        title: 'foo',
        color: { primary: '', secondary: '' },
        start: moment('2016-06-27')
          .add(4, 'hours')
          .toDate(),
        end: moment('2016-06-27')
          .add(6, 'hours')
          .toDate(),
        resizable: {
          beforeStart: true
        }
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const event: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-container'
    );
    const dayWidth: number = event.parentElement.offsetWidth / 7;
    const rect: ClientRect = event.getBoundingClientRect();
    triggerDomEvent('mousedown', document.body, {
      clientX: rect.left,
      clientY: rect.top
    });
    fixture.detectChanges();
    triggerDomEvent('mousemove', document.body, {
      clientX: rect.left + dayWidth,
      clientY: rect.top
    });
    fixture.detectChanges();
    expect(Math.round(event.getBoundingClientRect().left)).to.equal(
      Math.round(rect.left)
    );
    expect(Math.round(event.getBoundingClientRect().width)).to.equal(
      Math.round(rect.width)
    );
    triggerDomEvent('mouseup', document.body, {
      clientX: rect.left - dayWidth,
      clientY: rect.top
    });
    fixture.detectChanges();
    fixture.destroy();
  });

  it('should not allow events to be resized outside of the current view', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.events = [
      {
        title: 'foo',
        color: { primary: '', secondary: '' },
        start: moment('2016-06-27')
          .add(4, 'hours')
          .toDate(),
        end: moment('2016-06-27')
          .add(6, 'hours')
          .toDate(),
        resizable: {
          beforeStart: true
        }
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const event: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event-container'
    );
    const dayWidth: number = event.parentElement.offsetWidth / 7;
    const rect: ClientRect = event.getBoundingClientRect();
    triggerDomEvent('mousedown', document.body, {
      clientX: rect.left,
      clientY: rect.top
    });
    fixture.detectChanges();
    triggerDomEvent('mousemove', document.body, {
      clientX: rect.left - dayWidth,
      clientY: rect.top
    });
    fixture.detectChanges();
    expect(Math.round(event.getBoundingClientRect().left)).to.equal(
      Math.round(rect.left - dayWidth)
    );
    expect(Math.round(event.getBoundingClientRect().width)).to.equal(
      Math.round(rect.width + dayWidth)
    );
    triggerDomEvent('mousemove', document.body, {
      clientX: rect.left - dayWidth * 2,
      clientY: rect.top
    });
    fixture.detectChanges();
    expect(Math.round(event.getBoundingClientRect().left)).to.equal(
      Math.round(rect.left - dayWidth)
    );
    expect(Math.round(event.getBoundingClientRect().width)).to.equal(
      Math.round(rect.width + dayWidth)
    );
    triggerDomEvent('mouseup', document.body, {
      clientX: rect.left - dayWidth * 2,
      clientY: rect.top
    });
    fixture.detectChanges();
    fixture.destroy();
  });

  it('should allow external events to be dropped on the week view headers', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.events = [];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);

    const externalEventFixture: ComponentFixture<
      ExternalEventComponent
    > = TestBed.createComponent(ExternalEventComponent);
    externalEventFixture.detectChanges();
    document.body.appendChild(externalEventFixture.nativeElement);

    const event: HTMLElement = externalEventFixture.nativeElement.querySelector(
      '.external-event'
    );
    const eventPosition: ClientRect = event.getBoundingClientRect();

    const headers: any[] = Array.from(
      fixture.nativeElement.querySelectorAll('.cal-header')
    );
    const header: HTMLElement = headers[2];
    const headerPosition: ClientRect = header.getBoundingClientRect();

    const eventDropped: sinon.SinonSpy = sinon.spy();
    fixture.componentInstance.eventTimesChanged.subscribe(eventDropped);
    triggerDomEvent('mousedown', event, {
      clientY: eventPosition.top,
      clientX: eventPosition.left
    });
    fixture.detectChanges();
    triggerDomEvent('mousemove', document.body, {
      clientY: headerPosition.top,
      clientX: headerPosition.left
    });
    fixture.detectChanges();
    triggerDomEvent('mouseup', document.body, {
      clientY: headerPosition.top,
      clientX: headerPosition.left
    });
    fixture.detectChanges();
    fixture.destroy();
    externalEventFixture.destroy();
    expect(eventDropped).to.have.been.calledWith({
      event: externalEventFixture.componentInstance.event,
      newStart: moment('2016-06-27')
        .startOf('week')
        .add(2, 'days')
        .toDate()
    });
  });

  it('should allow the weekend days to be customised', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2017-06-25');
    fixture.componentInstance.weekendDays = [
      DAYS_OF_WEEK.FRIDAY,
      DAYS_OF_WEEK.SATURDAY
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, weekendDays: {} });
    fixture.detectChanges();
    const headerCells: HTMLElement[] = fixture.nativeElement.querySelectorAll(
      '.cal-header'
    );
    expect(headerCells[0].classList.contains('cal-weekend')).to.equal(false);
    expect(headerCells[5].classList.contains('cal-weekend')).to.equal(true);
    expect(headerCells[6].classList.contains('cal-weekend')).to.equal(true);
    fixture.destroy();
  });

  it('should add a custom CSS class to headers via the beforeViewRender output', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.beforeViewRender
      .pipe(take(1))
      .subscribe(({ header }) => {
        header[0].cssClass = 'foo';
      });
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelector('.cal-header')
        .classList.contains('foo')
    ).to.equal(true);
    fixture.destroy();
  });

  it('should log on invalid events', () => {
    const stub = sinon.stub(console, 'warn');
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.events = [
      { start: '2017-01-01', title: '', color: { primary: '', secondary: '' } }
    ] as any;
    fixture.componentInstance.ngOnChanges({ events: {} });
    fixture.detectChanges();
    stub.restore();
    expect(stub).to.have.been.calledOnce; // tslint:disable-line
  });

  it('should only call the beforeViewRender output once when refreshing the view', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.refresh = new Subject();
    fixture.componentInstance.ngOnInit();
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    const beforeViewRenderCalled = sinon.spy();
    // use subscription to test that it was only called a max of one times
    const subscription = fixture.componentInstance.beforeViewRender.subscribe(
      beforeViewRenderCalled
    );
    fixture.componentInstance.refresh.next(true);
    expect(beforeViewRenderCalled).to.have.been.calledOnce;
    subscription.unsubscribe();
    fixture.destroy();
  });

  it('should expose the view period on the beforeViewRender output', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    const beforeViewRenderCalled = sinon.spy();
    fixture.componentInstance.beforeViewRender
      .pipe(take(1))
      .subscribe(beforeViewRenderCalled);
    fixture.componentInstance.ngOnInit();
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    fixture.componentInstance.ngOnChanges({ viewDate: {} });
    expect(
      beforeViewRenderCalled.getCall(0).args[0].period.start
    ).to.be.an.instanceOf(Date);
    expect(
      beforeViewRenderCalled.getCall(0).args[0].period.end
    ).to.be.an.instanceOf(Date);
    expect(
      Array.isArray(beforeViewRenderCalled.getCall(0).args[0].period.events)
    ).to.equal(true);
    fixture.destroy();
  });

  it('should add event actions to each event', () => {
    const fixture: ComponentFixture<
      CalendarWeekViewComponent
    > = TestBed.createComponent(CalendarWeekViewComponent);
    fixture.componentInstance.viewDate = new Date('2016-06-27');
    const eventClicked = sinon.spy();
    fixture.componentInstance.eventClicked.subscribe(eventClicked);
    fixture.componentInstance.events = [
      {
        start: new Date('2016-06-26'),
        end: new Date('2016-06-28'),
        title: 'foo',
        color: {
          primary: 'blue',
          secondary: 'rgb(238, 238, 238)'
        },
        actions: [
          {
            label: '<i class="fa fa-fw fa-times"></i>',
            onClick: sinon.spy(),
            cssClass: 'foo'
          }
        ]
      }
    ];
    fixture.componentInstance.ngOnChanges({ viewDate: {}, events: {} });
    fixture.detectChanges();
    const action: HTMLElement = fixture.nativeElement.querySelector(
      '.cal-event .cal-event-action'
    );
    expect(action.innerHTML).to.equal('<i class="fa fa-fw fa-times"></i>');
    expect(action.classList.contains('foo')).to.equal(true);
    action.querySelector('i').click();
    expect(
      fixture.componentInstance.events[0].actions[0].onClick
    ).to.have.been.calledWith({ event: fixture.componentInstance.events[0] });
    expect(eventClicked).not.to.have.been.called;
  });
});
