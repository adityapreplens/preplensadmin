# Preplens Backend

This is the backend service for the Preplens admin dashboard, built with Node.js, Express, and MongoDB.

## Prerequisites

- Node.js 14+ and npm
- MongoDB Atlas account or a local MongoDB instance
- Git

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=your_mongodb_connection_string
PORT=4000
NODE_ENV=development
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment to Render.com

1. Push your code to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New" and select "Web Service"
4. Connect your GitHub repository
5. Configure the service:
   - Name: `preplens-backend`
   - Region: Choose the one closest to your users
   - Branch: `main`
   - Build Command: `npm install`
   - Start Command: `node index.js`
6. Add environment variables:
   - `MONGODB_URI`: Your MongoDB connection string
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will provide its own, but we need this as a fallback)
7. Click "Create Web Service"

## API Endpoints

- `POST /bulk-upload`: Upload Excel file with questions
- `GET /questions`: Get all questions
- `POST /questions`: Add a new question
- `DELETE /questions/:id`: Delete a question
- `GET /health`: Health check endpoint

## File Uploads

File uploads are stored in the `uploads/` directory. In production, consider using a cloud storage service like AWS S3.
