# StackSwipe

**Find your people. Share what you know. Grow together.**

StackSwipe is a community for peer-to-peer guidance. Everyone starts somewhere, and no question is too basic. It is not a mentorship marketplace: anyone can be a learner in one area and a helper in another, and messaging is free for everyone.

✨ Features
🔥 Discovery - Swipe through people you can learn from and people you can help, with labels based on real profile overlap

🤖 AI icebreakers - Category-based first-message ideas from both profiles, always editable and never sent automatically

💬 Messaging - Unread counts, read receipts, typing indicators and quick-start prompts

🛡️ Safety - Report, block and unmatch, with rate limits on messages and AI use

📊 Filtering - Combine background, learning topics and connection intent

🎨 Pixel-arcade UI - See DESIGN.md

🔐 Authentication - Supabase Auth with Google, GitHub, and Email/Password

## Database setup
Run these in the Supabase SQL Editor, in order. For a brand new project, `schema.sql` already includes the last two.

1. `supabase/schema.sql`
2. `supabase/admin_migration.sql`
3. `supabase/admin_rls_fix.sql`
4. `supabase/security_hardening.sql`
5. `supabase/guidance_platform.sql`

🛠️ Tech Stack
Frontend: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui

Backend: Next.js API Routes, Supabase

Database: PostgreSQL (Supabase)

Authentication: Supabase Auth

Real-time: Supabase Realtime

Deployment: Vercel

UI Components: Radix UI, Lucide Icons

Animations: CSS, plus GSAP and Lenis on the landing page

🎯 Perfect For
Beginners who are not sure what to learn next or who to ask

Students speaking to people who have already navigated their path

Career switchers finding people who made the same move

Experienced people sharing what they know, with no mentorship session to sell

Peers at similar stages learning and growing together