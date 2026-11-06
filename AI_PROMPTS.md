### First Prompt
```
Hey I am building the backend for a Task Management app in a /server folder using Node.js, Express, TypeScript, and Prisma. Generate the complete code for Authentication, User Management, and RBAC. Provide:
- The schema.prisma file containing a User model (id: UUID, email: unique string, password: string, role: Enum [ADMIN, USER]).
- A secure authentication controller (auth.controller.ts) handling JWT generation, login, and registration.
- Reusable Express middleware (auth.middleware.ts) for verifying JWTs and enforcing the Admin role.
- A user route (user.routes.ts) that allows Admins to fetch a list of all users.
Output the raw code files, their relative file paths, and instructions on how to start the Express server.
And also lease create a comprehensive Markdown file that details everything implemented in this prompt. Include explanations for easy understanding of the functionalities, as well as the overall flow. Provide both high-level and technical workflows. If possible, add sequence diagrams for both workflows.
Just do what is asked.
```



### Server Crash Error Fix
```
I am getting a crash when starting my server... 
The error is: PrismaClientConstructorValidationError: PrismaClient requires a driver adapter to connect to your database, but none was provided.
This is happening in src/config/prisma.ts. I am using a standard Neon PostgreSQL connection string, NOT Prisma Accelerate.
Please rewrite src/config/prisma.ts to use a standard, simple new PrismaClient() instantiation without the accelerateUrl or prismaOptions whatever the logic that is triggering this driver adapter error. Give me the complete, corrected code for src/config/prisma.ts.
```

### Frontend Build Prompt
```
Hey .. so my backend is completely done .. built it with Node, Express, Prisma and JWT for a Kanban task management app .. Now we are moving to the React frontend using Vite and TypeScript .. I want to use Tailwind CSS so I don't waste time typing raw css .. Listen .. my assessment rules strictly say I can only use AI for the Authentication, User Management, and RBAC parts .. so let's only do that right now .. I need you to generate a robust AuthContext using jwt-decode to manage the global state .. a Login page UI using Tailwind .. and a ProtectedRoute wrapper so normal users can't see admin pages .. Make sure to explain how the AuthContext works line-by-line .. and also I will need a detailed markdown file with the frontend architecture for my personal notes
```


### UI upgrade prompt
```
I have a working Login and Register page using React and Tailwind CSS. I want to upgrade their UI to look like a premium, modern B2B SaaS application (e.g., Linear, Vercel, or Stripe).

STRICT RULES:

DO NOT change any state variables, axios calls, handleSubmit logic, or JWT token handling.

DO NOT change the routing (useNavigate) or the role selection logic in the Register component.

DESIGN REQUIREMENTS:

Transform the layout into a split-screen design for desktop: the left side should be a sleek, subtle dark gradient or branded abstract pattern, and the right side should contain the clean white login/register form.

On mobile, hide the graphic side and center the form perfectly.

Style the inputs with subtle gray borders, rounded-lg corners, and a sharp focus ring (focus:ring-2 focus:ring-blue-600).

Make the submit buttons pop with a subtle shadow, hover state, and disabled state styling.

Add a smooth transition (transition-all duration-200) to all interactive elements.
```