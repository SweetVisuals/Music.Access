# Supabase Storage Setup Guide

## 🚨 Important: RLS Error Fix

The error `"new row violates row-level security policy"` occurs because Supabase's Row Level Security (RLS) is blocking file uploads.

## 📋 Step-by-Step Setup

### Step 1: Create Storage Bucket (if not exists)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `tkbedvjqciuerhagpmju`
3. Navigate to **Storage** in the left sidebar
4. Click **"Create a new bucket"**
5. **Name**: `assets`
6. **Public bucket**: ✅ Yes
7. **File size limit**: `50MB`
8. Click **"Create bucket"**

### Step 2: Configure RLS Policies

**Option A: Quick Fix (Disable RLS)**
1. Go to **Database** → **Tables** in your dashboard
2. Find **storage** in the left sidebar
3. Click on **storage.objects** (this is a BUILT-IN table)
4. Click **"Edit"** on the RLS toggle to disable it temporarily

**Option B: Proper Fix (Run SQL)**
1. Go to **SQL Editor** in your dashboard
2. Click **"New Query"**
3. Copy the entire contents of `supabase-rls-policies.sql`
4. Paste into the editor
5. Click **"Run"** to execute

### Step 3: What is storage.objects?

- **storage.objects** is a **built-in Supabase table**
- It automatically exists in every Supabase project
- It manages ALL files across ALL your storage buckets
- You don't create it - it's created automatically when you create buckets

### Step 4: Verify Setup

After running the SQL, you should see policies like:
- "Users can view their own assets"
- "Authenticated users can upload files"
- etc.

## 🔧 Alternative: Use the Script

Run this command in your terminal:
```bash
node scripts/create-storage-bucket.js
```

## ⚠️ Troubleshooting

**If you still get RLS errors:**
1. Make sure you're logged in (authenticated) when uploading
2. Check that the bucket name is exactly `assets` (case-sensitive)
3. Verify the policies were created successfully in SQL Editor

**To view existing policies:**
- Go to **Database** → **Tables** → **storage.objects**
- Click the **"Policies"** tab to see all RLS policies

## 📁 Files Created

- `supabase-rls-policies.sql` - Complete SQL setup
- `scripts/create-storage-bucket.js` - Automated bucket creation
- This guide for reference