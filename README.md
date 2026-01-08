# 🛸 Polyprompt

**Orchestrate your AI workforce in a collaborative, multi-agent workspace.**

Polyprompt is a high-performance, modern web application designed for complex brainstorming, strategic planning, and creative ideation. Instead of talking to one AI, you can assemble a team of specialized agents that work together, challenge each other, and help you reach better outcomes.

---

## ✨ Key Features

### 🤖 Specialized Agent Personas
Assemble your dream team from a library of default agents or create your own:
- **Strategic Analyst**: Data-driven consultant for long-term planning.
- **Devil's Advocate**: Skeptical critic who finds flaws in Every assumption.
- **Creative Ideator**: Optimistic brainstormer for out-of-the-box thinking.
- **Custom Agents**: Define your own personas with specific roles, models, and verbosity settings.

### ⚡ Auto-Mode Discussions
Orchestrate multi-agent debates automatically. Choose between:
- **Quick Mode**: Rapid-fire feedback from multiple perspectives.
- **Deep Dive**: Extensive, multi-turn reasoning and collaboration between agents.

### 🔓 Open Access
Start debating immediately without signing up.
- **Free Guest Access**: Ask up to 3 questions per day instantly.
- **Authenticated Power**: Sign in to save history, sync across devices, and bring your own API key for unlimited usage.

### 🔗 Seamless Sharing
Generate beautiful, read-only links for your conversations to share insights with teammates or stakeholders.

### 💾 Hybrid Persistence
- **Cloud Sync**: Securely store your data in Redis when logged in.
- **Local Fallback**: Works offline with LocalStorage for anonymous sessions.

---

## 🛠️ The Tech Stack

Polyprompt is built on the cutting edge of the Next.js ecosystem:

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Server Actions)
- **UI & UX**: [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), and Vanilla CSS for high-performance animations.
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) with Google OAuth.
- **Database**: [Upstash Redis](https://upstash.com/) for low-latency state persistence.
- **AI Orchestration**: Custom streaming infrastructure compatible with OpenAI and Groq-style APIs.
- **Typography**: Optimized with Inter.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A Redis instance (Upstash recommended)
- Google Cloud Console credentials (for NextAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/polyprompt.git
   cd polyprompt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file:
   ```env
   # Redis
   polypr0mpt_REDIS_URL="your-redis-url"

   # Authentication
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret"
   GOOGLE_CLIENT_ID="your-id"
   GOOGLE_CLIENT_SECRET="your-secret"

   # AI API (Proxy)
   # Relevant keys for your specific AI proxy
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🎨 Aesthetic Philosophy
Polyprompt leverages **Rich Aesthetics**:
- **Glassmorphism**: Subtle translucent panels for a premium feel.
- **Vibrant Gradients**: Indigo and blue palettes for a professional yet energetic look.
- **Micro-animations**: Smooth transitions and pulsing skeletons for high perceived performance.
- **Responsive Layout**: Designed for everything from wide desktop monitors to mobile devices.

---

## 📜 License
This project is private and intended for personal/professional use.
