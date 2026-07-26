# Store times in UTC and display Europe/Kyiv

Booking timestamps are stored and compared in UTC while the user interface displays times in Europe/Kyiv local time. The first version assumes all rooms belong to one office timezone, which avoids per-room timezone complexity while keeping backend comparisons and tests consistent.
