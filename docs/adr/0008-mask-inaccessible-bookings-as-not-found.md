# Mask inaccessible bookings as not found

When a regular user requests a booking they do not own, the API returns `404 Not Found` rather than `403 Forbidden`. Administrators can access all bookings, but regular users should not be able to confirm the existence of another user's booking by probing identifiers.
