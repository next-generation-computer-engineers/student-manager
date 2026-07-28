# Student Manager

A modern application for managing student information.

## Overview

A pretty simple student tracker that's used to track attendance and search for students enrolled in classes. Developed for organizations that need a straightforward solution for searching student class history for future reference.

> [!NOTE]
> Try the live demo at [https://student-manager-ivory.vercel.app](https://student-manager-ivory.vercel.app).

## Features

- Spreadsheet import (`.xlsx`, `.csv`, `.tsv`, or a Google Sheets link) with automatic column detection and a review step
- Course searching
- Student searching including phone number, email, and name
- Attendance statistics per-day, including present/late/absent/excused
- User role management (admin, teacher)
- Light and dark themes

## Setting up locally

The app reads **live data from Supabase** — students, courses, and attendance
are not bundled in the repo. Connect your project and everything populates from
the database.

1. Open the shared Supabase project (or create one with the same schema as
   production).
2. Copy `student-manager/.env.example` to `student-manager/.env.local` and set:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # anon / public key from API settings
   ```
   Each user row in `public.users` has an **`organization_id`**. Imports stamp that
   id on every new students, classes, and attendance row automatically — nothing
   extra to configure.
   Use the **anon (public) key** — the long JWT starting with `eyJ`, not the
   service role key.
3. Install and run:
   ```bash
   cd student-manager
   npm install
   npm run dev
   ```
4. Sign up at `/auth/signup`. A new account needs an **admin to approve** it
   under **Dashboard → Approvals** before you can use the app.
5. Import attendance sheets at **Dashboard → Import a sheet**, or use data
   already in Supabase — the dashboard updates on every request.

For Vercel, set the same two `NEXT_PUBLIC_*` variables in the project settings.

## Importing attendance sheets

Attendance used to be loaded by running `server/data-processing/process_data.py`
followed by `insert_db.py`. That is now built into the app at
**Dashboard → Import a sheet**, which accepts a file upload or a public Google
Sheets link.

The importer understands the layout those scripts expected (course name in `A1`,
session dates from column G, no headers) and also detects labelled columns in
any order. Grades like `7th` or `Grade 11`, levels like `beg`/`adv`, and
attendance values like `In`/`Out`/`Late`/`Excused` are all normalised the same
way the Python did.

Rows with an `@cengclass.org` email are treated as CENG staff (teachers /
managers) and skipped on import.

Everything is shown in a preview before anything is written. Students are
matched to existing records by name, so re-importing a corrected sheet updates
contacts rather than creating duplicates.

```bash
npm run verify:parser   # parser fixtures
```

## Screenshots

A few screenshots of the website:
<table>
    <tr>
        <td>
            <img src="github/images/course_search_view.png" alt="Course Search Page">
            <p>Course Search Page</p>
        </td>
        <td>
            <img src="github/images/student_search_view.png" alt="Student Search Page">
            <p>Student Search Page</p>
        </td>
    </tr>
    <tr>
        <td>
            <img src="github/images/class_view.png" alt="Course Page">
            <p>Course Page</p>
        </td>
        <td>
            <img src="github/images/student_view.png" alt="Student Page">
            <p>Student Page</p>
        </td>
    </tr>
    <tr>
        <td>
            <img src="github/images/merge_view.png" alt="Merge Page">
            <p>Merge Page</p>
        </td>
        <td>
            <img src="github/images/approvals_view.png" alt="Approvals Page">
            <p>Approvals Page</p>
        </td>
    </tr>
</table>
