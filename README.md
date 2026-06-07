# FinTrack 📊 — Personalized Expense Tracker & Financial Planner

> 📖 **Check out the [FinTrack Technical Walkthrough](./walkthrough.md) for a deep dive into the system architecture and notification/search pipelines.**

FinTrack is a premium, responsive personal finance tracking application designed to help users budget, monitor expenses, set savings goals, and visualize their spending behaviors. It is built using a modern tech stack (Next.js 16, React 19, Tailwind CSS v4, and Supabase) and features robust notifications (in-app and email), recurring subscription tracking, and automated financial summary reports.

---

## 🚀 Key Features

* **Dashboard Overview**: Access a real-time summary of your finances, including recent transactions, budget tracking progress, monthly savings, and recent system alerts.
* **Transaction Management**: Record and categorize incomes and expenses. Features support search, filtering by date/category/type, and adding notes.
* **Budget Tracking & Alerts**: Set monthly spending limits for individual categories. The system automatically triggers in-app and email notifications when you approach or exceed your budget.
* **Savings Goals & Milestones**: Define targets (e.g., "Emergency Fund"), set deadlines, log contributions, and celebrate progress with automated goal milestone updates.
* **Subscription Manager**: Stay on top of recurring monthly or annual payments (e.g., Netflix, software licenses) with clear renewal calendars.
* **Visual Analytics**: Interactive, animated data visualizations built with Recharts, highlighting spending patterns, category distributions, and month-over-month trends.
* **Automated Report Digests**:
  * **Weekly Summary**: Aggregates the last 7 days of expenses, showing total spending and category breakdown.
  * **Monthly Report**: Summarizes income, total expenses, savings rate, and category breakdowns for the previous calendar month.

---

## 🛠️ Tech Stack

* **Framework**: Next.js 16 (App Router) & React 19
* **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Realtime, `@supabase/ssr` Auth)
* **Styling & UI**: Tailwind CSS v4, Base UI, Shadcn/ui elements, Framer Motion (for premium micro-animations), and Lucide React (icons)
* **Charts**: Recharts
* **Email Delivery**: Resend & SMTP (using Nodemailer) with a local Sandbox logging fallback