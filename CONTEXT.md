# Meeting Room Booking

This context describes how people reserve meeting rooms for specific time intervals and how the system protects room availability.

## Language

**Booking**:
A user's reservation of a specific room for a specific time interval. A booking becomes active immediately when the room is available and the user is allowed to book it.
_Avoid_: Reservation request, approval, appointment, recurring booking

**Active Booking**:
A booking that currently occupies its room's time interval and prevents overlapping bookings for the same room.
_Avoid_: Approved booking, confirmed request

**Cancelled Booking**:
A booking that no longer occupies its room's time interval but remains visible as booking history.
_Avoid_: Deleted booking, rejected booking

**Time Slot**:
The half-open interval from a booking's start time up to, but not including, its end time. Adjacent slots do not overlap when one ends exactly as the next begins.
_Avoid_: Time range, closed interval

**Booking Granularity**:
Bookings start and end on 15-minute boundaries, and the shortest valid booking is 15 minutes.
_Avoid_: Arbitrary minute booking

**Booking Hours**:
The global daily window from 08:00 to 20:00 in which a booking must fully fit. Weekend bookings are allowed in the first version.
_Avoid_: Business days, room-specific hours

**Future Booking**:
A booking whose start time is later than the current time. Users can only create and cancel future active bookings.
_Avoid_: Upcoming meeting, editable booking

**Administrative Cancellation**:
An administrator's cancellation of any future active booking, including bookings created by other users.
_Avoid_: Deletion, rejection, approval rollback

**Cancellation Record**:
The record of when a booking was cancelled and which user cancelled it. A cancellation reason is not required in the first version.
_Avoid_: Deletion audit, rejection reason

**Room**:
A bookable meeting space with a name, capacity, location, equipment list, and active state.
_Avoid_: Resource, venue, place

**Active Room**:
A room that users can see and book. Deactivated rooms remain in history but are not available for new bookings.
_Avoid_: Deleted room, archived resource

**Room Deactivation Guard**:
A room cannot be deactivated while it has future active bookings.
_Avoid_: Automatic booking cancellation, forced room deletion

**Availability Check**:
The backend rule that decides whether a room can accept a new booking for a requested time slot. It rejects any booking that overlaps an active booking for the same room.
_Avoid_: UI-only availability, calendar suggestion

**User**:
A registered person who can view active rooms, create bookings, and cancel their own future active bookings.
_Avoid_: Customer, client, account

**Administrator**:
A registered person who can manage rooms, view all bookings, and cancel any future active booking.
_Avoid_: Manager, moderator, superuser

**Booking Ownership**:
The relationship between a booking and the user who created it. Regular users can see details for their own bookings, while other users only see occupied time slots without owner details.
_Avoid_: Public booking owner, shared calendar identity
