# Friday Night Football (FNF) App

A simple, mobile-first app for managing casual 5-a-side football sessions. Built to replace AppSheet with a fast, intuitive interface.

**Live App:** https://tranquil-capybara-a467b8.netlify.app/

---

## The Problem

Previously used AppSheet to manage Friday night football sessions, but ran into frustration with:
- Complex, cluttered UI that required too many taps
- Unclear buttons and hard-to-read availability states
- Overkill for what should be simple weekly tracking

Needed something ruthlessly minimal: big buttons, obvious states (In/Out, Paid/Unpaid), and a clear dashboard view of who owes money.

---

## What It Does

### Core Features
- **Player Management** - Add/remove players, see who owes what
- **Weekly Sessions** - Mark attendance and payment status in real-time
- **Bank Tracking** - Auto-calculate and track weekly banked amounts (9 players × £8)
- **Debt Tracking** - Automatically flag unpaid players from closed weeks
- **WhatsApp Messages** - Generate copy-paste chase messages for the group
- **Cancelled Week Tracking** - Mark weeks as cancelled for leisure centre invoice disputes

### How It Works

1. **Add Players** - Start with a roster (usually ~20 people)
2. **Open a Week** - App creates a new Friday session
3. **Mark Attendance** - Tap "In" when players arrive; tap "Paid" when they transfer money
4. **Close the Week** - App calculates (number who played × £8), updates balances, banks the total
5. **Chase Payment** - Copy the auto-generated WhatsApp message and post to the group
6. **Repeat** - Next Friday, create a new week

### Data Stored Per Player
- Name
- Current balance (positive = credit, negative = owed)

### Data Stored Per Week
- Date
- Attendance (who played)
- Payment status (who paid before playing)
- Bank amount (total sent to FNF account)
- Status (open, closed, or cancelled)

---

## Tech Stack

- **React 18** - Component framework
- **Vite** - Build tool (fast, modern)
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **localStorage** - Persistence (no backend needed)
- **Netlify** - Deployment (auto-deploys on git push)

### Why This Stack?

- **No backend** - Keeps it simple and free
- **localStorage** - Works offline, persists across sessions
- **Mobile-first** - Designed for iPhone use during play
- **Installable** - Add to home screen as a PWA
- **Zero config** - Vite handles bundling, Tailwind handles styling

---

## Install & Run Locally

### Prerequisites
- Node.js 16+ installed

### Setup

```bash
# Clone the repo
git clone https://github.com/paulnickson/fnf-app.git
cd fnf-app

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
```

This creates an optimised build in the `dist/` folder (Netlify handles this automatically).

---

## Usage Guide

### Dashboard
- **Bank Balance** - Total money in the FNF account
- **Amount Owed** - Total of all unpaid player balances
- **WhatsApp Message** - Pre-formatted message to copy/paste to the group
- **Current Week** - Quick view of this Friday's attendance and payment status

### Players Tab
- See full roster with individual balances
- Add new players
- Remove inactive players

### History Tab
- View past weeks (closed or cancelled)
- Expand to see who played and who paid
- Mark weeks as cancelled (for invoice tracking)

---

## The Weekly Workflow

**Friday Evening (Game Night)**
1. Players pay £8 (ideally before arrival, but some pay after)
2. As they arrive, tap "In" next to their name
3. As payments come in, tap "Paid"

**After the Game**
1. Tap "Close Week"
2. App calculates: number who played × £8
3. Bank that amount to the FNF account
4. Unpaid players are automatically marked as owing £8

**Throughout the Week**
1. Copy the WhatsApp message
2. Paste it into the WhatsApp group
3. Players transfer money
4. Next Friday, repeat

---

## Cancelled Week Workflow

If a week is cancelled (leisure centre closes or too few players):

1. In the app, expand that week's row
2. Tap "Cancel"
3. When the next month's invoice arrives, check how many weeks were cancelled
4. Email the leisure centre with the count and dates (the app keeps a record)

**Example:**
- Paid for 5 weeks in July, but 1 was cancelled
- August invoice comes for 5 weeks
- Email leisure centre: "July had 1 cancelled week (22 May), please credit us for 4 weeks instead of 5"

---

## Data Persistence

- All data lives in the browser's localStorage
- Automatically saved every time you make a change
- Persists across sessions (your data is still there when you reopen the app)
- **Important:** Clearing your browser cache will erase all data

**Future improvement:** Add export/backup functionality.

---

## Deployment

The app is deployed on **Netlify** and auto-deploys whenever you push to GitHub.

### To Deploy Changes

```bash
# Make changes locally
git add .
git commit -m "Your message"
git push origin main
```

Netlify automatically builds and deploys. Live in ~1 minute.

### Deploy Status
Check deployment status at: https://app.netlify.com/sites/tranquil-capybara-a467b8/

---

## Next Iterations (Roadmap)

### Short Term (Next 1-2 uses)
- [ ] Better payment history per player
- [ ] Notes field (for tracking refunds, absences, etc.)
- [ ] Session details (show final player count)

### Medium Term (Before Handover)
- [ ] Email/phone number fields (to contact players)
- [ ] Admin dashboard (read-only view for whoever takes over)
- [ ] Export data to CSV (for records)
- [ ] Stats dashboard (most active players, total collected, etc.)

### Longer Term
- [ ] Email notifications (remind unpaid players)
- [ ] Configurable price (not hardcoded to £8)
- [ ] Multi-organizer support
- [ ] Payment method tracking (who pays via bank transfer vs. cash)
- [ ] WhatsApp integration (no more manual copy-paste)

---

## Known Limitations

1. **Manual WhatsApp** - You still copy/paste the message (not automated)
2. **Browser Storage Only** - Data lives in the browser you use. If you switch devices, data won't sync
3. **No Backups** - Clear your cache and data is gone (add export feature soon)
4. **Mobile Only** - Built for iPhone; works on Android but not optimised
5. **No Real-time Sync** - Multiple people can't edit at once (each person needs their own copy)

---

## For Future Organizers

### Handing Over
1. Clone this repo
2. Create your own GitHub repo (or fork this one)
3. Deploy to Netlify (or your hosting of choice)
4. Share the URL with whoever takes over

### No Coding Required
This app is ready to use as-is. No command line, no builds—just open the URL on an iPhone, add to home screen, and go.

If you want to change the price from £8, colours, or add features, those are all GitHub discussions for the developer.

---

## Contributing

Found a bug? Want to suggest a feature? File an issue on GitHub or reach out to Paul.

---

## License

MIT (use freely, modify as needed, build on it)

---

## Questions?

This app was built in July 2026 to solve a specific problem: managing casual football sessions without app bloat. It's intentionally simple. If you're using it and something doesn't work or feels clunky, let's fix it.

---

**Last Updated:** July 2026  
**Live URL:** https://tranquil-capybara-a467b8.netlify.app/  
**GitHub:** https://github.com/paulnickson/fnf-app
