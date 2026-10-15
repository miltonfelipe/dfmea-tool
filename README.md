# DFMEA Tool

A browser-based Design Failure Mode and Effects Analysis (DFMEA) tool for electronics and industrial machinery projects.

- **Worksheet**: failure modes with Severity / Occurrence / Detection ratings, RPN and revised RPN, actions, owners and status
- **Block diagram**: drag-and-drop system diagram linked to subsystems
- **Dashboard**: risk matrix, RPN statistics and per-subsystem summary
- **Review**: per-entry comments and version history
- **Roles**: Project Manager (edit) and Reviewer (comment)
- **Import / export**: projects as JSON files, worksheet as CSV

All data (projects, users and theme) is stored in the browser's `localStorage`. Login is a client-side demo, so don't treat it as real authentication.

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # production build to dist/
npm run lint
```

Built with React 19 and Vite.
