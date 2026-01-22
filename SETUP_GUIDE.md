# Resume Tailor - Quick Setup Guide

## Step-by-Step Setup (5-10 minutes)

### 1. Install Dependencies

```bash
cd resume-tailor
npm install
```

### 2. Set Up Supabase Database

1. Go to your Supabase project: https://tuqlmwacfsygmpbfmhpl.supabase.co
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire content from `supabase/migrations/001_initial_schema.sql`
5. Click **Run** to execute the migration

This will create all necessary tables, indexes, and security policies.

### 3. Get Your Supabase Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **URL**: `https://tuqlmwacfsygmpbfmhpl.supabase.co`
   - **anon public** key (NOT the publishable key)
   - **service_role** key (secret, keep it safe!)

### 4. Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new secret key
3. Copy and save it (you won't see it again)

### 5. Configure Environment Variables

You have two options:

#### Option A: Local Development (.env.local)

Create `.env.local` file in project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tuqlmwacfsygmpbfmhpl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
OPENAI_API_KEY=your_openai_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Option B: Vercel Deployment

1. Push code to GitHub
2. Go to Vercel dashboard
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (will be your Vercel URL)
5. Deploy

### 6. Run the Application

```bash
npm run dev
```

Open http://localhost:3000

### 7. Test the Application

1. **Sign Up** - Create a test account
2. **Upload Resume** - Upload a DOCX resume
3. **Paste Job Description** - Copy any job posting
4. **Click "Tailor Resume"** - Wait ~30 seconds
5. **Download** - Get your tailored resume

## Common Issues

### "Unauthorized" Error
- Check that your Supabase keys are correct
- Make sure you ran the database migration
- Verify RLS policies are enabled

### "OpenAI API Error"
- Verify your OpenAI API key is valid
- Check you have credits in your OpenAI account
- Ensure the key has proper permissions

### File Upload Fails
- Check Supabase storage bucket exists (created by migration)
- Verify storage policies are set correctly
- Make sure file is .docx format

### Database Errors
- Run the migration SQL again
- Check tables exist in Supabase Table Editor
- Verify your user has proper permissions

## Project Structure

```
resume-tailor/
├── src/app/              # Next.js pages
│   ├── (auth)/          # Login & Signup
│   ├── dashboard/       # Application tracking
│   ├── refine/         # Main feature - resume tailoring
│   └── api/            # Backend API routes
├── src/components/ui/   # UI components
├── src/lib/            # Core logic
│   ├── supabase/       # Database clients
│   ├── openai/         # AI client
│   ├── parsers/        # DOCX parsing
│   ├── generators/     # Document generation
│   └── ai/             # AI tailoring logic
└── supabase/           # Database migrations
```

## Next Steps

1. **Customize Landing Page** - Edit `src/app/page.tsx`
2. **Add Stripe** - Implement Pro subscription (not included yet)
3. **Improve AI Prompts** - Tweak prompts in `src/lib/ai/tailoring.ts`
4. **Add More Features**:
   - Batch processing
   - Cover letter generation
   - LinkedIn profile optimization
   - Browser extension

## Support

If you run into issues:
1. Check the console for error messages
2. Verify all environment variables are set
3. Confirm database migration ran successfully
4. Test Supabase connection in their dashboard

## Production Checklist

Before going live:

- [ ] Database migration executed
- [ ] Environment variables set in Vercel
- [ ] Test signup/login flow
- [ ] Test resume upload
- [ ] Test tailoring process
- [ ] Test document download
- [ ] Check mobile responsiveness
- [ ] Set up error monitoring (Sentry)
- [ ] Configure domain
- [ ] Add privacy policy & terms
