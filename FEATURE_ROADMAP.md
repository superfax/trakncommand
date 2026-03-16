# Trakn Command — Feature Roadmap
_Last updated: Mar 6, 2026_

---

## ✅ Completed

- **DM Templates** — Initial DM + Follow-up DM fields in Settings
- **Smart Cooldown** — Time-based re-DM with configurable hours (0 = test mode)
- **Lead Pipeline Stages** — New → Contacted (auto on DM) → Converted (manual)
- **Notification Badge** — Purple dot + count on Contacts when new leads arrive
- **Multi-Keyword Support** — Single/Multi mode toggle, each keyword gets its own DM + reply + follow-up
- **Auto-Like** — ❌ NOT POSSIBLE (Meta Graph API limitation)
- **Phase 1 — Auth & Accounts** ✅ — Supabase email/password auth, protected routes, RLS data isolation, service role API pattern

---

## 🔴 Hard (days, Meta API risk) — Back Burner

### 📱 Story Mentions / New Follower
- Auto-DM when someone mentions you in a story or follows you
- ⚠️ Requires new Meta API permissions — high review risk
- Treat as exploratory when ready

---

## 🚀 Big Picture — Multi-User Expansion (SaaS)

This is about turning Trakn Command from a **single-user personal tool** into a **product other creators can use**.

### Phase 2 — Instagram Connection 🔴 ← NEXT SESSION
- Each user connects **their own** Instagram Business account via OAuth
- Their own `FB_ACCESS_TOKEN` stored securely per user
- Meta's OAuth flow for third-party app access

### Phase 3 — Billing & Plans 🟡
- Free tier (limited DMs/month) vs Paid tier (unlimited)
- Integrate Stripe (or Paddle — already explored)
- Usage metering per user

### Phase 4 — Admin Dashboard 🟢
- See all users, plan status, usage stats
- Ability to manually adjust accounts

### Phase 5 — Onboarding Flow 🟢
- Setup wizard: connect Instagram → set keyword → write DM → go live
- First-run experience that doesn't require tech knowledge

> [!IMPORTANT]
> Phase 2 (Instagram OAuth per user) is the **critical blocker** for multi-user. Each user must connect their own IG Business account. This is a meaningful Meta API project on its own.

> [!NOTE]
> The fastest path to early users: recruit 2-3 beta users manually (you generate their token for them) while Phase 2 is being built. Proves the concept without the OAuth complexity.

---

## 💡 Next Session
1. **Phase 2** — Instagram OAuth per user
