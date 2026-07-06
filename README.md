# Our Days

A private shared memory journal webpage for recording relationship dates, photos, and precious moments.

Live site:

https://shiguo425.github.io/first-project/

## Features

- Shows how many days we have been together
- Saves shared memories with a title, date, text, and picture
- Tracks a shared wish list
- Tracks plans for this year
- Pins cities on China and global maps
- Saves picture bundles for each pinned place
- Uploads pictures to Supabase Storage
- Stores shared memory content in Supabase
- Includes a simple account/password login gate
- Refreshes shared memories automatically every 30 seconds

## Login

The webpage asks for an account number and password before showing the journal.

This is a simple front-end lock for normal private sharing. Because the site is hosted as public GitHub Pages code, it should not be treated as strong security.

## Supabase Setup

Before the shared upload and timeline features work, run the SQL setup once in Supabase.

1. Open the Supabase project.
2. Go to SQL Editor.
3. Copy the contents of `supabase-setup.sql`.
4. Paste it into Supabase SQL Editor.
5. Click Run.

The SQL creates:

- `couple_settings`
- `memories`
- `wishlist`
- `year_schedule`
- `places`
- `place_photos`
- `memories` storage bucket
- public read/write policies for the shared journal

## Files

- `index.html` - page structure
- `styles.css` - page design and responsive layout
- `app.js` - login, day counter, Supabase upload, and timeline logic
- `supabase-setup.sql` - Supabase database, storage, map, wish list, and schedule setup
- `assets/memory-hero.png` - hero background image

## Development

This is a static website. You can open `index.html` directly in a browser, or serve the folder with any simple static server.
