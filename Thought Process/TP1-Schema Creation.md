

Alright, so firstly, we are going to draft the Database Schema for the Task Management App



\- So a little understanding about this is .. I assume it will be more like the Jira setup \[like that Jira board we see]... I am getting that visuals here.

\- So, we will have users with roles, either Admin or User.



Admin (Permissions):

* Manage users
* Manage projects
* Create, edit, delete and reorder tasks
* Assign tasks to users



User(Permissions)

* View projects they are members of
* Create tasks
* Edit tasks
* Change task status
* Reorder tasks
* Cannot access projects they are not members of





Basic Schema understanding:

1. Users: id, username, first\_name, last\_name, password, role(Admin, User).
2. Projects: id, project\_name, project\_description, resources\[may be a list of links], attachments \[like files of PRDs or SRS and stuff like that], creator \[User with Admin role], created\_at, updated\_at, \[So for members I am either thinking of n-n relation with members field .. or another table. called ProjectMembers: id, project\_id/project\[FK], User\[FK]]
3. Tasks: id, task\_name, task\_description, resources, attachments, Project \[FK], status, task\_type \[task, feature, documentation, bug, hotfix, ..etc something extra]
4. Order:

Now for ordering I researched there are multiple ways ... 

like Lexorank / or lexicographical whatever that is called the Fraction Indexing .. So I think it is more like giving buffer words or numbers .. 
Like in terms of Float .. so let us say I have TaskA given as 1.0 and TaskB as 2.0 .. and then if I drag the TaskX and drop it between TaskA and TaskB it will calculate the number between 1.0 and 2.0 to assign .. like example 1.1 ..like wise we have infinite of them..This is the best one that I found.



Other are Array, LinkedList and all but they are too specific..

