import React, { useMemo } from 'react';

const EventsPage: React.FC = () => {
  const filteredEvents = useMemo(() => {
    console.log('[EVENTS_PAGE] Filtering events - Input:', {
      eventsType: typeof events,
      isArray: Array.isArray(events),
      events
    });
    
    if (!Array.isArray(events)) {
      console.error('[EVENTS_PAGE] Events is not an array:', events);
      return [];
    }

    let filtered = events;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => {
        if (!event || typeof event !== 'object') {
          console.error('[EVENTS_PAGE] Invalid event object during search:', event);
          return false;
        }
        return (
          event.name?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query)
        );
      });
    }

    // Apply status filter
    if (activeFilter !== "ALL") {
      filtered = filtered.filter(event => {
        if (!event || typeof event !== 'object') {
          console.error('[EVENTS_PAGE] Invalid event object during status filter:', event);
          return false;
        }
        return event.status === activeFilter;
      });
    }

    console.log('[EVENTS_PAGE] Filtered events result:', filtered);
    return filtered;
  }, [events, searchQuery, activeFilter]);

  return (
    // Rest of the component code
  );
};

export default EventsPage; 