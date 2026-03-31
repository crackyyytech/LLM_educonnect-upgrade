# LLM EduConnect — User Manual

A free educational video learning platform for the Tamil Nadu Samacheer Kalvi curriculum (Classes 1–12), with AI-powered tutoring, progress tracking, and role-based management tools.

---

## Table of Contents

1. [Default Login Credentials](#1-default-login-credentials)
2. [Getting Started](#2-getting-started)
3. [Student Guide](#3-student-guide)
4. [Teacher Guide](#4-teacher-guide)
5. [Admin Guide](#5-admin-guide)
6. [Keyboard Shortcuts](#6-keyboard-shortcuts)

---

## 1. Default Login Credentials

### Demo / Test Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@kalvi.com | admin123 |
| Teacher | teacher@kalvi.com | teacher123 |
| Student | student@kalvi.com | student123 |

### Class-wise Student Accounts (Classes 1–12)

These accounts are pre-seeded, one per class.

| Class | Email | Password |
|---|---|---|
| Class 1 | class1@suct.edu | Class@1 |
| Class 2 | class2@suct.edu | Class@2 |
| Class 3 | class3@suct.edu | Class@3 |
| Class 4 | class4@suct.edu | Class@4 |
| Class 5 | class5@suct.edu | Class@5 |
| Class 6 | class6@suct.edu | Class@6 |
| Class 7 | class7@suct.edu | Class@7 |
| Class 8 | class8@suct.edu | Class@8 |
| Class 9 | class9@suct.edu | Class@9 |
| Class 10 (SSLC) | class10@suct.edu | Class@10 |
| Class 11 (Plus One) | class11@suct.edu | Class@11 |
| Class 12 (Plus Two) | class12@suct.edu | Class@12 |

> These are default credentials. It's recommended to change passwords after first login in a production environment.

---

## 2. Getting Started

### Creating an Account

1. Open the app in your browser.
2. Click **Register** on the login page.
3. Fill in your name, email, and password (minimum 6 characters).
4. Select your role: **Student**, **Teacher**, or **Admin**.
   - Students: select your class number (1–12).
   - Teachers: enter your subject.
5. Click **Register**. You'll be logged in automatically.

### Logging In

1. Enter your registered email and password.
2. Click **Login**.
3. You'll be redirected to your role-specific dashboard.

> Accounts can be disabled by an admin. If you see "Account disabled", contact your administrator.

### Logging Out

Click your profile icon in the top-right header and select **Logout**.

---

## 3. Student Guide

### Dashboard Overview

After login, the app opens to your assigned class. The layout has three main areas:

- **Header** — search bar, theme toggle, notifications, profile menu
- **Sidebar** — playlist, favorites, notes, queue, history
- **Main area** — video player and subject list

### Watching Videos

1. Your class is pre-selected on login. Use the class selector to switch if needed.
2. Click a subject from the list to load its playlist.
3. Click any video to start watching.
4. Videos unlock sequentially — complete the current video to unlock the next one.
5. A video is marked **watched** when you finish it. Your progress is saved automatically.

### Playback Controls

| Control | Description |
|---|---|
| Speed | 0.5× to 2× playback speed |
| Repeat | Off / Repeat All / Repeat One |
| Shuffle | Randomize playlist order |
| Sleep Timer | Auto-stop after a set duration |
| Focus Mode | Hides the sidebar for distraction-free viewing |

### Favorites & Queue

- Click the heart icon on any video to add it to **Favorites**.
- Click the queue icon to add a video to your **Watch Queue** for later.
- Access both from the Sidebar tabs.

### Notes

- Open the **Notes** tab in the sidebar while watching a video.
- Type your notes — they are saved per video automatically.
- Click **Export** to download all your notes as a `.txt` file.

### Progress Tracking

- **Watched count** — total videos you've completed.
- **Completed subjects** — subjects where you've finished all videos.
- **Learning streak** — consecutive days you've been active on the platform.
- View your full stats from the profile menu → **My Stats**.

### Recently Watched & Continue Watching

- The **History** tab in the sidebar shows your last 30 watched videos.
- The home screen shows up to 6 playlists you can continue from where you left off.

### AI Tutor

1. Click the **Tutor** button (chat icon) in the header or sidebar.
2. Type your question in Tamil or English.
3. The AI (powered by Google Gemini) responds in real time.
4. The tutor is context-aware — it knows what subject you're currently studying.

### Theme

Toggle between **Dark** and **Light** mode using the sun/moon icon in the header.

---

## 4. Teacher Guide

### Dashboard Overview

After login, you land on the **Teacher Panel**, which shows your assigned students and their progress.

### Viewing Student Progress

- The panel lists all students in your assigned class or subject.
- Each student card shows:
  - Videos watched
  - Subjects completed
  - Streak days
- Click a student card to expand it and see detailed progress.

### Searching & Sorting Students

- Use the **search bar** to find students by name or email.
- Use the **sort dropdown** to order by:
  - Name
  - Videos watched
  - Streak days
  - Completed subjects

### Exporting Progress

Click **Export CSV** to download a spreadsheet of all your students' progress data.

### Managing Playlists

Teachers can manage subject playlists via the **Manage Panel**:

1. Click **Manage** in the header.
2. Select a class and subject.
3. Add, edit, or delete playlist entries.

---

## 5. Admin Guide

### Dashboard Overview

Admins have access to the full **Admin Dashboard** with platform-wide statistics and user management tools.

### Platform Statistics

The dashboard home shows:

- Total users (broken down by role)
- Active vs. disabled accounts
- Total videos watched across the platform
- Role distribution chart
- Recently joined users

### Managing Users

Navigate to the **Users** tab in the admin dashboard.

#### Creating a User

1. Click **Add User**.
2. Fill in name, email, password, role, and class/subject if applicable.
3. Click **Save**.

#### Editing a User

1. Find the user using search or filters.
2. Click the **Edit** (pencil) icon on their row.
3. Update any fields and click **Save**.

#### Disabling / Enabling an Account

- Toggle the **Active** switch on a user's row to disable or re-enable their login access.

#### Resetting Progress

- Click the **Reset Progress** option on a user to clear their watched videos, completed subjects, and streak data.

#### Deleting a User

- Click the **Delete** (trash) icon on a user's row and confirm.

#### Bulk Operations

1. Check the boxes next to multiple users.
2. Use the **Bulk Actions** dropdown to:
   - Delete selected
   - Enable/disable selected
   - Change role for selected

### Searching & Filtering Users

- Search by name, email, subject, or class.
- Filter by role (admin / teacher / student).
- Filter by status (active / disabled).
- Sort by name, videos watched, or join date.
- Results are paginated (10 per page).

### Exporting Users

Click **Export CSV** to download a full list of all users with their details.

### Announcements

1. Go to the **Announcements** tab.
2. Click **New Announcement**.
3. Enter your message, select a type (Info / Warning / Success / Danger), and choose the target audience (All / Students / Teachers / Admins).
4. Click **Post**. The announcement appears for the targeted users.
5. Click the **×** on any announcement to delete it.

### Cache & System Health

- Go to **Settings** → **Cache** to view current cache usage.
- Click **Clear Cache** to force-refresh all YouTube playlist data.

---

## 6. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `/` | Focus the search bar |
| `?` | Open keyboard shortcuts help |
| `q` | Toggle the watch queue |
| `←` / `→` | Previous / next video |
| `f` | Toggle focus mode |
| `z` | Toggle sleep timer |
| `m` | Mute / unmute video |

---

*For technical issues or account problems, contact your platform administrator.*
