DROP TABLE IF EXISTS public.bookings;
DROP TABLE IF EXISTS public.guests;
DROP TABLE IF EXISTS public.rooms;
DROP TABLE IF EXISTS public.conference_bookings;
DROP TABLE IF EXISTS public.conference_rooms;
DROP TABLE IF EXISTS public.bar_inventory;
DROP TABLE IF EXISTS public.payment_tenders;
DROP TABLE IF EXISTS public.website_pages;

DROP FUNCTION IF EXISTS public.notify_new_booking();
DROP FUNCTION IF EXISTS public.notify_booking_status_change();
DROP FUNCTION IF EXISTS public.notify_conference_booking();
DROP FUNCTION IF EXISTS public.notify_conference_booking_cancelled();
