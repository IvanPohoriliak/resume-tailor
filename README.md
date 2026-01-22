# Resume Tailor

AI-powered resume optimization platform that helps job seekers tailor their resumes for specific job postings in minutes.

## Features

- 📄 **DOCX Resume Upload** - Upload your master resume once
- 🤖 **AI-Powered Tailoring** - GPT-4 optimizes your resume for each job
- 📊 **ATS Score Analysis** - See how well your resume matches the job
- ✏️ **Inline Editing** - Edit any section directly in the preview
- 🔄 **AI Rewrite** - Rewrite sections with different tones
- 📱 **Application Tracking** - Track all applications in one dashboard
- 📥 **DOCX & PDF Export** - Download in the format you need

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Hosting**: Vercel

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd resume-tailor
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. In your Supabase project dashboard, go to **SQL Editor**
3. Run the migration file: `supabase/migrations/001_initial_schema.sql`

### 4. Set up environment variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Where to find Supabase keys:**
- Go to your Supabase project
- Click on **Settings** → **API**
- Copy:
  - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

**Where to get OpenAI API key:**
- Go to [OpenAI Platform](https://platform.openai.com)
- Navigate to **API Keys**
- Create a new secret key

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click **New Project**
3. Import your GitHub repository
4. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (your vercel deployment URL)
5. Click **Deploy**

### 3. Update Supabase URL configuration

After deployment, update `NEXT_PUBLIC_APP_URL` in Vercel environment variables to your production URL (e.g., `https://resume-tailor.vercel.app`)

## Project Structure

```
resume-tailor/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Auth pages (login, signup)
│   │   ├── dashboard/        # Dashboard page
│   │   ├── refine/          # Main resume tailoring page
│   │   ├── api/             # API routes
│   │   │   ├── resume/      # Resume upload & fetch
│   │   │   ├── application/ # Application CRUD
│   │   │   ├── ai/          # AI operations (rewrite)
│   │   │   └── document/    # Document generation
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Landing page
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   └── ui/              # UI components (shadcn/ui)
│   ├── lib/
│   │   ├── supabase/        # Supabase clients
│   │   ├── openai/          # OpenAI client
│   │   ├── parsers/         # DOCX parser
│   │   ├── generators/      # DOCX & PDF generators
│   │   ├── ai/              # AI tailoring logic
│   │   └── utils/           # Utility functions
│   └── types/               # TypeScript types
├── supabase/
│   └── migrations/          # Database migrations
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## Usage

### For Users

1. **Sign Up** - Create an account
2. **Upload Resume** - Upload your master DOCX resume
3. **Paste Job Description** - Copy job description from any job board
4. **Tailor** - Click "Tailor Resume" and wait ~30 seconds
5. **Edit** - Edit any section inline or use AI Rewrite
6. **Download** - Download as DOCX or PDF
7. **Track** - View all applications in Dashboard

### Free Tier Limits

- 5 tailored resumes per month
- All core features included

### Pro Features (Future)

- Unlimited tailored resumes
- Advanced ATS analytics
- Priority support

## API Routes

### Resume
- `POST /api/resume` - Upload resume
- `GET /api/resume` - Fetch user's resumes

### Application
- `POST /api/application` - Create application (tailor resume)
- `GET /api/application` - Fetch user's applications
- `PATCH /api/application/[id]` - Update application
- `DELETE /api/application/[id]` - Delete application

### AI
- `POST /api/ai/rewrite` - Rewrite text section

### Document
- `POST /api/document/generate` - Generate DOCX or PDF

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
