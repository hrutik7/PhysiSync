import React from 'react';
import { format } from 'date-fns';
import { Card } from './ui/card';
import { Check } from 'lucide-react';

const DailyTimeline = () => {
  // Generate time slots for every 30 minutes
  const timeSlots = Array.from({ length: 48 }, (_, i) => i/2);
  
  // Format time helper function
  const formatTime = (hour:any, minute = 0) => {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return format(date, 'h:mm aaaa');
  };

  // Sample events data
  const events = [
    {
      id: 1,
      title: 'Guru Ravidas Jayanti',
      time: '12:00 AM',
      duration: 24,
      isAllDay: true,
      color: 'bg-green-100 text-green-800 border border-green-200',
    },
    {
      id: 2,
      title: 'Introspect and planning',
      time: '9:15 AM',
      duration: 0.5,
      completed: true,
      color: 'bg-blue-100 text-blue-800 border border-blue-200',
    },
    {
      id: 3,
      title: 'Read about opensource / blogs / follow some experienced devs',
      time: '9:45 AM',
      duration: 0.75,
      completed: true,
      color: 'bg-blue-100 text-blue-800 border border-blue-200',
    },
    {
      id: 4,
      title: 'openstatus contribution',
      time: '11:30 AM',
      duration: 1.5,
      completed: true,
      color: 'bg-blue-100 text-blue-800 border border-blue-200',
    },
  ];

  const getEventStyle = (event:any) => {
    const baseStyle = `rounded-lg p-2 mb-1 text-sm ${event.color} ${
      event.isAllDay ? 'col-span-full' : ''
    }`;
    return event.completed ? `${baseStyle} opacity-90` : baseStyle;
  };

  const findEventsForTimeSlot = (hour:any, minute:any) => {
    return events.filter(event => {
      const [eventHour, eventMinute] = event.time.split(':')[0].split(' ')[0].split(':').map(Number);
      return (eventHour === hour && eventMinute === minute) || event.isAllDay;
    });
  };

  return (
    <div className="h-[600px] overflow-y-auto p-4">
      <div className="p-4 bg-white">
        {/* Header */}
        <div className="flex items-center mb-6 border-b pb-4">
          <div className="bg-blue-100 text-blue-800 rounded-full w-12 h-12 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs font-medium">WED</div>
              <div className="text-xs font-bold">12</div>
            </div>
          </div>
          <div className="ml-4">
            <div className="text-sm text-gray-600">GMT+05:30</div>
          </div>
        </div>

        {/* All-day events */}
        <div className="mb-4">
          {events.filter(event => event.isAllDay).map(event => (
            <div key={event.id} className={getEventStyle(event)}>
              <div className="flex items-center">
                {event.completed && (
                  <Check className="w-4 h-4 mr-1" />
                )}
                <span>{event.title}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Grid */}
        <div className="grid grid-cols-[80px_1fr] gap-2">
          {timeSlots.map((time) => {
            const hour = Math.floor(time);
            const minute = (time % 1) * 60;
            const timeLabel = formatTime(hour, minute);
            
            return (
              <React.Fragment key={time}>
                <div className="text-right pr-2 text-sm text-gray-600 h-12 -mt-2">
                  {minute === 0 && timeLabel}
                </div>
                <div className="border-t border-gray-100 relative h-12 group hover:bg-gray-50">
                  {findEventsForTimeSlot(hour, minute).map((event) => !event.isAllDay && (
                    <div
                      key={event.id}
                      className={getEventStyle(event)}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        minHeight: `${event.duration * 48}px`,
                        zIndex: 10
                      }}
                    >
                      <div className="flex items-center">
                        {event.completed && (
                          <Check className="w-4 h-4 mr-1" />
                        )}
                        <span>
                          {event.time} {event.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyTimeline;