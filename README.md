# Spendly

**Take control of your spending. Make every expense count.**

Spendly is a modern, responsive personal expense tracker designed to help you record expenses, understand spending patterns, monitor your finances, and make more informed everyday money decisions.

With an intuitive dashboard, detailed analytics, customizable categories, and Excel exports, Spendly brings essential expense-tracking tools together in one place.

**Live application:** [spendly-mark1.vercel.app](https://spendly-mark1.vercel.app)

---

## Screenshots

Explore Spendly's interface and key features.

<img width="1917" height="867" alt="image" src="https://github.com/user-attachments/assets/f9095d88-05b5-4c70-9dfc-ed84d6b7ea9b" />

### Dashboard
<img width="1518" height="817" alt="image" src="https://github.com/user-attachments/assets/072a7a8b-e707-4049-9fdf-b5476ff391e4" />

*Overview of spending activity, expense summaries, and daily spending.*

### Expense Management
<img width="1886" height="846" alt="image" src="https://github.com/user-attachments/assets/fdc8b333-c8a0-4e0d-bd20-77c86a1fa7c5" />

*Record, search, filter, sort, edit, and delete expenses.*

### Analytics
<img width="1486" height="855" alt="image" src="https://github.com/user-attachments/assets/0b264033-2e97-4640-b381-bdde65a2def1" />

*Visualize spending patterns and understand where your money goes.*

### Reports
<img width="1227" height="821" alt="image" src="https://github.com/user-attachments/assets/e6042466-015f-4e76-903a-ec8811021806" />

*Review spending over time and export expense data to Excel.*

### Settings
<img width="1886" height="878" alt="image" src="https://github.com/user-attachments/assets/a29c0fe9-63db-4e44-af0a-4db4c471a9b3" />

*Customize preferences, manage categories, and configure the application.*

---

## Features

### Expense Management
- Add expenses with a date, title, amount, and category.
- Edit existing expense records or delete them with confirmation.
- Search expenses and narrow results using available filters.
- Sort expenses to find relevant transactions quickly.
- View expenses in layouts designed for desktop and mobile screens.

### Dashboard
- Get an overview of your recorded expenses.
- Review daily spending and summary information.
- Access key expense-management features from the main interface.

### Analytics and Reports
- Explore spending trends through interactive charts.
- Review spending by category and over time.
- Compare expense activity across available reporting periods.
- Export expense data to an Excel workbook for further analysis.

### Categories and Preferences
- Organize expenses using categories.
- Manage categories through application settings.
- Choose supported currency and appearance preferences.
- Use a responsive interface across desktop, tablet, and mobile devices.

### Account and Data Management
- Sign up and sign in securely through Better Auth.
- Store application data in MongoDB.
- Keep expense records associated with the authenticated account.
- Access the application through a consistent, protected user experience.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| Next.js | Application framework, routing, and server-side functionality |
| React | Component-based user interface |
| TypeScript | Type safety and maintainable development |
| Tailwind CSS | Responsive styling and UI design |
| Recharts | Interactive charts and data visualization |
| MongoDB Atlas | Cloud database for persistent application data |
| Better Auth | Authentication and session management |
| Zod | Data validation |
| Vercel | Application hosting and deployment |

---

## Architecture Overview

Spendly uses a full-stack Next.js architecture, keeping the user interface, server-side application logic, authentication, and database integration within one application.

```text
User
  |
  v
Spendly Web Interface
(Next.js + React + TypeScript)
  |
  v
Server-side Application Logic
(API routes / server actions)
  |
  +----------------------+
  |                      |
  v                      v
Better Auth          MongoDB Atlas
Authentication       Persistent Data
                         |
                         v
              Expenses, Categories,
              and Application Records
```

The application uses MongoDB for persistent storage, Better Auth for authentication, and server-side operations for database-backed functionality.

---

## Getting Started

You can run Spendly locally for development or explore the deployed application through the live link above.

### Prerequisites

Install the following before starting:

- [Node.js](https://nodejs.org/) — use a version compatible with the project.
- npm, included with Node.js.
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or another compatible MongoDB deployment.
- Git, to clone the repository.

### 1. Clone the repository

```bash
git clone https://github.com/AtifAnsari0345/Spendly.git
cd Spendly
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

Create a `.env.local` file in the project root and configure the required variables:

```dotenv
BETTER_AUTH_SECRET=your_generated_secret
BETTER_AUTH_URL=http://localhost:3000
MONGODB_URI=your_mongodb_connection_string
```

- `BETTER_AUTH_SECRET`: a strong, randomly generated secret used by Better Auth.
- `BETTER_AUTH_URL`: the base URL of the application. Use the local URL for development and the deployed URL in production.
- `MONGODB_URI`: the connection string for your MongoDB database.

Replace the example values with your own valid configuration. URL-encode special characters in MongoDB usernames or passwords when required by the connection string format.

**Security:** Never commit `.env.local`, real credentials, database passwords, or authentication secrets to Git. Use your hosting provider's environment-variable settings for production deployments.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run quality checks

The project provides the following validation commands:

```bash
npm run typecheck
npm run lint
npm run build
```

These commands check TypeScript, linting, and production-build compatibility.

---

## Deployment

Spendly is deployed on Vercel and uses MongoDB Atlas for persistent storage.

To deploy your own instance:

1. Fork or clone the repository.
2. Import the project into [Vercel](https://vercel.com/).
3. Configure the required environment variables for the relevant deployment environments.
4. Configure MongoDB Atlas network access and database credentials appropriately.
5. Set `BETTER_AUTH_URL` to the deployed application's canonical URL.
6. Deploy and verify sign-up, sign-in, expense persistence, analytics, and exports.

After changing production environment variables, trigger a new deployment when required by your hosting provider.

---

## Security and Data Handling

Spendly is designed with account-based access and server-side database operations.

- Authentication and session handling are managed by Better Auth.
- Database operations should enforce authenticated access and account-level data isolation.
- Environment variables are used for secrets and database connection configuration.
- Destructive actions, such as deleting expenses, require user confirmation in the interface.

When hosting your own instance, use strong secrets, restrict database access to trusted network sources where practical, and never expose database credentials in client-side code or public repositories.

---

## Project Structure

The project is organized by application routes, shared components, features, and supporting libraries.

```text
Spendly/
├── public/                  # Static assets and branding
├── src/
│   ├── app/                 # Routes, pages, and application entry points
│   ├── components/          # Shared UI components
│   ├── features/            # Feature-specific UI and logic
│   └── lib/                 # Shared utilities, auth, database, and helpers
├── .env.example             # Environment-variable template
├── .gitignore
├── package.json
├── next.config.ts
└── README.md
```

*The exact files and subdirectories may evolve as the project develops.*

---

## Roadmap

Potential areas for future improvement include:

- More advanced spending insights and budgeting tools.
- Additional reporting and data visualization options.
- Further accessibility and usability enhancements.
- Continued performance, reliability, and security improvements.

---

## Contributing

Suggestions, bug reports, and improvements are welcome.

1. Fork the repository.
2. Create a branch for your change.
3. Make your changes and run the available quality checks.
4. Submit a pull request with a clear description of the improvement.

For substantial changes, open an issue first to discuss the proposed approach.

---

## License

No license has been specified yet. Unless a license is added to the repository, the code should not be assumed to be available for unrestricted reuse, modification, or redistribution.

---

## Author

**Mohammed Atif Ansari**

- GitHub: [@AtifAnsari0345](https://github.com/AtifAnsari0345)
- Project: [Spendly](https://github.com/AtifAnsari0345/Spendly)
- Live application: [spendly-mark1.vercel.app](https://spendly-mark1.vercel.app)

---

*Spendly — a clearer view of your everyday spending.*
