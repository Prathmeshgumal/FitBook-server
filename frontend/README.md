# FitBook Dashboard Frontend

A React-based dashboard application for managing gym members and viewing key statistics.

## Prerequisites

- Node.js 18+
- The FitBook backend server running on port 4000

## Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create a `.env` file (optional, defaults to proxying to localhost:4000):
```env
VITE_API_URL=http://localhost:4000/api/v1
```

3. Start the development server:
```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## Features

- **Overview Dashboard**: Key metrics including total gyms, members, active memberships, and revenue
- **Analytics Charts**: Visual representation of gym types, member growth, and gender distribution
- **Recent Gyms**: Latest onboarded gyms with details
- **Popular Plans**: Top membership plans by subscription count
- **Gyms Table**: Searchable and paginated list of all gyms

## Tech Stack

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui components
- Recharts for data visualization
- SWR for data fetching

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.
