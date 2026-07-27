-- Serialize Room deactivation with future Active Booking writes on the Room row.
CREATE FUNCTION "enforce_active_room_for_future_booking"()
RETURNS TRIGGER AS $$
DECLARE
    room_is_active BOOLEAN;
BEGIN
    SELECT "isActive"
    INTO room_is_active
    FROM "Room"
    WHERE "id" = NEW."roomId"
    FOR UPDATE;

    IF NEW."status" = 'ACTIVE'
       AND NEW."startAt" > CURRENT_TIMESTAMP
       AND room_is_active IS FALSE THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Future Active Bookings require an Active Room.',
            CONSTRAINT = 'Booking_active_room_guard';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Booking_active_room_guard"
BEFORE INSERT OR UPDATE OF "roomId", "startAt", "status"
ON "Booking"
FOR EACH ROW
EXECUTE FUNCTION "enforce_active_room_for_future_booking"();

CREATE FUNCTION "enforce_room_deactivation_guard"()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."isActive"
       AND NOT NEW."isActive"
       AND EXISTS (
           SELECT 1
           FROM "Booking"
           WHERE "roomId" = NEW."id"
             AND "status" = 'ACTIVE'
             AND "startAt" > CURRENT_TIMESTAMP
       ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'Room cannot be deactivated while it has future Active Bookings.',
            CONSTRAINT = 'Room_deactivation_guard';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Room_deactivation_guard"
BEFORE UPDATE OF "isActive"
ON "Room"
FOR EACH ROW
EXECUTE FUNCTION "enforce_room_deactivation_guard"();
