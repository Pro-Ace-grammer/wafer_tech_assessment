## Realtime & UI Flow Thoughts ..

First a User sees a Page with Login .. Login as Admin, Login as User, And Sign Up ..

### Login Flow:
- User clicks Login .. Both use the same authentication logic but check against their respective roles in the DB.
- If user is Admin, they get redirected to a dashboard with extra features .. like 'Create Project' or 'Add Member' buttons.
- If a normal User logs in, same auth .. but redirecting to home with limited UI based on their permissions.

### Permissions:
Admin User:
- Can create / manage projects ..
- Add or manage users ..
- Create, edit, delete or reorder tasks ..
- Assign tasks to users.

Normal User:
- View projects they are members of ..
- Create, edit, reorder tasks ..
- Change task status ..
- Cannot access projects they are not members of .. API needs to block this too, not just frontend.

### UI Breakdown ..
Project Management:
- Create New Project .. List All Projects .. Add or Remove Members.

Task Board:
- Kanban style columns for each Status (Pending, In Progress, Completed) ..
- Drag Tasks to Reorder ..
- Real-time Updates via sockets ..

### Task Reorder Handling & Sockets ..
- So what I have thought here is when a user reorders a task .. for that particular user it updates immediately on the UI (Optimistic UI) so it feels seamless and fast ..
- Simultaneously the frontend hits the API backend with the reorder request .. 
- The backend processes it silently, updates the LexoRank string in the db .. 
- Once the DB is successfully updated, the backend broadcasts a socket message ONLY to users active in that specific project room ..
- Then their UI updates automatically .. giving everyone a seamless feel.

- As for the notification payload .. I figured it out .. we just need to send:
  - taskId (so the UI knows what moved)
  - newStatus (in case it moved to a different column)
  - newOrder (the new string value to sort by)
  - projectId (to filter the socket room so only members see it)
  - maybe a 'message' string like "Admin moved Task X" for the toast notification on the UI ..

  