-- Keep the Future Booking invariant true at the database write boundary.
CREATE OR REPLACE FUNCTION "enforce_active_room_for_future_booking"()
RETURNS TRIGGER AS $$
DECLARE
    room_is_active BOOLEAN;
BEGIN
    IF NEW."status" = 'ACTIVE'
       AND NEW."startAt" <= CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Active Bookings require a future start.',
            CONSTRAINT = 'Booking_future_start_guard';
    END IF;

    SELECT "isActive"
    INTO room_is_active
    FROM "Room"
    WHERE "id" = NEW."roomId"
    FOR UPDATE;

    IF NEW."status" = 'ACTIVE'
       AND room_is_active IS FALSE THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Future Active Bookings require an Active Room.',
            CONSTRAINT = 'Booking_active_room_guard';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
