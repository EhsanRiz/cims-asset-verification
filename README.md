# CIMS - Compensation Information Management System

## Asset Registration and Verification

A web application for the **Lesotho Lowlands Water Development Project Phase III (LLWDP III)** to manage and verify asset registration for Project Affected Persons (PAPs).

### Features

- **All Data Tab**: Browse all households with expandable rows showing beneficiaries, co-owners, and assets
- **Personal Asset Tab**: Generate and print individual asset verification forms
- **Communal Asset Tab**: Manage community-level assets with 16 asset categories
- **Data Completion**: Fill in missing data directly in the form, which saves back to the database
- **Print-Ready Forms**: Two-page printable forms with photos and ID documents

### Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Hosting**: Render

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```

### Deployment on Render

1. Connect your GitHub repository to Render
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy!

### Database Requirements

The following Supabase tables are required:
- `households`
- `beneficiaries`
- `co_owners`
- `household_assets`
- `banking_details`
- `system_users`
- `communal_assets`

### Environment

The Supabase connection is configured in `src/lib/supabase.js`.

---

**Developed by 4D Climate Solutions**  
For Lesotho Lowlands Water Development Project Phase III
